"use client";

import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronRight, Fan, Lightbulb, RefreshCw, Settings2 } from "lucide-react";
import type { Device } from "../lib/domain";
import c from "./dashboard.module.css";

export type Command = (action: string, data?: Record<string, unknown>) => Promise<void>;
export function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={c.switch}
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className={c.switchTrack}>
        <span />
      </span>
      <span>{checked ? "On" : "Off"}</span>
    </button>
  );
}

export function Range({
  label,
  value,
  min = 1,
  max = 100,
  step = 1,
  suffix = "%",
  low = "Low",
  high = "High",
  temperature = false,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  low?: string;
  high?: string;
  temperature?: boolean;
  disabled: boolean;
  onCommit: (value: number) => Promise<void>;
}) {
  const id = useId();
  const [draft, setDraft] = useState<number | null>(null);
  const committing = useRef(false);
  const current = draft ?? value;
  async function commit(next: number) {
    if (committing.current) return;
    if (next === value) {
      setDraft(null);
      return;
    }
    committing.current = true;
    try {
      await onCommit(next);
    } finally {
      setDraft(null);
      committing.current = false;
    }
  }
  return (
    <div className={c.rangeControl}>
      <div className={c.row}>
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>
          {current}
          {suffix}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        disabled={disabled}
        aria-valuetext={`${current}${suffix}`}
        className={temperature ? c.temperature : c.range}
        style={
          {
            "--fill": `${((current - min) / (max - min)) * 100}%`,
          } as CSSProperties
        }
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={(e) => void commit(Number(e.currentTarget.value))}
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
            void commit(Number(e.currentTarget.value));
        }}
        onBlur={(e) => {
          if (draft !== null) void commit(Number(e.currentTarget.value));
        }}
        onPointerCancel={() => setDraft(null)}
      />
      <div className={c.rangeLabels}>
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

export function DeviceCard({
  device,
  busy,
  onCommand,
  onRefresh,
  onSettings,
  children,
  extras,
}: {
  device: Device;
  busy: boolean;
  onCommand: Command;
  onRefresh: () => void;
  onSettings: () => void;
  children: ReactNode;
  extras: ReactNode;
}) {
  const titleId = useId();
  const ready = device.online && device.updatedAt > 0;
  const compact = ready && !device.state.power;
  const [expanded, setExpanded] = useState(false);
  const Icon = device.kind === "fan" ? Fan : Lightbulb;
  return (
    <section
      aria-labelledby={titleId}
      className={`${c.deviceCard} ${compact ? c.compactCard : ""}`}
    >
      <header className={c.deviceHeader}>
        <Icon size={30} strokeWidth={1.5} aria-hidden="true" />
        <div className={c.deviceName}>
          <h3 id={titleId}>{device.name}</h3>
          <p>{device.room}</p>
        </div>
        <Switch
          label={`${device.kind === "fan" ? "Fan" : "Light"} power`}
          checked={device.state.power}
          disabled={busy || !ready || !device.capabilities.includes("power")}
          onChange={(on) => void onCommand("power", { on })}
        />
      </header>
      {!ready && (
        <div className={c.deviceWarning}>
          <strong>{device.updatedAt ? "Offline · last known state" : "State not read yet"}</strong>
          <p>
            {device.error ??
              "Refresh to check this device. Controls are unavailable until it responds."}
          </p>
          <button className={c.textButton} disabled={busy} onClick={onRefresh}>
            <RefreshCw size={16} /> Refresh device
          </button>
        </div>
      )}
      {!compact && <div className={c.primaryControls}>{children}</div>}
      <details
        className={c.moreControls}
        open={expanded}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary>
          <span>More controls</span>
          <ChevronRight size={18} />
        </summary>
        <div className={c.extraControls}>
          {extras}
          <div className={c.extraActions}>
            <button className={c.button} disabled={busy} onClick={onRefresh}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button className={c.button} disabled={busy} onClick={onSettings}>
              <Settings2 size={16} /> Device settings
            </button>
          </div>
          <p className={c.muted}>
            {device.model}
            {device.updatedAt > 0 && (
              <>
                {" "}
                · Last checked{" "}
                <time dateTime={new Date(device.updatedAt).toISOString()}>
                  {new Date(device.updatedAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </>
            )}
          </p>
        </div>
      </details>
    </section>
  );
}
