import "server-only";
import { api } from "@personal/convex";
import { fetchMutation } from "./convex-read";
import { convexOptions } from "./data";

export async function recordSearch(q: string) {
  try {
    await fetchMutation(api.canceldt.searches.record, { q }, convexOptions());
  } catch {
    // Analytics must never prevent a visitor from searching. Do not log the term.
    console.error("CANCELDT search tracking failed.");
  }
}
