import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const submit = mutation({
  args: {
    applicationFormId: v.id("applicationForms"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    whyBsfs: v.string(),
    interestingLearning: v.string(),
    cvStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Validate the form is active
    const form = await ctx.db.get(args.applicationFormId);
    if (!form || !form.isActive) {
      throw new Error(
        "This application round is not currently accepting applications."
      );
    }

    // Server-side validation
    if (!args.firstName.trim()) throw new Error("First name is required.");
    if (!args.lastName.trim()) throw new Error("Last name is required.");
    if (!args.email.trim()) throw new Error("Email is required.");
    if (!args.phone.trim()) throw new Error("Phone number is required.");
    if (!args.whyBsfs.trim())
      throw new Error("Please answer the first question.");
    if (!args.interestingLearning.trim())
      throw new Error("Please answer the second question.");

    // Check for duplicate email within this round
    const existingApplicant = await ctx.db
      .query("applicants")
      .withIndex("by_email", (q) =>
        q.eq("email", args.email.trim().toLowerCase())
      )
      .first();

    if (
      existingApplicant &&
      existingApplicant.applicationFormId === args.applicationFormId
    ) {
      throw new Error(
        "An application with this email has already been submitted for this round."
      );
    }

    const now = Date.now();

    // Create applicant record
    const applicantId = await ctx.db.insert("applicants", {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: args.email.trim().toLowerCase(),
      phone: args.phone.trim(),
      stage: "applied",
      applicationFormId: args.applicationFormId,
      appliedAt: now,
    });

    // Create application record with responses
    await ctx.db.insert("applications", {
      applicantId,
      applicationFormId: args.applicationFormId,
      responses: [
        { fieldId: "why_bsfs", value: args.whyBsfs.trim() },
        {
          fieldId: "interesting_learning",
          value: args.interestingLearning.trim(),
        },
      ],
      cvStorageId: args.cvStorageId,
      submittedAt: now,
    });

    return applicantId;
  },
});
