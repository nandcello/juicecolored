"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, MoveHorizontal } from "lucide-react";
import type { FanDevice } from "../lib/domain";
import type { MoveFan } from "../lib/fan-direction";
import { FanDirection, type FanDirectionActions } from "./fan-direction";
import { DeviceCard, Range, Switch, type Command } from "./device-controls";
import c from "./dashboard.module.css";

export function FanControls({
  device,
  busy,
  onCommand,
  onSettings,
  onRefresh,
  onMove,
  directionActions,
}: {
  device: FanDevice;
  busy: boolean;
  onCommand: Command;
  onSettings: () => void;
  onRefresh: () => void;
  onMove: MoveFan;
  directionActions: FanDirectionActions;
}) {
  const state = device.state;
  const [minutes, setMinutes] = useState(String(state.offInMinutes || 60));
  const [directionVersion, setDirectionVersion] = useState(0);
  const disabled = busy || !device.online || device.updatedAt <= 0;
  const stopped = disabled || !state.power;
  const supports = (capability: FanDevice["capabilities"][number]) =>
    device.capabilities.includes(capability);
  return (
    <DeviceCard
      device={device}
      busy={busy}
      onCommand={onCommand}
      onRefresh={onRefresh}
      onSettings={onSettings}
      extras={
        <>
          {supports("oscillation") && (
            <>
              <label className={c.field}>
                Oscillation angle
                <select
                  value={state.angle}
                  disabled={stopped}
                  onChange={(e) => void onCommand("angle", { angle: Number(e.target.value) })}
                >
                  {[30, 60, 90, 120, 140].map((n) => (
                    <option key={n} value={n}>
                      {n}°
                    </option>
                  ))}
                </select>
              </label>
              <div className={c.extraActions}>
                <button
                  className={c.button}
                  disabled={stopped}
                  onClick={() => {
                    setDirectionVersion((v) => v + 1);
                    void onCommand("direction", { direction: "left" });
                  }}
                >
                  <ArrowLeft size={16} /> Turn left
                </button>
                <button
                  className={c.button}
                  disabled={stopped}
                  onClick={() => {
                    setDirectionVersion((v) => v + 1);
                    void onCommand("direction", { direction: "right" });
                  }}
                >
                  Turn right <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {supports("timer") && (
            <>
              <label className={c.field}>
                Turn off after (minutes)
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={minutes}
                  disabled={stopped}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </label>
              <p className={c.muted}>
                {state.offInMinutes
                  ? `${state.offInMinutes} minutes remaining`
                  : "No off timer set"}
              </p>
              <div className={c.extraActions}>
                <button
                  className={c.button}
                  disabled={
                    stopped ||
                    !Number.isInteger(Number(minutes)) ||
                    Number(minutes) < 1 ||
                    Number(minutes) > 480
                  }
                  onClick={() => void onCommand("timer", { minutes: Number(minutes) })}
                >
                  Set off timer
                </button>
                <button
                  className={c.textButton}
                  disabled={disabled || !state.offInMinutes}
                  onClick={() => void onCommand("cancelTimer")}
                >
                  Cancel timer
                </button>
              </div>
            </>
          )}
          {(
            [
              ["Indicator light", "indicator"],
              ["Button sounds", "sound"],
              ["Child lock", "childLock"],
            ] as const
          ).map(([label, action]) => (
            <div className={c.row} key={action}>
              <span>{label}</span>
              <Switch
                label={label}
                checked={state[action]}
                disabled={disabled}
                onChange={(on) => void onCommand(action, { on })}
              />
            </div>
          ))}
        </>
      }
    >
      {supports("speed") && (
        <Range
          label="Fan speed"
          value={state.speed}
          disabled={stopped}
          onCommit={(speed) => onCommand("speed", { speed })}
        />
      )}
      {supports("oscillation") && (
        <div className={c.oscillation}>
          <MoveHorizontal size={24} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <span>Oscillate</span>
            <p>Turn side to side</p>
          </div>
          <Switch
            label="Oscillate"
            checked={state.oscillating}
            disabled={stopped}
            onChange={(on) => void onCommand("oscillation", { on })}
          />
        </div>
      )}
      {supports("fanMode") && (
        <div className={c.airflow}>
          <span>Airflow</span>
          <div className={c.segments} role="group" aria-label="Airflow">
            {(
              [
                ["straight", "Steady"],
                ["natural", "Natural"],
              ] as const
            ).map(([mode, name]) => (
              <button
                key={mode}
                aria-pressed={state.mode === mode}
                disabled={stopped}
                onClick={() => void onCommand("fanMode", { mode })}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
      {supports("oscillation") && (
        <FanDirection
          key={`${directionVersion}:${state.power}:${state.oscillating}:${state.childLock}:${device.online}`}
          deviceId={device.id}
          direction={device.direction}
          actions={directionActions}
          disabled={stopped || state.oscillating || state.childLock}
          unavailable={
            state.oscillating
              ? "Turn off oscillation to aim the fan."
              : state.childLock
                ? "Turn off child lock to aim the fan."
                : undefined
          }
          onMove={onMove}
        />
      )}
    </DeviceCard>
  );
}
