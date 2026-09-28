import { describe, it, expect } from "vitest";
import { fanCommand, readFan, controlFan, FAN_PROPERTIES } from "../convex/adapters/fan";
import type { CloudClient } from "../convex/adapters/yeelight";
const values = {
  power: true,
  speed: 73,
  mode: 1,
  oscillating: true,
  angle: 140,
  offInMinutes: 60,
  indicator: false,
  sound: false,
  childLock: true,
};
export const fanRows = () =>
  Object.entries(FAN_PROPERTIES).map(([name, [siid, piid]]) => ({
    did: "456",
    siid,
    piid,
    code: 0,
    value: values[name as keyof typeof values],
  }));
describe("Standing Fan 2 adapter", () => {
  it("maps speed, oscillation, wind mode, timer and motor control to their exact MIoT properties", () => {
    expect(fanCommand("456", "speed", { speed: 73 })).toEqual({
      did: "456",
      siid: 2,
      piid: 10,
      value: 73,
    });
    expect(fanCommand("456", "fanMode", { mode: "natural" })).toMatchObject({
      piid: 3,
      value: 1,
    });
    expect(fanCommand("456", "oscillation", { on: true })).toMatchObject({
      piid: 4,
      value: true,
    });
    expect(fanCommand("456", "angle", { angle: 140 })).toMatchObject({
      piid: 5,
      value: 140,
    });
    expect(fanCommand("456", "timer", { minutes: 480 })).toMatchObject({
      piid: 6,
      value: 480,
    });
    expect(fanCommand("456", "direction", { direction: "left" })).toMatchObject({
      piid: 9,
      value: 1,
    });
    expect(fanCommand("456", "childLock", { on: true })).toMatchObject({
      siid: 3,
      piid: 1,
      value: true,
    });
  });
  it.each([
    ["speed", { speed: 0 }],
    ["speed", { speed: 101 }],
    ["speed", { speed: 1.5 }],
    ["angle", { angle: 45 }],
    ["timer", { minutes: 481 }],
    ["power", { on: "yes" }],
    ["fanMode", { mode: "sleep" }],
    ["scene", {}],
  ])("rejects invalid %s requests", (action, data) => {
    expect(() => fanCommand("456", action as string, data as never)).toThrow();
  });
  it("matches properties by identifier, tolerating upstream order changes", async () => {
    const client = {
      api: async () => fanRows().reverse(),
    } as unknown as CloudClient;
    expect(await readFan(client, "456")).toEqual({
      ...values,
      mode: "natural",
    });
  });
  it("does not invent state when a property read fails", async () => {
    const client = {
      api: async () => fanRows().map((r) => (r.piid === 10 ? { ...r, code: -1 } : r)),
    } as unknown as CloudClient;
    await expect(readFan(client, "456")).rejects.toThrow();
  });
  it("requires the matching success acknowledgement before accepting a command", async () => {
    const client = {
      api: async () => [{ did: "456", siid: 2, piid: 10, code: -4001 }],
    } as unknown as CloudClient;
    await expect(controlFan(client, "456", "speed", { speed: 40 })).rejects.toThrow(
      "did not confirm",
    );
  });
});
