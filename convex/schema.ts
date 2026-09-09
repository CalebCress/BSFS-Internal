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
      v.union(
        v.literal("admin"),
        v.literal("attendance_tracker"),
        v.literal("cv_reviewer"),
        v.literal("ti_reviewer")
      )
    ),
    phoneNumber: v.optional(v.string()),
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
    // Optional because applicants who applied before these fields existed
    // have neither. Both are required on new submissions.
    graduationYear: v.optional(v.number()),
    course: v.optional(v.string()),
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
    // Secret token for the public interview booking link (/interview/:token).
    // Optional because rows created before this feature have none.
    bookingToken: v.optional(v.string()),
    // When a booking invite was last emailed, per interview stage, so a bulk
    // send can skip anyone already contacted FOR THAT STAGE. An applicant is
    // invited twice over a round - once to the telephone interview and again
    // to the assessment centre - so this can't be a single timestamp.
    inviteSentAt: v.optional(
      v.object({
        telephone: v.optional(v.number()),
        assessment_center: v.optional(v.number()),
      })
    ),
    // Deprecated predecessor of inviteSentAt: a single timestamp with no record
    // of which stage it was for. Kept so documents written before the split
    // still validate; read as a telephone invite, which is the stage everyone
    // is invited to first. No longer written.
    inviteLastSentAt: v.optional(v.number()),
  })
    .index("by_stage", ["stage"])
    .index("by_email", ["email"])
    .index("by_applicationForm", ["applicationFormId"])
    .index("by_bookingToken", ["bookingToken"]),

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
    // Which of the parallel interviews at this time window this row is - a
    // table at an assessment centre, a concurrent call in a telephone round.
    // Each is its own row sharing date/startTime/endTime, so one applicant per
    // row still holds. Absent when only one runs at a time.
    tableNumber: v.optional(v.number()),
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
    eventType: v.optional(v.union(
      v.literal("corporate_market_update"),
      v.literal("workshop"),
      v.literal("regional"),
      v.literal("other"),
    )),
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
    eventId: v.optional(v.id("events")),
    fileStorageId: v.id("_storage"),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    category: v.optional(v.union(
      v.literal("market_corporate"),
      v.literal("workshop"),
      v.literal("interview_prep"),
      v.literal("regional_reports"),
      v.literal("special_reports"),
    )),
    presenterUserId: v.optional(v.id("users")),
  })
    .index("by_event", ["eventId"])
    .index("by_uploadedAt", ["uploadedAt"])
    .index("by_category", ["category"]),

  // CV review requests
  cvReviews: defineTable({
    submittedBy: v.id("users"),
    cvStorageId: v.id("_storage"),
    assignedTo: v.optional(v.id("users")), // undefined = "Anyone"
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
    ),
    submittedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_submittedBy", ["submittedBy"])
    .index("by_assignedTo", ["assignedTo"])
    .index("by_status", ["status"]),

  // Reviews/scores given to applicants
  reviews: defineTable({
    applicantId: v.id("applicants"),
    reviewerId: v.id("users"),
    // Which two of these are required depends on reviewType; the server
    // validates against REVIEW_CATEGORIES in convex/reviewCategories.ts.
    scores: v.object({
      cv: v.optional(v.number()),
      responses: v.optional(v.number()),
      technical: v.optional(v.number()),
      behavioral: v.optional(v.number()),
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
    .index("by_type", ["reviewType"])
    .index("by_applicant_reviewer_type", [
      "applicantId",
      "reviewerId",
      "reviewType",
    ]),

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

  // Internship listings (cached from the-trackr API + user-added)
  internshipProgrammes: defineTable({
    source: v.union(v.literal("trackr"), v.literal("user")),
    externalId: v.optional(v.string()),
    addedBy: v.optional(v.id("users")),
    name: v.string(),
    companyName: v.string(),
    companyId: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    url: v.optional(v.string()),
    region: v.optional(v.string()),
    industry: v.optional(v.string()),
    season: v.string(),
    type: v.optional(v.string()),
    categories: v.array(v.string()),
    locations: v.array(v.string()),
    process: v.optional(v.string()),
    openingDate: v.optional(v.number()),
    closingDate: v.optional(v.number()),
    currentStage: v.optional(v.string()),
    rolling: v.optional(v.boolean()),
    requiresCv: v.optional(v.boolean()),
    coverLetter: v.optional(v.string()),
    writtenAnswers: v.optional(v.string()),
    sponsorsVisa: v.optional(v.string()),
    notes: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
  })
    .index("by_externalId", ["externalId"])
    .index("by_source", ["source"])
    .index("by_addedBy", ["addedBy"])
    .index("by_season", ["season"]),

  // Per-user application progress on an internship
  internshipProgress: defineTable({
    userId: v.id("users"),
    programmeId: v.id("internshipProgrammes"),
    status: v.union(
      v.literal("not_started"),
      v.literal("applied"),
      v.literal("online_assessment"),
      v.literal("hirevue"),
      v.literal("technical_interview"),
      v.literal("assessment_centre"),
      v.literal("final"),
      v.literal("offer"),
      v.literal("rejected"),
      v.literal("withdrew"),
    ),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_programme", ["programmeId"])
    .index("by_user_programme", ["userId", "programmeId"]),
});
