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
import { Skeleton } from "@/components/ui/skeleton";
import { BatchCreateDialog } from "./components/BatchCreateDialog";
import { SlotCard } from "./components/SlotCard";
import { Plus, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

type SlotType = "telephone" | "assessment_center";

export function InterviewsPage() {
  const { profile, isBoardMember } = useCurrentProfile();
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | SlotType>("all");

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
    const filtered =
      typeFilter === "all"
        ? slots
        : slots.filter((s) => s.type === typeFilter);
    return filtered.reduce(
      (acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
      },
      {} as Record<string, typeof slots>
    );
  }, [slots, typeFilter]);

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

  const handleDelete = async (slotId: Id<"interviewSlots">) => {
    try {
      await deleteMutation({ slotId });
      toast.success("Slot deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete slot"
      );
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
        {isBoardMember && (
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
          {/* Type filter */}
          <div className="flex items-center gap-3">
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
              <p className="font-medium">No interview slots</p>
              <p className="text-sm">
                {isBoardMember
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
                      isBoardMember={isBoardMember}
                      currentUserId={currentUserId}
                      onSignup={() => void handleSignup(slot._id)}
                      onCancel={() => void handleCancel(slot._id)}
                      onDelete={() => void handleDelete(slot._id)}
                      onReassign={(applicantId) =>
                        void handleReassign(slot._id, applicantId)
                      }
                      applicantsForReassign={applicantsForReassign(slot.type)}
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

      {/* Batch Create Dialog */}
      <BatchCreateDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
      />
    </div>
  );
}
