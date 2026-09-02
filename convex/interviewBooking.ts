import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/**
 * Public (unauthenticated) interview booking.
 *
 * Applicants reach these functions via a tokenised link, /interview/:token.
 * Following the repo's public-function idiom (applicationForms.getActive,
 * convex/applications.ts), these deliberately do NOT call getAuthUserId and
 * self-authorise with server-side validation instead.
 *
 * The token only IDENTIFIES the applicant. Whether they may book at all is
 * decided by their current stage, re-checked on every single call - so a
 * rejected applicant's link stops working immediately, even if they replay a
 * previously captured request.
 */

/** How long before an interview an applicant can still change or cancel it. */
export const RESCHEDULE_CUTOFF_HOURS = 24;

/** Interview times are wall-clock times in this zone. Convex servers run UTC. */
const TIMEZONE = "Europe/Rome";

const CUTOFF_MS = RESCHEDULE_CUTOFF_HOURS * 60 * 60 * 1000;

/**
 * Convert a naive "YYYY-MM-DD" + "HH:MM" pair into a real instant, reading the
 * pair as wall-clock time in TIMEZONE.
 *
 * Slots are stored without a zone, and the Convex runtime is UTC, so a plain
 * Date.parse would be off by the local offset - the server-side twin of the
 * T00:00:00 fix in src/lib/utils.ts. Deriving the offset from the date itself
 * (rather than hardcoding +01:00) keeps this correct across DST.
 */
export function slotStartMs(date: string, startTime: string): number {
  const asUtc = Date.parse(`${date}T${startTime}:00Z`);
  if (Number.isNaN(asUtc)) return NaN;

  const label =
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      timeZoneName: "longOffset",
    })
      .formatToParts(new Date(asUtc))
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";

  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(label);
  if (!match) return asUtc;

  const sign = match[1] === "+" ? 1 : -1;
  const offsetMinutes = sign * (Number(match[2]) * 60 + Number(match[3]));
  return asUtc - offsetMinutes * 60_000;
}

/** Stages during which an applicant has an interview to book. */
type InterviewStage = "telephone" | "assessment_center";

type Resolved =
  | { status: "invalid" }
  | { status: "complete" }
  | { status: "ok"; applicant: Doc<"applicants">; stage: InterviewStage };

/**
 * Resolve a booking token to an applicant who is currently allowed to book.
 *
 * Every entry point goes through this, so the stage gate can't drift between
 * the query and the mutations.
 */
async function resolveApplicant(
  ctx: QueryCtx,
  rawToken: string
): Promise<Resolved> {
  const token = rawToken?.trim() ?? "";

  // Guard BEFORE the index query. bookingToken is optional, so rows predating
  // the backfill are indexed under `undefined` - querying with an empty token
  // would match one of them and hand out a real applicant.
  if (token.length < 16) return { status: "invalid" };

  const applicant = await ctx.db
    .query("applicants")
    .withIndex("by_bookingToken", (q) => q.eq("bookingToken", token))
    // .unique() so a duplicate-token bug throws loudly rather than silently
    // picking one of two applicants.
    .unique();

  if (!applicant) return { status: "invalid" };

  if (applicant.stage === "accepted") return { status: "complete" };

  // "rejected" and "applied" both fall through to `invalid`, and the page
  // renders identical copy for them - distinguishing the two would let anyone
  // holding a stray link learn that a named person was rejected.
  if (applicant.stage !== "telephone" && applicant.stage !== "assessment_center") {
    return { status: "invalid" };
  }

  return { status: "ok", applicant, stage: applicant.stage };
}

/** Sort key for a slot: works because dates are YYYY-MM-DD and times HH:MM. */
function slotKey(slot: { date: string; startTime: string }): string {
  return `${slot.date}T${slot.startTime}`;
}

/** Every slot currently held by this applicant, earliest first. */
async function heldSlots(ctx: QueryCtx, applicantId: Doc<"applicants">["_id"]) {
  const slots = await ctx.db
    .query("interviewSlots")
    .withIndex("by_applicant", (q) => q.eq("applicantId", applicantId))
    .collect();
  return slots.sort((a, b) => slotKey(a).localeCompare(slotKey(b)));
}

/**
 * Load everything the public booking page needs for one token.
 *
 * Slots are grouped into one entry per time window: an assessment centre runs
 * several tables at the same time, each its own row, and the applicant picks a
 * time, never a table.
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const resolved = await resolveApplicant(ctx, args.token);
    if (resolved.status !== "ok") return { status: resolved.status } as const;

    const { applicant, stage } = resolved;
    const now = Date.now();

    const allSlots = await ctx.db
      .query("interviewSlots")
      .withIndex("by_type", (q) => q.eq("type", stage))
      .collect();

    // Group by time window. Never leak who holds a taken table, nor the
    // internal fields (createdBy, maxInterviewers, table numbers).
    const groups = new Map<
      string,
      {
        date: string;
        startTime: string;
        endTime: string;
        available: boolean;
        isMine: boolean;
      }
    >();

    for (const slot of allSlots) {
      if (slotStartMs(slot.date, slot.startTime) <= now) continue;

      const key = slotKey(slot);
      const existing = groups.get(key);
      const free = slot.applicantId === undefined;
      const mine = slot.applicantId === applicant._id;

      if (existing) {
        existing.available = existing.available || free;
        existing.isMine = existing.isMine || mine;
      } else {
        groups.set(key, {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          available: free,
          isMine: mine,
        });
      }
    }

    const slots = [...groups.values()].sort((a, b) =>
      slotKey(a).localeCompare(slotKey(b))
    );

    // Staff can assign an applicant to more than one slot via interviewSlots.update,
    // so prefer the next upcoming one and fall back to the earliest.
    const held = await heldSlots(ctx, applicant._id);
    const current =
      held.find((s) => slotStartMs(s.date, s.startTime) > now) ?? held[0] ?? null;

    const booking = current
      ? {
          date: current.date,
          startTime: current.startTime,
          endTime: current.endTime,
          changeDeadlineMs:
            slotStartMs(current.date, current.startTime) - CUTOFF_MS,
          canChange:
            slotStartMs(current.date, current.startTime) - now > CUTOFF_MS,
        }
      : null;

    return {
      status: "ok" as const,
      firstName: applicant.firstName,
      type: stage,
      cutoffHours: RESCHEDULE_CUTOFF_HOURS,
      booking,
      slots,
    };
  },
});

/** Shared cutoff guard: refuse if any slot they hold is inside the cutoff. */
function assertChangeable(held: Doc<"interviewSlots">[], now: number) {
  for (const slot of held) {
    if (slotStartMs(slot.date, slot.startTime) - now < CUTOFF_MS) {
      throw new Error(
        `Your interview is less than ${RESCHEDULE_CUTOFF_HOURS} hours away and can no longer be changed online. Please email us to make a change.`
      );
    }
  }
}

/**
 * Book (or move to) a time window.
 *
 * The client sends a time, not a table; the server claims the lowest-numbered
 * free table at that time.
 *
 * Concurrency: two applicants clicking the same last free table is handled by
 * Convex itself. Mutations are serializable transactions with optimistic
 * concurrency control - the loser's read set changed under it, so it aborts and
 * is retried from the top, re-reads, finds nothing free and throws the "just
 * taken" message. This only holds because the read and the write live in the
 * SAME mutation, so do not split the availability check out to the client.
 */
export const book = mutation({
  args: {
    token: v.string(),
    date: v.string(),
    startTime: v.string(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveApplicant(ctx, args.token);
    if (resolved.status !== "ok") {
      throw new Error(
        "This booking link is no longer active. Please contact us if you think this is a mistake."
      );
    }

    const { applicant, stage } = resolved;
    const now = Date.now();

    const startMs = slotStartMs(args.date, args.startTime);
    if (Number.isNaN(startMs)) throw new Error("That time is not valid.");
    if (startMs <= now) {
      throw new Error("That time has already passed. Please pick another one.");
    }

    // All rows (tables) for this time window, in this applicant's round.
    const candidates = (
      await ctx.db
        .query("interviewSlots")
        .withIndex("by_type", (q) => q.eq("type", stage))
        .collect()
    )
      .filter((s) => s.date === args.date && s.startTime === args.startTime)
      .sort((a, b) => (a.tableNumber ?? 1) - (b.tableNumber ?? 1));

    if (candidates.length === 0) {
      throw new Error("That time is no longer available. Please pick another one.");
    }

    // Already booked at this exact time - treat a double submit as a no-op
    // rather than an error.
    if (candidates.some((s) => s.applicantId === applicant._id)) {
      return { ok: true as const };
    }

    const free = candidates.find((s) => s.applicantId === undefined);
    if (!free) {
      throw new Error(
        "Sorry, that time was just taken by someone else. Please pick another one."
      );
    }

    // Releasing the old booking and claiming the new one happen in one
    // transaction, so the applicant is never left holding nothing.
    const held = await heldSlots(ctx, applicant._id);
    assertChangeable(held, now);
    for (const slot of held) {
      await ctx.db.patch(slot._id, { applicantId: undefined });
    }

    await ctx.db.patch(free._id, { applicantId: applicant._id });
    return { ok: true as const };
  },
});

/** Release the applicant's booking, subject to the same cutoff. */
export const cancel = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const resolved = await resolveApplicant(ctx, args.token);
    if (resolved.status !== "ok") {
      throw new Error(
        "This booking link is no longer active. Please contact us if you think this is a mistake."
      );
    }

    const held = await heldSlots(ctx, resolved.applicant._id);
    if (held.length === 0) throw new Error("You have no booking to cancel.");

    assertChangeable(held, Date.now());
    for (const slot of held) {
      await ctx.db.patch(slot._id, { applicantId: undefined });
    }

    return { ok: true as const };
  },
});

