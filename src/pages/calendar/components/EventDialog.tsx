import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EventData {
  _id: Id<"events">;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  seriesId?: string;
  isCorporateMarketUpdate?: boolean;
  corporateAssignee?: Id<"users">;
  marketAssignee?: Id<"users">;
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent?: EventData | null;
}

const DAYS_OF_WEEK = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

export function EventDialog({
  open,
  onOpenChange,
  editingEvent,
}: EventDialogProps) {
  const createEvent = useMutation(api.events.create);
  const createRecurring = useMutation(api.events.createRecurring);
  const updateEvent = useMutation(api.events.update);
  const profiles = useQuery(api.profiles.listProfiles);

  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [weeksCount, setWeeksCount] = useState(12);
  const [isCorporateMarketUpdate, setIsCorporateMarketUpdate] = useState(false);
  const [corporateAssignee, setCorporateAssignee] = useState("");
  const [marketAssignee, setMarketAssignee] = useState("");
  const [corporatePopoverOpen, setCorporatePopoverOpen] = useState(false);
  const [marketPopoverOpen, setMarketPopoverOpen] = useState(false);

  const isEditing = !!editingEvent;

  // All approved members for assignment dropdowns
  const allMembers = profiles ?? [];

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description ?? "");
      setDate(editingEvent.date);
      setStartTime(editingEvent.startTime);
      setEndTime(editingEvent.endTime);
      setLocation(editingEvent.location ?? "");
      setRecurring(false);
      setIsCorporateMarketUpdate(editingEvent.isCorporateMarketUpdate ?? false);
      setCorporateAssignee(editingEvent.corporateAssignee ?? "");
      setMarketAssignee(editingEvent.marketAssignee ?? "");
    } else {
      setTitle("");
      setDescription("");
      setDate("");
      setStartTime("09:00");
      setEndTime("10:00");
      setLocation("");
      setRecurring(false);
      setDayOfWeek("1");
      setWeeksCount(12);
      setIsCorporateMarketUpdate(false);
      setCorporateAssignee("");
      setMarketAssignee("");
    }
  }, [editingEvent, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateEvent({
          eventId: editingEvent._id,
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          startTime,
          endTime,
          location: location.trim() || undefined,
          isCorporateMarketUpdate,
          corporateAssignee:
            isCorporateMarketUpdate && corporateAssignee
              ? (corporateAssignee as Id<"users">)
              : undefined,
          marketAssignee:
            isCorporateMarketUpdate && marketAssignee
              ? (marketAssignee as Id<"users">)
              : undefined,
        });
        toast.success("Event updated");
      } else if (recurring) {
        if (!date) {
          toast.error("Please select a start date");
          setSubmitting(false);
          return;
        }
        const result = await createRecurring({
          title: title.trim(),
          description: description.trim() || undefined,
          dayOfWeek: Number(dayOfWeek),
          startTime,
          endTime,
          startDate: date,
          weeksCount,
          isCorporateMarketUpdate: isCorporateMarketUpdate || undefined,
        });
        toast.success(`Created ${result.eventsCreated} recurring events`);
      } else {
        if (!date) {
          toast.error("Please select a date");
          setSubmitting(false);
          return;
        }
        await createEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          startTime,
          endTime,
          location: location.trim() || undefined,
          isCorporateMarketUpdate: isCorporateMarketUpdate || undefined,
          corporateAssignee:
            isCorporateMarketUpdate && corporateAssignee
              ? (corporateAssignee as Id<"users">)
              : undefined,
          marketAssignee:
            isCorporateMarketUpdate && marketAssignee
              ? (marketAssignee as Id<"users">)
              : undefined,
        });
        toast.success("Event created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save event"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Event" : "Add Event"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the event details."
              : "Create a new calendar event."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Meeting"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event details..."
            />
          </div>

          {/* Recurring toggle - create mode only */}
          {!isEditing && (
            <div className="flex items-center gap-3">
              <Checkbox
                id="recurring"
                checked={recurring}
                onCheckedChange={(checked) => setRecurring(checked === true)}
              />
              <Label htmlFor="recurring" className="cursor-pointer">
                Recurring weekly event
              </Label>
            </div>
          )}

          {/* Date / Recurring fields */}
          {recurring && !isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={dayOfWeek}
                    onValueChange={setDayOfWeek}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Weeks</Label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={weeksCount}
                    onChange={(e) => setWeeksCount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Starting from</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          )}

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
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

          {/* Location - not shown for recurring create (starts unset) */}
          {(!recurring || isEditing) && (
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Room 301"
              />
            </div>
          )}

          {/* Corporate & Market Update checkbox */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="corporateMarketUpdate"
              checked={isCorporateMarketUpdate}
              onCheckedChange={(checked) =>
                setIsCorporateMarketUpdate(checked === true)
              }
            />
            <Label htmlFor="corporateMarketUpdate" className="cursor-pointer">
              Corporate & Market Update
            </Label>
          </div>

          {/* Member assignment dropdowns (shown when C&M checked and NOT recurring create) */}
          {isCorporateMarketUpdate && !(recurring && !isEditing) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Corporate Presenter</Label>
                <Popover open={corporatePopoverOpen} onOpenChange={setCorporatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={corporatePopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      {corporateAssignee
                        ? allMembers.find((m) => m.userId === corporateAssignee)?.displayName ?? "Select member..."
                        : "Select member..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Search member..." />
                      <CommandList>
                        <CommandEmpty>No member found.</CommandEmpty>
                        <CommandGroup>
                          {allMembers.map((member) => (
                            <CommandItem
                              key={member.userId}
                              value={member.displayName}
                              onSelect={() => {
                                setCorporateAssignee(
                                  corporateAssignee === member.userId ? "" : member.userId
                                );
                                setCorporatePopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  corporateAssignee === member.userId ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {member.displayName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Market Presenter</Label>
                <Popover open={marketPopoverOpen} onOpenChange={setMarketPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={marketPopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      {marketAssignee
                        ? allMembers.find((m) => m.userId === marketAssignee)?.displayName ?? "Select member..."
                        : "Select member..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Search member..." />
                      <CommandList>
                        <CommandEmpty>No member found.</CommandEmpty>
                        <CommandGroup>
                          {allMembers.map((member) => (
                            <CommandItem
                              key={member.userId}
                              value={member.displayName}
                              onSelect={() => {
                                setMarketAssignee(
                                  marketAssignee === member.userId ? "" : member.userId
                                );
                                setMarketPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  marketAssignee === member.userId ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {member.displayName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : isEditing
                ? "Update Event"
                : recurring
                  ? `Create ${weeksCount} Weekly Events`
                  : "Create Event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
