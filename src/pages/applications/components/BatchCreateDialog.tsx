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
import { PARALLEL_SLOT_LABELS } from "@/lib/constants";
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

/** Selectable slot lengths, in minutes. Mirrored by the server's validation. */
const DURATION_OPTIONS = [15, 20, 30, 45, 60] as const;

/** The usual length of each round, offered before anyone touches the field. */
const DEFAULT_DURATION = {
  telephone: 20,
  assessment_center: 30,
} as const;

export function BatchCreateDialog({
  open,
  onOpenChange,
}: BatchCreateDialogProps) {
  const batchCreate = useMutation(api.interviewSlots.batchCreate);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [type, setType] = useState<"telephone" | "assessment_center">(
    "telephone"
  );
  // Explicit <number>: the const map would otherwise pin the state to the
  // literal 20 and reject every other option.
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION.telephone);
  const [maxInterviewers, setMaxInterviewers] = useState(2);
  // Parallel interviews per time window: tables at an assessment centre,
  // concurrent calls in a telephone round.
  const [parallelCount, setParallelCount] = useState(1);
  const [location, setLocation] = useState("");
  const [autoAssign, setAutoAssign] = useState(false);

  const slotCount = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    if (endMin <= startMin) return 0;
    // One row per parallel interview, so N of them creates N slots per window
    // per time window.
    return Math.floor((endMin - startMin) / duration) * Math.max(parallelCount, 1);
  }, [startTime, endTime, duration, parallelCount]);

  const resetForm = () => {
    setDate("");
    setStartTime("09:00");
    setEndTime("17:00");
    setType("telephone");
    setDuration(DEFAULT_DURATION.telephone);
    setMaxInterviewers(2);
    setParallelCount(1);
    setLocation("");
    setAutoAssign(false);
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
        parallelCount,
        location: location.trim() || undefined,
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
              {/* Same icon as Start Time, and not for decoration: without it
                  this label is shorter, and the two inputs beneath end up at
                  different heights. */}
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> End Time
              </Label>
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
                  {DURATION_OPTIONS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interview Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  const next = v as "telephone" | "assessment_center";
                  setType(next);
                  // Each round has its own usual length, so switching type
                  // moves the duration with it rather than leaving a
                  // telephone-sized slot on an assessment centre.
                  setDuration(DEFAULT_DURATION[next]);
                }}
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

          {/* Both rounds can run several at once - the wording is all that
              differs, since a phone call is not a table. */}
          <div className="space-y-2">
            <Label>{PARALLEL_SLOT_LABELS[type].field}</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={parallelCount}
              onChange={(e) => setParallelCount(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {PARALLEL_SLOT_LABELS[type].help}
            </p>
          </div>

          {/* Location - an assessment centre happens somewhere, and the
              applicant is told where when they book. A telephone interview
              has nowhere to be. */}
          {type === "assessment_center" && (
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="e.g. Via Sarfatti 25, Room 3-E4-SR03"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Shown to applicants when they book, on their confirmation, and
                in their confirmation email. Can be set later.
              </p>
            </div>
          )}

          {/* Auto-assign toggle */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoAssign"
                checked={autoAssign}
                onChange={(e) => setAutoAssign(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="autoAssign" className="cursor-pointer">
                Auto-assign applicants (skips anyone who has already booked)
              </Label>
            </div>
            <p className="pl-7 text-xs text-muted-foreground">
              Leave off if you&apos;re sending booking links &mdash; applicants
              will choose their own time.
            </p>
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
