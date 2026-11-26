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

/**
 * Absolute device settings that can be combined into one submitted change. Only
 * the latest value of each setting is kept, so repeating a tweak never produces
 * another write. Direction nudges, effects, scenes and saving a power-on default
 * are ordered one-off commands and are never merged.
 */
export type FanSettings = Partial<
  Pick<
    FanState,
    | "power"
    | "speed"
    | "mode"
    | "oscillating"
    | "angle"
    | "offInMinutes"
    | "indicator"
    | "sound"
    | "childLock"
  >
>;
export type LightSettings = Partial<{
  power: boolean;
  brightness: number;
  kelvin: number;
  color: string;
  offInMinutes: number;
}>;
export type DeviceSettings = FanSettings & LightSettings;

const FAN_SETTING_KEYS = [
  "power",
  "speed",
  "mode",
  "oscillating",
  "angle",
  "offInMinutes",
  "indicator",
  "sound",
  "childLock",
] as const;
const LIGHT_SETTING_KEYS = ["power", "brightness", "kelvin", "color", "offInMinutes"] as const;
export const settingKeys = (kind: Device["kind"]): readonly string[] =>
  kind === "fan" ? FAN_SETTING_KEYS : LIGHT_SETTING_KEYS;

/** The mergeable settings an action represents, or null for a one-off command. */
export function actionSettings(
  kind: Device["kind"],
  action: string,
  data: Record<string, unknown>,
): DeviceSettings | null {
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
      case "sound":
      case "childLock":
        return { [action]: data.on as boolean };
      default:
        return null;
    }
  }
  switch (action) {
    case "brightness":
      return { brightness: data.brightness as number };
    case "temperature":
      return { kelvin: data.kelvin as number };
    case "color":
      return { color: data.color as string };
    default:
      return null;
  }
}

/** Latest value wins. White temperature and color are one light mode, so they replace each other. */
export function mergeSettings(base: DeviceSettings, next: DeviceSettings): DeviceSettings {
  const merged: DeviceSettings = { ...base };
  if (next.kelvin !== undefined) delete merged.color;
  if (next.color !== undefined) delete merged.kelvin;
  return Object.assign(merged, next);
}

/** The observable state a set of settings predicts. */
export function expectedSettingsState(
  kind: Device["kind"],
  settings: DeviceSettings,
): ExpectedState {
  const expected: Record<string, unknown> = {};
  for (const key of settingKeys(kind))
    if (settings[key as keyof DeviceSettings] !== undefined)
      expected[key] = settings[key as keyof DeviceSettings];
  if (kind === "light") {
    if (settings.kelvin !== undefined) expected.mode = "white";
    if (settings.color !== undefined) expected.mode = "color";
  }
  return expected as ExpectedState;
}

/** Human labels for one activity entry describing a combined change. */
export function settingsLabel(kind: Device["kind"], settings: DeviceSettings) {
  const names: Record<string, string> = {
    power: settings.power ? "turned on" : "turned off",
    speed: "speed",
    mode: "wind mode",
    oscillating: "oscillation",
    angle: "oscillation angle",
    offInMinutes: settings.offInMinutes ? "off timer" : "off timer cancelled",
    indicator: "indicator light",
    sound: "button sound",
    childLock: "child lock",
    brightness: "brightness",
    kelvin: "white temperature",
    color: "color",
  };
  const parts = settingKeys(kind)
    .filter((key) => settings[key as keyof DeviceSettings] !== undefined)
    .map((key) => names[key]);
  const text = parts.join(", ");
  return text ? text[0].toUpperCase() + text.slice(1) : "Device updated";
}
