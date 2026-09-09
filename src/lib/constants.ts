export const STAGES = {
  applied: { label: "Applied", color: "bg-blue-100 text-blue-800" },
  telephone: { label: "Telephone Interview", color: "bg-yellow-100 text-yellow-800" },
  assessment_center: { label: "Assessment Center", color: "bg-purple-100 text-purple-800" },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
} as const;

export type Stage = keyof typeof STAGES;

export const ROLES = {
  board_member: { label: "Board Member" },
  committee_member: { label: "Committee Member" },
  alumni: { label: "Alumni" },
} as const;

export type Role = keyof typeof ROLES;

export const SPECIAL_ROLES = {
  admin: { label: "Admin" },
  attendance_tracker: { label: "Attendance Tracker" },
  cv_reviewer: { label: "CV Reviewer" },
  ti_reviewer: { label: "TI Reviewer" },
} as const;

export type SpecialRole = keyof typeof SPECIAL_ROLES;

/**
 * What one of several parallel interviews at the same time is called.
 *
 * The underlying model is identical for both rounds - N rows sharing a time
 * window, one applicant each - but "table" only means something at an
 * assessment centre. A telephone round runs concurrent calls.
 */
export const PARALLEL_SLOT_LABELS = {
  telephone: {
    one: "Interview",
    field: "Interviews per Time Slot",
    help: "How many interviews run at the same time. Each takes one applicant.",
  },
  assessment_center: {
    one: "Table",
    field: "Tables per Time Slot",
    help: "How many tables run at the same time. Each seats one applicant.",
  },
} as const;

export const REVIEW_TYPES = {
  application: { label: "Application" },
  telephone: { label: "Telephone" },
  assessment_center: { label: "Assessment Center" },
} as const;

export type ReviewType = keyof typeof REVIEW_TYPES;

// Review categories and the 1-5 scale live in convex/reviewCategories.ts so the
// server validates against exactly what the UI renders. Re-exported here so
// existing "@/lib/constants" imports keep working.
export {
  REVIEW_CATEGORIES,
  SCORE_MIN,
  SCORE_MAX,
  BOARD_ONLY_REVIEW_TYPES,
  canSeeReviewType,
  isBoardOnlyReviewType,
  stageToReviewType,
} from "../../convex/reviewCategories";
export type { ScoreKey } from "../../convex/reviewCategories";

// Stock section constants

export const STOCK_RATINGS = {
  1: { label: "Strong Sell", color: "bg-red-100 text-red-800" },
  2: { label: "Sell", color: "bg-orange-100 text-orange-800" },
  3: { label: "Hold", color: "bg-yellow-100 text-yellow-800" },
  4: { label: "Buy", color: "bg-blue-100 text-blue-800" },
  5: { label: "Strong Buy", color: "bg-green-100 text-green-800" },
} as const;

export const SENTIMENT = {
  bullish: { label: "Bullish", color: "bg-green-100 text-green-800" },
  bearish: { label: "Bearish", color: "bg-red-100 text-red-800" },
  neutral: { label: "Neutral", color: "bg-gray-100 text-gray-800" },
} as const;

export type Sentiment = keyof typeof SENTIMENT;

// Member status constants
export const MEMBER_STATUSES = {
  pending: { label: "Pending Approval", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
} as const;

export type MemberStatus = keyof typeof MEMBER_STATUSES;
