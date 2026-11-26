// Isolated QA simulator for the temporary preview only (tests/qa-preview.mjs).
// It never reaches Convex, Xiaomi, the Bathala bridge or a household device.
// Device-boundary requests are planned with the production adapter functions,
// so the log shows exactly which miIO/MIoT requests the gateway would deliver.
import fixture from "../fixtures/home.json" with { type: "json" };
import type { Device, Snapshot } from "../../domain";
import { fanCommand, fanSettingsCommand, FAN_PROPERTIES } from "../../convex/adapters/fan";
import { command, lightSettingsCommands } from "../../convex/adapters/yeelight";
import { PROPS } from "../../convex/adapters/vendor/controls.mjs";
import { expectedCommandState, settingKeys, type DeviceSettings } from "../../command-state";

export type DeviceConfig = { delayMs: number; failNext: boolean; hold: boolean };
export type BoundaryRequest = { method: string; params: unknown[] };
export type LogEntry = {
  seq: number;
  at: number;
  finishedAt?: number;
  device?: string;
  deviceId?: string;
  op: string;
  payload: Record<string, unknown>;
  boundary: BoundaryRequest[];
  status: "sending" | "held" | "confirmed" | "failed" | "rejected";
  note?: string;
};
type Operation = Record<string, unknown> & { type: string; id?: string };
type Result = { status: number; json: unknown };

const SIMULATED_ID: Record<string, string> = {
  "fixture-fan": "qa-fan",
  "fixture-light": "qa-ceiling",
  "fixture-bedroom": "qa-bedside",
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class Simulator {
  state = structuredClone(fixture) as Snapshot;
  config: Record<string, DeviceConfig> = Object.fromEntries(
    this.state.devices.map((d) => [d.id, { delayMs: 1200, failNext: false, hold: false }]),
  );
  log: LogEntry[] = [];
  private seq = 0;
  private leases = new Set<string>();
  private releases = new Map<string, (() => void)[]>();
  private accountBusy = false;

  snapshot() {
    return structuredClone(this.state);
  }
  report() {
    return {
      devices: this.state.devices.map((d) => ({
        id: d.id,
        name: d.name,
        kind: d.kind,
        online: d.online,
        busy: this.leases.has(d.id),
        held: (this.releases.get(d.id)?.length ?? 0) > 0,
        state: d.state,
        config: this.config[d.id],
      })),
      log: this.log.slice(-200).reverse(),
    };
  }
  configure(input: {
    id?: string;
    delayMs?: number;
    failNext?: boolean;
    hold?: boolean;
    release?: boolean;
    reset?: boolean;
  }) {
    if (input.reset) {
      for (const id of this.releases.keys()) this.release(id);
      Object.assign(this, { state: structuredClone(fixture) as Snapshot, log: [] });
      for (const config of Object.values(this.config))
        Object.assign(config, { delayMs: 1200, failNext: false, hold: false });
      return;
    }
    const config = input.id ? this.config[input.id] : undefined;
    if (!config || !input.id) return;
    if (typeof input.delayMs === "number")
      config.delayMs = Math.max(0, Math.min(15000, input.delayMs));
    if (typeof input.failNext === "boolean") config.failNext = input.failNext;
    if (typeof input.hold === "boolean") config.hold = input.hold;
    if (input.release || input.hold === false) this.release(input.id);
  }
  private release(id: string) {
    for (const resolve of this.releases.get(id) ?? []) resolve();
    this.releases.delete(id);
  }
  private async wait(id: string, entry: LogEntry) {
    const config = this.config[id];
    if (config.hold) {
      entry.status = "held";
      await new Promise<void>((resolve) =>
        this.releases.set(id, [...(this.releases.get(id) ?? []), resolve]),
      );
      entry.status = "sending";
    }
    await sleep(config.delayMs);
  }
  private entry(op: Operation, device?: Device, boundary: BoundaryRequest[] = []) {
    const entry: LogEntry = {
      seq: ++this.seq,
      at: Date.now(),
      ...(device ? { device: device.name, deviceId: device.id } : {}),
      op: op.type,
      payload: Object.fromEntries(
        Object.entries(op).filter(([key]) => key !== "type" && key !== "id"),
      ),
      boundary,
      status: "sending",
    };
    this.log.push(entry);
    return entry;
  }
  private read(device: Device): BoundaryRequest {
    const did = SIMULATED_ID[device.id];
    return device.kind === "fan"
      ? {
          method: "get_properties",
          params: Object.values(FAN_PROPERTIES).map(([siid, piid]) => ({ did, siid, piid })),
        }
      : { method: "get_prop", params: PROPS };
  }

  async handle(op: Operation): Promise<Result> {
    const device = this.state.devices.find((d) => d.id === op.id);
    const deviceScoped = ["refresh", "apply", "control"].includes(op.type);
    if (deviceScoped) {
      if (!device)
        return { status: 400, json: { error: "Choose a device connected to your account." } };
      return this.deviceOperation(op, device);
    }
    const entry = this.entry(op, device);
    // Account-wide work waits for no device lease, as in the gateway.
    if (this.accountBusy || this.leases.size) {
      entry.status = "rejected";
      entry.note = "Another request is in progress.";
      return {
        status: 400,
        json: { error: "Another request is in progress. Try again in a moment." },
      };
    }
    this.accountBusy = true;
    try {
      await sleep(300);
      entry.finishedAt = Date.now();
      entry.status = "confirmed";
      if (op.type === "visibility" && device) device.hidden = op.hidden as boolean;
      else if (op.type === "metadata" && device)
        Object.assign(device, { name: op.name as string, room: op.room as string });
      else if (op.type === "deleteScene")
        this.state.scenes = this.state.scenes.filter((s) => s.id !== op.id);
      else if (op.type === "discover")
        return { status: 200, json: { found: this.state.devices.length } };
      else if (op.type === "saveScene" && device?.kind === "light")
        this.state.scenes.push({
          id: `qa-scene-${this.seq}`,
          name: String(op.name),
          description: "Your saved light setting",
          mode: device.state.mode,
          kelvin: device.state.kelvin,
          color: device.state.color,
          brightness: device.state.brightness,
        });
      else {
        entry.status = "rejected";
        entry.note = "Not simulated in the isolated QA preview.";
        return {
          status: 403,
          json: {
            error: "Isolated QA preview: this action is not simulated. No device was contacted.",
          },
        };
      }
      return { status: 200, json: { ok: true } };
    } finally {
      this.accountBusy = false;
    }
  }

  private async deviceOperation(op: Operation, device: Device): Promise<Result> {
    const did = SIMULATED_ID[device.id];
    let boundary: BoundaryRequest[];
    try {
      if (op.type === "refresh") boundary = [this.read(device)];
      else if (op.type === "apply") {
        const settings = op.settings as DeviceSettings;
        if (Object.keys(settings).some((key) => !settingKeys(device.kind).includes(key)))
          throw new Error("Invalid setting for this device.");
        boundary =
          device.kind === "fan"
            ? [{ method: "set_properties", params: fanSettingsCommand(did, settings) }]
            : lightSettingsCommands(settings, op.duration as number | undefined).map(
                ([method, params]) => ({ method, params }),
              );
        boundary.push(this.read(device));
      } else {
        const action = String(op.action);
        const data = (op.data ?? {}) as Record<string, unknown>;
        boundary =
          device.kind === "fan"
            ? [{ method: "set_properties", params: [fanCommand(did, action, data)] }]
            : [(([method, params]) => ({ method, params }))(command(action, data))];
        boundary.push(this.read(device));
      }
    } catch (error) {
      const entry = this.entry(op, device);
      entry.status = "rejected";
      entry.note = error instanceof Error ? error.message : "Invalid request.";
      return { status: 400, json: { error: entry.note } };
    }
    const entry = this.entry(op, device, boundary);
    if (this.accountBusy || this.leases.has(device.id)) {
      entry.status = "rejected";
      entry.note = "Device lease held by another request.";
      return {
        status: 400,
        json: { error: "This device is finishing another request. Try again in a moment." },
      };
    }
    this.leases.add(device.id);
    try {
      await this.wait(device.id, entry);
      entry.finishedAt = Date.now();
      const config = this.config[device.id];
      if (config.failNext) {
        config.failNext = false;
        entry.status = "failed";
        entry.note = "Simulated: no acknowledgement. Not retried.";
        device.online = false;
        device.error =
          op.type === "refresh"
            ? "Unable to read the device. Check power and Xiaomi Home, then refresh."
            : "Command not confirmed. Refresh to check the device's current state.";
        this.activity(
          device,
          op.type === "refresh" ? null : "Command not confirmed — refresh before retrying",
          "error",
        );
        return {
          status: 502,
          json: {
            error:
              op.type === "refresh"
                ? device.error
                : "Device did not confirm. Refresh before trying again.",
          },
        };
      }
      if (op.type === "apply") {
        const settings = op.settings as DeviceSettings;
        Object.assign(device.state, settings);
        if (device.kind === "light") {
          if (settings.kelvin !== undefined) device.state.mode = "white";
          if (settings.color !== undefined) device.state.mode = "color";
        }
        this.activity(device, `Combined change: ${Object.keys(settings).join(", ")}`, "success");
      } else if (op.type === "control") {
        Object.assign(
          device.state,
          expectedCommandState(
            device.kind,
            String(op.action),
            (op.data ?? {}) as Record<string, unknown>,
          ),
        );
        if (device.kind === "light" && op.action === "scene") device.state.power = true;
        this.activity(device, `Command: ${String(op.action)}`, "success");
      }
      device.online = true;
      device.error = undefined;
      device.updatedAt = Date.now();
      entry.status = "confirmed";
      return { status: 200, json: { ok: true } };
    } finally {
      this.leases.delete(device.id);
    }
  }
  private activity(device: Device, label: string | null, status: "success" | "error") {
    if (!label) return;
    this.state.activity.unshift({
      id: `qa-${this.seq}`,
      deviceName: device.name,
      label,
      status,
      createdAt: Date.now(),
    });
    this.state.activity = this.state.activity.slice(0, 50);
  }
}

const store = globalThis as typeof globalThis & { __jarvisQA?: Simulator };
export const simulator = (store.__jarvisQA ??= new Simulator());
