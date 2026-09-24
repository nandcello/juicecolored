"use client";

import { useEffect, useRef, useState } from "react";
import type { LightDevice, Scene, Snapshot } from "@/lib/domain";
import { request } from "@/lib/client";
import { runFanMovement, type FanMove } from "@/lib/fan-direction";

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
  const working = useRef(false);
  const alive = useRef(true);
  const qrVersion = useRef(0);
  const shownDevices = state.devices.filter((d) => !d.hidden);
  const lights = shownDevices.filter((d): d is LightDevice => d.kind === "light");
  const selectable = view === "scenes" ? lights : shownDevices;
  const device = selectable.find((d) => d.id === selected) ?? selectable[0];
  const rooms = [...new Set(shownDevices.map((d) => d.room))];
  const activeRoom = room !== null && rooms.includes(room) ? room : null;
  const visible = shownDevices.filter((d) => activeRoom === null || d.room === activeRoom);
  const refreshIds = JSON.stringify(
    view === "devices" ? visible.map((d) => d.id) : device ? [device.id] : [],
  );

  useEffect(() => {
    alive.current = true;
    const timer = setInterval(async () => {
      if (working.current || document.hidden) return;
      try {
        const next = await request<Snapshot>();
        if (alive.current && !working.current) {
          setState(next);
          setStale(false);
        }
      } catch {
        if (alive.current) setStale(true);
      }
    }, 15000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ids: string[] = JSON.parse(refreshIds);
    let nextIndex = 0;
    // One physical read per minute, rotating through visible devices. Never fan
    // out reads or retry commands: Xiaomi serializes operations per account.
    const timer = setInterval(async () => {
      if (!ids.length || working.current || document.hidden) return;
      working.current = true;
      setBusy(true);
      const id = ids[nextIndex++ % ids.length];
      try {
        await request({ type: "refresh", id });
        const next = await request<Snapshot>();
        if (!cancelled && alive.current) {
          setState(next);
          setStale(false);
        }
      } catch {
        if (!cancelled && alive.current) setStale(true);
      } finally {
        working.current = false;
        if (alive.current) setBusy(false);
      }
    }, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refreshIds]);

  async function task(
    operation: Record<string, unknown>,
    message?: string,
    perform = () => request(operation),
  ) {
    if (working.current) {
      setNotice({
        text: "A request is in progress. Give it a moment, then try again.",
        error: false,
      });
      return;
    }
    working.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const result = await perform();
      if (operation.type === "logout") return result;
      const next = await request<Snapshot>();
      if (!alive.current) return;
      setState(next);
      setStale(false);
      if (message || result.warning)
        setNotice({
          text: String(result.warning ?? message),
          error: !!result.warning,
        });
      return result;
    } catch (error) {
      if (alive.current)
        setNotice({
          text: error instanceof Error ? error.message : "Could not complete the request.",
          error: true,
        });
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function command(id: string, action: string, data: Record<string, unknown> = {}) {
    await task({ type: "control", id, action, data });
  }
  async function moveFan(id: string, move: FanMove) {
    const operation = {
      type: "control",
      id,
      action: "direction",
      data: { direction: move.direction },
    };
    const result = await task(operation, undefined, async () => {
      // Keep the dashboard's operation lock for the entire sequence, including
      // motor settling time. The server still validates and leases each nudge.
      const checkReady = (snapshot: Snapshot) => {
        const fan = snapshot.devices.find((d) => d.id === id);
        if (
          fan?.kind !== "fan" ||
          !fan.online ||
          !fan.updatedAt ||
          !fan.state.power ||
          fan.state.oscillating ||
          fan.state.childLock
        )
          throw new Error(
            "Fan direction is unavailable. Turn off oscillation and child lock, then recalibrate.",
          );
      };
      checkReady(await request<Snapshot>());
      const completed = await runFanMovement(move, async () => {
        if (document.hidden)
          throw new Error("Fan movement stopped. Recalibrate before aiming again.");
        const response = await request(operation);
        if (response.warning) throw new Error(String(response.warning));
        const next = await request<Snapshot>();
        checkReady(next);
        if (alive.current) setState(next);
      });
      return { ok: completed };
    });
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
    busy,
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
    moveFan,
    openDevice,
    closeDialog,
    openConnect,
    startLogin,
    pollLogin,
    applyScene,
  };
}
export type DashboardController = ReturnType<typeof useDashboard>;
