import { describe, expect, it, vi } from "vitest";
import { angleToStep, stepToAngle, runFanMovement } from "../src/lib/fan-direction";

describe("estimated fan direction", () => {
  it("snaps to measured motor steps and clamps the 140 degree travel", () => {
    expect(angleToStep(-100, 14)).toBe(0);
    expect(angleToStep(0, 14)).toBe(7);
    expect(angleToStep(34, 14)).toBe(10);
    expect(angleToStep(100, 14)).toBe(14);
    expect(stepToAngle(0, 14)).toBe(-70);
    expect(stepToAngle(7, 14)).toBe(0);
    expect(stepToAngle(14, 14)).toBe(70);
  });
  it("waits for each acknowledgement and settling interval before advancing", async () => {
    const calls: string[] = [];
    const result = await runFanMovement(
      {
        direction: "left",
        count: 3,
        signal: new AbortController().signal,
        onStep: (step) => calls.push(`step ${step}`),
      },
      async () => {
        calls.push("send");
      },
      async () => {
        calls.push("settle");
      },
    );
    expect(result).toBe(true);
    expect(calls).toEqual([
      "send",
      "settle",
      "step 1",
      "send",
      "settle",
      "step 2",
      "send",
      "settle",
      "step 3",
    ]);
  });
  it("does not retry or send remaining nudges after an ambiguous failure", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Timeout"));
    const onStep = vi.fn();
    await expect(
      runFanMovement(
        { direction: "right", count: 4, signal: new AbortController().signal, onStep },
        send,
        async () => {},
      ),
    ).rejects.toThrow("Timeout");
    expect(send).toHaveBeenCalledTimes(2);
    expect(onStep).toHaveBeenCalledExactlyOnceWith(1);
  });
  it("stops after the in-flight step without inventing a new position", async () => {
    const controller = new AbortController();
    const send = vi.fn(async () => {
      controller.abort();
    });
    const onStep = vi.fn();
    expect(
      await runFanMovement(
        { direction: "right", count: 4, signal: controller.signal, onStep },
        send,
        async () => {},
      ),
    ).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
    expect(onStep).not.toHaveBeenCalled();
    expect(
      await runFanMovement(
        { direction: "right", count: 4, signal: controller.signal, onStep },
        send,
      ),
    ).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it.each([0, -1, 1.5, 71, NaN])("rejects invalid step count %s before sending", async (count) => {
    const send = vi.fn();
    await expect(
      runFanMovement(
        { direction: "right", count, signal: new AbortController().signal, onStep: () => {} },
        send,
      ),
    ).rejects.toThrow("Invalid");
    expect(send).not.toHaveBeenCalled();
  });
});
