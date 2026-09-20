import "server-only";
import { ConvexHttpClient } from "convex/browser";
export function backend() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL,
    secret = process.env.JARVIS_GATEWAY_SECRET;
  if (!url || !secret) throw new Error("Jarvis backend is not configured.");
  return { client: new ConvexHttpClient(url), secret };
}
export function configured() {
  return !!(
    process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.JARVIS_GATEWAY_SECRET &&
    process.env.JARVIS_SESSION_SECRET
  );
}
