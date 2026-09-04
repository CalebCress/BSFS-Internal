/**
 * Local draft of the public application form.
 *
 * Applicants write long answers, so losing them to a closed tab is costly.
 * Values are kept in localStorage on this device only - nothing is sent to the
 * server until they actually submit.
 *
 * The draft expires a month after the LAST EDIT, not the first save, so an
 * actively-worked-on application never lapses.
 */

const DRAFT_STORAGE_KEY = "bsfs_apply_draft";
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type DraftValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  aboutYou: string;
  recentHeadline: string;
};

export const EMPTY_DRAFT: DraftValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  aboutYou: "",
  recentHeadline: "",
};

type StoredDraft = {
  /** Which application round the draft belongs to. */
  formId: string | null;
  updatedAt: number;
  values: DraftValues;
};

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private browsing); nothing to recover from.
  }
}

/**
 * Read the saved draft, or null when there isn't a usable one.
 *
 * Returns null AND clears storage when the draft is older than a month or is
 * malformed, so a stale or corrupt entry can never leave the form half-filled.
 */
export function loadDraft(): StoredDraft | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (typeof parsed?.updatedAt !== "number") throw new Error("bad draft");

    if (Date.now() - parsed.updatedAt > DRAFT_MAX_AGE_MS) {
      clearDraft();
      return null;
    }

    const values = (parsed.values ?? {}) as Partial<DraftValues>;
    return {
      formId: typeof parsed.formId === "string" ? parsed.formId : null,
      updatedAt: parsed.updatedAt,
      values: {
        firstName: asString(values.firstName),
        lastName: asString(values.lastName),
        email: asString(values.email),
        phone: asString(values.phone),
        aboutYou: asString(values.aboutYou),
        recentHeadline: asString(values.recentHeadline),
      },
    };
  } catch {
    clearDraft();
    return null;
  }
}

/** True when the applicant has actually typed something worth keeping. */
export function draftHasContent(values: Partial<DraftValues>): boolean {
  return Object.values(values).some(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

export function saveDraft(
  values: Partial<DraftValues>,
  formId: string | null
): void {
  if (typeof window === "undefined") return;
  // Don't create a key just because someone opened the page.
  if (!draftHasContent(values)) return;

  try {
    const draft: StoredDraft = {
      formId,
      updatedAt: Date.now(),
      values: { ...EMPTY_DRAFT, ...values },
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // A failed draft save must never block the form.
  }
}

/**
 * Record of a completed submission, kept on this device for the same month as
 * a draft.
 *
 * Applicants close the tab and come back wondering whether it went through, so
 * reopening the page shows their status instead of a blank form. It is a local
 * receipt, not proof - the server is the record of what was actually received.
 */

const SUBMITTED_STORAGE_KEY = "bsfs_apply_submitted";

export type StoredSubmission = {
  /** Which round it was submitted to, so a new round starts fresh. */
  formId: string | null;
  submittedAt: number;
  email: string;
};

export function clearSubmission(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SUBMITTED_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private browsing); nothing to recover from.
  }
}

/** Read the saved receipt, clearing it when it is older than a month or bad. */
export function loadSubmission(): StoredSubmission | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SUBMITTED_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSubmission>;
    if (typeof parsed?.submittedAt !== "number") throw new Error("bad receipt");

    if (Date.now() - parsed.submittedAt > DRAFT_MAX_AGE_MS) {
      clearSubmission();
      return null;
    }

    return {
      formId: typeof parsed.formId === "string" ? parsed.formId : null,
      submittedAt: parsed.submittedAt,
      email: asString(parsed.email),
    };
  } catch {
    clearSubmission();
    return null;
  }
}

export function saveSubmission(email: string, formId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const submission: StoredSubmission = {
      formId,
      submittedAt: Date.now(),
      email,
    };
    window.localStorage.setItem(
      SUBMITTED_STORAGE_KEY,
      JSON.stringify(submission)
    );
  } catch {
    // A failed receipt save must never break a successful submission.
  }
}
