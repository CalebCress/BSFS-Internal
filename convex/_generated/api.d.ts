/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as applicants from "../applicants.js";
import type * as applicationForms from "../applicationForms.js";
import type * as applications from "../applications.js";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as calendar from "../calendar.js";
import type * as crons from "../crons.js";
import type * as cvReviews from "../cvReviews.js";
import type * as email from "../email.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as internships from "../internships.js";
import type * as internshipsSync from "../internshipsSync.js";
import type * as interviewAccess from "../interviewAccess.js";
import type * as interviewBooking from "../interviewBooking.js";
import type * as interviewInvites from "../interviewInvites.js";
import type * as interviewSignups from "../interviewSignups.js";
import type * as interviewSlots from "../interviewSlots.js";
import type * as interviewTimes from "../interviewTimes.js";
import type * as massive from "../massive.js";
import type * as memberTheses from "../memberTheses.js";
import type * as permissions from "../permissions.js";
import type * as profiles from "../profiles.js";
import type * as resources from "../resources.js";
import type * as reviewCategories from "../reviewCategories.js";
import type * as reviewStats from "../reviewStats.js";
import type * as reviews from "../reviews.js";
import type * as stockTheses from "../stockTheses.js";
import type * as stocks from "../stocks.js";
import type * as uploadLimits from "../uploadLimits.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  applicants: typeof applicants;
  applicationForms: typeof applicationForms;
  applications: typeof applications;
  attendance: typeof attendance;
  auth: typeof auth;
  calendar: typeof calendar;
  crons: typeof crons;
  cvReviews: typeof cvReviews;
  email: typeof email;
  events: typeof events;
  http: typeof http;
  internships: typeof internships;
  internshipsSync: typeof internshipsSync;
  interviewAccess: typeof interviewAccess;
  interviewBooking: typeof interviewBooking;
  interviewInvites: typeof interviewInvites;
  interviewSignups: typeof interviewSignups;
  interviewSlots: typeof interviewSlots;
  interviewTimes: typeof interviewTimes;
  massive: typeof massive;
  memberTheses: typeof memberTheses;
  permissions: typeof permissions;
  profiles: typeof profiles;
  resources: typeof resources;
  reviewCategories: typeof reviewCategories;
  reviewStats: typeof reviewStats;
  reviews: typeof reviews;
  stockTheses: typeof stockTheses;
  stocks: typeof stocks;
  uploadLimits: typeof uploadLimits;
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

export declare const components: {
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
