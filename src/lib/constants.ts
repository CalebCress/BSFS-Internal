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

export const REVIEW_TYPES = {
  application: { label: "Application" },
  telephone: { label: "Telephone" },
  assessment_center: { label: "Assessment Center" },
} as const;

export type ReviewType = keyof typeof REVIEW_TYPES;

export const SCORE_CATEGORIES = [
  { key: "overall" as const, label: "Overall", required: true },
  { key: "motivation" as const, label: "Motivation", required: false },
  { key: "experience" as const, label: "Experience", required: false },
  { key: "cultureFit" as const, label: "Culture Fit", required: false },
] as const;

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
