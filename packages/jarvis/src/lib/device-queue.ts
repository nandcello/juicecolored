import {
  expectedSettingsState,
  mergeSettings,
  type DeviceSettings,
  type ExpectedState,
} from "../../command-state";
import type { Device } from "./domain";

/** Adjustments made within this idle window are submitted together. */
export const IDLE_MS = 600;

type Kind = Device["kind"];
export type Submission =
  | { type: "batch"; settings: DeviceSettings; duration?: number }
  | {
      type: "command";
      action: string;
      data: Record<string, unknown>;
      expected: ExpectedState;
      message?: string;
    }
  | { type: "refresh"; message?: string; automatic?: boolean };
export type Outcome = { ok: true; result: Record<string, unknown> } | { ok: false; error: unknown };
export type LaneView = {
  /** Unconfirmed intent projected over the last confirmed state, oldest first. */
  overlay: ExpectedState;
  phase: "idle" | "waiting" | "sending" | "checking";
  /** A direction nudge is queued or in flight; each nudge is a physical movement. */
  directionPending: boolean;
  refreshPending: boolean;
};
export type QueueHandlers = {
  send(id: string, submission: Submission): Promise<Record<string, unknown>>;
  /** Reconcile with confirmed state. The submission stays projected until this resolves. */
  settle(id: string, kind: Kind, submission: Submission, outcome: Outcome): Promise<void>;
};
type Lane = {
  kind: Kind;
  draft: DeviceSettings | null;
  duration?: number;
  timer?: ReturnType<typeof setTimeout>;
  due: boolean;
  queue: Submission[];
  inflight: Submission | null;
  running: boolean;
};

export const IDLE_LANE: LaneView = {
  overlay: {},
  phase: "idle",
  directionPending: false,
  refreshPending: false,
};

/**
 * Per-device command lanes, exposed as an external store for React. Each device
 * has its own idle timer and at most one request in flight; devices never wait
 * for each other. Mergeable settings are combined, latest value per setting,
 * into one submission. One-off commands keep their order relative to
 * adjustments and are never merged or dropped.
 */
export class DeviceQueues {
  private lanes = new Map<string, Lane>();
  private handlers: QueueHandlers | null = null;
  private paused = false;
  private waiters: (() => void)[] = [];
  private listeners = new Set<() => void>();
  private snapshot: Readonly<Record<string, LaneView>> = {};
  constructor(private idleMs = IDLE_MS) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };
  getSnapshot = () => this.snapshot;

  /** Attach request handlers; lanes only send while connected. */
  connect(handlers: QueueHandlers) {
    this.handlers = handlers;
    for (const [id, lane] of this.lanes) {
      if (lane.draft) this.arm(id, lane);
      void this.pump(id);
    }
  }
  disconnect() {
    this.handlers = null;
    for (const lane of this.lanes.values()) clearTimeout(lane.timer);
  }

  private lane(id: string, kind: Kind) {
    let lane = this.lanes.get(id);
    if (!lane) {
      lane = { kind, draft: null, due: false, queue: [], inflight: null, running: false };
      this.lanes.set(id, lane);
    }
    return lane;
  }

  private notify() {
    const next: Record<string, LaneView> = {};
    for (const [id, lane] of this.lanes) next[id] = this.project(lane);
    this.snapshot = next;
    for (const listener of this.listeners) listener();
    const waiters = this.waiters;
    this.waiters = [];
    for (const resolve of waiters) resolve();
  }

  private arm(id: string, lane: Lane) {
    clearTimeout(lane.timer);
    lane.timer = setTimeout(() => {
      lane.due = true;
      void this.pump(id);
    }, this.idleMs);
  }

  /** Record an absolute adjustment; it is submitted after the device has been idle. */
  edit(id: string, kind: Kind, settings: DeviceSettings, duration?: number) {
    const lane = this.lane(id, kind);
    lane.draft = mergeSettings(lane.draft ?? {}, settings);
    if (duration !== undefined) lane.duration = duration;
    lane.due = false;
    this.arm(id, lane);
    this.notify();
  }

  /** Queue a one-off command or read after everything already requested for the device. */
  submit(id: string, kind: Kind, submission: Submission) {
    const lane = this.lane(id, kind);
    if (
      submission.type === "refresh" &&
      [lane.inflight, ...lane.queue].some((s) => s?.type === "refresh")
    )
      return;
    this.seal(lane);
    lane.queue.push(submission);
    this.notify();
    void this.pump(id);
  }

  private seal(lane: Lane) {
    clearTimeout(lane.timer);
    if (!lane.draft) return;
    const tail = lane.queue.at(-1);
    // Merge into a batch that has not been sent yet instead of queuing another write.
    if (tail?.type === "batch") {
      tail.settings = mergeSettings(tail.settings, lane.draft);
      if (lane.duration !== undefined) tail.duration = lane.duration;
    } else
      lane.queue.push({
        type: "batch",
        settings: lane.draft,
        ...(lane.duration !== undefined ? { duration: lane.duration } : {}),
      });
    lane.draft = null;
    lane.due = false;
  }

  private async pump(id: string) {
    const lane = this.lanes.get(id);
    if (!lane || lane.running || !this.handlers) return;
    lane.running = true;
    try {
      while (this.handlers) {
        // Edits made during an in-flight save wait for it, then go as one batch.
        if (lane.draft && lane.due) this.seal(lane);
        if (this.paused || !lane.queue.length) break;
        const handlers = this.handlers;
        const submission = lane.queue.shift()!;
        lane.inflight = submission;
        this.notify();
        let outcome: Outcome;
        try {
          outcome = { ok: true, result: await handlers.send(id, submission) };
        } catch (error) {
          outcome = { ok: false, error };
        }
        try {
          await handlers.settle(id, lane.kind, submission, outcome);
        } finally {
          lane.inflight = null;
          this.notify();
        }
      }
    } finally {
      lane.running = false;
      this.notify();
    }
  }

  private project(lane: Lane): LaneView {
    const entries = [lane.inflight, ...lane.queue].filter((s): s is Submission => !!s);
    const overlay: Record<string, unknown> = {};
    for (const entry of entries) {
      if (entry.type === "batch")
        Object.assign(overlay, expectedSettingsState(lane.kind, entry.settings));
      if (entry.type === "command") Object.assign(overlay, entry.expected);
    }
    if (lane.draft) Object.assign(overlay, expectedSettingsState(lane.kind, lane.draft));
    const writing = (s: Submission | null | undefined) => !!s && s.type !== "refresh";
    return {
      overlay: overlay as ExpectedState,
      phase: writing(lane.inflight)
        ? "sending"
        : lane.draft || lane.queue.some(writing)
          ? "waiting"
          : lane.inflight
            ? "checking"
            : "idle",
      directionPending: entries.some((s) => s.type === "command" && s.action === "direction"),
      refreshPending: entries.some((s) => s.type === "refresh"),
    };
  }

  view(id: string): LaneView {
    return this.snapshot[id] ?? IDLE_LANE;
  }

  /** Whether the device has anything unconfirmed, queued or in flight. */
  busy(id: string) {
    return this.view(id).phase !== "idle";
  }

  /** Held lanes keep accepting edits but send nothing until resumed. */
  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (!paused) for (const id of this.lanes.keys()) void this.pump(id);
  }

  /** Submit every pending adjustment now and resolve once all devices are idle. */
  async settled() {
    for (const [id, lane] of this.lanes) {
      if (lane.draft) {
        this.seal(lane);
        this.notify();
        void this.pump(id);
      }
    }
    while (this.handlers && [...this.lanes.keys()].some((id) => this.busy(id)))
      await new Promise<void>((resolve) => this.waiters.push(resolve));
  }
}
