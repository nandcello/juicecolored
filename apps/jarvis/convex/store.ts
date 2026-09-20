import { internalMutation, internalQuery, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { deviceState, sceneFields } from "./schema";
import { requireGateway } from "./security";

export const snapshot = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireGateway(secret);
    const [account, devices, scenes, activity] = await Promise.all([
      ctx.db
        .query("integrations")
        .withIndex("by_provider", (q) => q.eq("provider", "xiaomi"))
        .unique(),
      ctx.db.query("devices").collect(),
      ctx.db.query("scenes").collect(),
      ctx.db.query("activity").order("desc").take(40),
    ]);
    return {
      connected: !!account,
      region: account?.region ?? "sg",
      devices: devices.map(
        ({
          _id,
          name,
          room,
          kind,
          provider,
          model,
          online,
          capabilities,
          state,
          updatedAt,
          error,
          hidden,
        }) => ({
          id: _id,
          hidden: hidden ?? false,
          name,
          room,
          kind,
          provider,
          model,
          online,
          capabilities,
          state,
          updatedAt,
          ...(error ? { error } : {}),
        }),
      ),
      scenes: scenes.map(({ _id, _creationTime, ...scene }) => ({
        id: _id,
        ...scene,
      })),
      activity: activity.map(({ _id, _creationTime, ...event }) => ({
        id: _id,
        ...event,
      })),
    };
  },
});
export const account = internalQuery({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query("integrations")
      .withIndex("by_provider", (q) => q.eq("provider", "xiaomi"))
      .unique(),
});
export const login = internalQuery({
  args: { key: v.string() },
  handler: (ctx, { key }) =>
    ctx.db
      .query("logins")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique(),
});
export const putLogin = internalMutation({
  args: { key: v.string(), encryptedSession: v.string(), expires: v.number() },
  handler: async (ctx, args) => {
    for (const row of await ctx.db.query("logins").collect()) await ctx.db.delete(row._id);
    await ctx.db.insert("logins", args);
  },
});
export const connect = internalMutation({
  args: { key: v.string(), encryptedSession: v.string(), region: v.string() },
  handler: async (ctx, args) => {
    const login = await ctx.db
      .query("logins")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!login || login.expires < Date.now())
      throw new ConvexError("This sign-in was cancelled or expired. Create another code.");
    const previous = await ctx.db
      .query("integrations")
      .withIndex("by_provider", (q) => q.eq("provider", "xiaomi"))
      .unique();
    if (previous) await ctx.db.delete(previous._id);
    // A new account must not inherit devices from an earlier account.
    for (const row of await ctx.db.query("devices").collect()) await ctx.db.delete(row._id);
    await ctx.db.insert("integrations", {
      provider: "xiaomi",
      encryptedSession: args.encryptedSession,
      region: args.region,
      connectedAt: Date.now(),
    });
    await ctx.db.delete(login._id);
  },
});
export const disconnect = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ["integrations", "logins", "devices"] as const)
      for (const row of await ctx.db.query(table).collect()) await ctx.db.delete(row._id);
  },
});
export const device = internalQuery({
  args: { id: v.id("devices") },
  handler: (ctx, { id }) => ctx.db.get(id),
});
export const syncDevices = internalMutation({
  args: {
    accountId: v.id("integrations"),
    devices: v.array(
      v.object({
        externalId: v.string(),
        name: v.string(),
        model: v.string(),
        online: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, { accountId, devices }) => {
    if (!(await ctx.db.get(accountId)))
      throw new ConvexError("Account changed. Refresh the dashboard.");
    const previous = await ctx.db.query("devices").collect();
    for (const row of previous)
      if (!devices.some((d) => d.externalId === row.externalId)) await ctx.db.delete(row._id);
    for (const device of devices) {
      const old = previous.find((d) => d.externalId === device.externalId);
      if (old)
        await ctx.db.patch(old._id, {
          model: device.model,
          online: device.online,
        });
      else
        await ctx.db.insert("devices", {
          ...device,
          room: "My home",
          kind: device.model === "dmaker.fan.p18" ? "fan" : "light",
          provider: "xiaomi",
          capabilities:
            device.model === "dmaker.fan.p18"
              ? ["power", "speed", "oscillation", "fanMode", "timer"]
              : ["power", "brightness", "temperature", "color", "scenes", "effects", "timer"],
          state:
            device.model === "dmaker.fan.p18"
              ? {
                  power: false,
                  speed: 1,
                  mode: "straight",
                  oscillating: false,
                  angle: 30,
                  offInMinutes: 0,
                  indicator: false,
                  sound: false,
                  childLock: false,
                }
              : {
                  power: false,
                  brightness: 50,
                  kelvin: 4000,
                  color: "#ffffff",
                  mode: "white",
                  flowing: false,
                  offInMinutes: 0,
                },
          updatedAt: 0,
        });
    }
    return (await ctx.db.query("devices").collect()).map((d) => d._id);
  },
});
export const updateState = internalMutation({
  args: {
    id: v.id("devices"),
    online: v.boolean(),
    state: v.optional(deviceState),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...data }) => {
    if (await ctx.db.get(id))
      await ctx.db.patch(id, {
        ...data,
        error: data.error,
        updatedAt: Date.now(),
      });
  },
});
export const visibility = internalMutation({
  args: { id: v.id("devices"), hidden: v.boolean() },
  handler: async (ctx, { id, hidden }) => {
    if (!(await ctx.db.get(id))) throw new ConvexError("Device no longer exists.");
    await ctx.db.patch(id, { hidden });
  },
});
export const metadata = internalMutation({
  args: { id: v.id("devices"), name: v.string(), room: v.string() },
  handler: async (ctx, { id, name, room }) => {
    if (!name.trim() || name.length > 60 || !room.trim() || room.length > 40)
      throw new ConvexError("Enter a name and room (up to 60 and 40 characters).");
    if (!(await ctx.db.get(id))) throw new ConvexError("Device no longer exists.");
    await ctx.db.patch(id, { name: name.trim(), room: room.trim() });
  },
});
export const saveScene = internalMutation({
  args: sceneFields,
  handler: async (ctx, args) => {
    if (!args.name.trim() || args.name.length > 40)
      throw new ConvexError("Name the scene using 1–40 characters.");
    if ((await ctx.db.query("scenes").take(31)).length >= 30)
      throw new ConvexError("You can save up to 30 scenes.");
    return ctx.db.insert("scenes", { ...args, name: args.name.trim() });
  },
});
export const deleteScene = internalMutation({
  args: { id: v.id("scenes") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
export const event = internalMutation({
  args: {
    deviceName: v.string(),
    label: v.string(),
    status: v.union(v.literal("success"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activity", { ...args, createdAt: Date.now() });
    const old = await ctx.db.query("activity").order("desc").collect();
    for (const row of old.slice(100)) await ctx.db.delete(row._id);
  },
});
export const rateLimit = internalMutation({
  args: { key: v.string(), max: v.number(), window: v.number() },
  handler: async (ctx, { key, max, window }) => {
    const now = Date.now(),
      old = await ctx.db
        .query("limits")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
    if (old && old.expires > now && old.count >= max) return false;
    if (old)
      await ctx.db.patch(old._id, {
        expires: old.expires > now ? old.expires : now + window,
        count: old.expires > now ? old.count + 1 : 1,
      });
    else await ctx.db.insert("limits", { key, expires: now + window, count: 1 });
    // Keys are fixed to the owner and operation, avoiding unbounded per-IP records.
    return true;
  },
});
export const acquire = internalMutation({
  args: { key: v.string(), token: v.string() },
  handler: async (ctx, { key, token }) => {
    const old = await ctx.db
      .query("leases")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (old && old.expires > Date.now()) return false;
    if (old) await ctx.db.patch(old._id, { token, expires: Date.now() + 120000 });
    else
      await ctx.db.insert("leases", {
        key,
        token,
        expires: Date.now() + 120000,
      });
    return true;
  },
});
export const release = internalMutation({
  args: { key: v.string(), token: v.string() },
  handler: async (ctx, { key, token }) => {
    const old = await ctx.db
      .query("leases")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (old?.token === token) await ctx.db.delete(old._id);
  },
});
