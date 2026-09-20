import { describe, expect, it } from "vitest";

import { getRetryOutcome, RETRY_DELAYS_MS } from "./retry";

describe("offline retry policy", () => {
  it("uses the planned buffered exponential schedule", () => {
    expect(RETRY_DELAYS_MS).toEqual([5_000, 30_000, 120_000, 600_000, 3_600_000, 21_600_000]);
  });

  it("marks the item failed after the final automatic retry tier", () => {
    expect(getRetryOutcome(0, 1_000)).toEqual({
      attempts: 1,
      nextAttemptAt: 6_000,
      state: "pending",
    });
    expect(getRetryOutcome(5, 1_000)).toEqual({
      attempts: 6,
      nextAttemptAt: 21_601_000,
      state: "failed",
    });
    expect(getRetryOutcome(20, 1_000)).toEqual({
      attempts: 21,
      nextAttemptAt: 21_601_000,
      state: "failed",
    });
  });
});
