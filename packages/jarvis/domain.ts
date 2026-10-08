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
export type FanDevice = DeviceBase & {
  kind: "fan";
  state: FanState;
  direction?: import("./fan-direction").FanDirectionState;
};
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
