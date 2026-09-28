import { PROPS, makeCommand } from "./vendor/controls.mjs";
import { XiaomiClient } from "./vendor/xiaomi.mjs";
import type { LightState } from "../../domain";

export type Session = {
  userId?: string;
  serviceToken?: string;
  ssecurity?: string;
  region?: string;
  agent?: string;
  cookies?: { name: string; value: string; domain: string; path: string }[];
  qr?: string;
  poll?: string;
  loginUrl?: string;
  expires?: number;
  connectedAt?: string;
};
export type ControlData = {
  on?: boolean;
  speed?: number;
  angle?: number;
  direction?: string;
  brightness?: number;
  kelvin?: number;
  color?: string;
  duration?: number;
  mode?: string;
  minutes?: number;
  name?: string;
  count?: number;
  end?: number;
  steps?: {
    duration: number;
    mode: string;
    kelvin?: number;
    color?: string;
    brightness: number;
  }[];
};
export interface CloudClient {
  session: Session;
  startQR(region: string): Promise<Session>;
  pollQR(): Promise<boolean>;
  request(url: string): Promise<Response>;
  devices(): Promise<{ id: string; name: string; model: string; online: boolean }[]>;
  api(path: string, data: unknown): Promise<unknown>;
  rpc(id: string, method: string, params: unknown[]): Promise<unknown>;
}
export const createClient = (session: Session = {}): CloudClient =>
  new XiaomiClient(session) as unknown as CloudClient;
export function command(action: string, data: ControlData): [string, unknown[]] {
  return makeCommand(action, data) as [string, unknown[]];
}
export async function readLight(client: CloudClient, externalId: string): Promise<LightState> {
  const raw = await client.rpc(externalId, "get_prop", PROPS);
  if (!Array.isArray(raw) || raw.length !== PROPS.length || !["on", "off"].includes(String(raw[0])))
    throw new Error("This model did not return supported light properties.");
  const p = Object.fromEntries(PROPS.map((key, i) => [key, String(raw[i] ?? "")]));
  let rgb = Number(p.rgb) || 0;
  if (p.color_mode === "3") {
    const h = (Number(p.hue) || 0) / 60,
      s = (Number(p.sat) || 0) / 100,
      x = 1 - Math.abs((h % 2) - 1);
    const channels = [
      [1, x, 0],
      [x, 1, 0],
      [0, 1, x],
      [0, x, 1],
      [x, 0, 1],
      [1, 0, x],
    ][Math.floor(h) % 6];
    rgb = channels.map((v) => Math.round((v * s + 1 - s) * 255)).reduce((a, v) => (a << 8) + v, 0);
  }
  return {
    power: p.power === "on",
    brightness: Number(p.bright) || 1,
    kelvin: Number(p.ct) || 4000,
    color: "#" + rgb.toString(16).padStart(6, "0"),
    mode: p.color_mode === "2" ? "white" : "color",
    flowing: p.flowing === "1",
    offInMinutes: Number(p.delayoff) || 0,
  };
}
