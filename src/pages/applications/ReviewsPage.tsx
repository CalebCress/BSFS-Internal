import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "./components/StageBadge";
import { Star } from "lucide-react";
import { isBoardOnlyReviewType, type ReviewType } from "@/lib/constants";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

const ALL_REVIEW_TYPE_TABS: { value: ReviewType; label: string }[] = [
  { value: "application", label: "Application" },
  { value: "telephone", label: "Telephone" },
  { value: "assessment_center", label: "Assessment Center" },
];

export function ReviewsPage() {
  const navigate = useNavigate();
  const { isBoardMember } = useCurrentProfile();

  // Application and telephone queues are board-only.
  const REVIEW_TYPE_TABS = useMemo(
    () =>
      ALL_REVIEW_TYPE_TABS.filter(
        (tab) => isBoardMember || !isBoardOnlyReviewType(tab.value)
      ),
    [isBoardMember]
  );

  const [tabOverride, setTabOverride] = useState<ReviewType | null>(null);
  // Never land on a tab this user can't see - the profile loads asynchronously,
  // so the fallback is derived rather than held in initial state.
  const activeTab: ReviewType =
    tabOverride && REVIEW_TYPE_TABS.some((t) => t.value === tabOverride)
      ? tabOverride
      : (REVIEW_TYPE_TABS[0]?.value ?? "assessment_center");
  const setActiveTab = setTabOverride;

  const unreviewed = useQuery(api.reviews.listUnreviewed, {
    reviewType: activeTab,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">
          Applicants awaiting your review. Click &ldquo;Review&rdquo; to open
          their detail page.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ReviewType)}
      >
        <TabsList>
          {REVIEW_TYPE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {REVIEW_TYPE_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            {unreviewed === undefined ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : unreviewed.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                <Star className="mx-auto mb-3 h-8 w-8 opacity-40" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">
                  You&apos;ve reviewed all applicants for this stage.
                </p>
              </div>
            ) : (
              <div className="rounded-md border divide-y">
                {unreviewed.map((applicant) => (
                  <div
                    key={applicant._id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {applicant.firstName} {applicant.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {applicant.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StageBadge stage={applicant.stage} />
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {formatDate(applicant.appliedAt)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/applications/applicants/${applicant._id}`
                          )
                        }
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
