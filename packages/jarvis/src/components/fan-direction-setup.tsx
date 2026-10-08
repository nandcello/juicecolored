"use client";

import { useRef, useState } from "react";
import type { FanDirectionState } from "../../fan-direction";
import type { FanDirectionActions } from "./fan-direction";
import c from "./dashboard.module.css";
import s from "./fan-direction.module.css";

export function FanDirectionSetup({
  direction,
  actions,
}: {
  direction: FanDirectionState;
  actions: FanDirectionActions;
}) {
  const setup = direction.setup!;
  const motion = direction.motion!;
  const [pending, setPending] = useState(false);
  const working = useRef(false);
  async function act(run: () => Promise<boolean>) {
    if (working.current) return;
    working.current = true;
    setPending(true);
    try {
      await run();
    } finally {
      working.current = false;
      setPending(false);
    }
  }
  return (
    <div className={s.setup}>
      <strong>{setup.side === "left" ? "1. Find the left end" : "2. Find the right end"}</strong>
      <p role="status" aria-label="Fan setup">
        {motion.stopping
          ? "Stopping after the current attempt…"
          : setup.stage === "sweeping"
            ? `Moving ${setup.side} automatically…`
            : setup.stage === "checking"
              ? "Pausing, then trying twice slowly. Watch the fan."
              : "Did either of the two slow attempts turn the fan?"}
      </p>
      {setup.stage === "sweeping" ? (
        <>
          <p>
            No repeated tapping or counting. When it seems to stop turning, check this end. Jarvis
            will pause and try again before you confirm.
          </p>
          <p className={c.muted}>
            Left and right are viewed from behind the fan, looking where it blows.
          </p>
          <button
            className={c.primaryButton}
            disabled={pending || motion.stopping}
            onClick={() => void act(() => actions.checkEnd(motion.token, setup.round))}
          >
            Check {setup.side} end
          </button>
        </>
      ) : setup.stage === "confirm" ? (
        <div className={c.extraActions}>
          <button
            className={c.primaryButton}
            disabled={pending || motion.stopping}
            onClick={() => void act(() => actions.observeEnd(motion.token, setup.round, false))}
          >
            Neither attempt moved it
          </button>
          <button
            className={c.button}
            disabled={pending || motion.stopping}
            onClick={() => void act(() => actions.observeEnd(motion.token, setup.round, true))}
          >
            It moved — keep going
          </button>
        </div>
      ) : (
        <p className={c.muted}>
          A single missed movement does not mean the fan reached the end. The two checks are spaced
          six seconds apart.
        </p>
      )}
      <p className={c.muted}>
        Stay where you can see the fan for this setup. Aiming will remain approximate if commands
        are ignored.
      </p>
      <button
        className={c.textButton}
        disabled={pending || motion.stopping}
        onClick={() => void act(() => actions.stop(motion.token))}
      >
        Cancel calibration
      </button>
    </div>
  );
}
