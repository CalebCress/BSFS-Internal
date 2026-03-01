import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Clock } from "lucide-react";

interface BatchCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function BatchCreateDialog({
  open,
  onOpenChange,
}: BatchCreateDialogProps) {
  const batchCreate = useMutation(api.interviewSlots.batchCreate);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [duration, setDuration] = useState(30);
  const [type, setType] = useState<"telephone" | "assessment_center">(
    "telephone"
  );
  const [maxInterviewers, setMaxInterviewers] = useState(2);
  const [autoAssign, setAutoAssign] = useState(true);

  const slotCount = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    if (endMin <= startMin) return 0;
    return Math.floor((endMin - startMin) / duration);
  }, [startTime, endTime, duration]);

  const resetForm = () => {
    setDate("");
    setStartTime("09:00");
    setEndTime("17:00");
    setDuration(30);
    setType("telephone");
    setMaxInterviewers(2);
    setAutoAssign(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      toast.error("Please select a date");
      return;
    }
    if (slotCount === 0) {
      toast.error("No slots can be created with this time range");
      return;
    }

    setSubmitting(true);
    try {
      const result = await batchCreate({
        date,
        startTime,
        endTime,
        duration,
        type,
        maxInterviewers,
        autoAssign,
      });
      const msg = `Created ${result.slotsCreated} slot${result.slotsCreated !== 1 ? "s" : ""}${
        result.applicantsAssigned > 0
          ? `, assigned ${result.applicantsAssigned} applicant${result.applicantsAssigned !== 1 ? "s" : ""}`
          : ""
      }`;
      toast.success(msg);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create slots"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Interview Slots</DialogTitle>
          <DialogDescription>
            Generate multiple interview timeslots for a specific date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Start Time
              </Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Duration + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Slot Duration</Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => setDuration(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interview Type</Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setType(v as "telephone" | "assessment_center")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telephone">Telephone</SelectItem>
                  <SelectItem value="assessment_center">
                    Assessment Center
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Max interviewers */}
          <div className="space-y-2">
            <Label>Max Interviewers per Slot</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxInterviewers}
              onChange={(e) => setMaxInterviewers(Number(e.target.value))}
            />
          </div>

          {/* Auto-assign toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoAssign"
              checked={autoAssign}
              onChange={(e) => setAutoAssign(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="autoAssign" className="cursor-pointer">
              Auto-assign applicants to slots
            </Label>
          </div>

          <Separator />

          {/* Preview */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Slots to create:
            </span>
            <Badge variant="secondary" className="text-base">
              {slotCount}
            </Badge>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || slotCount === 0}
          >
            {submitting
              ? "Creating..."
              : `Create ${slotCount} Slot${slotCount !== 1 ? "s" : ""}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
