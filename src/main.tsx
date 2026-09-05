import { ConvexAuthProvider } from "@convex-dev/auth/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

/**
 * Keep booking tokens out of analytics.
 *
 * /interview/:token carries a bearer capability in the path - anyone holding
 * that URL can see and book an applicant's interview. Vercel Analytics reports
 * the page path verbatim, so without this every token an applicant follows
 * would be recorded in a third-party dashboard. The path is collapsed to
 * /interview/[token] so the page is still counted, just not identified.
 */
function redactTokens(event: BeforeSendEvent): BeforeSendEvent {
  try {
    const url = new URL(event.url);
    if (/^\/interview\/.+/.test(url.pathname)) {
      url.pathname = "/interview/[token]";
      return { ...event, url: url.toString() };
    }
  } catch {
    // A URL we can't parse is one we can't vouch for either.
    return { ...event, url: "" };
  }
  return event;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <RouterProvider router={router} />
      {/* Outside the router so it also covers the public apply and booking
          pages, which sit on their own top-level routes. */}
      <Analytics beforeSend={redactTokens} />
    </ConvexAuthProvider>
  </React.StrictMode>,
);
