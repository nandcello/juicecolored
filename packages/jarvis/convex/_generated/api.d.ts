/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adapters_fan from "../adapters/fan.js";
import type * as adapters_vendor_controls from "../adapters/vendor/controls.js";
import type * as adapters_vendor_xiaomi from "../adapters/vendor/xiaomi.js";
import type * as adapters_yeelight from "../adapters/yeelight.js";
import type * as crypto from "../crypto.js";
import type * as fanCalibration from "../fanCalibration.js";
import type * as fanDirectionStore from "../fanDirectionStore.js";
import type * as fanMotion from "../fanMotion.js";
import type * as fanMotionActions from "../fanMotionActions.js";
import type * as fanMotionState from "../fanMotionState.js";
import type * as gateway from "../gateway.js";
import type * as security from "../security.js";
import type * as store from "../store.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "adapters/fan": typeof adapters_fan;
  "adapters/vendor/controls": typeof adapters_vendor_controls;
  "adapters/vendor/xiaomi": typeof adapters_vendor_xiaomi;
  "adapters/yeelight": typeof adapters_yeelight;
  crypto: typeof crypto;
  fanCalibration: typeof fanCalibration;
  fanDirectionStore: typeof fanDirectionStore;
  fanMotion: typeof fanMotion;
  fanMotionActions: typeof fanMotionActions;
  fanMotionState: typeof fanMotionState;
  gateway: typeof gateway;
  security: typeof security;
  store: typeof store;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
