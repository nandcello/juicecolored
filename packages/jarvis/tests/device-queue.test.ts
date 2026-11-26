import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceQueues, IDLE_MS, type Outcome, type Submission } from "../src/lib/device-queue";

type Call = { id: string; submission: Submission; release: (error?: Error) => void };
function harness() {
  const calls: Call[] = [];
  const settled: { id: string; submission: Submission; outcome: Outcome }[] = [];
  let changes = 0;
  const queues = new DeviceQueues();
  queues.subscribe(() => changes++);
  queues.connect({
    send: (id, submission) =>
      new Promise((resolve, reject) =>
        calls.push({
          id,
          submission: structuredClone(submission),
          release: (error) => (error ? reject(error) : resolve({ ok: true })),
        }),
      ),
    settle: async (id, _kind, submission, outcome) => {
      settled.push({ id, submission, outcome });
    },
  });
  const flush = () => vi.advanceTimersByTimeAsync(0);
  return { queues, calls, settled, flush, changes: () => changes };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("per-device command lanes", () => {
  it("projects each adjustment immediately and sends one batch after the idle window", async () => {
    const h = harness();
    h.queues.edit("fan", "fan", { speed: 50 });
    expect(h.queues.view("fan")).toMatchObject({ overlay: { speed: 50 }, phase: "waiting" });
    await vi.advanceTimersByTimeAsync(IDLE_MS - 100);
    h.queues.edit("fan", "fan", { oscillating: false });
    h.queues.edit("fan", "fan", { speed: 55 });
    await vi.advanceTimersByTimeAsync(IDLE_MS - 1);
    expect(h.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.calls.map((c) => c.submission)).toEqual([
      { type: "batch", settings: { speed: 55, oscillating: false } },
    ]);
    expect(h.queues.view("fan")).toMatchObject({
      overlay: { speed: 55, oscillating: false },
      phase: "sending",
    });
  });

  it("keeps latest values for partially overlapping fields and replaces the light mode", async () => {
    const h = harness();
    h.queues.edit("light", "light", { brightness: 40, kelvin: 3000 }, 500);
    h.queues.edit("light", "light", { color: "#ff0000" }, 2000);
    h.queues.edit("light", "light", { brightness: 70 });
    expect(h.queues.view("light").overlay).toMatchObject({
      brightness: 70,
      color: "#ff0000",
      mode: "color",
    });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(h.calls[0].submission).toEqual({
      type: "batch",
      settings: { brightness: 70, color: "#ff0000" },
      duration: 2000,
    });
  });

  it("holds edits made during an in-flight save and coalesces them into the next batch", async () => {
    const h = harness();
    h.queues.edit("fan", "fan", { speed: 30 });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    h.queues.edit("fan", "fan", { speed: 35 });
    await vi.advanceTimersByTimeAsync(IDLE_MS * 2);
    h.queues.edit("fan", "fan", { mode: "natural" });
    await vi.advanceTimersByTimeAsync(IDLE_MS * 2);
    h.queues.edit("fan", "fan", { speed: 40 });
    await vi.advanceTimersByTimeAsync(IDLE_MS * 2);
    // Still one request in flight; newer intent stays projected over it.
    expect(h.calls).toHaveLength(1);
    expect(h.queues.view("fan").overlay).toMatchObject({ speed: 40, mode: "natural" });
    h.calls[0].release();
    await h.flush();
    expect(h.calls.map((c) => c.submission)).toEqual([
      { type: "batch", settings: { speed: 30 } },
      { type: "batch", settings: { speed: 40, mode: "natural" } },
    ]);
  });

  it("keeps devices independent: a delayed device never delays another", async () => {
    const h = harness();
    h.queues.edit("fan", "fan", { speed: 80 });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    h.queues.edit("light", "light", { power: true });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(h.calls.map((c) => c.id)).toEqual(["fan", "light"]);
    h.calls[1].release();
    await h.flush();
    expect(h.settled.map((s) => s.id)).toEqual(["light"]);
    expect(h.queues.view("light").phase).toBe("idle");
    expect(h.queues.view("fan").phase).toBe("sending");
    h.calls[0].release(new Error("Device did not confirm"));
    await h.flush();
    expect(h.settled.map((s) => [s.id, s.outcome.ok])).toEqual([
      ["light", true],
      ["fan", false],
    ]);
  });

  it("does not let a failure discard newer intent, and never resends the failed batch", async () => {
    const h = harness();
    h.queues.edit("fan", "fan", { speed: 80, oscillating: false });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    h.queues.edit("fan", "fan", { speed: 20 });
    h.calls[0].release(new Error("lost"));
    await h.flush();
    expect(h.queues.view("fan").overlay).toEqual({ speed: 20 });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(h.calls.map((c) => c.submission)).toEqual([
      { type: "batch", settings: { speed: 80, oscillating: false } },
      { type: "batch", settings: { speed: 20 } },
    ]);
  });

  it("orders one-off commands after earlier adjustments without merging or dropping them", async () => {
    const h = harness();
    h.queues.edit("fan", "fan", { oscillating: false });
    h.queues.submit("fan", "fan", {
      type: "command",
      action: "direction",
      data: { direction: "left" },
      expected: {},
    });
    h.queues.submit("fan", "fan", {
      type: "command",
      action: "direction",
      data: { direction: "left" },
      expected: {},
    });
    expect(h.queues.view("fan").directionPending).toBe(true);
    await h.flush();
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].submission).toEqual({ type: "batch", settings: { oscillating: false } });
    h.calls[0].release();
    await h.flush();
    h.calls[1].release();
    await h.flush();
    expect(h.calls.map((c) => c.submission.type === "command" && c.submission.action)).toEqual([
      false,
      "direction",
      "direction",
    ]);
  });

  it("pauses for account-wide work, then sends what accumulated", async () => {
    const h = harness();
    h.queues.setPaused(true);
    h.queues.edit("fan", "fan", { speed: 60 });
    await vi.advanceTimersByTimeAsync(IDLE_MS * 3);
    expect(h.calls).toHaveLength(0);
    expect(h.queues.view("fan").phase).toBe("waiting");
    h.queues.setPaused(false);
    await h.flush();
    expect(h.calls).toHaveLength(1);
  });

  it("settled() submits pending edits immediately and resolves when every device is idle", async () => {
    const h = harness();
    h.queues.edit("light", "light", { brightness: 10 });
    let done = false;
    void h.queues.settled().then(() => (done = true));
    await h.flush();
    expect(h.calls).toHaveLength(1);
    expect(done).toBe(false);
    h.calls[0].release();
    await h.flush();
    expect(done).toBe(true);
  });

  it("does not queue duplicate reads for one device", async () => {
    const h = harness();
    h.queues.submit("fan", "fan", { type: "refresh" });
    h.queues.submit("fan", "fan", { type: "refresh" });
    await h.flush();
    expect(h.queues.view("fan")).toMatchObject({ phase: "checking", refreshPending: true });
    h.calls[0].release();
    await h.flush();
    expect(h.calls).toHaveLength(1);
  });
});
