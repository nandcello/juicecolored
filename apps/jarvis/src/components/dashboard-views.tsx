"use client";

import { Activity, Check, CircleHelp, EyeOff, LogOut, RefreshCw, Trash2, X } from "lucide-react";
import type { Scene } from "@/lib/domain";
import type { DashboardController } from "./use-dashboard";
import c from "./dashboard.module.css";

export function DashboardViews({
  controller,
  presets,
}: {
  controller: DashboardController;
  presets: Scene[];
}) {
  const {
    state,
    view,
    device,
    lights,
    busy,
    task,
    setSelected,
    setView,
    setDialog,
    openConnect,
    applyScene,
  } = controller;
  if (view === "scenes")
    return (
      <div className={c.viewStack}>
        <div className={c.sceneToolbar}>
          <label className={c.field}>
            Apply scenes to
            <select
              value={device?.id ?? ""}
              disabled={!lights.length}
              onChange={(e) => setSelected(e.target.value)}
            >
              {lights.length ? (
                lights.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.room}
                  </option>
                ))
              ) : (
                <option>No connected lights</option>
              )}
            </select>
          </label>
          <button
            className={c.button}
            disabled={
              device?.kind !== "light" ||
              !device.online ||
              !device.updatedAt ||
              !device.state.power ||
              busy
            }
            onClick={() => setDialog("save")}
          >
            Save current light
          </button>
        </div>
        <p className={c.muted}>
          {device
            ? `Apply a scene to ${device.name}. Scenes also turn the light on.`
            : "Connect a light to use scenes."}
        </p>
        <div className={c.sceneGrid}>
          {[...presets, ...state.scenes].map((scene) => (
            <button
              className={c.scene}
              key={scene.id}
              disabled={
                busy ||
                !device?.online ||
                !device.updatedAt ||
                !device.capabilities.includes("scenes")
              }
              onClick={() => applyScene(scene)}
            >
              <span className={c.sceneColor} style={{ backgroundColor: scene.color }} />
              <strong>{scene.name}</strong>
              <span>{scene.description}</span>
              <small>
                {scene.mode === "white" ? `${scene.kelvin}K` : "Color"} · {scene.brightness}%
                brightness
              </small>
            </button>
          ))}
        </div>
        {state.scenes.length > 0 && (
          <section className={c.panel}>
            <h2>Saved scenes</h2>
            {state.scenes.map((scene) => (
              <div className={c.listRow} key={scene.id}>
                <span>{scene.name}</span>
                <button
                  className={c.iconButton}
                  aria-label={`Delete ${scene.name}`}
                  disabled={busy}
                  onClick={() => void task({ type: "deleteScene", id: scene.id }, "Scene removed.")}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    );
  if (view === "activity")
    return (
      <section className={c.panel}>
        <h2>Recent activity</h2>
        {state.activity.length ? (
          state.activity.map((event) => (
            <div className={c.activityRow} key={event.id}>
              <span
                aria-label={event.status === "success" ? "Success" : "Error"}
                className={event.status === "error" ? c.errorIcon : c.successIcon}
              >
                {event.status === "success" ? <Check size={20} /> : <X size={20} />}
              </span>
              <div>
                <p>{event.label}</p>
                <small className={c.muted}>{event.deviceName}</small>
              </div>
              <time className={c.muted} dateTime={new Date(event.createdAt).toISOString()}>
                {new Date(event.createdAt).toLocaleString("en-PH", {
                  timeZone: "Asia/Manila",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </div>
          ))
        ) : (
          <div className={c.empty}>
            <Activity size={30} />
            <h3>No activity yet</h3>
            <p>Your confirmed device changes will appear here.</p>
          </div>
        )}
        <p className={c.muted}>Latest 40 events · Philippine time</p>
      </section>
    );
  return (
    <div className={c.settingsGrid}>
      <section className={c.panel}>
        <div className={c.row}>
          <h2>Xiaomi Home</h2>
          <span className={c.muted}>{state.connected ? "Connected" : "Not connected"}</span>
        </div>
        <p className={c.muted}>
          Connect your Yeelight lights and Mi Smart Standing Fan 2 through Xiaomi Home.
        </p>
        <div className={c.extraActions}>
          <button className={c.primaryButton} disabled={busy} onClick={openConnect}>
            {state.connected ? "Reconnect account" : "Connect account"}
          </button>
          {state.connected && (
            <button
              className={c.textButton}
              disabled={busy}
              onClick={() => setDialog("disconnect")}
            >
              Disconnect
            </button>
          )}
        </div>
        <button
          className={c.button}
          disabled={busy || !state.connected}
          onClick={() => void task({ type: "discover" }, "Device search complete.")}
        >
          <RefreshCw size={17} /> Find devices
        </button>
        <p className={c.muted}>
          Region: {state.region === "sg" ? "Singapore / Philippines" : state.region.toUpperCase()}
        </p>
      </section>
      <section className={c.panel}>
        <h2>
          <EyeOff size={21} /> Hidden devices
        </h2>
        <p className={c.muted}>
          Hidden devices stay connected. Restore them to put their controls back on Home.
        </p>
        {state.devices
          .filter((d) => d.hidden)
          .map((d) => (
            <div className={c.listRow} key={d.id}>
              <span>
                {d.name}
                <small className={c.blockMuted}>{d.room}</small>
              </span>
              <button
                className={c.button}
                aria-label={`Restore ${d.name}`}
                disabled={busy}
                onClick={() =>
                  void task({ type: "visibility", id: d.id, hidden: false }, "Device restored.")
                }
              >
                Restore
              </button>
            </div>
          ))}
        {!state.devices.some((d) => d.hidden) && <p className={c.muted}>No hidden devices.</p>}
      </section>
      <section className={c.panel}>
        <h2>Jarvis</h2>
        <button className={c.textButton} onClick={() => setView("activity")}>
          <Activity size={20} />
          Activity
        </button>
        <button className={c.textButton} onClick={() => setDialog("help")}>
          <CircleHelp size={20} />
          Help
        </button>
        <button
          className={c.textButton}
          disabled={busy}
          onClick={async () => {
            const result = await task({ type: "logout" });
            if (result) window.location.reload();
          }}
        >
          <LogOut size={20} />
          Sign out of Jarvis
        </button>
      </section>
    </div>
  );
}
