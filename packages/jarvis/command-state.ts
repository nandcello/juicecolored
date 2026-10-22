import type { Device, FanState, LightState } from "./domain";

export type ExpectedState = Partial<FanState> | Partial<LightState>;

// Only properties that the device can report back belong here. Direction nudges
// and saving a power-on default have no observable state to predict or compare.
export function expectedCommandState(
  kind: Device["kind"],
  action: string,
  data: Record<string, unknown>,
): ExpectedState {
  if (action === "power") return { power: data.on as boolean };
  if (action === "timer") return { offInMinutes: data.minutes as number };
  if (action === "cancelTimer") return { offInMinutes: 0 };
  if (kind === "fan") {
    switch (action) {
      case "speed":
        return { speed: data.speed as number };
      case "fanMode":
        return { mode: data.mode as FanState["mode"] };
      case "oscillation":
        return { oscillating: data.on as boolean };
      case "angle":
        return { angle: data.angle as number };
      case "indicator":
        return { indicator: data.on as boolean };
      case "sound":
        return { sound: data.on as boolean };
      case "childLock":
        return { childLock: data.on as boolean };
      default:
        return {};
    }
  }
  switch (action) {
    case "brightness":
      return { brightness: data.brightness as number };
    case "temperature":
      return { kelvin: data.kelvin as number, mode: "white" };
    case "color":
      return { color: data.color as string, mode: "color" };
    case "scene":
      return {
        brightness: data.brightness as number,
        ...(data.mode === "white"
          ? { mode: "white", kelvin: data.kelvin as number }
          : { mode: "color", color: data.color as string }),
      };
    case "flow":
      return { flowing: true };
    case "stopFlow":
      return { flowing: false };
    default:
      return {};
  }
}

export function matchesCommandState(observed: FanState | LightState, expected: ExpectedState) {
  return Object.entries(expected).every(([key, value]) => {
    const actual = observed[key as keyof typeof observed];
    // Countdown values can cross a minute boundary while a read is in flight.
    if (key === "offInMinutes" && typeof value === "number" && value > 0)
      return typeof actual === "number" && actual > 0 && actual <= value && actual >= value - 1;
    if (typeof value === "string" && typeof actual === "string")
      return actual.toLowerCase() === value.toLowerCase();
    return actual === value;
  });
}
