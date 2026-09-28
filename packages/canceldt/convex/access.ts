import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "@personal/convex/server";
export async function requireAdmin(ctx: Pick<QueryCtx | MutationCtx, "auth">) {
  const identity = await ctx.auth.getUserIdentity();
  const allowed = (process.env.CANCELDT_ADMIN_IDENTITIES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (
    !identity ||
    identity.issuer !== process.env.CANCELDT_AUTH_ISSUER ||
    !allowed.includes(identity.tokenIdentifier)
  )
    throw new ConvexError("Administrator access required.");
  return identity;
}
