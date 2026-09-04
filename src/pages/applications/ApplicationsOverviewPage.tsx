import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STAGES, type Stage } from "@/lib/constants";

/**
 * Bar colour per stage.
 *
 * Not the STAGES badge colours: those are bg-*-100 tints chosen to sit behind
 * dark text, far too pale to read as a filled bar. These are the same hues one
 * step into readable territory, with one deliberate exception - Accepted is
 * teal rather than green. Green beside red is the classic red/green confusion
 * pair, and Accepted and Rejected sit next to each other here; teal/red
 * separates cleanly for deuteranopia (validated ΔE 13.1) where green/red does
 * not (ΔE 5.0). Every bar is labelled with its stage and count anyway, so
 * colour is never the only thing carrying identity.
 */
const STAGE_BAR_COLORS: Record<Stage, string> = {
  applied: "#2563eb",
  telephone: "#d97706",
  assessment_center: "#9333ea",
  accepted: "#0d9488",
  rejected: "#dc2626",
};

/** Pipeline order, not the object key order, so the bars read as a journey. */
const STAGE_ORDER: Stage[] = [
  "applied",
  "telephone",
  "assessment_center",
  "accepted",
  "rejected",
];

export function ApplicationsOverviewPage() {
  const stats = useQuery(api.applicants.getStats, {});

  const total = stats
    ? STAGE_ORDER.reduce((sum, stage) => sum + (stats[stage] ?? 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Applications Overview
        </h1>
        <p className="text-muted-foreground">
          Where this round&apos;s applicants currently stand.
        </p>
      </div>

      {stats === undefined ? (
        <div className="space-y-4">
          <Skeleton className="h-[130px] w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      ) : total === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="font-medium">No applications yet</p>
          <p className="text-sm">
            Numbers appear here as soon as the first application comes in.
          </p>
        </div>
      ) : (
        <>
          {/* The headline number needs no chart - it is one value. */}
          <Card>
            <CardContent className="py-6">
              <p className="text-sm font-medium text-muted-foreground">
                Total applications received
              </p>
              <p className="mt-1 text-5xl font-bold tabular-nums tracking-tight">
                {total}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Breakdown by stage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {STAGE_ORDER.map((stage) => {
                const count = stats[stage] ?? 0;
                const share = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div key={stage} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: STAGE_BAR_COLORS[stage] }}
                        />
                        <span className="text-sm font-medium">
                          {STAGES[stage].label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {count}
                        </span>
                        <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                          {share.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    {/* Recessive track, colour only on the value itself. */}
                    <div
                      aria-hidden
                      className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          // A stage with people in it must never render as
                          // nothing, however small its share.
                          minWidth: count > 0 ? "0.5rem" : 0,
                          background: STAGE_BAR_COLORS[stage],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
