import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle, Clock, HelpCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type SlotOption = {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  isMine: boolean;
};

const TYPE_LABELS = {
  telephone: "Telephone Interview",
  assessment_center: "Assessment Centre",
} as const;

/**
 * Format a "YYYY-MM-DD" date string for display.
 *
 * The T00:00:00 suffix is required: `new Date("2026-03-02")` parses as UTC
 * midnight and renders as the previous day west of UTC.
 */
function formatSlotDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Format the exact instant after which changes are closed. */
function formatDeadline(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Shared shell for every terminal state (no `alert` component in this repo). */
function MessageCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          {icon}
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-2 max-w-md text-muted-foreground">{children}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function PublicInterviewBookingPage() {
  const { token } = useParams<{ token: string }>();
  const data = useQuery(
    api.interviewBooking.getByToken,
    token ? { token } : "skip"
  );
  const book = useMutation(api.interviewBooking.book);
  const cancelBooking = useMutation(api.interviewBooking.cancel);

  const [pending, setPending] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  // Group the flat slot list into one card per date. Already sorted server-side.
  const slotsByDate = useMemo(() => {
    if (!data || data.status !== "ok") return [];
    const groups = new Map<string, SlotOption[]>();
    for (const slot of data.slots) {
      const existing = groups.get(slot.date);
      if (existing) existing.push(slot);
      else groups.set(slot.date, [slot]);
    }
    return [...groups.entries()].map(([date, slots]) => ({ date, slots }));
  }, [data]);

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[240px] w-full" />
      </div>
    );
  }

  // Unknown token, not yet invited, or no longer in the process. Deliberately
  // one shared message: distinguishing them would reveal that a named person
  // was rejected to anyone holding a stray link.
  if (data.status === "invalid") {
    return (
      <MessageCard
        icon={<HelpCircle className="mb-4 h-16 w-16 text-muted-foreground" />}
        title="Link not recognised"
      >
        This booking link isn&apos;t active. If you believe you should be able to
        book an interview, please get in touch with us and we&apos;ll help.
      </MessageCard>
    );
  }

  if (data.status !== "ok") {
    return (
      <MessageCard
        icon={<CheckCircle className="mb-4 h-16 w-16 text-green-500" />}
        title="No interviews to book"
      >
        You have no interviews left to schedule. We&apos;ll be in touch by email
        with next steps.
      </MessageCard>
    );
  }

  const { firstName, type, cutoffHours, booking } = data;
  const typeLabel =
    type === "assessment_center"
      ? TYPE_LABELS.assessment_center
      : TYPE_LABELS.telephone;

  const handleBook = async (slot: SlotOption) => {
    setPending(`${slot.date}T${slot.startTime}`);
    try {
      await book({ token: token!, date: slot.date, startTime: slot.startTime });
      setChanging(false);
      toast.success("Your interview is booked");
    } catch (error) {
      // The thrown Convex messages are written as applicant-facing copy.
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not book that time. Please try again."
      );
    } finally {
      setPending(null);
    }
  };

  const handleCancel = async () => {
    setPending("cancel");
    try {
      await cancelBooking({ token: token! });
      setChanging(false);
      toast.success("Your booking has been cancelled");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not cancel your booking. Please try again."
      );
    } finally {
      setPending(null);
    }
  };

  const showPicker = !booking || changing;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Book your {typeLabel}</h1>
        <p className="mt-1 text-muted-foreground">
          Hi {firstName} — please choose a time that works for you.
        </p>
      </div>

      {booking && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarCheck className="h-5 w-5 text-green-600" />
              Your interview is confirmed
            </CardTitle>
            <CardDescription className="text-base font-medium text-foreground">
              {formatSlotDate(booking.date)} at {booking.startTime} –{" "}
              {booking.endTime}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {booking.canChange ? (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  You can change or cancel until{" "}
                  {formatDeadline(booking.changeDeadlineMs)} ({cutoffHours} hours
                  before your interview).
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setChanging(!changing)}
                    disabled={pending !== null}
                  >
                    {changing ? "Keep this time" : "Change time"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleCancel()}
                    disabled={pending !== null}
                  >
                    {pending === "cancel" ? "Cancelling..." : "Cancel booking"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                Your interview is less than {cutoffHours} hours away and can no
                longer be changed online. Please email us if you need to make a
                change.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {showPicker && (
        <>
          <p className="text-sm text-muted-foreground">
            You can change or cancel your booking up until {cutoffHours} hours
            before your interview.
          </p>

          {slotsByDate.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No times have been published for your round yet. We&apos;ll email
                you as soon as they&apos;re available.
              </CardContent>
            </Card>
          ) : (
            slotsByDate.map(({ date, slots }) => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {formatSlotDate(date)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {slots.map((slot) => {
                      const key = `${slot.date}T${slot.startTime}`;
                      const isPending = pending === key;
                      const bookable = slot.available && !slot.isMine;

                      return (
                        <Button
                          key={key}
                          variant={bookable ? "outline" : "ghost"}
                          disabled={!bookable || pending !== null}
                          onClick={() => void handleBook(slot)}
                          className="h-auto flex-col py-2"
                        >
                          <span>
                            {slot.startTime} – {slot.endTime}
                          </span>
                          {isPending ? (
                            <span className="text-xs font-normal text-muted-foreground">
                              Booking...
                            </span>
                          ) : slot.isMine ? (
                            <span className="text-xs font-normal text-muted-foreground">
                              Your time
                            </span>
                          ) : (
                            !slot.available && (
                              <span className="text-xs font-normal text-muted-foreground">
                                Unavailable
                              </span>
                            )
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}
