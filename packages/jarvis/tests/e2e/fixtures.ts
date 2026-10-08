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
  travelSteps?: number;
  position?: number;
  token?: string;
  round?: number;
  moved?: boolean;
};
export type Simulation = {
  state: Snapshot;
  commands: Operation[];
  failNext: boolean;
  delay: number;
  loginPending: boolean;
  motionError: boolean;
  setupAttempts: number;
  setupDelay: number;
};
export const test = base.extend<{ simulation: Simulation }>({
  simulation: async ({ page }, provide) => {
    const simulation: Simulation = {
      state: structuredClone(fixture) as Snapshot,
      commands: [],
      failNext: false,
      delay: 0,
      loginPending: true,
      motionError: false,
      setupAttempts: 0,
      setupDelay: 300,
    };
    const motionTimers: ReturnType<typeof setInterval>[] = [];
    function sweepSetup(device: Extract<Snapshot["devices"][number], { kind: "fan" }>) {
      const state = device.direction!;
      const round = state.setup!.round;
      const timer = setInterval(() => {
        if (
          device.direction !== state ||
          !state.motion ||
          state.setup?.stage !== "sweeping" ||
          state.setup.round !== round
        ) {
          clearInterval(timer);
          return;
        }
        state.motion.completed++;
        simulation.setupAttempts++;
      }, simulation.setupDelay);
      motionTimers.push(timer);
    }
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
      if (device?.kind === "fan") {
        if (op.type === "fanSetup") {
          simulation.setupAttempts = 0;
          device.direction = {
            travelSteps: device.direction?.travelSteps ?? 0,
            position: null,
            setup: { side: "left", stage: "sweeping", round: 0 },
            motion: {
              token: `setup-${simulation.commands.length}`,
              kind: "seek",
              steps: 70,
              completed: 0,
              stopping: false,
            },
          };
          sweepSetup(device);
        }
        const setupState = device.direction;
        if (
          op.type === "fanCheckEnd" &&
          setupState?.setup?.stage === "sweeping" &&
          setupState.motion &&
          setupState.motion.token === op.token &&
          setupState.setup.round === op.round
        ) {
          setupState.setup.stage = "checking";
          setupState.motion.kind = "probe";
          setupState.motion.steps = setupState.motion.completed + 2;
          const timer = setInterval(() => {
            if (
              device.direction !== setupState ||
              !setupState.motion ||
              setupState.setup?.stage !== "checking"
            ) {
              clearInterval(timer);
              return;
            }
            setupState.motion.completed++;
            if (setupState.motion.completed === setupState.motion.steps) {
              setupState.setup.stage = "confirm";
              clearInterval(timer);
            }
          }, 400);
          motionTimers.push(timer);
        }
        if (
          op.type === "fanObserveEnd" &&
          setupState?.setup?.stage === "confirm" &&
          setupState.motion &&
          setupState.motion.token === op.token &&
          setupState.setup.round === op.round
        ) {
          if (!op.moved && setupState.setup.side === "right") {
            const travelSteps = simulation.setupAttempts - 1;
            device.direction = { travelSteps, position: travelSteps, measurement: "observed" };
          } else {
            if (!op.moved) {
              setupState.setup.side = "right";
              simulation.setupAttempts = 0;
            }
            setupState.setup.round++;
            setupState.setup.stage = "sweeping";
            setupState.motion.kind = "seek";
            sweepSetup(device);
          }
        }
        if (op.type === "fanReference")
          device.direction = { travelSteps: op.travelSteps!, position: op.position! };
        if (op.type === "fanHome" || op.type === "fanAim") {
          const travelSteps = device.direction?.travelSteps ?? op.travelSteps!;
          const target = op.type === "fanHome" ? 0 : op.position!;
          const steps =
            op.type === "fanHome" ? travelSteps : Math.abs(target - device.direction!.position!);
          const token = `motion-${simulation.commands.length}`;
          device.direction = {
            travelSteps,
            position: null,
            motion: {
              token,
              kind: op.type === "fanHome" ? "home" : "aim",
              steps,
              completed: 0,
              stopping: false,
            },
          };
          const timer = setInterval(() => {
            const state = device.direction;
            if (state?.motion?.token !== token) {
              clearInterval(timer);
              return;
            }
            state.motion.completed++;
            if (state.motion.completed >= steps || simulation.motionError) {
              state.motion = undefined;
              state.position = simulation.motionError ? null : target;
              state.error = simulation.motionError
                ? "Movement could not be confirmed. Calibrate again before aiming."
                : undefined;
              simulation.motionError = false;
              clearInterval(timer);
            }
          }, 500);
          motionTimers.push(timer);
        }
        if (
          op.type === "fanStop" &&
          device.direction?.motion &&
          device.direction.motion.token === op.token
        ) {
          device.direction.motion = undefined;
          device.direction.setup = undefined;
          device.direction.position = null;
          device.direction.error = "Movement stopped. Calibrate again before aiming.";
        }
      }
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
          if (
            device.direction &&
            ["direction", "power", "oscillation", "angle", "childLock"].includes(op.action ?? "")
          )
            device.direction.position = null;
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
    try {
      await provide(simulation);
    } finally {
      for (const timer of motionTimers) clearInterval(timer);
    }
  },
});
export { expect } from "@playwright/test";
export const card = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
