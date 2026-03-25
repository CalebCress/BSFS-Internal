import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { type Id } from "../../../convex/_generated/dataModel";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "./components/StageBadge";
import { ApplicantStageSelect } from "./components/ApplicantStageSelect";
import { ScoreDisplay } from "./components/ScoreDisplay";
import { ReviewForm } from "./components/ReviewForm";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  FileText,
  Download,
  ExternalLink,
  Star,
} from "lucide-react";
import { REVIEW_TYPES, type ReviewType } from "@/lib/constants";

/** Maps fieldId from the responses array to human-readable question labels */
const QUESTION_LABELS: Record<string, string> = {
  why_bsfs: "Why BSFS and why you?",
  interesting_learning: "What's something interesting you've learned recently?",
};

/** Maps applicant stage to the default review type */
function stageToReviewType(stage: string): ReviewType {
  if (stage === "telephone") return "telephone";
  if (stage === "assessment_center") return "assessment_center";
  return "application";
}

export function ApplicantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTypeOverride, setReviewTypeOverride] =
    useState<ReviewType | null>(null);

  const applicant = useQuery(
    api.applicants.getById,
    id ? { id: id as Id<"applicants"> } : "skip"
  );

  // Derive review type from stage, allow user override via dropdown
  const defaultReviewType = applicant
    ? stageToReviewType(applicant.stage)
    : "application";
  const reviewType = reviewTypeOverride ?? defaultReviewType;

  const reviews = useQuery(
    api.reviews.listByApplicant,
    id ? { applicantId: id as Id<"applicants">, reviewType } : "skip"
  );

  const aggregateScores = useQuery(
    api.reviews.getAggregateScores,
    id ? { applicantId: id as Id<"applicants">, reviewType } : "skip"
  );

  const myReview = useQuery(
    api.reviews.getMyReview,
    id
      ? { applicantId: id as Id<"applicants">, reviewType }
      : "skip"
  );

  const canReview = useQuery(
    api.reviews.canReview,
    id
      ? { applicantId: id as Id<"applicants">, reviewType }
      : "skip"
  );

  // Loading state
  if (applicant === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!applicant) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Applicant Not Found
        </h1>
        <Button
          variant="ghost"
          onClick={() => navigate("/applications/applicants")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Applicants
        </Button>
      </div>
    );
  }

  const responses = applicant.application?.responses ?? [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/applications/applicants")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {applicant.firstName} {applicant.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Applied {formatDate(applicant.appliedAt)}{" "}
            &middot; {applicant.formTitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StageBadge stage={applicant.stage} />
          <ApplicantStageSelect
            applicantId={applicant._id}
            currentStage={applicant.stage}
          />
        </div>
      </div>

      {/* Main content: two-column grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column (2/3 width) */}
        <div className="md:col-span-2 space-y-6">
          {/* Application Responses */}
          <Card>
            <CardHeader>
              <CardTitle>Application Responses</CardTitle>
              <CardDescription>
                Answers submitted with the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {responses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No application responses found.
                </p>
              ) : (
                <div className="space-y-6">
                  {responses.map((response, index) => (
                    <div key={response.fieldId}>
                      {index > 0 && <Separator className="mb-6" />}
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          {QUESTION_LABELS[response.fieldId] ??
                            response.fieldId}
                        </h3>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {response.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle>Reviews</CardTitle>
                    {aggregateScores && aggregateScores.count > 0 && (
                      <CardDescription className="mt-1">
                        {aggregateScores.count} review
                        {aggregateScores.count !== 1 ? "s" : ""}
                      </CardDescription>
                    )}
                  </div>
                  <Select
                    value={reviewType}
                    onValueChange={(v) =>
                      setReviewTypeOverride(v as ReviewType)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(REVIEW_TYPES) as [
                          ReviewType,
                          { label: string },
                        ][]
                      ).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canReview !== false && (
                  <Button
                    size="sm"
                    onClick={() => setReviewDialogOpen(true)}
                    variant={myReview ? "outline" : "default"}
                    disabled={canReview === undefined}
                  >
                    <Star className="mr-2 h-4 w-4" />
                    {myReview ? "Edit My Review" : "Leave Review"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aggregate scores */}
              {aggregateScores && aggregateScores.count > 0 && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                  <h4 className="text-sm font-semibold">Average Scores</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <ScoreDisplay
                      label="Overall"
                      score={aggregateScores.overall}
                    />
                    <ScoreDisplay
                      label="Motivation"
                      score={aggregateScores.motivation}
                    />
                    <ScoreDisplay
                      label="Experience"
                      score={aggregateScores.experience}
                    />
                    <ScoreDisplay
                      label="Culture Fit"
                      score={aggregateScores.cultureFit}
                    />
                  </div>
                </div>
              )}

              {/* Individual reviews */}
              {reviews && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review, idx) => (
                    <div key={review._id}>
                      {idx > 0 && <Separator className="mb-4" />}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {review.reviewerName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <ScoreDisplay
                            label="Overall"
                            score={review.scores.overall}
                            size="sm"
                          />
                          <ScoreDisplay
                            label="Motivation"
                            score={review.scores.motivation}
                            size="sm"
                          />
                          <ScoreDisplay
                            label="Experience"
                            score={review.scores.experience}
                            size="sm"
                          />
                          <ScoreDisplay
                            label="Culture Fit"
                            score={review.scores.cultureFit}
                            size="sm"
                          />
                        </div>
                        {review.comments && (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            &ldquo;{review.comments}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reviews yet for this type.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Personal Info + CV (1/3 width) */}
        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${applicant.email}`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {applicant.email}
                </a>
              </div>
              {applicant.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${applicant.phone}`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {applicant.phone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {formatDate(applicant.appliedAt)}
                </span>
              </div>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Round: </span>
                <span className="font-medium">{applicant.formTitle}</span>
              </div>
            </CardContent>
          </Card>

          {/* Resume / CV */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resume / CV</CardTitle>
            </CardHeader>
            <CardContent>
              {applicant.cvUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">
                      CV Document
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        window.open(applicant.cvUrl!, "_blank")
                      }
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <a href={applicant.cvUrl} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center rounded-lg border border-dashed p-6 text-center">
                  <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No CV uploaded
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Form Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {myReview ? "Edit Your Review" : "Leave a Review"}
            </DialogTitle>
          </DialogHeader>
          {myReview !== undefined && (
            <ReviewForm
              applicantId={applicant._id}
              reviewType={reviewType}
              existingReview={myReview}
              onSuccess={() => setReviewDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
