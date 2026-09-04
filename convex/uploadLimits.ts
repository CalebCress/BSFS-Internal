/**
 * Upload size limits, shared by the browser and the server.
 *
 * A pure module (no Convex imports) so the React app can import it without
 * pulling server code into the bundle - the same idiom as reviewCategories.ts
 * and interviewTimes.ts.
 */

/**
 * Largest CV an applicant may attach.
 *
 * Held at 4MB for the serverless request limits the app is deployed behind.
 * The browser check is a courtesy - it fails fast with a clear message instead
 * of after a long upload - so the server checks the stored file too.
 */
export const MAX_CV_BYTES = 4 * 1024 * 1024;

/** "4MB" - for user-facing copy, so the number is never written twice. */
export const MAX_CV_LABEL = `${MAX_CV_BYTES / (1024 * 1024)}MB`;
