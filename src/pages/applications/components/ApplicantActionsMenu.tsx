import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { type Id } from "../../../../convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { STAGES, type Stage } from "@/lib/constants";
import { toast } from "sonner";

interface ApplicantActionsMenuProps {
  applicantId: Id<"applicants">;
  currentStage: Stage;
  applicantName: string;
  /** Leave the page after deleting - the record it was showing is gone. */
  navigateAwayOnDelete?: boolean;
}

export function ApplicantActionsMenu({
  applicantId,
  currentStage,
  applicantName,
  navigateAwayOnDelete,
}: ApplicantActionsMenuProps) {
  const updateStage = useMutation(api.applicants.updateStage);
  const removeApplicant = useMutation(api.applicants.remove);
  const navigate = useNavigate();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleStageChange = async (newStage: Stage) => {
    if (newStage === currentStage) return;
    try {
      await updateStage({ id: applicantId, stage: newStage });
      toast.success(`Moved to ${STAGES[newStage].label}`);
    } catch {
      toast.error("Failed to update stage");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await removeApplicant({ id: applicantId });
      toast.success(
        `Deleted ${applicantName}` +
          (result.slotsFreed > 0
            ? `, freeing ${result.slotsFreed} interview slot${
                result.slotsFreed !== 1 ? "s" : ""
              }`
            : "")
      );
      setConfirmingDelete(false);
      if (navigateAwayOnDelete) void navigate("/applications/applicants");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete applicant"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(Object.entries(STAGES) as [Stage, (typeof STAGES)[Stage]][]).map(
            ([key, { label }]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => void handleStageChange(key)}
                disabled={key === currentStage}
              >
                Move to {label}
              </DropdownMenuItem>
            )
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              // Let the menu close before the dialog opens, or Radix hands
              // focus back to a trigger that is on its way out.
              e.preventDefault();
              setTimeout(() => setConfirmingDelete(true), 0);
            }}
          >
            Delete applicant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirmingDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirmingDelete(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {applicantName}?</DialogTitle>
            <DialogDescription>
              This permanently removes them from the round. It can&apos;t be
              undone - if they should be reconsidered later, they will have to
              apply again.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium">This will delete:</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              <li>their applicant record and written answers</li>
              <li>their uploaded CV</li>
              <li>every review of them, and their scores</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              Any interview slot they hold is freed for someone else, not
              deleted.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete applicant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
