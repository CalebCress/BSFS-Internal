/**
 * Sign-up sheet block arithmetic, shared by the server and the React app the
 * same way `interviewTimes.ts` is: the client draws the blocks the server will
 * accept a name against, and the two must agree on where the blocks fall.
 */
import { toMinutes } from "./interviewTimes";

/** Minutes past midnight as "HH:MM". */
export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * The start times of every block in [startTime, endTime).
 *
 * Only whole blocks count: a sheet from 10:00 to 11:15 in 30-minute blocks
 * has 10:00 and 10:30, and the trailing quarter hour is not offered.
 */
export function blockStarts(
  startTime: string,
  endTime: string,
  slotMinutes: number
): string[] {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (slotMinutes <= 0 || end <= start) return [];

  const starts: string[] = [];
  for (let t = start; t + slotMinutes <= end; t += slotMinutes) {
    starts.push(fromMinutes(t));
  }
  return starts;
}

/** The "HH:MM" a block starting at `blockStart` ends. */
export function blockEnd(blockStart: string, slotMinutes: number): string {
  return fromMinutes(toMinutes(blockStart) + slotMinutes);
}
