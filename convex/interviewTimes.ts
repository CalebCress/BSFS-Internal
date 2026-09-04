/**
 * Interview time-window arithmetic, shared by the server and the React app.
 *
 * `tsconfig.app.json` includes both `src` and `convex`, so one module can serve
 * both sides. That matters here: the client disables a slot the server would
 * refuse, and the two must agree on what "overlapping" means or the UI will
 * offer moves that then fail.
 */

/** "HH:MM" as minutes past midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export type TimeWindow = {
  date: string;
  startTime: string;
  endTime: string;
};

/**
 * Do two slots occupy the same person at the same moment?
 *
 * Touching windows (10:00-10:30 and 10:30-11:00) do NOT overlap - back-to-back
 * interviews are normal and must stay bookable.
 */
export function overlaps(a: TimeWindow, b: TimeWindow): boolean {
  if (a.date !== b.date) return false;
  return (
    toMinutes(a.startTime) < toMinutes(b.endTime) &&
    toMinutes(b.startTime) < toMinutes(a.endTime)
  );
}
