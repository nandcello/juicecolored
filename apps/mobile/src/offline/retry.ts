import type { SyncState } from "./types";

export const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 3_600_000, 21_600_000] as const;

export function getRetryOutcome(previousAttempts: number, now: number) {
  const attempts = previousAttempts + 1;
  const delay =
    RETRY_DELAYS_MS[Math.min(previousAttempts, RETRY_DELAYS_MS.length - 1)] ??
    RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  const state: SyncState = attempts >= RETRY_DELAYS_MS.length ? "failed" : "pending";
  return { attempts, nextAttemptAt: now + delay, state };
}
