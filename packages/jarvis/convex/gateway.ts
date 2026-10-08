"use node";
import { readFan, controlFan, FAN_MODEL } from "./adapters/fan";
import { randomUUID } from "node:crypto";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v, ConvexError } from "convex/values";
import { requireGateway } from "./security";
import { seal, unseal, verifyPassword } from "./crypto";
import { createClient, command, readLight } from "./adapters/yeelight";
import type { CloudClient } from "./adapters/yeelight";
const controlData = v.object({
  on: v.optional(v.boolean()),
  speed: v.optional(v.number()),
  angle: v.optional(v.number()),
  direction: v.optional(v.string()),
  brightness: v.optional(v.number()),
  kelvin: v.optional(v.number()),
  color: v.optional(v.string()),
  duration: v.optional(v.number()),
  mode: v.optional(v.string()),
  minutes: v.optional(v.number()),
  name: v.optional(v.string()),
  count: v.optional(v.number()),
  end: v.optional(v.number()),
  steps: v.optional(
    v.array(
      v.object({
        duration: v.number(),
        mode: v.string(),
        kelvin: v.optional(v.number()),
        color: v.optional(v.string()),
        brightness: v.number(),
      }),
    ),
  ),
});
const operation = v.union(
  v.object({
    type: v.literal("fanHome"),
    id: v.id("devices"),
    travelSteps: v.optional(v.number()),
  }),
  v.object({ type: v.literal("fanAim"), id: v.id("devices"), position: v.number() }),
  v.object({
    type: v.literal("fanReference"),
    id: v.id("devices"),
    travelSteps: v.number(),
    position: v.number(),
  }),
  v.object({ type: v.literal("fanStop"), id: v.id("devices"), token: v.string() }),
  v.object({ type: v.literal("startLogin"), region: v.string() }),
  v.object({ type: v.literal("pollLogin"), key: v.string() }),
  v.object({ type: v.literal("discover") }),
  v.object({ type: v.literal("disconnect") }),
  v.object({
    type: v.literal("visibility"),
    id: v.id("devices"),
    hidden: v.boolean(),
  }),
  v.object({ type: v.literal("refresh"), id: v.id("devices") }),
  v.object({
    type: v.literal("control"),
    id: v.id("devices"),
    action: v.string(),
    data: controlData,
  }),
  v.object({
    type: v.literal("metadata"),
    id: v.id("devices"),
    name: v.string(),
    room: v.string(),
  }),
  v.object({
    type: v.literal("saveScene"),
    id: v.id("devices"),
    name: v.string(),
  }),
  v.object({ type: v.literal("deleteScene"), id: v.id("scenes") }),
);
export const login = action({
  args: { secret: v.string(), password: v.string() },
  handler: async (ctx, { secret, password }): Promise<boolean> => {
    requireGateway(secret);
    if (
      !(await ctx.runMutation(internal.store.rateLimit, {
        key: "owner-login",
        max: 10,
        window: 300000,
      }))
    )
      throw new ConvexError("Too many sign-in attempts. Try again in five minutes.");
    return verifyPassword(password);
  },
});
async function account(ctx: ActionCtx) {
  const account = await ctx.runQuery(internal.store.account, {});
  if (!account) throw new Error("Connect Xiaomi Home first.");
  return {
    account,
    client: createClient(unseal(account.encryptedSession, "xiaomi:account")),
  };
}
async function refresh(ctx: ActionCtx, client: CloudClient, id: Id<"devices">) {
  const d = await ctx.runQuery(internal.store.device, { id });
  if (!d) throw new Error("Device no longer exists. Refresh your device list.");
  try {
    const state =
      d.kind === "fan"
        ? await readFan(client, d.externalId)
        : await readLight(client, d.externalId);
    await ctx.runMutation(internal.store.updateState, {
      id,
      online: true,
      state,
    });
    return state;
  } catch {
    await ctx.runMutation(internal.store.updateState, {
      id,
      online: false,
      error: "Unable to read the device. Check power and Xiaomi Home, then refresh.",
    });
    throw new Error("Unable to read the device. Check power and Xiaomi Home, then refresh.");
  }
}
async function discover(ctx: ActionCtx) {
  const { account: a, client } = await account(ctx),
    devices = await client.devices();
  const ids = await ctx.runMutation(internal.store.syncDevices, {
    accountId: a._id,
    devices: devices.map((d) => ({
      externalId: d.id,
      name: d.name,
      model: d.model,
      online: d.online,
    })),
  });
  // Bound upstream requests; remaining devices refresh when selected by the owner.
  await Promise.allSettled(ids.slice(0, 4).map((id) => refresh(ctx, client, id)));
  return { found: ids.length };
}
export const execute = action({
  args: { secret: v.string(), operation },
  handler: async (ctx, { secret, operation: op }): Promise<unknown> => {
    requireGateway(secret);
    if (
      !(await ctx.runMutation(internal.store.rateLimit, {
        key: "owner-api",
        max: 120,
        window: 60000,
      }))
    )
      throw new ConvexError("Too many requests. Wait a moment.");
    // Cancellation must remain available while the background job owns the lease.
    if (op.type === "fanStop") {
      await ctx.runMutation(internal.fanMotion.stop, { deviceId: op.id, token: op.token });
      return { ok: true };
    }
    const token = randomUUID(),
      key = "xiaomi-owner";
    if (!(await ctx.runMutation(internal.store.acquire, { key, token })))
      throw new ConvexError("Another request is in progress. Try again in a moment.");
    let backgroundOwnsLease = false;
    try {
      if (op.type === "fanReference") {
        await ctx.runMutation(internal.fanMotion.reference, {
          deviceId: op.id,
          travelSteps: op.travelSteps,
          position: op.position,
        });
        return { ok: true };
      }
      if (op.type === "fanHome" || op.type === "fanAim") {
        backgroundOwnsLease = await ctx.runMutation(internal.fanMotion.start, {
          deviceId: op.id,
          token,
          kind: op.type === "fanHome" ? "home" : "aim",
          ...(op.type === "fanHome" ? { travelSteps: op.travelSteps } : { target: op.position }),
        });
        return { ok: true };
      }
      if (op.type === "startLogin") {
        if (
          !(await ctx.runMutation(internal.store.rateLimit, {
            key: "qr-start",
            max: 6,
            window: 60000,
          }))
        )
          throw new Error("Wait a minute before creating another sign-in code.");
        const client = createClient();
        await client.startQR(op.region);
        const image = await client.request(client.session.qr!);
        const mime = image.headers.get("content-type")?.split(";")[0];
        if (!image.ok || !["image/png", "image/jpeg", "image/gif"].includes(mime ?? ""))
          throw new Error("Could not load the Xiaomi sign-in code.");
        const bytes = await image.arrayBuffer();
        if (bytes.byteLength > 512000)
          throw new Error("Xiaomi returned an unexpected sign-in image.");
        const key = randomUUID();
        await ctx.runMutation(internal.store.putLogin, {
          key,
          encryptedSession: seal(client.session, "xiaomi:login:" + key),
          expires: client.session.expires!,
        });
        return {
          key,
          image: `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`,
          expires: client.session.expires,
        };
      }
      if (op.type === "pollLogin") {
        const login = await ctx.runQuery(internal.store.login, { key: op.key });
        if (!login || login.expires < Date.now())
          throw new Error("This code expired or was replaced. Create a new one.");
        const client = createClient(unseal(login.encryptedSession, "xiaomi:login:" + op.key));
        if (!(await client.pollQR())) return { pending: true };
        await ctx.runMutation(internal.store.connect, {
          key: op.key,
          encryptedSession: seal(client.session, "xiaomi:account"),
          region: client.session.region!,
        });
        await ctx.runMutation(internal.store.event, {
          deviceName: "Xiaomi Home",
          label: "Account connected",
          status: "success",
        });
        try {
          return { connected: true, ...(await discover(ctx)) };
        } catch {
          return {
            connected: true,
            warning: "Account connected. Use Find devices to retry discovery.",
          };
        }
      }
      if (op.type === "disconnect") {
        await ctx.runMutation(internal.store.disconnect, {});
        await ctx.runMutation(internal.store.event, {
          deviceName: "Xiaomi Home",
          label: "Account disconnected",
          status: "success",
        });
        return { ok: true };
      }
      if (op.type === "discover") return discover(ctx);
      if (op.type === "deleteScene") {
        await ctx.runMutation(internal.store.deleteScene, { id: op.id });
        return { ok: true };
      }
      if (op.type === "visibility") {
        await ctx.runMutation(internal.store.visibility, {
          id: op.id,
          hidden: op.hidden,
        });
        return { ok: true };
      }
      if (op.type === "metadata") {
        await ctx.runMutation(internal.store.metadata, {
          id: op.id,
          name: op.name,
          room: op.room,
        });
        return { ok: true };
      }
      const { client } = await account(ctx),
        device = await ctx.runQuery(internal.store.device, { id: op.id });
      if (!device) throw new Error("Choose a device connected to your account.");
      if (op.type === "refresh") {
        await refresh(ctx, client, op.id);
        return { ok: true };
      }
      if (op.type === "saveScene") {
        if (device.kind !== "light") throw new Error("Choose a light to save a scene.");
        const state = await refresh(ctx, client, op.id);
        if (!("brightness" in state)) throw new Error("Choose a light to save a scene.");
        if (!state.power) throw new Error("Turn the light on before saving a scene.");
        command("scene", state);
        await ctx.runMutation(internal.store.saveScene, {
          name: op.name,
          description: "Your saved light setting",
          mode: state.mode,
          kelvin: state.kelvin,
          color: state.color,
          brightness: state.brightness,
        });
        return { ok: true };
      }
      if (device.kind === "fan" && device.model !== FAN_MODEL)
        throw new Error("This fan model is not supported yet.");
      if (op.action === "timerStatus" || op.action === "rename")
        throw new Error("Use the device settings to rename this device.");
      const label =
        op.action === "power"
          ? op.data.on
            ? "Turned on"
            : "Turned off"
          : ({
              speed: "Fan speed changed",
              fanMode: "Wind mode changed",
              oscillation: "Oscillation changed",
              angle: "Oscillation angle changed",
              direction: "Fan direction adjusted",
              indicator: "Indicator light changed",
              sound: "Button sound changed",
              childLock: "Child lock changed",
              brightness: "Brightness changed",
              temperature: "White temperature changed",
              color: "Color changed",
              scene: "Scene applied",
              timer: "Off timer set",
              cancelTimer: "Off timer cancelled",
              flow: "Effect started",
              stopFlow: "Effect stopped",
              default: "Power-on default saved",
            }[op.action] ?? "Device updated");
      try {
        if (device.kind === "fan") {
          if (["direction", "power", "oscillation", "angle", "childLock"].includes(op.action))
            await ctx.runMutation(internal.store.invalidateFanDirection, { id: op.id });
          await controlFan(client, device.externalId, op.action, op.data);
        } else {
          const [method, params] = command(op.action, op.data);
          const result = await client.rpc(device.externalId, method, params);
          if (!Array.isArray(result) || result[0] !== "ok")
            throw new Error("The bulb did not confirm the command. Refresh before retrying.");
        }
        // Never retry a command automatically: a network timeout can follow successful delivery.
        let warning: string | undefined;
        try {
          await refresh(ctx, client, op.id);
        } catch {
          warning = "The device accepted the command, but its state could not be refreshed.";
        }
        await ctx.runMutation(internal.store.event, {
          deviceName: device.name,
          label,
          status: "success",
        });
        return { ok: true, ...(warning ? { warning } : {}) };
      } catch (error) {
        await ctx.runMutation(internal.store.event, {
          deviceName: device.name,
          label: "Command not confirmed — refresh before retrying",
          status: "error",
        });
        throw error;
      }
    } catch (error) {
      // Return only adapter-authored messages. No upstream payloads, tokens or stack traces.
      if (error instanceof ConvexError) throw error;
      const message = error instanceof Error ? error.message : "";
      const safe =
        /^(Xiaomi|This |Choose |Connect |Invalid |Use |Turn |Wait |Could not |Unable |Account |Device |The bulb|The fan|Brightness|Temperature|Transition|Power |Minutes|Repeat |End |Unknown |Step |You can |Name )/.test(
          message,
        );
      throw new ConvexError(
        safe ? message : "The device service could not complete this request. Please try again.",
      );
    } finally {
      if (!backgroundOwnsLease) await ctx.runMutation(internal.store.release, { key, token });
    }
  },
});
