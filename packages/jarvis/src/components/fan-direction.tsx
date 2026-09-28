"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_TRAVEL_STEPS, type MoveFan } from "../lib/fan-direction";
import { FanDirectionArc } from "./fan-direction-arc";
import c from "./dashboard.module.css";
import s from "./fan-direction.module.css";

export function FanDirection({
  deviceId,
  disabled,
  unavailable,
  onMove,
}: {
  deviceId: string;
  disabled: boolean;
  unavailable?: string;
  onMove: MoveFan;
}) {
  const [phase, setPhase] = useState<"idle" | "align" | "measure" | "ready">("idle");
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [position, setPosition] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [status, setStatus] = useState("");
  const movement = useRef<AbortController | null>(null);
  const storageKey = `jarvis:fan-travel:v1:${deviceId}`;

  const reset = useCallback((message: string) => {
    movement.current?.abort();
    setPosition(null);
    setPhase("idle");
    setCount(0);
    setStatus(message);
  }, []);
  useEffect(() => {
    function onHidden() {
      if (document.hidden) reset("Recalibrate after returning to the app.");
    }
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      movement.current?.abort();
    };
  }, [reset]);

  function begin() {
    let saved = 0;
    try {
      const value = Number(localStorage.getItem(storageKey));
      if (Number.isInteger(value) && value >= 2 && value <= MAX_TRAVEL_STEPS) saved = value;
    } catch {
      /* Calibration also works when browser storage is unavailable. */
    }
    setTotal(saved);
    setPosition(null);
    setCount(0);
    setStatus("");
    setPhase("align");
  }
  async function move(
    direction: "left" | "right",
    steps: number,
    onStep = (_completed: number) => {},
  ) {
    if (disabled || movement.current) return false;
    const controller = new AbortController();
    movement.current = controller;
    setMoving(true);
    let success = false;
    try {
      success = await onMove({ direction, count: steps, signal: controller.signal, onStep });
      if (!success || controller.signal.aborted) {
        reset("Movement stopped. Recalibrate before aiming again.");
        return false;
      }
      return true;
    } catch {
      reset("Movement was not confirmed. Recalibrate before aiming again.");
      return false;
    } finally {
      movement.current = null;
      setMoving(false);
    }
  }
  async function aim(target: number) {
    if (position === null || target === position || disabled || moving) return;
    const start = position;
    const sign = target > start ? 1 : -1;
    await move(sign > 0 ? "right" : "left", Math.abs(target - start), (completed) => {
      setPosition(start + sign * completed);
    });
  }
  const locked = disabled || moving;
  return (
    <div className={s.control}>
      <FanDirectionArc
        key={position === null ? "uncalibrated" : "calibrated"}
        position={position}
        total={total}
        disabled={locked}
        onCommit={aim}
      />
      <p className={c.muted}>
        {unavailable ??
          "Direction is estimated. Recalibrate if the fan moves in Xiaomi Home or by hand."}
      </p>
      {phase === "idle" && (
        <button className={c.button} disabled={locked} onClick={begin}>
          Calibrate direction
        </button>
      )}
      {phase === "align" && (
        <div className={s.setup}>
          <strong>1. Find the left limit</strong>
          <p>
            Use Step left until the fan stops moving farther left. View left and right from behind
            the fan, looking where it blows.
          </p>
          <div className={c.extraActions}>
            <button className={c.button} disabled={locked} onClick={() => void move("left", 1)}>
              Step left
            </button>
            <button
              className={c.primaryButton}
              disabled={locked}
              onClick={() => {
                if (total) {
                  setPosition(0);
                  setPhase("ready");
                } else {
                  setCount(0);
                  setPhase("measure");
                }
              }}
            >
              At left limit
            </button>
          </div>
          {total > 0 && (
            <>
              <p>Using your saved measurement: {total} steps across 140°.</p>
              <button className={c.textButton} disabled={locked} onClick={() => setTotal(0)}>
                Measure travel again
              </button>
            </>
          )}
        </div>
      )}
      {phase === "measure" && (
        <div className={s.setup}>
          <strong>2. Measure the travel</strong>
          <p>
            Tap Step right and wait for each movement. Stop as soon as the fan reaches its right
            limit; do not count extra presses against the limit.
          </p>
          <p role="status">{count} right steps counted</p>
          <div className={c.extraActions}>
            <button
              className={c.button}
              disabled={locked || count >= MAX_TRAVEL_STEPS}
              onClick={async () => {
                if (await move("right", 1)) setCount((value) => value + 1);
              }}
            >
              Step right
            </button>
            <button
              className={c.primaryButton}
              disabled={locked || count < 2}
              onClick={() => {
                setTotal(count);
                setPosition(count);
                setPhase("ready");
                try {
                  localStorage.setItem(storageKey, String(count));
                } catch {
                  /* Optional preference. */
                }
              }}
            >
              At right limit
            </button>
          </div>
          {count >= MAX_TRAVEL_STEPS && (
            <p>
              Travel measurement limit reached. Restart calibration if the fan has not reached the
              right limit.
            </p>
          )}
        </div>
      )}
      {phase === "ready" && !moving && (
        <div className={c.row}>
          <span className={c.muted}>About {(140 / total).toFixed(1)}° per step</span>
          <button className={c.textButton} disabled={locked} onClick={begin}>
            Recalibrate
          </button>
        </div>
      )}
      {moving ? (
        <div className={c.extraActions}>
          <span role="status" className={c.muted}>
            Moving…
          </span>
          <button
            className={c.button}
            onClick={() =>
              reset("Stopping after the current step. Recalibrate before aiming again.")
            }
          >
            Stop after this step
          </button>
        </div>
      ) : (
        (phase === "align" || phase === "measure") && (
          <button className={c.textButton} onClick={() => reset("")}>
            Cancel calibration
          </button>
        )
      )}
      {status && (
        <p role="status" className={c.muted}>
          {status}
        </p>
      )}
    </div>
  );
}
