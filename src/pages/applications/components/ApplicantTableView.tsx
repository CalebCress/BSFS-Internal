import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StageBadge } from "./StageBadge";
import { ApplicantStageSelect } from "./ApplicantStageSelect";
import { ArrowUpDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Stage } from "@/lib/constants";
import type { Id } from "../../../../convex/_generated/dataModel";

type Applicant = {
  _id: Id<"applicants">;
  firstName: string;
  lastName: string;
  email: string;
  stage: Stage;
  appliedAt: number;
  averageOverall: number | null;
};

type SortField = "name" | "email" | "stage" | "appliedAt" | "averageOverall";
type SortDir = "asc" | "desc";

interface ApplicantTableViewProps {
  applicants: Applicant[];
}

export function ApplicantTableView({ applicants }: ApplicantTableViewProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>("appliedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = [...applicants].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return (
          dir *
          `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`
          )
        );
      case "email":
        return dir * a.email.localeCompare(b.email);
      case "stage":
        return dir * a.stage.localeCompare(b.stage);
      case "appliedAt":
        return dir * (a.appliedAt - b.appliedAt);
      case "averageOverall": {
        if (a.averageOverall == null && b.averageOverall == null) return 0;
        if (a.averageOverall == null) return 1;
        if (b.averageOverall == null) return -1;
        return dir * (a.averageOverall - b.averageOverall);
      }
      default:
        return 0;
    }
  });

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => toggleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-3 w-3" />
    </Button>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton field="name">Name</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="email">Email</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="stage">Stage</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="appliedAt">Applied Date</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="averageOverall">Avg. Score</SortButton>
            </TableHead>
            <TableHead className="w-[60px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No applicants found.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((applicant) => (
              <TableRow
                key={applicant._id}
                className="cursor-pointer"
                onClick={() =>
                  navigate(`/applications/applicants/${applicant._id}`)
                }
              >
                <TableCell className="font-medium">
                  {applicant.firstName} {applicant.lastName}
                </TableCell>
                <TableCell>{applicant.email}</TableCell>
                <TableCell>
                  <StageBadge stage={applicant.stage} />
                </TableCell>
                <TableCell>
                  {formatDate(applicant.appliedAt)}
                </TableCell>
                <TableCell>
                  {applicant.averageOverall != null ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {applicant.averageOverall.toFixed(1)}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      &mdash;
                    </span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <ApplicantStageSelect
                    applicantId={applicant._id}
                    currentStage={applicant.stage}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
