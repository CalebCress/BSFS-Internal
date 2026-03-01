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
  applicantId?: Id<"applicants">;
  signupCount: number;
  signupUserIds: string[];
  applicantName: string | null;
}

interface ApplicantOption {
  _id: Id<"applicants">;
  firstName: string;
  lastName: string;
}

interface SlotCardProps {
  slot: SlotData;
  isBoardMember: boolean;
  currentUserId: string | undefined;
  onSignup: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onReassign?: (applicantId: Id<"applicants"> | undefined) => void;
  applicantsForReassign?: ApplicantOption[];
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
  isBoardMember,
  currentUserId,
  onSignup,
  onCancel,
  onDelete,
  onReassign,
  applicantsForReassign,
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
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={typeStyle.color}>
              {typeStyle.label}
            </Badge>
            {isBoardMember && onDelete && (
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

        {/* Interviewer count */}
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
          <Button
            size="sm"
            className="w-full"
            onClick={onSignup}
            disabled={isFull || signingUp}
          >
            {signingUp ? "Signing up..." : isFull ? "Slot Full" : "Sign Up"}
          </Button>
        )}

        {/* Board member: reassign applicant */}
        {isBoardMember && onReassign && applicantsForReassign && (
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
