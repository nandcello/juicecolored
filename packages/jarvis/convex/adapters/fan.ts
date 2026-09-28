import type { FanState } from "../../domain";
import type { CloudClient, ControlData } from "./yeelight";

// Mi Smart Standing Fan 2 only. Property IDs come from the dmaker-p18:1 MIoT spec.
export const FAN_MODEL = "dmaker.fan.p18";
export const FAN_PROPERTIES = {
  power: [2, 1],
  speed: [2, 10],
  mode: [2, 3],
  oscillating: [2, 4],
  angle: [2, 5],
  offInMinutes: [2, 6],
  indicator: [2, 7],
  sound: [2, 8],
  childLock: [3, 1],
} as const;
type Property = {
  did: string;
  siid: number;
  piid: number;
  value?: boolean | number;
  code?: number;
};
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)
    throw new Error(`Invalid fan value. Choose a whole number from ${min} to ${max}.`);
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Invalid fan switch value.");
  return value;
}
export function fanCommand(id: string, action: string, data: ControlData): Property {
  let property: keyof typeof FAN_PROPERTIES = "power";
  let value: boolean | number;
  switch (action) {
    case "power":
      value = boolean(data.on);
      break;
    case "speed":
      property = "speed";
      value = integer(data.speed, 1, 100);
      break;
    case "fanMode":
      if (data.mode !== "straight" && data.mode !== "natural") throw new Error("Invalid fan mode.");
      property = "mode";
      value = data.mode === "natural" ? 1 : 0;
      break;
    case "oscillation":
      property = "oscillating";
      value = boolean(data.on);
      break;
    case "angle":
      value = integer(data.angle, 30, 140);
      if (![30, 60, 90, 120, 140].includes(value)) throw new Error("Invalid oscillation angle.");
      property = "angle";
      break;
    case "timer":
      property = "offInMinutes";
      value = integer(data.minutes, 0, 480);
      break;
    case "cancelTimer":
      property = "offInMinutes";
      value = 0;
      break;
    case "indicator":
    case "sound":
    case "childLock":
      property = action;
      value = boolean(data.on);
      break;
    case "direction":
      if (data.direction !== "left" && data.direction !== "right")
        throw new Error("Invalid fan direction.");
      return {
        did: id,
        siid: 2,
        piid: 9,
        value: data.direction === "left" ? 1 : 2,
      };
    default:
      throw new Error("Unknown fan command.");
  }
  const [siid, piid] = FAN_PROPERTIES[property];
  return { did: id, siid, piid, value };
}
export async function readFan(client: CloudClient, id: string): Promise<FanState> {
  const params = Object.values(FAN_PROPERTIES).map(([siid, piid]) => ({
    did: id,
    siid,
    piid,
  }));
  const raw = await client.api("/miotspec/prop/get", { params });
  if (!Array.isArray(raw)) throw new Error("Unable to read fan properties.");
  const values = Object.fromEntries(
    Object.entries(FAN_PROPERTIES).map(([name, [siid, piid]]) => {
      const row = raw.find(
        (p: Property) => p.did === id && p.siid === siid && p.piid === piid && p.code === 0,
      );
      if (!row) throw new Error("Unable to read fan properties.");
      return [name, row.value];
    }),
  );
  const mode = integer(values.mode, 0, 1);
  const angle = integer(values.angle, 30, 140);
  if (![30, 60, 90, 120, 140].includes(angle)) throw new Error("Invalid fan angle returned.");
  return {
    power: boolean(values.power),
    speed: integer(values.speed, 1, 100),
    mode: mode === 1 ? "natural" : "straight",
    oscillating: boolean(values.oscillating),
    angle,
    offInMinutes: integer(values.offInMinutes, 0, 480),
    indicator: boolean(values.indicator),
    sound: boolean(values.sound),
    childLock: boolean(values.childLock),
  };
}
export async function controlFan(
  client: CloudClient,
  id: string,
  action: string,
  data: ControlData,
) {
  const property = fanCommand(id, action, data);
  const result = await client.api("/miotspec/prop/set", { params: [property] });
  if (
    !Array.isArray(result) ||
    result.length !== 1 ||
    !result.some(
      (r: Property) =>
        r.did === id && r.siid === property.siid && r.piid === property.piid && r.code === 0,
    )
  )
    throw new Error("The fan did not confirm the command. Refresh before retrying.");
}
