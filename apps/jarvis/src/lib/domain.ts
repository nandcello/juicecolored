/** Common device contract. Provider-specific identifiers and credentials stay on the server. */
export type Capability =
  | "power"
  | "brightness"
  | "temperature"
  | "color"
  | "scenes"
  | "effects"
  | "timer"
  | "speed"
  | "oscillation"
  | "fanMode";
export type LightState = {
  power: boolean;
  brightness: number;
  kelvin: number;
  color: string;
  mode: "white" | "color";
  flowing: boolean;
  offInMinutes: number;
};
export type FanState = {
  power: boolean;
  speed: number;
  mode: "straight" | "natural";
  oscillating: boolean;
  angle: number;
  offInMinutes: number;
  indicator: boolean;
  sound: boolean;
  childLock: boolean;
};
type DeviceBase = {
  id: string;
  name: string;
  room: string;
  provider: "xiaomi";
  model: string;
  online: boolean;
  capabilities: Capability[];
  hidden?: boolean;
  updatedAt: number;
  error?: string;
};
export type LightDevice = DeviceBase & { kind: "light"; state: LightState };
export type FanDevice = DeviceBase & { kind: "fan"; state: FanState };
export type Device = LightDevice | FanDevice;
export type Scene = {
  id: string;
  name: string;
  description: string;
  mode: "white" | "color";
  kelvin: number;
  color: string;
  brightness: number;
};
export type Activity = {
  id: string;
  deviceName: string;
  label: string;
  status: "success" | "error";
  createdAt: number;
};
export type Snapshot = {
  connected: boolean;
  devices: Device[];
  scenes: Scene[];
  activity: Activity[];
  region: string;
};
export const BUILTIN_SCENES: Scene[] = [
  {
    id: "unwind",
    name: "Unwind",
    description: "A little warmth. A slower pace.",
    mode: "white",
    kelvin: 2700,
    color: "#edba77",
    brightness: 35,
  },
  {
    id: "focus",
    name: "Focus",
    description: "Clear light for a clear mind.",
    mode: "white",
    kelvin: 5000,
    color: "#c4deca",
    brightness: 100,
  },
  {
    id: "after-hours",
    name: "After hours",
    description: "Let the evening find its color.",
    mode: "color",
    kelvin: 4000,
    color: "#b871ff",
    brightness: 30,
  },
  {
    id: "movie-night",
    name: "Movie night",
    description: "Settle in. Dim the world.",
    mode: "color",
    kelvin: 2700,
    color: "#ff7340",
    brightness: 15,
  },
];
export const INTEGRATIONS = [
  {
    id: "xiaomi",
    name: "Xiaomi Home",
    description: "Yeelight lights and Mi Smart Standing Fan 2, connected through Xiaomi Home.",
    capabilities: [
      "power",
      "brightness",
      "temperature",
      "color",
      "scenes",
      "effects",
      "timer",
    ] as Capability[],
  },
];
