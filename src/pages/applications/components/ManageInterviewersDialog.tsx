import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { overlaps } from "../../../../convex/interviewTimes";
import type { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { UserMinus } from "lucide-react";

type Slot = {
  _id: Id<"interviewSlots">;
  date: string;
  startTime: string;
  endTime: string;
  type: "telephone" | "assessment_center";
  maxInterviewers: number;
  tableNumber?: number;
  signupCount: number;
  signupUserIds: string[];
  interviewers: { userId: Id<"users">; name: string }[];
  applicantName: string | null;
};

interface Props {
  slot: Slot | null;
  /** Every slot on the page, used to work out where someone can be moved to. */
  allSlots: Slot[];
  onOpenChange: (open: boolean) => void;
  formatDate: (date: string) => string;
}

/**
 * Board-member tool for rearranging who interviews when.
 *
 * Candidate slots are filtered to the same interview type and then annotated
 * with the reason they can't be used - full, or clashing with something else
 * that person is already down for. Showing the blocked options rather than
 * hiding them is deliberate: "Ana is busy at 10:00" is the information you
 * need to rearrange the day, and an option that silently vanishes doesn't
 * give it to you.
 */
export function ManageInterviewersDialog({
  slot,
  allSlots,
  onOpenChange,
  formatDate,
}: Props) {
  const moveInterviewer = useMutation(api.interviewSignups.moveInterviewer);
  const removeInterviewer = useMutation(api.interviewSignups.removeInterviewer);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  if (!slot) return null;

  /** Same-type slots, in schedule order, with why each is or isn't usable. */
  const targetsFor = (userId: Id<"users">) =>
    allSlots
      .filter((s) => s._id !== slot._id && s.type === slot.type)
      .sort((a, b) =>
        a.date !== b.date
          ? a.date.localeCompare(b.date)
          : a.startTime.localeCompare(b.startTime)
      )
      .map((s) => {
        const clash = allSlots.find(
          (other) =>
            other._id !== slot._id &&
            other._id !== s._id &&
            other.signupUserIds.includes(userId.toString()) &&
            overlaps(other, s)
        );
        const alreadyThere = s.signupUserIds.includes(userId.toString());
        const full = s.signupCount >= s.maxInterviewers;

        return {
          slot: s,
          disabled: alreadyThere || full || !!clash,
          reason: alreadyThere
            ? "already here"
            : full
              ? "full"
              : clash
                ? `busy ${clash.startTime}`
                : null,
        };
      });

  const handleMove = async (
    userId: Id<"users">,
    toSlotId: Id<"interviewSlots">
  ) => {
    setBusyUserId(userId.toString());
    try {
      await moveInterviewer({
        fromSlotId: slot._id,
        toSlotId,
        userId,
      });
      toast.success("Interviewer moved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not move them");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (userId: Id<"users">, name: string) => {
    setBusyUserId(userId.toString());
    try {
      await removeInterviewer({ slotId: slot._id, userId });
      toast.success(`Removed ${name} from this slot`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove them");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {slot.applicantName
              ? `Interviewers for ${slot.applicantName}`
              : "Interviewers"}
          </DialogTitle>
          <DialogDescription>
            {formatDate(slot.date)}, {slot.startTime}&ndash;{slot.endTime}
            {slot.tableNumber !== undefined && ` (Table ${slot.tableNumber})`}
            {" · "}
            {slot.signupCount} of {slot.maxInterviewers} filled
            {!slot.applicantName && " · no applicant assigned"}
          </DialogDescription>
        </DialogHeader>

        {slot.interviewers.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nobody has signed up for this slot yet.
          </p>
        ) : (
          <div className="space-y-3">
            {slot.interviewers.map((interviewer) => {
              const targets = targetsFor(interviewer.userId);
              const busy = busyUserId === interviewer.userId.toString();

              return (
                <div
                  key={interviewer.userId.toString()}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <span className="flex-1 truncate text-sm font-medium">
                    {interviewer.name}
                  </span>

                  <Select
                    value=""
                    disabled={busy || targets.length === 0}
                    onValueChange={(value) =>
                      void handleMove(
                        interviewer.userId,
                        value as Id<"interviewSlots">
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-[230px] text-xs">
                      <SelectValue
                        placeholder={
                          targets.length === 0 ? "No other slots" : "Move to..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {targets.map(({ slot: target, disabled, reason }) => (
                        <SelectItem
                          key={target._id}
                          value={target._id}
                          disabled={disabled}
                        >
                          {/* The applicant leads: you move someone to an
                              interview WITH A PERSON, and the time is how you
                              tell two of them apart. */}
                          <span className="font-medium">
                            {target.applicantName ?? "No applicant"}
                          </span>
                          <span className="text-muted-foreground">
                            {" · "}
                            {target.date === slot.date
                              ? target.startTime
                              : `${target.date} ${target.startTime}`}
                            {target.tableNumber !== undefined &&
                              ` · T${target.tableNumber}`}
                            {` · ${target.signupCount}/${target.maxInterviewers}`}
                            {reason ? ` (${reason})` : ""}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    title={`Remove ${interviewer.name} from this slot`}
                    disabled={busy}
                    onClick={() =>
                      void handleRemove(interviewer.userId, interviewer.name)
                    }
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
