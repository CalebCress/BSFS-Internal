import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // User profiles (extends auth users with app-specific data)
  profiles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("board_member"),
      v.literal("committee_member"),
      v.literal("alumni")
    ),
    specialRole: v.optional(
      v.union(v.literal("admin"), v.literal("attendance_tracker"))
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    displayName: v.string(),
    linkedIn: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    cvStorageId: v.optional(v.id("_storage")),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    icalToken: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_icalToken", ["icalToken"])
    .index("by_status", ["status"]),

  // Application rounds (one per semester)
  applicationForms: defineTable({
    title: v.string(),
    semester: v.string(),
    description: v.optional(v.string()),
    fields: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          type: v.union(
            v.literal("text"),
            v.literal("textarea"),
            v.literal("select"),
            v.literal("file"),
            v.literal("email"),
            v.literal("url")
          ),
          required: v.boolean(),
          options: v.optional(v.array(v.string())),
          placeholder: v.optional(v.string()),
        })
      )
    ),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),

  // Applicants (external, non-authenticated people)
  applicants: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    stage: v.union(
      v.literal("applied"),
      v.literal("telephone"),
      v.literal("assessment_center"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    applicationFormId: v.id("applicationForms"),
    appliedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_stage", ["stage"])
    .index("by_email", ["email"])
    .index("by_applicationForm", ["applicationFormId"]),

  // Application form submissions
  applications: defineTable({
    applicantId: v.id("applicants"),
    applicationFormId: v.id("applicationForms"),
    responses: v.array(
      v.object({
        fieldId: v.string(),
        value: v.string(),
      })
    ),
    cvStorageId: v.optional(v.id("_storage")),
    submittedAt: v.number(),
  })
    .index("by_applicant", ["applicantId"])
    .index("by_form", ["applicationFormId"]),

  // Interview timeslots
  interviewSlots: defineTable({
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    type: v.union(
      v.literal("telephone"),
      v.literal("assessment_center")
    ),
    maxInterviewers: v.number(),
    applicantId: v.optional(v.id("applicants")),
    createdBy: v.id("users"),
  })
    .index("by_date", ["date"])
    .index("by_type", ["type"])
    .index("by_applicant", ["applicantId"]),

  // Users signed up for interview slots
  interviewSignups: defineTable({
    slotId: v.id("interviewSlots"),
    userId: v.id("users"),
    signedUpAt: v.number(),
  })
    .index("by_slot", ["slotId"])
    .index("by_user", ["userId"]),

  // Calendar events
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    location: v.optional(v.string()),
    seriesId: v.optional(v.string()),
    createdBy: v.id("users"),
    isCorporateMarketUpdate: v.optional(v.boolean()),
    corporateAssignee: v.optional(v.id("users")),
    marketAssignee: v.optional(v.id("users")),
    mandatoryAttendance: v.optional(v.boolean()),
  })
    .index("by_date", ["date"])
    .index("by_series", ["seriesId"]),

  // Attendance records
  attendance: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("excused")
    ),
    recordedBy: v.id("users"),
    recordedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_user", ["eventId", "userId"]),

  // Uploaded presentation resources
  resources: defineTable({
    title: v.string(),
    eventId: v.id("events"),
    fileStorageId: v.id("_storage"),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_uploadedAt", ["uploadedAt"]),

  // Reviews/scores given to applicants
  reviews: defineTable({
    applicantId: v.id("applicants"),
    reviewerId: v.id("users"),
    scores: v.object({
      overall: v.number(),
      motivation: v.optional(v.number()),
      experience: v.optional(v.number()),
      cultureFit: v.optional(v.number()),
    }),
    comments: v.optional(v.string()),
    reviewType: v.union(
      v.literal("application"),
      v.literal("telephone"),
      v.literal("assessment_center")
    ),
    createdAt: v.number(),
  })
    .index("by_applicant", ["applicantId"])
    .index("by_reviewer", ["reviewerId"])
    .index("by_type", ["reviewType"]),

  // Stock tickers for thesis sharing
  stocks: defineTable({
    ticker: v.string(),
    name: v.string(),
    sector: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_ticker", ["ticker"]),

  // User investment theses on stocks
  stockTheses: defineTable({
    stockId: v.id("stocks"),
    userId: v.id("users"),
    rating: v.number(),
    thesis: v.string(),
    sentiment: v.union(
      v.literal("bullish"),
      v.literal("bearish"),
      v.literal("neutral")
    ),
    priceTarget: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stock", ["stockId"])
    .index("by_user", ["userId"]),
});
