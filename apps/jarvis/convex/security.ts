import { ConvexError } from "convex/values";
export function requireGateway(value: string) {
  const expected = process.env.JARVIS_GATEWAY_SECRET;
  if (!expected || expected.length < 32 || value !== expected)
    throw new ConvexError("Unauthorized.");
}
