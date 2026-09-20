"use client";
import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Fan, SlidersHorizontal, RefreshCw, ArrowLeft, ArrowRight } from "lucide-react";
import type { FanDevice } from "@/lib/domain";
import { ui } from "./ui";

export function FanControls({
  device,
  busy,
  onCommand,
  onSettings,
  onRefresh,
}: {
  device: FanDevice;
  busy: boolean;
  onCommand: (action: string, data?: Record<string, unknown>) => void;
  onSettings: () => void;
  onRefresh: () => void;
}) {
  const state = device.state;
  const [speed, setSpeed] = useState(state.speed);
  const [minutes, setMinutes] = useState(String(state.offInMinutes || 60));
  const ready = device.online && device.updatedAt > 0;
  const disabled = busy || !ready;
  const stopped = disabled || !state.power;
  return (
    <section {...stylex.props(s.panel)}>
      <div {...stylex.props(ui.row)}>
        <div>
          <p {...stylex.props(s.eyebrow)}>FAN CONTROLS</p>
          <h2 {...stylex.props(s.name)}>{device.name}</h2>
        </div>
        <button
          aria-label="Device settings"
          onClick={onSettings}
          {...stylex.props(ui.button, ui.ghost)}
        >
          <SlidersHorizontal size={19} />
        </button>
      </div>
      <div {...stylex.props(s.status)}>
        <Fan size={42} />
        <div>
          <strong>
            {ready
              ? state.power
                ? "A little room to breathe."
                : "Resting, for now."
              : "Let’s check in."}
          </strong>
          <p {...stylex.props(ui.muted)}>
            {ready
              ? `${state.speed}% · ${state.mode === "natural" ? "Natural wind" : "Straight wind"}`
              : (device.error ?? "Refresh to read this fan.")}
          </p>
        </div>
        <button
          disabled={busy}
          aria-label="Refresh fan state"
          onClick={onRefresh}
          {...stylex.props(ui.button, ui.ghost)}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <Switch
        label="Fan power"
        checked={ready && state.power}
        disabled={disabled}
        onChange={(on) => onCommand("power", { on })}
      />
      <div {...stylex.props(s.section)}>
        <label {...stylex.props(ui.label)}>
          Fan speed <strong>{speed}%</strong>
          <input
            aria-label="Fan speed"
            type="range"
            min={1}
            max={100}
            value={speed}
            disabled={stopped}
            onChange={(e) => setSpeed(Number(e.target.value))}
            onPointerUp={(e) => onCommand("speed", { speed: Number(e.currentTarget.value) })}
            onKeyUp={(e) => {
              if (
                [
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                  "PageUp",
                  "PageDown",
                ].includes(e.key)
              )
                onCommand("speed", { speed: Number(e.currentTarget.value) });
            }}
            {...stylex.props(s.range)}
          />
        </label>
        <label {...stylex.props(ui.label)}>
          Wind mode
          <select
            aria-label="Wind mode"
            value={state.mode}
            disabled={stopped}
            onChange={(e) => onCommand("fanMode", { mode: e.target.value })}
            {...stylex.props(ui.input)}
          >
            <option value="straight">Straight wind</option>
            <option value="natural">Natural wind</option>
          </select>
        </label>
      </div>
      <div {...stylex.props(s.section)}>
        <Switch
          label="Oscillation"
          checked={state.oscillating}
          disabled={stopped}
          onChange={(on) => onCommand("oscillation", { on })}
        />
        <label {...stylex.props(ui.label)}>
          Oscillation angle
          <select
            aria-label="Oscillation angle"
            value={state.angle}
            disabled={stopped}
            onChange={(e) => onCommand("angle", { angle: Number(e.target.value) })}
            {...stylex.props(ui.input)}
          >
            {[30, 60, 90, 120, 140].map((n) => (
              <option key={n} value={n}>
                {n}°
              </option>
            ))}
          </select>
        </label>
        <div {...stylex.props(s.actions)}>
          <button
            disabled={stopped}
            onClick={() => onCommand("direction", { direction: "left" })}
            {...stylex.props(ui.button)}
          >
            <ArrowLeft size={16} />
            Turn left
          </button>
          <button
            disabled={stopped}
            onClick={() => onCommand("direction", { direction: "right" })}
            {...stylex.props(ui.button)}
          >
            Turn right
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div {...stylex.props(s.section)}>
        <label {...stylex.props(ui.label)}>
          Turn off after (minutes)
          <input
            aria-label="Fan off timer"
            type="number"
            min={1}
            max={480}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            disabled={stopped}
            {...stylex.props(ui.input)}
          />
        </label>
        <p {...stylex.props(ui.muted)}>
          {ready && state.offInMinutes
            ? `${state.offInMinutes} minutes remaining`
            : "No off timer set"}
        </p>
        <div {...stylex.props(s.actions)}>
          <button
            disabled={
              stopped ||
              !Number.isInteger(Number(minutes)) ||
              Number(minutes) < 1 ||
              Number(minutes) > 480
            }
            onClick={() => onCommand("timer", { minutes: Number(minutes) })}
            {...stylex.props(ui.button)}
          >
            Set off timer
          </button>
          <button
            disabled={disabled || !state.offInMinutes}
            onClick={() => onCommand("cancelTimer")}
            {...stylex.props(ui.button, ui.ghost)}
          >
            Cancel timer
          </button>
        </div>
      </div>
      <details {...stylex.props(s.section)}>
        <summary {...stylex.props(s.more)}>More settings</summary>
        <div {...stylex.props(s.section)}>
          <Switch
            label="Indicator light"
            checked={state.indicator}
            disabled={disabled}
            onChange={(on) => onCommand("indicator", { on })}
          />
          <Switch
            label="Button sounds"
            checked={state.sound}
            disabled={disabled}
            onChange={(on) => onCommand("sound", { on })}
          />
          <Switch
            label="Child lock"
            checked={state.childLock}
            disabled={disabled}
            onChange={(on) => onCommand("childLock", { on })}
          />
        </div>
      </details>
    </section>
  );
}
function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div {...stylex.props(ui.row)}>
      <span>{label}</span>
      <button
        role="switch"
        aria-label={label}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        {...stylex.props(ui.button, checked && ui.primary)}
      >
        {checked ? "On" : "Off"}
      </button>
    </div>
  );
}
const s = stylex.create({
  panel: {
    padding: 28,
    backgroundColor: "#1b241b",
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#35432e",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    minWidth: 0,
  },
  name: { fontSize: 24, lineHeight: 1.2, margin: 0 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#b5c79c",
    marginBottom: 10,
  },
  status: { display: "flex", alignItems: "center", gap: 16, color: "#d8edaa" },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#35432e",
    paddingTop: 20,
  },
  range: { width: "100%", accentColor: "#d8edaa", height: 32 },
  actions: { display: "flex", flexWrap: "wrap", gap: 8 },
  more: { cursor: "pointer", color: "#bdcbb2" },
});
