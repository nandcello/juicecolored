"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Device, LightDevice, Scene, Snapshot } from "../lib/domain";
import { request } from "../lib/client";
import {
  DeviceQueues,
  IDLE_LANE,
  type QueueHandlers,
  type Outcome,
  type Submission,
} from "../lib/device-queue";
import {
  actionSettings,
  expectedCommandState,
  expectedSettingsState,
  matchesCommandState,
} from "../../command-state";

export type View = "devices" | "scenes" | "activity" | "settings";
export type Dialog = "connect" | "save" | "device" | "disconnect" | "help" | null;
export type Feedback = { text: string; error: boolean };
export type DeviceStatus = {
  label?: string;
  optimistic: boolean;
  /** Changes are queued or being confirmed; the controls stay editable. */
  saving: boolean;
  directionPending: boolean;
  refreshPending: boolean;
  feedback?: Feedback;
};
type QR = { key: string; image: string; expires: number };
// These can run while background fan movement owns the account lease.
const DURING_MOTION = ["fanStop", "fanCheckEnd", "fanObserveEnd"];
const UNCONFIRMED = "The requested change was not confirmed. Showing the last reported state.";

export function useDashboard(initial: Snapshot) {
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState(initial.devices[0]?.id ?? "");
  const [view, setView] = useState<View>("devices");
  const [room, setRoom] = useState<string | null>(null);
  // Account-wide work only (sign-in, discovery, settings, fan movement). Device
  // commands never set this, so one device never puts the app in a loading state.
  const [accountTask, setAccountTask] = useState<string | null>(null);
  const [notice, setNotice] = useState<Feedback | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [dialog, setDialog] = useState<Dialog>(null);
  const [qr, setQR] = useState<QR | null>(null);
  const [region, setRegion] = useState(initial.region);
  const [stale, setStale] = useState(false);
  const [unverified, setUnverified] = useState<Set<string>>(() => new Set());
  const lastAttempt = useRef(new Map<string, number>());
  const accountWorking = useRef(false);
  const alive = useRef(true);
  const accountVersion = useRef(0);
  // Snapshots are numbered when requested. A device ignores any snapshot that
  // was requested before its latest command or read settled, so a stale
  // response can never overwrite a newer confirmation.
  const snapshotSeq = useRef(0);
  const freshFrom = useRef(new Map<string, number>());
  const [queues] = useState(() => new DeviceQueues());
  const devicesRef = useRef(initial.devices);
  useEffect(() => {
    devicesRef.current = state.devices;
  }, [state.devices]);
  const lanes = useSyncExternalStore(queues.subscribe, queues.getSnapshot, queues.getSnapshot);
  const backgroundMoving = state.devices.some((d) => d.kind === "fan" && !!d.direction?.motion);
  const qrVersion = useRef(0);

  function markUnverified(id: string, failed: boolean) {
    setUnverified((previous) => {
      if (previous.has(id) === failed) return previous;
      const next = new Set(previous);
      if (failed) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function setDeviceFeedback(id: string, value: Feedback | null) {
    setFeedback((previous) => {
      if (!value && !previous[id]) return previous;
      const next = { ...previous };
      if (value) next[id] = value;
      else delete next[id];
      return next;
    });
  }
  async function loadSnapshot() {
    const seq = ++snapshotSeq.current;
    const next = await request<Snapshot>();
    return { seq, next };
  }
  function applySnapshot(seq: number, next: Snapshot) {
    setState((previous) => ({
      ...next,
      devices: next.devices.map((d) =>
        seq < (freshFrom.current.get(d.id) ?? 0)
          ? (previous.devices.find((p) => p.id === d.id) ?? d)
          : d,
      ),
    }));
  }

  async function sendSubmission(id: string, submission: Submission) {
    lastAttempt.current.set(id, Date.now());
    if (submission.type === "refresh") return request({ type: "refresh", id });
    if (submission.type === "command")
      return request({
        type: "control",
        id,
        action: submission.action,
        data: submission.data,
      });
    return request({
      type: "apply",
      id,
      settings: submission.settings,
      ...(submission.duration !== undefined ? { duration: submission.duration } : {}),
    });
  }
  async function settleSubmission(
    id: string,
    kind: Device["kind"],
    submission: Submission,
    outcome: Outcome,
  ) {
    lastAttempt.current.set(id, Date.now());
    // Anything requested before this point predates the outcome for this device.
    freshFrom.current.set(id, snapshotSeq.current + 1);
    const expected =
      submission.type === "refresh"
        ? {}
        : submission.type === "batch"
          ? expectedSettingsState(kind, submission.settings)
          : submission.expected;
    let observed: Device | undefined;
    let snapshotError: unknown;
    try {
      // A failed response can still have changed the device or its availability.
      // Recover the recorded state without ever repeating the operation.
      const { seq, next } = await loadSnapshot();
      if (!alive.current) return;
      applySnapshot(seq, next);
      observed = next.devices.find((d) => d.id === id);
    } catch (error) {
      snapshotError = error;
    }
    if (!alive.current) return;
    const quiet = submission.type === "refresh" && submission.automatic;
    if (!outcome.ok) {
      markUnverified(id, true);
      if (snapshotError) setStale(true);
      else if (quiet) setStale(true);
      if (!quiet)
        setDeviceFeedback(id, {
          text:
            outcome.error instanceof Error
              ? outcome.error.message
              : "Could not complete the request.",
          error: true,
        });
      return;
    }
    if (snapshotError) {
      markUnverified(id, true);
      setStale(true);
      if (!quiet)
        setDeviceFeedback(id, {
          text:
            snapshotError instanceof Error
              ? snapshotError.message
              : "Could not confirm the device state.",
          error: true,
        });
      return;
    }
    markUnverified(id, false);
    setStale(false);
    const predicted = Object.keys(expected).length > 0;
    const warning =
      (outcome.result.warning as string | undefined) ??
      (predicted && (!observed?.online || !matchesCommandState(observed.state, expected))
        ? UNCONFIRMED
        : undefined);
    if (warning) setDeviceFeedback(id, { text: warning, error: true });
    else if (submission.type !== "refresh" || !submission.automatic)
      setDeviceFeedback(
        id,
        submission.type !== "batch" && submission.message
          ? { text: submission.message, error: false }
          : null,
      );
  }
  // The latest handlers, refreshed after every render; they only use refs and setters.
  const handlers = useRef<QueueHandlers | null>(null);
  useEffect(() => {
    handlers.current = { send: sendSubmission, settle: settleSubmission };
  });
  useEffect(() => {
    alive.current = true;
    queues.connect({
      send: (...args) => handlers.current!.send(...args),
      settle: (...args) => handlers.current!.settle(...args),
    });
    return () => {
      alive.current = false;
      queues.disconnect();
    };
  }, [queues]);

  // Background fan movement owns the account lease; device lanes wait for it.
  useEffect(() => {
    queues.setPaused(backgroundMoving || accountWorking.current);
  }, [backgroundMoving, queues]);

  function deviceStatus(id: string): DeviceStatus {
    const lane = lanes[id] ?? IDLE_LANE;
    return {
      label:
        lane.phase === "sending"
          ? "Applying… Waiting for device confirmation"
          : lane.phase === "waiting"
            ? "Saving changes…"
            : lane.phase === "checking"
              ? "Checking device…"
              : undefined,
      optimistic: Object.keys(lane.overlay).length > 0,
      saving: lane.phase === "sending" || lane.phase === "waiting",
      directionPending: lane.directionPending,
      refreshPending: lane.refreshPending,
      feedback: feedback[id],
    };
  }

  const shownDevices = state.devices
    .filter((d) => !d.hidden)
    .map((d) => {
      const overlay = (lanes[d.id] ?? IDLE_LANE).overlay;
      return Object.keys(overlay).length
        ? ({ ...d, state: { ...d.state, ...overlay } } as Device)
        : d;
    })
    .map((d) =>
      unverified.has(d.id)
        ? {
            ...d,
            online: false,
            error: d.error ?? "Unable to confirm the current state. Check again.",
          }
        : d,
    );
  const lights = shownDevices.filter((d): d is LightDevice => d.kind === "light");
  const selectable = view === "scenes" ? lights : shownDevices;
  const device = selectable.find((d) => d.id === selected) ?? selectable[0];
  const rooms = [...new Set(shownDevices.map((d) => d.room))];
  const activeRoom = room !== null && rooms.includes(room) ? room : null;
  const visible = shownDevices.filter((d) => activeRoom === null || d.room === activeRoom);
  const refreshIds = JSON.stringify(
    (view === "devices" ? visible : device ? [device] : [])
      .filter((d) => !state.requiresReconnect || d.transport === "local")
      .map((d) => d.id),
  );

  useEffect(() => {
    let polling = false;
    let cancelled = false;
    async function poll() {
      if (accountWorking.current || document.hidden || polling) return;
      polling = true;
      const version = accountVersion.current;
      try {
        const { seq, next } = await loadSnapshot();
        if (
          !cancelled &&
          alive.current &&
          !accountWorking.current &&
          accountVersion.current === version
        ) {
          applySnapshot(seq, next);
          setStale(false);
        }
      } catch {
        if (!cancelled && alive.current) setStale(true);
      } finally {
        polling = false;
      }
    }
    const timer = setInterval(poll, backgroundMoving ? 1500 : 15000);
    document.addEventListener("visibilitychange", poll);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [backgroundMoving]);

  useEffect(() => {
    let cancelled = false;
    const ids: string[] = JSON.parse(refreshIds);
    function refreshDevices() {
      if (cancelled || accountWorking.current || document.hidden || backgroundMoving) return;
      // Read every visible device on entry, then at most once per 30 seconds.
      // Each device reads in its own lane, after its own commands; never replay a write.
      for (const id of ids) {
        if (queues.busy(id)) continue;
        if (Date.now() - (lastAttempt.current.get(id) ?? 0) < 30000) continue;
        lastAttempt.current.set(id, Date.now());
        const kind = devicesRef.current.find((d) => d.id === id)?.kind;
        if (kind) queues.submit(id, kind, { type: "refresh", automatic: true });
      }
    }
    function resume() {
      if (document.hidden) return;
      // Coalesce visibility/focus events while still checking after app resume.
      for (const id of ids) {
        if (Date.now() - (lastAttempt.current.get(id) ?? 0) > 5000) lastAttempt.current.delete(id);
      }
      refreshDevices();
    }
    // Defer startup so Strict Mode's discarded effect cannot issue a read.
    const startup = setTimeout(refreshDevices, 0);
    const timer = setInterval(refreshDevices, 5000);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    return () => {
      cancelled = true;
      clearTimeout(startup);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, [refreshIds, backgroundMoving, queues]);

  /** Account-wide work: waits for in-flight device changes, then holds device lanes. */
  async function task(
    operation: Record<string, unknown>,
    message?: string,
    perform = () => request(operation),
  ) {
    const type = String(operation.type);
    if (accountWorking.current || (backgroundMoving && !DURING_MOTION.includes(type))) {
      setNotice({
        text: "A request is in progress. Give it a moment, then try again.",
        error: false,
      });
      return;
    }
    accountWorking.current = true;
    accountVersion.current++;
    setAccountTask(type);
    setNotice(null);
    try {
      // Pending device changes go first, so account work sees their confirmed result.
      if (!backgroundMoving) await queues.settled();
      queues.setPaused(true);
      const result = await perform();
      if (type === "logout") return result;
      const { seq, next } = await loadSnapshot();
      if (!alive.current) return;
      applySnapshot(seq, next);
      setStale(false);
      if (message || result.warning)
        setNotice({
          text: String(result.warning ?? message),
          error: !!result.warning,
        });
      return result;
    } catch (error) {
      try {
        const { seq, next } = await loadSnapshot();
        if (alive.current) applySnapshot(seq, next);
      } catch {
        if (alive.current) setStale(true);
      }
      if (alive.current)
        setNotice({
          text: error instanceof Error ? error.message : "Could not complete the request.",
          error: true,
        });
    } finally {
      accountWorking.current = false;
      if (alive.current) {
        setAccountTask(null);
        queues.setPaused(backgroundMoving);
      }
    }
  }
  /** Device adjustments: reflected immediately, combined per device, never blocking others. */
  async function command(id: string, action: string, data: Record<string, unknown> = {}) {
    const target = state.devices.find((d) => d.id === id);
    if (!target) return;
    const { duration, ...values } = data;
    const settings = actionSettings(target.kind, action, values);
    if (settings)
      queues.edit(id, target.kind, settings, typeof duration === "number" ? duration : undefined);
    else
      queues.submit(id, target.kind, {
        type: "command",
        action,
        data,
        expected: expectedCommandState(target.kind, action, data),
      });
  }
  function refreshDevice(id: string, message?: string) {
    const target = state.devices.find((d) => d.id === id);
    if (!target) return;
    setDeviceFeedback(id, null);
    queues.submit(id, target.kind, { type: "refresh", ...(message ? { message } : {}) });
  }
  async function fanTask(operation: Record<string, unknown>) {
    const result = await task(operation);
    return result?.ok === true;
  }
  function openDevice(id: string, nextDialog: "device" | "save") {
    setSelected(id);
    setDialog(nextDialog);
  }
  function closeDialog() {
    qrVersion.current++;
    setQR(null);
    setDialog(null);
  }
  function openConnect() {
    setQR(null);
    setRegion(state.region);
    setDialog("connect");
  }
  async function startLogin() {
    const version = ++qrVersion.current;
    setQR(null);
    const result = await task({ type: "startLogin", region });
    if (result && version === qrVersion.current) setQR(result as QR);
  }
  async function pollLogin() {
    if (!qr) return;
    const result = await task({ type: "pollLogin", key: qr.key });
    if (result?.connected) {
      closeDialog();
      setNotice({
        text: String(result.warning ?? "Xiaomi Home is connected."),
        error: !!result.warning,
      });
    } else if (result?.pending)
      setNotice({
        text: "Waiting for approval. Scan the code in Xiaomi Home, then check again.",
        error: false,
      });
  }
  function applyScene(scene: Scene) {
    if (device?.kind !== "light") return;
    const data = {
      mode: scene.mode,
      color: scene.color,
      brightness: scene.brightness,
      kelvin: scene.kelvin,
    };
    queues.submit(device.id, "light", {
      type: "command",
      action: "scene",
      data,
      expected: expectedCommandState("light", "scene", data),
      message: `${scene.name} applied.`,
    });
  }
  const busy = accountTask !== null || backgroundMoving;
  return {
    state,
    device,
    lights,
    rooms,
    activeRoom,
    visible,
    shownDevices,
    /** Account-wide work or background fan movement. */
    busy,
    accountBusy: accountTask !== null,
    /** Device controls are held only by fan movement, the direction/calibration safeguard. */
    deviceBlocked: backgroundMoving || (accountTask?.startsWith("fan") ?? false),
    deviceStatus,
    dismissFeedback: (id: string) => setDeviceFeedback(id, null),
    notice,
    dialog,
    qr,
    region,
    stale,
    view,
    setView,
    setRoom,
    setSelected,
    setNotice,
    setDialog,
    setRegion,
    task,
    command,
    refreshDevice,
    fanTask,
    openDevice,
    closeDialog,
    openConnect,
    startLogin,
    pollLogin,
    applyScene,
  };
}
export type DashboardController = ReturnType<typeof useDashboard>;
