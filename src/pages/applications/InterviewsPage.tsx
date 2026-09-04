import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { type Id } from "../../../convex/_generated/dataModel";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BatchCreateDialog } from "./components/BatchCreateDialog";
import { SlotCard } from "./components/SlotCard";
import { ManageInterviewersDialog } from "./components/ManageInterviewersDialog";
import { Plus, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

type SlotType = "telephone" | "assessment_center";

/** The bits of a slot the delete confirmation needs to describe it. */
type SlotToDelete = {
  _id: Id<"interviewSlots">;
  date: string;
  startTime: string;
  endTime: string;
  tableNumber?: number;
  applicantName: string | null;
  signupCount: number;
};

/** "HH:MM" as minutes past midnight, for comparing time windows. */
const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export function InterviewsPage() {
  const { profile, hasAdminAccess, isBoardMember } = useCurrentProfile();
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | SlotType>("all");
  const [assignedOnly, setAssignedOnly] = useState(false);
  // Deleting a slot also drops its signups, so it is confirmed before it runs.
  const [pendingDelete, setPendingDelete] = useState<SlotToDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [managingSlotId, setManagingSlotId] =
    useState<Id<"interviewSlots"> | null>(null);

  // Queries
  const slots = useQuery(api.interviewSlots.list, {});
  const mySignups = useQuery(api.interviewSignups.listMySignups, {});
  const applicants = useQuery(api.applicants.list, {});

  // Mutations
  const signupMutation = useMutation(api.interviewSignups.signup);
  const cancelMutation = useMutation(api.interviewSignups.cancel);
  const deleteMutation = useMutation(api.interviewSlots.remove);
  const reassignMutation = useMutation(api.interviewSlots.update);

  // Loading states for individual operations
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null);

  const currentUserId = profile?.userId?.toString();

  // Slots grouped by date for the Schedule tab
  const slotsByDate = useMemo(() => {
    if (!slots) return {};
    const filtered = slots.filter(
      (s) =>
        (typeFilter === "all" || s.type === typeFilter) &&
        (!assignedOnly || s.applicantId !== undefined)
    );
    return filtered.reduce(
      (acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
      },
      {} as Record<string, typeof slots>
    );
  }, [slots, typeFilter, assignedOnly]);

  /**
   * The time range of an existing signup that clashes with this slot, if any.
   *
   * The server refuses an overlapping signup outright; this just says so before
   * the click, which matters most at an assessment centre where several tables
   * share one time window and look like ordinary separate cards.
   */
  const conflictFor = useCallback(
    (slot: { _id: string; date: string; startTime: string; endTime: string }) => {
      if (!mySignups) return null;
      const clash = mySignups.find(
        ({ slot: mine }) =>
          mine._id.toString() !== slot._id.toString() &&
          mine.date === slot.date &&
          toMinutes(mine.startTime) < toMinutes(slot.endTime) &&
          toMinutes(slot.startTime) < toMinutes(mine.endTime)
      );
      return clash ? `${clash.slot.startTime}-${clash.slot.endTime}` : null;
    },
    [mySignups]
  );

  const sortedDates = useMemo(
    () => Object.keys(slotsByDate).sort(),
    [slotsByDate]
  );

  // Applicants filtered by slot type for reassign dropdown
  const applicantsForReassign = useCallback(
    (slotType: SlotType) => {
      if (!applicants) return [];
      return applicants
        .filter((a) => a.stage === slotType)
        .map((a) => ({
          _id: a._id,
          firstName: a.firstName,
          lastName: a.lastName,
        }));
    },
    [applicants]
  );

  const handleSignup = async (slotId: Id<"interviewSlots">) => {
    setLoadingSlot(slotId);
    try {
      await signupMutation({ slotId });
      toast.success("Signed up for slot");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sign up"
      );
    } finally {
      setLoadingSlot(null);
    }
  };

  const handleCancel = async (slotId: Id<"interviewSlots">) => {
    setLoadingSlot(slotId);
    try {
      await cancelMutation({ slotId });
      toast.success("Cancelled signup");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel"
      );
    } finally {
      setLoadingSlot(null);
    }
  };

  // Looked up by id rather than held in state: after a move, Convex pushes new
  // slot data and the dialog must show the roster it just changed, not a stale
  // copy captured when it opened.
  const managingSlot = slots?.find((s) => s._id === managingSlotId) ?? null;

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteMutation({ slotId: pendingDelete._id });
      toast.success("Slot deleted");
      setPendingDelete(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete slot"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleReassign = async (
    slotId: Id<"interviewSlots">,
    applicantId: Id<"applicants"> | undefined
  ) => {
    try {
      await reassignMutation({ slotId, applicantId });
      toast.success(applicantId ? "Applicant assigned" : "Applicant unassigned");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reassign"
      );
    }
  };

  const formatDate = (dateStr: string) => {
    // Append T00:00:00 to prevent timezone shifting
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const totalSlots = slots?.length ?? 0;
  const mySignupCount = mySignups?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground">
            {slots
              ? `${totalSlots} slot${totalSlots !== 1 ? "s" : ""} scheduled`
              : "Loading..."}
          </p>
        </div>
        {hasAdminAccess && (
          <Button onClick={() => setBatchDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Slots
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="my-signups">
            My Signups
            {mySignupCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {mySignupCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-6 space-y-6">
          {/* Type filter. Hidden for non-board members: telephone interviews
              are board-run and never reach them, so a filter with one real
              option would only invite them to look for slots that aren't
              there. The server filters regardless of what is shown here. */}
          <div className="flex items-center gap-3">
            {isBoardMember && (
              <Select
                value={typeFilter}
                onValueChange={(v) =>
                  setTypeFilter(v as "all" | SlotType)
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="telephone">Telephone</SelectItem>
                  <SelectItem value="assessment_center">
                    Assessment Center
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="assigned-only"
                checked={assignedOnly}
                onCheckedChange={(checked) => setAssignedOnly(checked === true)}
              />
              <Label
                htmlFor="assigned-only"
                className="text-sm font-normal cursor-pointer"
              >
                Only slots with an applicant
              </Label>
            </div>
          </div>

          {/* Slot list grouped by date */}
          {slots === undefined ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[200px] w-full" />
                ))}
              </div>
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              <Calendar className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="font-medium">
                {slots.length > 0
                  ? "No slots match these filters"
                  : "No interview slots"}
              </p>
              <p className="text-sm">
                {slots.length > 0
                  ? "Try clearing the type filter or the applicant checkbox."
                  : hasAdminAccess
                    ? 'Click "Create Slots" to schedule interviews.'
                    : "No interview slots have been created yet."}
              </p>
            </div>
          ) : (
            sortedDates.map((date) => (
              <div key={date} className="space-y-3">
                <h3 className="text-lg font-semibold">{formatDate(date)}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {slotsByDate[date].map((slot) => (
                    <SlotCard
                      key={slot._id}
                      slot={slot}
                      hasAdminAccess={hasAdminAccess}
                      canDelete={isBoardMember}
                      currentUserId={currentUserId}
                      onSignup={() => void handleSignup(slot._id)}
                      onCancel={() => void handleCancel(slot._id)}
                      onDelete={() => setPendingDelete(slot)}
                      onManageInterviewers={
                        isBoardMember
                          ? () => setManagingSlotId(slot._id)
                          : undefined
                      }
                      onReassign={(applicantId) =>
                        void handleReassign(slot._id, applicantId)
                      }
                      applicantsForReassign={applicantsForReassign(slot.type)}
                      conflictWith={conflictFor(slot)}
                      signingUp={loadingSlot === slot._id}
                      cancelling={loadingSlot === slot._id}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* My Signups Tab */}
        <TabsContent value="my-signups" className="mt-6">
          {mySignups === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : mySignups.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              <Clock className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="font-medium">No signups yet</p>
              <p className="text-sm">
                Sign up for interview slots from the Schedule tab.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mySignups.map((item) => (
                <div
                  key={item.signupId}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatDate(item.slot.date)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          item.slot.type === "telephone"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-purple-100 text-purple-800"
                        }
                      >
                        {item.slot.type === "telephone"
                          ? "Telephone"
                          : "Assessment Center"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {item.slot.startTime} &ndash; {item.slot.endTime}
                      </span>
                      {item.slot.applicantName && (
                        <span>Applicant: {item.slot.applicantName}</span>
                      )}
                      <span>
                        {item.slot.signupCount} / {item.slot.maxInterviewers}{" "}
                        interviewers
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCancel(item.slot._id)}
                    disabled={loadingSlot === item.slot._id.toString()}
                  >
                    {loadingSlot === item.slot._id.toString()
                      ? "Cancelling..."
                      : "Cancel"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Board members: move interviewers between slots */}
      <ManageInterviewersDialog
        slot={managingSlot}
        allSlots={slots ?? []}
        onOpenChange={(open) => {
          if (!open) setManagingSlotId(null);
        }}
        formatDate={formatDate}
      />

      {/* Confirm deleting a slot */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this slot?</DialogTitle>
            <DialogDescription>
              {pendingDelete && (
                <>
                  {formatDate(pendingDelete.date)}, {pendingDelete.startTime}
                  &ndash;{pendingDelete.endTime}
                  {pendingDelete.tableNumber !== undefined &&
                    ` (Table ${pendingDelete.tableNumber})`}
                  . This can&apos;t be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {pendingDelete &&
            (pendingDelete.applicantName || pendingDelete.signupCount > 0) && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <p className="font-medium">This slot is in use:</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {pendingDelete.applicantName && (
                    <li>
                      {pendingDelete.applicantName} is booked into it and will
                      lose their interview time.
                    </li>
                  )}
                  {pendingDelete.signupCount > 0 && (
                    <li>
                      {pendingDelete.signupCount} interviewer
                      {pendingDelete.signupCount !== 1 ? "s are" : " is"} signed
                      up and will be un-signed-up.
                    </li>
                  )}
                </ul>
              </div>
            )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Keep slot
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Create Dialog */}
      <BatchCreateDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
      />
    </div>
  );
}
