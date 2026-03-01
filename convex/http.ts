import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// iCal calendar feed endpoint
http.route({
  path: "/api/calendar",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token parameter", { status: 400 });
    }

    const profile = await ctx.runQuery(
      internal.calendar.getProfileByIcalToken,
      { token }
    );

    if (!profile) {
      return new Response("Invalid token", { status: 401 });
    }

    const data = await ctx.runQuery(internal.calendar.getCalendarData, {
      userId: profile.userId,
    });

    const now = new Date();
    const timestamp =
      now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    let ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BSFS Internal//Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:BSFS Calendar`,
    ];

    // Add events
    for (const event of data.events) {
      const dtStart = event.date.replace(/-/g, "") + "T" + event.startTime.replace(/:/g, "") + "00";
      const dtEnd = event.date.replace(/-/g, "") + "T" + event.endTime.replace(/:/g, "") + "00";

      ical.push("BEGIN:VEVENT");
      ical.push(`UID:event-${event._id}@bsfs`);
      ical.push(`DTSTAMP:${timestamp}`);
      ical.push(`DTSTART:${dtStart}`);
      ical.push(`DTEND:${dtEnd}`);
      ical.push(`SUMMARY:${escapeIcal(event.title)}`);
      if (event.location) {
        ical.push(`LOCATION:${escapeIcal(event.location)}`);
      }
      if (event.description) {
        ical.push(`DESCRIPTION:${escapeIcal(event.description)}`);
      }
      ical.push("END:VEVENT");
    }

    // Add interview signups
    for (const interview of data.interviews) {
      const typeLabel =
        interview.type === "telephone"
          ? "Telephone Interview"
          : "Assessment Center";
      const summary = interview.applicantName
        ? `${typeLabel}: ${interview.applicantName}`
        : typeLabel;

      const dtStart = interview.date.replace(/-/g, "") + "T" + interview.startTime.replace(/:/g, "") + "00";
      const dtEnd = interview.date.replace(/-/g, "") + "T" + interview.endTime.replace(/:/g, "") + "00";

      ical.push("BEGIN:VEVENT");
      ical.push(`UID:interview-${interview._id}@bsfs`);
      ical.push(`DTSTAMP:${timestamp}`);
      ical.push(`DTSTART:${dtStart}`);
      ical.push(`DTEND:${dtEnd}`);
      ical.push(`SUMMARY:${escapeIcal(summary)}`);
      ical.push("END:VEVENT");
    }

    ical.push("END:VCALENDAR");

    return new Response(ical.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bsfs-calendar.ics"',
      },
    });
  }),
});

function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export default http;
