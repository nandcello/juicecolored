"use client";

import { useEffect, useRef, useState } from "react";
import type { Device, LightDevice, Scene, Snapshot } from "../lib/domain";
import { request } from "../lib/client";
import { expectedCommandState, matchesCommandState } from "../../command-state";

export type View = "devices" | "scenes" | "activity" | "settings";
export type Dialog = "connect" | "save" | "device" | "disconnect" | "help" | null;
type QR = { key: string; image: string; expires: number };

export function useDashboard(initial: Snapshot) {
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState(initial.devices[0]?.id ?? "");
  const [view, setView] = useState<View>("devices");
  const [room, setRoom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [qr, setQR] = useState<QR | null>(null);
  const [region, setRegion] = useState("sg");
  const [stale, setStale] = useState(false);
  const [unverified, setUnverified] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState<{ id: string; label: string; optimistic?: Device } | null>(
    null,
  );
  const lastAttempt = useRef(new Map<string, number>());
  const working = useRef(false);
  const alive = useRef(true);
  const operationVersion = useRef(0);
  const backgroundMoving = state.devices.some((d) => d.kind === "fan" && !!d.direction?.motion);
  const qrVersion = useRef(0);
  const shownDevices = state.devices
    .filter((d) => !d.hidden)
    .map((d) => (pending?.optimistic?.id === d.id ? pending.optimistic : d))
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
    view === "devices" ? visible.map((d) => d.id) : device ? [device.id] : [],
  );

  function markUnverified(id: string, failed: boolean) {
    setUnverified((previous) => {
      const next = new Set(previous);
      if (failed) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  useEffect(() => {
    alive.current = true;
    let polling = false;
    let cancelled = false;
    async function poll() {
      if (working.current || document.hidden || polling) return;
      polling = true;
      const version = operationVersion.current;
      try {
        const next = await request<Snapshot>();
        if (
          !cancelled &&
          alive.current &&
          !working.current &&
          operationVersion.current === version
        ) {
          setState(next);
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
      alive.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [backgroundMoving]);

  useEffect(() => {
    let cancelled = false;
    const ids: string[] = JSON.parse(refreshIds);
    async function refreshDevices() {
      if (cancelled || working.current || document.hidden || backgroundMoving) return;
      // Read every visible device on entry, then at most once per 30 seconds.
      // Serialize physical reads with commands; never replay a write.
      for (const id of ids) {
        if (cancelled || working.current || document.hidden) return;
        if (Date.now() - (lastAttempt.current.get(id) ?? 0) < 30000) continue;
        working.current = true;
        operationVersion.current++;
        lastAttempt.current.set(id, Date.now());
        setBusy(true);
        setPending({ id, label: "Checking device…" });
        let failed = false;
        try {
          await request({ type: "refresh", id });
        } catch {
          failed = true;
        }
        // Failed reads also change the recorded availability. Fetch that result
        // instead of leaving a previously-online card on screen.
        try {
          const next = await request<Snapshot>();
          if (alive.current) {
            markUnverified(id, failed);
            setState(next);
            setStale(failed);
          }
        } catch {
          if (alive.current) {
            markUnverified(id, true);
            setStale(true);
          }
        } finally {
          lastAttempt.current.set(id, Date.now());
          working.current = false;
          if (alive.current) {
            setBusy(false);
            setPending(null);
          }
        }
      }
    }
    function resume() {
      if (document.hidden) return;
      // Coalesce visibility/focus events while still checking after app resume.
      for (const id of ids) {
        if (Date.now() - (lastAttempt.current.get(id) ?? 0) > 5000) lastAttempt.current.delete(id);
      }
      void refreshDevices();
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
  }, [refreshIds, backgroundMoving]);

  async function task(
    operation: Record<string, unknown>,
    message?: string,
    perform = () => request(operation),
  ) {
    if (
      working.current ||
      (backgroundMoving &&
        !["fanStop", "fanCheckEnd", "fanObserveEnd"].includes(String(operation.type)))
    ) {
      setNotice({
        text: "A request is in progress. Give it a moment, then try again.",
        error: false,
      });
      return;
    }
    working.current = true;
    operationVersion.current++;
    setBusy(true);
    setNotice(null);
    const target = state.devices.find((d) => d.id === operation.id);
    const expected =
      operation.type === "control" && target
        ? expectedCommandState(
            target.kind,
            String(operation.action),
            (operation.data ?? {}) as Record<string, unknown>,
          )
        : {};
    const predictsState = Object.keys(expected).length > 0;
    if (typeof operation.id === "string") {
      setPending({
        id: operation.id,
        label:
          operation.type === "refresh"
            ? "Checking device…"
            : "Applying… Waiting for device confirmation",
        optimistic:
          predictsState && target
            ? ({ ...target, state: { ...target.state, ...expected } } as Device)
            : undefined,
      });
      lastAttempt.current.set(operation.id, Date.now());
    }
    try {
      const result = await perform();
      if (operation.type === "logout") return result;
      const next = await request<Snapshot>();
      if (!alive.current) return;
      setState(next);
      setStale(false);
      if (
        typeof operation.id === "string" &&
        ["control", "refresh"].includes(String(operation.type))
      )
        markUnverified(operation.id, false);
      const observed = next.devices.find((d) => d.id === operation.id);
      const warning =
        result.warning ??
        (predictsState && (!observed?.online || !matchesCommandState(observed.state, expected))
          ? "The requested change was not confirmed. Showing the last reported state."
          : undefined);
      if (message || warning)
        setNotice({
          text: String(warning ?? message),
          error: !!warning,
        });
      return result;
    } catch (error) {
      if (
        alive.current &&
        typeof operation.id === "string" &&
        ["control", "refresh"].includes(String(operation.type))
      )
        markUnverified(operation.id, true);
      // A failed response can still have changed the device or its availability.
      // Recover the recorded state without ever repeating the operation.
      try {
        const next = await request<Snapshot>();
        if (alive.current) setState(next);
      } catch {
        if (alive.current) setStale(true);
      }
      if (alive.current)
        setNotice({
          text: error instanceof Error ? error.message : "Could not complete the request.",
          error: true,
        });
    } finally {
      working.current = false;
      if (typeof operation.id === "string") lastAttempt.current.set(operation.id, Date.now());
      if (alive.current) {
        setBusy(false);
        setPending(null);
      }
    }
  }
  async function command(id: string, action: string, data: Record<string, unknown> = {}) {
    await task({ type: "control", id, action, data });
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
    if (device?.kind === "light")
      void task(
        {
          type: "control",
          id: device.id,
          action: "scene",
          data: {
            mode: scene.mode,
            color: scene.color,
            brightness: scene.brightness,
            kelvin: scene.kelvin,
          },
        },
        `${scene.name} applied.`,
      );
  }
  return {
    state,
    device,
    lights,
    rooms,
    activeRoom,
    visible,
    shownDevices,
    busy: busy || backgroundMoving,
    notice,
    pending,
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
