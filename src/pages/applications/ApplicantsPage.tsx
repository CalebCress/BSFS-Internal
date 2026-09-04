import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { STAGES, type Stage } from "@/lib/constants";
import { ApplicantTableView } from "./components/ApplicantTableView";
import { SendInvitesDialog } from "./components/SendInvitesDialog";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

export function ApplicantsPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");

  const applicants = useQuery(api.applicants.list, {});
  const { hasAdminAccess, isBoardMember } = useCurrentProfile();

  // Bulk invites only make sense when looking at a single interview stage -
  // "all stages" would mix rounds and people with nothing to book.
  const invitableStage =
    stageFilter === "telephone" || stageFilter === "assessment_center"
      ? stageFilter
      : null;

  const filteredApplicants = useMemo(() => {
    if (!applicants) return [];
    return applicants.filter((a) => {
      const matchesSearch =
        search === "" ||
        `${a.firstName} ${a.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase());
      const matchesStage = stageFilter === "all" || a.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [applicants, search, stageFilter]);

  const isLoading = applicants === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applicants</h1>
          <p className="text-muted-foreground">
            {applicants === undefined
              ? "Loading..."
              : isBoardMember
                ? `${applicants.length} total applicant${applicants.length !== 1 ? "s" : ""}`
                : `${applicants.length} applicant${applicants.length !== 1 ? "s" : ""} you are interviewing`}
          </p>
        </div>
        {hasAdminAccess && invitableStage && (
          <SendInvitesDialog stage={invitableStage} />
        )}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {/* Only the board sees the whole pipeline. Everyone else sees just
            the applicants they are interviewing, which is one stage by
            definition, so a stage filter would be a control with nothing to
            do. */}
        {isBoardMember && (
          <Select
            value={stageFilter}
            onValueChange={(v) => setStageFilter(v as Stage | "all")}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {(
                Object.entries(STAGES) as [Stage, (typeof STAGES)[Stage]][]
              ).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <ApplicantTableView applicants={filteredApplicants} />
      )}
    </div>
  );
}
