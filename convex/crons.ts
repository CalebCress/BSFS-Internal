import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Refresh internship listings from the-trackr once a day.
crons.daily(
  "sync internship programmes from the-trackr",
  { hourUTC: 4, minuteUTC: 0 },
  internal.internshipsSync.dailySync,
);

export default crons;
