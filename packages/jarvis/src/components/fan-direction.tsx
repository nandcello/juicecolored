"use client";

import type { FanDirectionState } from "../../fan-direction";
import { validTravelSteps } from "../lib/fan-direction";
import { FanDirectionArc } from "./fan-direction-arc";
import { FanDirectionSetup } from "./fan-direction-setup";
import c from "./dashboard.module.css";
import s from "./fan-direction.module.css";

export type FanDirectionActions = {
  home: (travelSteps?: number) => Promise<boolean>;
  aim: (position: number) => Promise<boolean>;
  setup: () => Promise<boolean>;
  checkEnd: (token: string, round: number) => Promise<boolean>;
  observeEnd: (token: string, round: number, moved: boolean) => Promise<boolean>;
  stop: (token: string) => Promise<boolean>;
};

export function FanDirection({
  deviceId,
  direction,
  disabled,
  unavailable,
  actions,
}: {
  deviceId: string;
  direction?: FanDirectionState;
  disabled: boolean;
  unavailable?: string;
  actions: FanDirectionActions;
}) {
  const storageKey = `jarvis:fan-travel:v1:${deviceId}`;
  const motion = direction?.motion;
  const position = direction?.position ?? null;
  const total = direction?.travelSteps ?? 0;

  function savedTravel() {
    if (total) return total;
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (validTravelSteps(saved)) return saved;
    } catch {
      /* The server also remembers completed measurements. */
    }
    return 0;
  }

  function calibrate() {
    const saved = savedTravel();
    if (saved) void actions.home(saved);
    else void actions.setup();
  }

  return (
    <div className={s.control}>
      <FanDirectionArc
        key={position === null ? "uncalibrated" : "calibrated"}
        position={position}
        total={total}
        disabled={disabled || !!motion}
        onCommit={async (target) => {
          if (target !== position) await actions.aim(target);
        }}
      />
      <p className={c.muted}>
        {unavailable ??
          "Direction is estimated. Recalibrate if the fan moves in Xiaomi Home or by hand."}
      </p>
      {direction?.setup && motion ? (
        <FanDirectionSetup direction={direction} actions={actions} />
      ) : motion ? (
        <div className={s.setup}>
          <p role="status" aria-label="Fan movement">
            {motion.stopping
              ? "Stopping after the current step…"
              : `${motion.kind === "home" ? "Calibrating" : "Aiming"}… ${motion.completed} of ${motion.steps} steps`}
          </p>
          <p className={c.muted}>
            You can leave the app. Movement will continue in the background.
          </p>
          <button
            className={c.button}
            disabled={motion.stopping}
            onClick={() => void actions.stop(motion.token)}
          >
            Stop after this step
          </button>
        </div>
      ) : (
        <>
          <div className={c.extraActions}>
            <button className={c.button} disabled={disabled} onClick={calibrate}>
              {position === null ? "Calibrate direction" : "Recalibrate"}
            </button>
            {total > 0 && (
              <button
                className={c.textButton}
                disabled={disabled}
                onClick={() => void actions.setup()}
              >
                Measure travel again
              </button>
            )}
          </div>
          {total > 0 && (
            <p className={c.muted}>
              {direction?.measurement === "observed"
                ? "Travel is estimated from the setup. Ignored commands or a late end check can affect aiming."
                : `One tap finds the left limit using your saved ${total}-step measurement.`}
            </p>
          )}
          {direction?.error && (
            <p role="status" aria-label="Fan direction status" className={c.muted}>
              {direction.error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
