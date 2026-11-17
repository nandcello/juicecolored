import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { bridgeRequest, lightMethods } from "./bridgeContract";
import { usesLocalControl } from "./localConfig";

function requireBridge(secret: string) {
  const expected = process.env.JARVIS_BRIDGE_SECRET;
  if (!expected || expected.length < 32 || secret !== expected)
    throw new ConvexError("Unauthorized.");
}
const identity = { secret: v.string(), id: v.id("bridgeJobs"), claim: v.string() };

export const heartbeat = mutation({
  args: { secret: v.string() },
  returns: v.null(),
  handler: async (ctx, { secret }) => {
    requireBridge(secret);
    const row = await ctx.db
      .query("bridgePresence")
      .withIndex("by_name", (q) => q.eq("name", "home"))
      .unique();
    if (row) await ctx.db.patch(row._id, { lastSeenAt: Date.now() });
    else await ctx.db.insert("bridgePresence", { name: "home", lastSeenAt: Date.now() });
    return null;
  },
});

export const enqueue = internalMutation({
  args: bridgeRequest,
  returns: v.id("bridgeJobs"),
  handler: async (ctx, request) => {
    if (!usesLocalControl(request.externalId))
      throw new Error("Device is not paired for local control.");
    const device = await ctx.db
      .query("devices")
      .withIndex("by_external", (q) =>
        q.eq("provider", "xiaomi").eq("externalId", request.externalId),
      )
      .unique();
    const allowed =
      device?.kind === "fan"
        ? ["get_properties", "set_properties"].includes(request.method)
        : device?.kind === "light" && lightMethods.has(request.method);
    if (!allowed || JSON.stringify(request.params).length > 8192)
      throw new Error("Invalid local device request.");
    const presence = await ctx.db
      .query("bridgePresence")
      .withIndex("by_name", (q) => q.eq("name", "home"))
      .unique();
    if (!presence || presence.lastSeenAt < Date.now() - 90000)
      throw new Error("Device bridge is offline. Check Bathala and try again.");
    const id = await ctx.db.insert("bridgeJobs", {
      ...request,
      status: "pending",
      expiresAt: Date.now() + 12000,
    });
    await ctx.scheduler.runAfter(120000, internal.localBridge.remove, { id });
    return id;
  },
});

// An outbound reactive subscription avoids exposing a server on the VPS or home network.
export const pending = query({
  args: { secret: v.string() },
  returns: v.array(v.id("bridgeJobs")),
  handler: async (ctx, { secret }) => {
    requireBridge(secret);
    return (
      await ctx.db
        .query("bridgeJobs")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(16)
    ).map((j) => j._id);
  },
});

export const claim = mutation({
  args: identity,
  returns: v.union(v.null(), v.object({ ...bridgeRequest, expiresAt: v.number() })),
  handler: async (ctx, { secret, id, claim }) => {
    requireBridge(secret);
    const job = await ctx.db.get(id);
    if (!job || job.status !== "pending") return null;
    if (job.expiresAt <= Date.now()) {
      await ctx.db.patch(id, {
        status: "failed",
        error: "Device request expired before delivery.",
      });
      return null;
    }
    await ctx.db.patch(id, { status: "running", claim });
    return {
      externalId: job.externalId,
      method: job.method,
      params: job.params,
      expiresAt: job.expiresAt,
    };
  },
});

export const maySend = mutation({
  args: identity,
  returns: v.boolean(),
  handler: async (ctx, { secret, id, claim }) => {
    requireBridge(secret);
    const job = await ctx.db.get(id);
    return !!job && job.status === "running" && job.claim === claim && job.expiresAt > Date.now();
  },
});

export const complete = mutation({
  args: { ...identity, result: v.optional(v.any()), error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { secret, id, claim, result, error }) => {
    requireBridge(secret);
    const job = await ctx.db.get(id);
    if (!job || job.status !== "running" || job.claim !== claim || job.expiresAt <= Date.now())
      return null;
    if (JSON.stringify(result ?? null).length > 16384) throw new Error("Invalid device response.");
    await ctx.db.patch(
      id,
      error
        ? { status: "failed", error: error.slice(0, 300) }
        : { status: "done", result: result ?? null },
    );
    return null;
  },
});

export const result = internalQuery({
  args: { id: v.id("bridgeJobs") },
  returns: v.union(
    v.null(),
    v.object({ status: v.string(), result: v.optional(v.any()), error: v.optional(v.string()) }),
  ),
  handler: async (ctx, { id }) => {
    const job = await ctx.db.get(id);
    return job
      ? {
          status: job.status,
          ...(job.result !== undefined ? { result: job.result } : {}),
          ...(job.error ? { error: job.error } : {}),
        }
      : null;
  },
});

export const expire = internalMutation({
  args: { id: v.id("bridgeJobs") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const job = await ctx.db.get(id);
    if (job && (job.status === "pending" || job.status === "running"))
      await ctx.db.patch(id, {
        status: "failed",
        error: "Device response timed out. Refresh before retrying.",
      });
    return null;
  },
});

export const remove = internalMutation({
  args: { id: v.id("bridgeJobs") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    if (await ctx.db.get(id)) await ctx.db.delete(id);
    return null;
  },
});
