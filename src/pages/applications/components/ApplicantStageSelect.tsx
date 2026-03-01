import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { type Id } from "../../../../convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { STAGES, type Stage } from "@/lib/constants";
import { toast } from "sonner";

interface ApplicantStageSelectProps {
  applicantId: Id<"applicants">;
  currentStage: Stage;
}

export function ApplicantStageSelect({
  applicantId,
  currentStage,
}: ApplicantStageSelectProps) {
  const updateStage = useMutation(api.applicants.updateStage);

  const handleStageChange = async (newStage: Stage) => {
    if (newStage === currentStage) return;
    try {
      await updateStage({ id: applicantId, stage: newStage });
      toast.success(`Moved to ${STAGES[newStage].label}`);
    } catch {
      toast.error("Failed to update stage");
    }
  };

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
