import { v } from "convex/values";

export const bridgeRequest = {
  externalId: v.string(),
  method: v.string(),
  params: v.array(v.any()),
};
export const bridgeStatus = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("done"),
  v.literal("failed"),
);
export const lightMethods = new Set([
  "get_prop",
  "set_power",
  "set_bright",
  "set_ct_abx",
  "set_rgb",
  "set_hsv",
  "set_scene",
  "cron_add",
  "cron_del",
  "cron_get",
  "set_default",
  "stop_cf",
  "start_cf",
]);
