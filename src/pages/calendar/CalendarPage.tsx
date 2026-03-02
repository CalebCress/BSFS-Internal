import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EventDialog } from "./components/EventDialog";
import { PresentationUpload } from "./components/PresentationUpload";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Pencil,
  Trash2,
  Link2,
  Repeat,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface EventData {
  _id: Id<"events">;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  seriesId?: string;
  createdBy: Id<"users">;
  isCorporateMarketUpdate?: boolean;
  corporateAssignee?: Id<"users">;
  marketAssignee?: Id<"users">;
  corporateAssigneeName?: string | null;
  marketAssigneeName?: string | null;
}

export function CalendarPage() {
  const { isBoardMember } = useCurrentProfile();
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [copied, setCopied] = useState(false);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const navigate = useNavigate();

  // Queries
  const events = useQuery(api.events.list, {
    year: currentYear,
    month: currentMonth,
  });
  const mySignups = useQuery(api.interviewSignups.listMySignups, {});

  // Mutations
  const removeEvent = useMutation(api.events.remove);
  const removeSeries = useMutation(api.events.removeSeries);
  const generateToken = useMutation(api.profiles.generateIcalToken);

  const [icalUrl, setIcalUrl] = useState<string | null>(null);

  // Navigation
  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setSelectedDate(null);
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();

    // getDay() returns 0=Sun, we need 0=Mon
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: Array<{ day: number; dateStr: string } | null> = [];

    // Leading empty cells
    for (let i = 0; i < startDow; i++) {
      days.push(null);
    }

    // Month days
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(currentMonth).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      days.push({
        day: d,
        dateStr: `${currentYear}-${monthStr}-${dayStr}`,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Events grouped by date
  const eventsByDate = useMemo(() => {
    if (!events) return {};
    return events.reduce(
      (acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
      },
      {} as Record<string, typeof events>
    );
  }, [events]);

  // Interview signups grouped by date (filtered to current month)
  const interviewsByDate = useMemo(() => {
    if (!mySignups) return {};
    const monthStr = String(currentMonth).padStart(2, "0");
    const prefix = `${currentYear}-${monthStr}`;
    return mySignups
      .filter((s) => s.slot.date.startsWith(prefix))
      .reduce(
        (acc, signup) => {
          if (!acc[signup.slot.date]) acc[signup.slot.date] = [];
          acc[signup.slot.date].push(signup);
          return acc;
        },
        {} as Record<string, typeof mySignups>
      );
  }, [mySignups, currentYear, currentMonth]);

  // Selected day data
  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];
  const selectedInterviews = selectedDate
    ? interviewsByDate[selectedDate] ?? []
    : [];

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const handleDelete = async (eventId: Id<"events">) => {
    try {
      await removeEvent({ eventId });
      toast.success("Event deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete event"
      );
    }
  };

  const handleDeleteSeries = async (seriesId: string) => {
    try {
      const result = await removeSeries({ seriesId });
      toast.success(`Deleted ${result.deleted} events in series`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete series"
      );
    }
  };

  const handleEdit = (event: EventData) => {
    setEditingEvent(event);
    setEventDialogOpen(true);
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setEventDialogOpen(true);
  };

  const handleGetFeed = useCallback(async () => {
    try {
      const token = await generateToken({});
      const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;
      const url = `${siteUrl}/api/calendar?token=${token}`;
      setIcalUrl(url);
    } catch (err) {
      toast.error("Failed to generate calendar feed");
    }
  }, [generateToken]);

  const handleCopyUrl = useCallback(() => {
    if (icalUrl) {
      navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  }, [icalUrl]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            Events and interview schedule
          </p>
        </div>
        {isBoardMember && (
          <Button onClick={handleAddEvent}>
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Button>
        )}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Calendar grid */}
      {events === undefined ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <div className="rounded-lg border">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {DAY_HEADERS.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((cell, i) => {
              if (!cell) {
                return (
                  <div key={`empty-${i}`} className="min-h-[80px] border-b border-r bg-muted/10" />
                );
              }

              const dayEvents = eventsByDate[cell.dateStr] ?? [];
              const dayInterviews = interviewsByDate[cell.dateStr] ?? [];
              const hasItems = dayEvents.length > 0 || dayInterviews.length > 0;
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;

              return (
                <div
                  key={cell.dateStr}
                  className={`min-h-[80px] border-b border-r p-1 cursor-pointer transition-colors hover:bg-muted/20 ${
                    isSelected ? "bg-accent/20 ring-1 ring-accent" : ""
                  }`}
                  onClick={() => {
                    setSelectedDate(cell.dateStr);
                    setDayDialogOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between px-1">
                    <span
                      className={`text-sm font-medium ${
                        isToday
                          ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : ""
                      }`}
                    >
                      {cell.day}
                    </span>
                  </div>
                  {hasItems && (
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event._id}
                          className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                            event.isCorporateMarketUpdate
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayInterviews.slice(0, 2).map((signup) => (
                        <div
                          key={signup.signupId}
                          className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                            signup.slot.type === "telephone"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {signup.slot.type === "telephone"
                            ? "Tel Interview"
                            : "AC Interview"}
                        </div>
                      ))}
                      {dayEvents.length + dayInterviews.length > 4 && (
                        <div className="px-1 text-[10px] text-muted-foreground">
                          +{dayEvents.length + dayInterviews.length - 4} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day dialog */}
      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? formatDate(selectedDate) : ""}
            </DialogTitle>
          </DialogHeader>

          {selectedEvents.length === 0 && selectedInterviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events or interviews on this day.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Events */}
              {selectedEvents.map((event) => (
                <Card key={event._id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{event.title}</span>
                      <div className="flex items-center gap-1">
                        {event.seriesId && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-blue-50 text-blue-600"
                          >
                            <Repeat className="mr-0.5 h-2.5 w-2.5" />
                            Series
                          </Badge>
                        )}
                        {isBoardMember && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setDayDialogOpen(false);
                                handleEdit(event);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => void handleDelete(event._id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {event.startTime} &ndash; {event.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{event.location || "No location"}</span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                    {/* Corporate & Market Update details */}
                    {event.isCorporateMarketUpdate && (
                      <div className="space-y-1.5 border-t pt-2">
                        <Badge
                          variant="secondary"
                          className="bg-green-50 text-green-700 text-[10px]"
                        >
                          Corporate & Market Update
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Corporate:</span>{" "}
                          {event.corporateAssigneeName && event.corporateAssignee ? (
                            <button
                              className="underline underline-offset-2 hover:text-foreground transition-colors"
                              onClick={() => {
                                setDayDialogOpen(false);
                                navigate(`/members/${event.corporateAssignee}`);
                              }}
                            >
                              {event.corporateAssigneeName}
                            </button>
                          ) : (
                            "Unassigned"
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Market:</span>{" "}
                          {event.marketAssigneeName && event.marketAssignee ? (
                            <button
                              className="underline underline-offset-2 hover:text-foreground transition-colors"
                              onClick={() => {
                                setDayDialogOpen(false);
                                navigate(`/members/${event.marketAssignee}`);
                              }}
                            >
                              {event.marketAssigneeName}
                            </button>
                          ) : (
                            "Unassigned"
                          )}
                        </div>
                        {isBoardMember && (
                          <PresentationUpload eventId={event._id} />
                        )}
                      </div>
                    )}
                    {isBoardMember && event.seriesId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs text-destructive hover:text-destructive"
                        onClick={() =>
                          void handleDeleteSeries(event.seriesId!)
                        }
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete Entire Series
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Interview signups */}
              {selectedInterviews.map((signup) => (
                <Card key={signup.signupId}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {signup.slot.type === "telephone"
                          ? "Telephone Interview"
                          : "Assessment Center"}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          signup.slot.type === "telephone"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-purple-100 text-purple-800"
                        }
                      >
                        Interview
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {signup.slot.startTime} &ndash; {signup.slot.endTime}
                      </span>
                    </div>
                    {signup.slot.applicantName && (
                      <p className="text-sm text-muted-foreground">
                        Applicant: {signup.slot.applicantName}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {signup.slot.signupCount} / {signup.slot.maxInterviewers}{" "}
                      interviewers
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Calendar Feed */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Calendar Feed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Subscribe in Apple Calendar, Google Calendar, or any app that
                supports iCal feeds.
              </p>
            </div>
            {!icalUrl ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleGetFeed()}
              >
                Get Feed URL
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
              >
                {copied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy URL"}
              </Button>
            )}
          </div>
          {icalUrl && (
            <div className="mt-3">
              <code className="block break-all rounded bg-muted px-3 py-2 text-xs">
                {icalUrl}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        editingEvent={editingEvent}
      />
    </div>
  );
}
