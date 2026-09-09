import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";

type SlotType = "telephone" | "assessment_center";

const TYPE_LABELS: Record<SlotType, string> = {
  telephone: "Telephone",
  assessment_center: "Assessment Center",
};

type SlotSummary = {
  type: SlotType;
  signupCount: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every slot on the page, for counting what an edit would touch. */
  slots: SlotSummary[];
}

/**
 * Apply one setting to every slot of an interview type at once.
 *
 * Blank means "leave alone" rather than "clear", so an edit changes only the
 * field it was given. Applicants and interviewers are never touched - see the
 * note the dialog shows, and updateAllOfType which enforces it.
 */
export function EditAllSlotsDialog({ open, onOpenChange, slots }: Props) {
  const updateAll = useMutation(api.interviewSlots.updateAllOfType);

  const [type, setType] = useState<SlotType>("assessment_center");
  const [maxInterviewers, setMaxInterviewers] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const affected = slots.filter((slot) => slot.type === type);

  const parsedMax =
    maxInterviewers.trim() === "" ? undefined : Number(maxInterviewers);
  const maxIsValid =
    parsedMax === undefined ||
    (Number.isInteger(parsedMax) && parsedMax >= 1 && parsedMax <= 20);

  // Warn BEFORE the edit, not after: someone lowering the cap should see that
  // slots already have more people on them than the new limit allows.
  const wouldBeOverCapacity =
    parsedMax === undefined
      ? 0
      : affected.filter((slot) => slot.signupCount > parsedMax).length;

  const changesSomething = parsedMax !== undefined || location.trim() !== "";

  const reset = () => {
    setMaxInterviewers("");
    setLocation("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateAll({
        type,
        maxInterviewers: parsedMax,
        // Undefined leaves it alone; only a typed value is sent.
        location: location.trim() === "" ? undefined : location.trim(),
      });
      toast.success(
        `Updated ${result.updated} ${TYPE_LABELS[type]} slot${
          result.updated !== 1 ? "s" : ""
        }` +
          (result.overCapacity > 0
            ? ` · ${result.overCapacity} now over capacity`
            : "")
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not apply the changes"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && saving) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit all slots of a type</DialogTitle>
          <DialogDescription>
            Applies to every existing slot of the type you pick. Leave a field
            blank to leave it unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Interview Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as SlotType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="telephone">
                  {TYPE_LABELS.telephone}
                </SelectItem>
                <SelectItem value="assessment_center">
                  {TYPE_LABELS.assessment_center}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{affected.length}</Badge>
              existing {TYPE_LABELS[type]} slot
              {affected.length !== 1 ? "s" : ""} would be updated
            </p>
          </div>

          <div className="space-y-2">
            <Label>Max Interviewers per Slot</Label>
            <Input
              type="number"
              min={1}
              max={20}
              placeholder="Leave blank to keep as is"
              value={maxInterviewers}
              onChange={(e) => setMaxInterviewers(e.target.value)}
            />
            {!maxIsValid && (
              <p className="text-xs text-destructive">
                Must be a whole number from 1 to 20.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="Leave blank to keep as is"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {wouldBeOverCapacity > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
              <p className="font-medium">
                {wouldBeOverCapacity} slot
                {wouldBeOverCapacity !== 1 ? "s" : ""} already{" "}
                {wouldBeOverCapacity !== 1 ? "have" : "has"} more interviewers
                than that.
              </p>
              <p className="mt-1 text-muted-foreground">
                Nobody is removed - those slots will simply show as over
                capacity until someone cancels.
              </p>
            </div>
          )}

          <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            Assigned applicants and interviewer signups are not affected. This
            changes only the fields above.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={
              saving ||
              !changesSomething ||
              !maxIsValid ||
              affected.length === 0
            }
          >
            {saving
              ? "Applying..."
              : `Apply to ${affected.length} slot${
                  affected.length !== 1 ? "s" : ""
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
