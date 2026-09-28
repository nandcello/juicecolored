"use client";

import { useId, useState } from "react";
import type { LightDevice } from "../lib/domain";
import { DeviceCard, Range, type Command } from "./device-controls";
import c from "./dashboard.module.css";

export function LightControls({
  device,
  busy,
  onCommand,
  onSave,
  onSettings,
  onRefresh,
}: {
  device: LightDevice;
  busy: boolean;
  onCommand: Command;
  onSave: () => void;
  onSettings: () => void;
  onRefresh: () => void;
}) {
  const state = device.state;
  const colorId = useId();
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [transition, setTransition] = useState("500");
  const [minutes, setMinutes] = useState("30");
  const ready = device.online && device.updatedAt > 0;
  const unavailable = !ready || busy;
  const disabled = unavailable || !state.power;
  const color = customColor ?? state.color;
  const supports = (capability: LightDevice["capabilities"][number]) =>
    device.capabilities.includes(capability);
  const send: Command = (action, data = {}) =>
    onCommand(action, { duration: Number(transition), ...data });
  return (
    <DeviceCard
      device={device}
      busy={busy}
      onCommand={send}
      onRefresh={onRefresh}
      onSettings={onSettings}
      extras={
        <>
          <label className={c.field}>
            Transition
            <select value={transition} onChange={(e) => setTransition(e.target.value)}>
              <option value="30">Instant</option>
              <option value="500">Gentle · 0.5s</option>
              <option value="2000">Smooth · 2s</option>
              <option value="5000">Slow · 5s</option>
            </select>
          </label>
          {supports("scenes") && (
            <button className={c.button} disabled={disabled} onClick={onSave}>
              Save this light as a scene
            </button>
          )}
          {supports("effects") && (
            <div className={c.extraActions}>
              <button
                className={c.button}
                disabled={disabled}
                onClick={() =>
                  void send("flow", {
                    steps: [
                      {
                        duration: 2500,
                        mode: "white",
                        kelvin: 2700,
                        brightness: 15,
                      },
                      {
                        duration: 2500,
                        mode: "white",
                        kelvin: 2700,
                        brightness: 70,
                      },
                    ],
                    count: 0,
                    end: 0,
                  })
                }
              >
                Breathe
              </button>
              <button
                className={c.button}
                disabled={disabled}
                onClick={() =>
                  void send("flow", {
                    steps: [
                      {
                        duration: 120000,
                        mode: "white",
                        kelvin: 3500,
                        brightness: 40,
                      },
                      {
                        duration: 1200000,
                        mode: "white",
                        kelvin: 2700,
                        brightness: 1,
                      },
                    ],
                    count: 2,
                    end: 2,
                  })
                }
              >
                Sunset
              </button>
              <button
                className={c.button}
                disabled={disabled}
                onClick={() => void send("stopFlow")}
              >
                Stop effect
              </button>
            </div>
          )}
          {supports("timer") && (
            <>
              <label className={c.field}>
                Off timer duration
                <select
                  value={minutes}
                  disabled={unavailable}
                  onChange={(e) => setMinutes(e.target.value)}
                >
                  {[5, 15, 30, 60, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </select>
              </label>
              <p className={c.muted}>
                {state.offInMinutes > 0
                  ? `Last reported timer: ${state.offInMinutes} minutes`
                  : "No off timer set"}
              </p>
              <div className={c.extraActions}>
                <button
                  className={c.button}
                  disabled={unavailable}
                  onClick={() => void send("timer", { minutes: Number(minutes) })}
                >
                  Set off timer
                </button>
                <button
                  className={c.textButton}
                  disabled={unavailable || !state.offInMinutes}
                  onClick={() => void send("cancelTimer")}
                >
                  Cancel timer
                </button>
              </div>
              <p className={c.muted}>
                Effects and timers run on the bulb, even after you close Jarvis.
              </p>
            </>
          )}
          <button className={c.button} disabled={disabled} onClick={() => void send("default")}>
            Save power-on default
          </button>
        </>
      }
    >
      {supports("brightness") && (
        <Range
          label="Brightness"
          value={state.brightness}
          disabled={disabled}
          onCommit={(brightness) => send("brightness", { brightness })}
        />
      )}
      {(supports("temperature") || supports("color")) && (
        <div className={c.lightMode}>
          <span>Light</span>
          <div className={c.segments} role="group" aria-label="Light mode">
            {supports("temperature") && (
              <button
                disabled={disabled}
                aria-pressed={state.mode === "white"}
                onClick={() => void send("temperature", { kelvin: state.kelvin })}
              >
                White
              </button>
            )}
            {supports("color") && (
              <button
                disabled={disabled}
                aria-pressed={state.mode === "color"}
                onClick={() => void send("color", { color: state.color })}
              >
                Color
              </button>
            )}
          </div>
          {state.mode === "white" && supports("temperature") ? (
            <Range
              label="Color temperature"
              value={state.kelvin}
              min={1700}
              max={6500}
              step={100}
              suffix="K"
              low="Warm"
              high="Cool"
              temperature
              disabled={disabled}
              onCommit={(kelvin) => send("temperature", { kelvin })}
            />
          ) : (
            supports("color") && (
              <div className={c.colorControls}>
                <div className={c.swatches}>
                  {["#ff7340", "#edba77", "#c4deca", "#65b4ff", "#b871ff", "#ff72b6"].map(
                    (value) => (
                      <button
                        className={c.swatch}
                        key={value}
                        aria-label={`Set color ${value}`}
                        aria-pressed={state.color === value}
                        style={{ backgroundColor: value }}
                        disabled={disabled}
                        onClick={() => {
                          setCustomColor(null);
                          void send("color", { color: value });
                        }}
                      />
                    ),
                  )}
                </div>
                <div className={c.extraActions}>
                  <label htmlFor={colorId}>Custom color</label>
                  <input
                    id={colorId}
                    type="color"
                    value={color}
                    disabled={disabled}
                    onChange={(e) => setCustomColor(e.target.value)}
                  />
                  <button
                    className={c.button}
                    disabled={disabled}
                    onClick={async () => {
                      await send("color", { color });
                      setCustomColor(null);
                    }}
                  >
                    Apply color
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </DeviceCard>
  );
}
