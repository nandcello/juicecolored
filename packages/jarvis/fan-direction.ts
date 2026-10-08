export const MAX_TRAVEL_STEPS = 70;
// Acknowledgement does not mean that the head has finished turning.
export const FAN_SETTLE_MS = 3000;
export const FAN_END_CHECK_MS = 6000;
export const FAN_LEASE_MS = 120000;

export function validTravelSteps(value: number): boolean {
  return Number.isInteger(value) && value >= 2 && value <= MAX_TRAVEL_STEPS;
}

export type FanDirectionState = {
  travelSteps: number;
  position: number | null;
  measurement?: "observed";
  setup?: {
    side: "left" | "right";
    stage: "sweeping" | "checking" | "confirm";
    round: number;
  };
  motion?: {
    token: string;
    kind: "home" | "aim" | "seek" | "probe";
    steps: number;
    completed: number;
    stopping: boolean;
  };
  error?: string;
};
