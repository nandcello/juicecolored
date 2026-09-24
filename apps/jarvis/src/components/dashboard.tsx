"use client";

import Link from "next/link";

import { Activity, CircleHelp, House, Lightbulb, Plus, Settings2, X } from "lucide-react";
import type { Scene, Snapshot } from "@/lib/domain";
import { FanControls } from "./fan-controls";
import { LightControls } from "./light-controls";
import { DashboardDialogs } from "./dashboard-dialogs";
import { DashboardViews } from "./dashboard-views";
import { useDashboard, type View } from "./use-dashboard";
import c from "./dashboard.module.css";

// Approved reference: direct, room-grouped appliance controls on light surfaces.
// Desktop pairs devices; mobile preserves their order in one column. Every power
// switch stays exposed; occasional controls are disclosed inside each device.
export function Dashboard({ initial, presets }: { initial: Snapshot; presets: Scene[] }) {
  const controller = useDashboard(initial);
  const {
    state,
    view,
    setView,
    rooms,
    activeRoom,
    setRoom,
    visible,
    shownDevices,
    busy,
    notice,
    setNotice,
    stale,
    task,
    command,
    openDevice,
    openConnect,
    setDialog,
  } = controller;
  const navigation = [
    { view: "devices", label: "Home", Icon: House },
    { view: "scenes", label: "Scenes", Icon: Lightbulb },
    { view: "settings", label: "Settings", Icon: Settings2 },
  ] as const;
  function navigate(next: View) {
    setView(next);
    window.scrollTo({ top: 0 });
  }
  return (
    <div className={c.app}>
      <a href="#main" className={c.skip}>
        Skip to controls
      </a>
      <aside className={c.sidebar}>
        <Link className={c.brand} href="/" aria-label="Jarvis home">
          jarvis
        </Link>
        <nav className={c.desktopNavigation} aria-label="Main navigation">
          {navigation.slice(0, 2).map(({ view: target, label, Icon }) => (
            <button
              key={target}
              aria-current={view === target ? "page" : undefined}
              onClick={() => navigate(target)}
            >
              <Icon size={22} strokeWidth={1.7} />
              {label}
            </button>
          ))}
        </nav>
        <nav className={c.secondaryNavigation} aria-label="Other pages">
          <button
            aria-current={view === "activity" ? "page" : undefined}
            onClick={() => navigate("activity")}
          >
            <Activity size={21} />
            Activity
          </button>
          <button
            aria-current={view === "settings" ? "page" : undefined}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={21} />
            Settings
          </button>
          <button onClick={() => setDialog("help")}>
            <CircleHelp size={21} />
            Help
          </button>
        </nav>
      </aside>
      <header className={c.mobileHeader}>
        <Link href="/" className={c.brand}>
          jarvis
        </Link>
        <button className={c.textButton} onClick={openConnect}>
          <Plus size={22} />
          Add
        </button>
      </header>
      <main id="main" className={c.main}>
        <header className={c.pageHeading}>
          <div>
            <h1>
              {view === "devices"
                ? "My home"
                : view === "scenes"
                  ? "Scenes"
                  : view === "activity"
                    ? "Activity"
                    : "Settings"}
            </h1>
            {view === "devices" && <p>Devices</p>}
          </div>
          <button className={`${c.textButton} ${c.desktopAdd}`} onClick={openConnect}>
            <Plus size={22} />
            Add device
          </button>
        </header>
        {stale && (
          <div className={c.warning} role="status">
            Connection interrupted. Showing the last known state. Open More controls → Refresh to
            check a device.
          </div>
        )}
        {notice && (
          <div
            className={notice.error ? c.warning : c.notice}
            role={notice.error ? "alert" : "status"}
          >
            <span>{notice.text}</span>
            <button
              className={c.iconButton}
              aria-label="Dismiss notification"
              onClick={() => setNotice(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <span role="status" className={c.srOnly}>
          {busy ? "Updating devices…" : ""}
        </span>
        {view === "devices" ? (
          <>
            {rooms.length > 0 && (
              <nav className={c.roomTabs} aria-label="Filter by room">
                <button aria-pressed={activeRoom === null} onClick={() => setRoom(null)}>
                  All rooms
                </button>
                {rooms.map((r) => (
                  <button key={r} aria-pressed={activeRoom === r} onClick={() => setRoom(r)}>
                    {r}
                  </button>
                ))}
              </nav>
            )}
            {shownDevices.length ? (
              <div className={c.rooms}>
                {rooms
                  .filter((r) => activeRoom === null || r === activeRoom)
                  .map((r) => (
                    <section key={r} className={c.roomSection} aria-label={r}>
                      <h2>{r}</h2>
                      <div className={c.deviceGrid}>
                        {visible
                          .filter((d) => d.room === r)
                          .map((d) => {
                            const shared = {
                              busy,
                              onCommand: (action: string, data?: Record<string, unknown>) =>
                                command(d.id, action, data),
                              onSettings: () => openDevice(d.id, "device"),
                              onRefresh: () =>
                                void task({ type: "refresh", id: d.id }, `${d.name} refreshed.`),
                            };
                            return d.kind === "fan" ? (
                              <FanControls
                                key={d.id}
                                device={d}
                                {...shared}
                                onMove={(move) => controller.moveFan(d.id, move)}
                              />
                            ) : (
                              <LightControls
                                key={d.id}
                                device={d}
                                {...shared}
                                onSave={() => openDevice(d.id, "save")}
                              />
                            );
                          })}
                      </div>
                    </section>
                  ))}
              </div>
            ) : (
              <section className={c.empty}>
                <Lightbulb size={32} strokeWidth={1.5} />
                <h2>
                  {state.devices.some((d) => d.hidden)
                    ? "Your devices are hidden"
                    : "Bring your devices together"}
                </h2>
                <p>Connect your Yeelight lights and standing fan through Xiaomi Home.</p>
                <div className={c.extraActions}>
                  <button
                    className={c.primaryButton}
                    disabled={busy}
                    onClick={() =>
                      state.connected
                        ? void task({ type: "discover" }, "Device search complete.")
                        : openConnect()
                    }
                  >
                    {state.connected ? "Find my devices" : "Connect Xiaomi Home"}
                  </button>
                  {state.devices.some((d) => d.hidden) && (
                    <button className={c.button} onClick={() => navigate("settings")}>
                      Manage hidden devices
                    </button>
                  )}
                </div>
              </section>
            )}
          </>
        ) : (
          <DashboardViews controller={controller} presets={presets} />
        )}
      </main>
      <nav className={c.mobileNavigation} aria-label="Main navigation">
        {navigation.map(({ view: target, label, Icon }) => (
          <button
            key={target}
            aria-current={view === target ? "page" : undefined}
            onClick={() => navigate(target)}
          >
            <Icon size={22} strokeWidth={1.7} />
            {label}
          </button>
        ))}
      </nav>
      <DashboardDialogs controller={controller} />
    </div>
  );
}
