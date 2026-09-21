"use node";
import { scrypt, timingSafeEqual, createHash } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
export const verify = action({
  args: { secret: v.string(), password: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { secret, password }) => {
    const gateway = process.env.CANCELDT_LOGIN_SECRET;
    const stored = process.env.CANCELDT_PASSPHRASE_HASH;
    if (!gateway || !stored) throw new ConvexError("CANCELDT sign-in is not configured.");
    const digest = (value: string) => createHash("sha256").update(value).digest();
    if (!timingSafeEqual(digest(secret), digest(gateway)))
      throw new ConvexError("CANCELDT sign-in access denied.");
    if (!password || password.length > 256) return false;
    await ctx.runMutation(internal.canceldt.loginLimit.reserve, {});
    const [version, salt, hash] = stored.split(":");
    if (
      version !== "scrypt" ||
      !/^[a-f0-9]{32}$/.test(salt ?? "") ||
      !/^[a-f0-9]{128}$/.test(hash ?? "")
    )
      throw new ConvexError("CANCELDT sign-in is not configured.");
    const actual = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        password,
        Buffer.from(salt, "hex"),
        64,
        {
          N: 131072,
          r: 8,
          p: 1,
          maxmem: 256 * 1024 * 1024,
        },
        (error, key) => (error ? reject(error) : resolve(key)),
      );
    });
    return timingSafeEqual(actual, Buffer.from(hash, "hex"));
  },
});
