import { afterEach, expect, it, vi } from "vitest";
import { createClient, readLightAfterCommand } from "../convex/adapters/yeelight";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("waits for a bulb transition and repeats only reads until the setting is confirmed", async () => {
  vi.useFakeTimers();
  const client = createClient();
  const properties = (brightness: string) => [
    "on",
    brightness,
    "4000",
    "16711680",
    "0",
    "100",
    "2",
    "0",
    "0",
    "Light",
  ];
  const rpc = vi
    .spyOn(client, "rpc")
    .mockResolvedValueOnce(properties("20"))
    .mockResolvedValue(properties("70"));
  const result = readLightAfterCommand(client, "123", "brightness", {
    brightness: 70,
    duration: 500,
  });
  await vi.advanceTimersByTimeAsync(499);
  expect(rpc).not.toHaveBeenCalled();
  await vi.runAllTimersAsync();
  await expect(result).resolves.toMatchObject({ confirmed: true, state: { brightness: 70 } });
  expect(rpc).toHaveBeenCalledTimes(2);
  expect(rpc.mock.calls.every(([, method]) => method === "get_prop")).toBe(true);
});

it("reports an unconfirmed bulb state after bounded reads", async () => {
  vi.useFakeTimers();
  const client = createClient();
  const rpc = vi
    .spyOn(client, "rpc")
    .mockResolvedValue(["on", "20", "4000", "0", "0", "0", "2", "0", "0", "Light"]);
  const result = readLightAfterCommand(client, "123", "brightness", { brightness: 70 });
  await vi.runAllTimersAsync();
  await expect(result).resolves.toMatchObject({ confirmed: false, state: { brightness: 20 } });
  expect(rpc).toHaveBeenCalledTimes(3);
});
