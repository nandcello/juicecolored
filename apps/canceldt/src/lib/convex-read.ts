import "server-only";
import { ConvexHttpClient } from "convex/browser";
import type {
  fetchQuery as query,
  fetchMutation as mutation,
  fetchAction as action,
  NextjsOptions,
} from "convex/nextjs";
// Bound backend calls so a broken connection cannot leave the editor streaming
// indefinitely. Only read operations are retried; writes may already have committed.
export const backendFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: "no-store",
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)])
      : AbortSignal.timeout(8000),
  });
function client(options: NextjsOptions = {}) {
  const connection = new ConvexHttpClient(options.url ?? process.env.NEXT_PUBLIC_CONVEX_URL!, {
    fetch: backendFetch,
    auth: options.token,
  });
  return connection;
}
export const fetchQuery: typeof query = async (reference, ...args) => {
  const connection = client(args[1]);
  try {
    return await connection.query(reference, args[0] || {});
  } catch (error) {
    if (
      !(error instanceof TypeError && error.cause) &&
      !(error instanceof Error && error.name === "TimeoutError")
    )
      throw error;
    return connection.query(reference, args[0] || {});
  }
};
export const fetchMutation: typeof mutation = async (reference, ...args) =>
  client(args[1]).mutation(reference, args[0] || {});
export const fetchAction: typeof action = async (reference, ...args) =>
  client(args[1]).action(reference, args[0] || {});
