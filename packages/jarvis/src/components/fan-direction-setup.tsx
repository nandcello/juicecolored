"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_TRAVEL_STEPS, type MoveFan } from "../lib/fan-direction";
import c from "./dashboard.module.css";
import s from "./fan-direction.module.css";

export function FanDirectionSetup({
  initialTravelSteps,
  disabled,
  onMove,
  onSave,
  onClose,
}: {
  initialTravelSteps: number;
  disabled: boolean;
  onMove: MoveFan;
  onSave: (travelSteps: number, position: number) => Promise<boolean>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"align" | "measure">("align");
  const [total, setTotal] = useState(initialTravelSteps);
  const [count, setCount] = useState(0);
  const [moving, setMoving] = useState(false);
  const [status, setStatus] = useState("");
  const movement = useRef<AbortController | null>(null);

  useEffect(() => {
    function hidden() {
      if (document.hidden) {
        movement.current?.abort();
        setPhase("align");
        setCount(0);
        setStatus("Manual calibration stopped. Find the left limit again when you return.");
      }
    }
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      movement.current?.abort();
    };
  }, []);

  async function step(direction: "left" | "right") {
    if (disabled || movement.current) return;
    const controller = new AbortController();
    movement.current = controller;
    setMoving(true);
    try {
      const success = await onMove({
        direction,
        count: 1,
        signal: controller.signal,
        onStep: () => {},
      });
      if (!success || controller.signal.aborted) throw new Error();
      if (direction === "right") setCount((value) => value + 1);
    } catch {
      setPhase("align");
      setCount(0);
      setStatus("Movement was not confirmed. Find the left limit again.");
    } finally {
      movement.current = null;
      setMoving(false);
    }
  }

  const locked = disabled || moving;
  return (
    <div className={s.setup}>
      {phase === "align" ? (
        <>
          <strong>1. Find the left limit</strong>
          <p>
            Use Step left until the fan stops moving farther left. View left and right from behind
            the fan, looking where it blows.
          </p>
          <div className={c.extraActions}>
            <button className={c.button} disabled={locked} onClick={() => void step("left")}>
              Step left
            </button>
            <button
              className={c.primaryButton}
              disabled={locked}
              onClick={() => {
                if (total) void onSave(total, 0);
                else {
                  setCount(0);
                  setStatus("");
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
        </>
      ) : (
        <>
          <strong>2. Measure the travel once</strong>
          <p>
            Tap Step right and wait for each movement. Stop as soon as the fan reaches its right
            limit; do not count extra presses against the limit. Future calibrations will run
            automatically.
          </p>
          <p role="status">{count} right steps counted</p>
          <div className={c.extraActions}>
            <button
              className={c.button}
              disabled={locked || count >= MAX_TRAVEL_STEPS}
              onClick={() => void step("right")}
            >
              Step right
            </button>
            <button
              className={c.primaryButton}
              disabled={locked || count < 2}
              onClick={() => void onSave(count, count)}
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
        </>
      )}
      {status && (
        <p role="status" className={c.muted}>
          {status}
        </p>
      )}
      <button
        className={c.textButton}
        onClick={() => {
          movement.current?.abort();
          onClose();
        }}
      >
        Cancel calibration
      </button>
    </div>
  );
}
