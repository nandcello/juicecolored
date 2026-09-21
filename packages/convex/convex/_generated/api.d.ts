/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as canceldt_access from "../canceldt/access.js";
import type * as canceldt_admin from "../canceldt/admin.js";
import type * as canceldt_login from "../canceldt/login.js";
import type * as canceldt_loginLimit from "../canceldt/loginLimit.js";
import type * as canceldt_model from "../canceldt/model.js";
import type * as canceldt_public from "../canceldt/public.js";
import type * as canceldt_reports from "../canceldt/reports.js";
import type * as crons from "../crons.js";
import type * as food from "../food.js";
import type * as http from "../http.js";
import type * as listening from "../listening.js";
import type * as places from "../places.js";
import type * as restaurantReviews from "../restaurantReviews.js";
import type * as uploadthing from "../uploadthing.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "canceldt/access": typeof canceldt_access;
  "canceldt/admin": typeof canceldt_admin;
  "canceldt/login": typeof canceldt_login;
  "canceldt/loginLimit": typeof canceldt_loginLimit;
  "canceldt/model": typeof canceldt_model;
  "canceldt/public": typeof canceldt_public;
  "canceldt/reports": typeof canceldt_reports;
  crons: typeof crons;
  food: typeof food;
  http: typeof http;
  listening: typeof listening;
  places: typeof places;
  restaurantReviews: typeof restaurantReviews;
  uploadthing: typeof uploadthing;
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
