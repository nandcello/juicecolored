export const MAX_TRAVEL_STEPS = 70;
export const FAN_SETTLE_MS = 1500;
export const FAN_LEASE_MS = 120000;

export function validTravelSteps(value: number): boolean {
  return Number.isInteger(value) && value >= 2 && value <= MAX_TRAVEL_STEPS;
}

export type FanDirectionState = {
  travelSteps: number;
  position: number | null;
  motion?: {
    token: string;
    kind: "home" | "aim";
    steps: number;
    completed: number;
    stopping: boolean;
  };
  error?: string;
};
