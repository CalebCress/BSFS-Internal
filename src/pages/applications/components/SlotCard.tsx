import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, User, Users, Trash2 } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

interface SlotData {
  _id: Id<"interviewSlots">;
  date: string;
  startTime: string;
  endTime: string;
  type: "telephone" | "assessment_center";
  maxInterviewers: number;
  tableNumber?: number;
  applicantId?: Id<"applicants">;
  signupCount: number;
  signupUserIds: string[];
  interviewers: { userId: Id<"users">; name: string }[];
  applicantName: string | null;
}

interface ApplicantOption {
  _id: Id<"applicants">;
  firstName: string;
  lastName: string;
}

interface SlotCardProps {
  slot: SlotData;
  hasAdminAccess: boolean;
  /** Deleting is board-only, tighter than the admin actions above. */
  canDelete?: boolean;
  /** Board members can rearrange who is interviewing in this slot. */
  onManageInterviewers?: () => void;
  currentUserId: string | undefined;
  onSignup: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onReassign?: (applicantId: Id<"applicants"> | undefined) => void;
  applicantsForReassign?: ApplicantOption[];
  /** Time range of an existing signup this slot clashes with, if any. */
  conflictWith?: string | null;
  signingUp?: boolean;
  cancelling?: boolean;
}

const TYPE_STYLES = {
  telephone: {
    label: "Telephone",
    color: "bg-yellow-100 text-yellow-800",
  },
  assessment_center: {
    label: "Assessment Center",
    color: "bg-purple-100 text-purple-800",
  },
} as const;

export function SlotCard({
  slot,
  hasAdminAccess,
  canDelete,
  onManageInterviewers,
  currentUserId,
  onSignup,
  onCancel,
  onDelete,
  onReassign,
  applicantsForReassign,
  conflictWith,
  signingUp,
  cancelling,
}: SlotCardProps) {
  const isFull = slot.signupCount >= slot.maxInterviewers;
  const isSignedUp = currentUserId
    ? slot.signupUserIds.includes(currentUserId)
    : false;
  const typeStyle = TYPE_STYLES[slot.type];

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {/* Header: time + type + delete */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {slot.startTime} &ndash; {slot.endTime}
            </span>
            {slot.tableNumber !== undefined && (
              <Badge variant="outline" className="font-normal">
                Table {slot.tableNumber}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={typeStyle.color}>
              {typeStyle.label}
            </Badge>
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Assigned applicant */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          {slot.applicantName ? (
            <span>{slot.applicantName}</span>
          ) : (
            <span className="text-muted-foreground">No applicant assigned</span>
          )}
        </div>

        {/* Interviewers */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {slot.signupCount} / {slot.maxInterviewers} interviewers
              </span>
            </div>
            {isFull && !isSignedUp && (
              <Badge
                variant="secondary"
                className="bg-red-100 text-red-700 text-xs"
              >
                Full
              </Badge>
            )}
          </div>
          {slot.interviewers.length > 0 && (
            <p className="pl-[22px] text-xs text-muted-foreground">
              {slot.interviewers.map((i) => i.name).join(", ")}
            </p>
          )}
          {onManageInterviewers && (
            <button
              type="button"
              className="pl-[22px] text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={onManageInterviewers}
            >
              Manage interviewers
            </button>
          )}
        </div>

        {/* Action button: Sign Up / Cancel */}
        {isSignedUp ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onCancel}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling..." : "Cancel Signup"}
          </Button>
        ) : (
          <div className="space-y-1">
            <Button
              size="sm"
              className="w-full"
              onClick={onSignup}
              disabled={isFull || signingUp || !!conflictWith}
            >
              {signingUp
                ? "Signing up..."
                : isFull
                  ? "Slot Full"
                  : conflictWith
                    ? "Time Conflict"
                    : "Sign Up"}
            </Button>
            {conflictWith && !isFull && (
              <p className="text-xs text-muted-foreground">
                Overlaps your {conflictWith} signup.
              </p>
            )}
          </div>
        )}

        {/* Board member: reassign applicant */}
        {hasAdminAccess && onReassign && applicantsForReassign && (
          <div className="pt-1 border-t">
            <label className="text-xs text-muted-foreground mb-1 block">
              Assign Applicant
            </label>
            <Select
              value={slot.applicantId?.toString() ?? "none"}
              onValueChange={(v) =>
                onReassign(
                  v === "none"
                    ? undefined
                    : (v as Id<"applicants">)
                )
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select applicant..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {applicantsForReassign.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.firstName} {a.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
