import { test as base, type Page } from "@playwright/test";
import fixture from "../fixtures/home.json" with { type: "json" };
import type { Snapshot } from "../../src/lib/domain";
export type Operation = {
  type: string;
  id?: string;
  action?: string;
  data?: Record<string, unknown>;
  hidden?: boolean;
  name?: string;
  room?: string;
  region?: string;
  key?: string;
};
export type Simulation = {
  state: Snapshot;
  commands: Operation[];
  failNext: boolean;
  delay: number;
  loginPending: boolean;
};
export const test = base.extend<{ simulation: Simulation }>({
  simulation: async ({ page }, provide) => {
    const simulation: Simulation = {
      state: structuredClone(fixture) as Snapshot,
      commands: [],
      failNext: false,
      delay: 0,
      loginPending: true,
    };
    await page.route("**/api/jarvis", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: simulation.state });
      const op: Operation = route.request().postDataJSON();
      simulation.commands.push(op);
      if (simulation.delay) await new Promise((resolve) => setTimeout(resolve, simulation.delay));
      if (simulation.failNext) {
        simulation.failNext = false;
        return route.fulfill({
          status: 502,
          json: {
            error: "Device did not confirm. Refresh before trying again.",
          },
        });
      }
      if (op.type === "startLogin")
        return route.fulfill({
          json: {
            key: "fixture-login",
            image:
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Crect width='240' height='240' fill='white'/%3E%3Cpath d='M20 20h70v70H20zM150 20h70v70h-70zM20 150h70v70H20z' fill='black'/%3E%3C/svg%3E",
            expires: Date.now() + 300000,
          },
        });
      if (op.type === "pollLogin") {
        if (simulation.loginPending) return route.fulfill({ json: { pending: true } });
        simulation.state.connected = true;
        return route.fulfill({ json: { connected: true } });
      }
      const device = simulation.state.devices.find((d) => d.id === op.id);
      if (device && op.type === "visibility") device.hidden = op.hidden;
      if (device && op.type === "metadata") {
        device.name = op.name!;
        device.room = op.room!;
      }
      if (op.type === "disconnect") {
        simulation.state.connected = false;
        simulation.state.devices = [];
      }
      if (op.type === "saveScene")
        simulation.state.scenes.push({
          id: "saved-scene",
          name: op.name!,
          description: "Saved light",
          mode: "white",
          kelvin: 2700,
          color: "#edba77",
          brightness: 75,
        });
      if (op.type === "deleteScene")
        simulation.state.scenes = simulation.state.scenes.filter((s) => s.id !== op.id);
      if (device && op.type === "control") {
        const data = op.data ?? {};
        if (op.action === "power") device.state.power = data.on as boolean;
        if (op.action === "timer") device.state.offInMinutes = data.minutes as number;
        if (op.action === "cancelTimer") device.state.offInMinutes = 0;
        if (device.kind === "fan") {
          if (op.action === "speed") device.state.speed = data.speed as number;
          if (op.action === "fanMode") device.state.mode = data.mode as "straight" | "natural";
          if (op.action === "oscillation") device.state.oscillating = data.on as boolean;
          if (op.action === "angle") device.state.angle = data.angle as number;
          if (op.action === "indicator" || op.action === "sound" || op.action === "childLock")
            device.state[op.action] = data.on as boolean;
        } else {
          if (op.action === "brightness") device.state.brightness = data.brightness as number;
          if (op.action === "color") {
            device.state.color = data.color as string;
            device.state.mode = "color";
          }
          if (op.action === "temperature") {
            device.state.kelvin = data.kelvin as number;
            device.state.mode = "white";
          }
          if (op.action === "scene") Object.assign(device.state, data, { power: true });
        }
        device.updatedAt++;
      }
      return route.fulfill({ json: { ok: true } });
    });
    await provide(simulation);
  },
});
export { expect } from "@playwright/test";
export const card = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
