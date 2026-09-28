export const MAX_TRAVEL_STEPS = 70;

export type FanMove = {
  direction: "left" | "right";
  count: number;
  signal: AbortSignal;
  onStep: (completed: number) => void;
};
export type MoveFan = (move: FanMove) => Promise<boolean>;

export function angleToStep(angle: number, total: number) {
  return Math.round(((Math.max(-70, Math.min(70, angle)) + 70) / 140) * total);
}

export function stepToAngle(step: number, total: number) {
  return (step / total) * 140 - 70;
}

// Each request is a deliberate nudge, never a retry. A failed/ambiguous request
// ends the sequence because its physical result cannot be inferred safely.
export async function runFanMovement(
  move: FanMove,
  send: () => Promise<void>,
  pause: () => Promise<void> = () => new Promise((resolve) => setTimeout(resolve, 1500)),
) {
  if (!Number.isInteger(move.count) || move.count < 1 || move.count > MAX_TRAVEL_STEPS)
    throw new Error("Invalid fan movement count.");
  for (let i = 0; i < move.count; i++) {
    if (move.signal.aborted) return false;
    await send();
    // Allow the motor to settle, including after the final calibration nudge.
    await pause();
    if (move.signal.aborted) return false;
    move.onStep(i + 1);
  }
  return true;
}
