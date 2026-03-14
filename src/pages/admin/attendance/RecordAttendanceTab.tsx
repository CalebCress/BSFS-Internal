import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Clock, MapPin, Check } from "lucide-react";
import { toast } from "sonner";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type AttendanceStatus = "present" | "absent" | "excused";

export function RecordAttendanceTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const events = useQuery(api.attendance.listAttendanceEvents, { year, month });

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(
    null
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium w-40 text-center">
          {MONTHS[month - 1]} {year}
        </span>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Events list */}
      {events === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No events this month.
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event._id}
              className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{event.title}</span>
                  {event.totalRecords > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {event.presentCount}/{event.totalRecords} present
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{event.date}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {event.startTime}–{event.endTime}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={event.totalRecords > 0 ? "outline" : "default"}
                onClick={() => setSelectedEventId(event._id)}
              >
                {event.totalRecords > 0 ? "Edit" : "Record"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Attendance recording dialog */}
      {selectedEventId && (
        <AttendanceDialog
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
        />
      )}
    </div>
  );
}

function AttendanceDialog({
  eventId,
  onClose,
}: {
  eventId: Id<"events">;
  onClose: () => void;
}) {
  const members = useQuery(api.profiles.listProfiles);
  const existingRecords = useQuery(api.attendance.getByEvent, { eventId });
  const recordBatch = useMutation(api.attendance.recordBatch);

  // Local state: userId -> status
  const [statuses, setStatuses] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [initialized, setInitialized] = useState(false);

  // Initialize from existing records once loaded
  if (existingRecords && !initialized) {
    const initial: Record<string, AttendanceStatus> = {};
    for (const r of existingRecords) {
      initial[r.userId] = r.status;
    }
    setStatuses(initial);
    setInitialized(true);
  }

  // Filter to non-alumni members only
  const activeMembers = (members ?? []).filter(
    (m) => m.role !== "alumni"
  );

  const setStatus = (userId: string, status: AttendanceStatus) => {
    setStatuses((prev) => ({ ...prev, [userId]: status }));
  };

  const handleSave = async () => {
    const records = Object.entries(statuses).map(([userId, status]) => ({
      userId: userId as Id<"users">,
      status,
    }));

    if (records.length === 0) {
      toast.error("No attendance recorded");
      return;
    }

    try {
      await recordBatch({ eventId, records });
      toast.success("Attendance saved");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save attendance"
      );
    }
  };

  const markAll = (status: AttendanceStatus) => {
    const all: Record<string, AttendanceStatus> = {};
    for (const m of activeMembers) {
      all[m.userId] = status;
    }
    setStatuses(all);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Record Attendance</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">Mark all:</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => markAll("present")}
          >
            Present
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => markAll("absent")}
          >
            Absent
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {activeMembers.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 text-sm">
              Loading members...
            </div>
          ) : (
            activeMembers.map((member) => {
              const currentStatus = statuses[member.userId];
              return (
                <div
                  key={member.userId}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                >
                  <span className="text-sm font-medium">
                    {member.displayName}
                  </span>
                  <Select
                    value={currentStatus ?? ""}
                    onValueChange={(val) =>
                      setStatus(member.userId, val as AttendanceStatus)
                    }
                  >
                    <SelectTrigger
                      className={`w-[120px] h-8 text-xs ${
                        currentStatus === "present"
                          ? "border-green-500 text-green-700"
                          : currentStatus === "absent"
                            ? "border-red-500 text-red-700"
                            : currentStatus === "excused"
                              ? "border-yellow-500 text-yellow-700"
                              : ""
                      }`}
                    >
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="excused">Excused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()}>
            <Check className="mr-2 h-4 w-4" />
            Save Attendance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
