import { useRef, useState } from "react";
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
import { ChevronsUpDown, Check, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: "corporate_market_update" | "workshop" | "regional";
}

export function UploadResourceDialog({
  open,
  onOpenChange,
  eventType,
}: UploadResourceDialogProps) {
  const createEvent = useMutation(api.events.create);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const uploadPresentation = useMutation(api.resources.uploadPresentation);
  const profiles = useQuery(api.profiles.listProfiles, { includeAlumni: true });

  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [corporateAssignee, setCorporateAssignee] = useState("");
  const [marketAssignee, setMarketAssignee] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [corporatePopoverOpen, setCorporatePopoverOpen] = useState(false);
  const [marketPopoverOpen, setMarketPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allMembers = profiles ?? [];
  const isCMU = eventType === "corporate_market_update";
  const isRegional = eventType === "regional";
  const usesTwoPresenters = isCMU || isRegional;
  const dialogTitle =
    eventType === "corporate_market_update"
      ? "Upload Market & Corporate Update"
      : eventType === "regional"
        ? "Upload Regional Report"
        : "Upload Workshop";

  const reset = () => {
    setTitle("");
    setDate("");
    setStartTime("09:00");
    setEndTime("10:00");
    setLocation("");
    setCorporateAssignee("");
    setMarketAssignee("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    if (!file) {
      toast.error("Please select a PDF file");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create the event
      const eventId = await createEvent({
        title: title.trim(),
        date,
        startTime,
        endTime,
        location: location.trim() || undefined,
        eventType,
        isCorporateMarketUpdate: isCMU || undefined,
        corporateAssignee:
          usesTwoPresenters && corporateAssignee
            ? (corporateAssignee as Id<"users">)
            : undefined,
        marketAssignee:
          usesTwoPresenters && marketAssignee
            ? (marketAssignee as Id<"users">)
            : undefined,
      });

      // 2. Upload the file
      const url = await generateUploadUrl();
      const result = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // 3. Link the file to the event as a resource
      await uploadPresentation({
        eventId,
        fileStorageId: storageId as Id<"_storage">,
      });

      toast.success("Resource uploaded");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload resource"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }
    setFile(selected);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Upload a past event presentation. This will also create the event
            in the calendar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Meeting"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

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

          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Room 301"
            />
          </div>

          {usesTwoPresenters && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isRegional ? "Presenter 1" : "Corporate Presenter"}</Label>
                <Popover
                  open={corporatePopoverOpen}
                  onOpenChange={setCorporatePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={corporatePopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      {corporateAssignee
                        ? allMembers.find(
                            (m) => m.userId === corporateAssignee
                          )?.displayName ?? "Select member..."
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
                                  corporateAssignee === member.userId
                                    ? ""
                                    : member.userId
                                );
                                setCorporatePopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  corporateAssignee === member.userId
                                    ? "opacity-100"
                                    : "opacity-0"
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
                <Label>{isRegional ? "Presenter 2" : "Market Presenter"}</Label>
                <Popover
                  open={marketPopoverOpen}
                  onOpenChange={setMarketPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={marketPopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      {marketAssignee
                        ? allMembers.find((m) => m.userId === marketAssignee)
                            ?.displayName ?? "Select member..."
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
                                  marketAssignee === member.userId
                                    ? ""
                                    : member.userId
                                );
                                setMarketPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  marketAssignee === member.userId
                                    ? "opacity-100"
                                    : "opacity-0"
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

          <div className="space-y-2">
            <Label>PDF File</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {file ? "Change File" : "Select PDF"}
              </Button>
              {file && (
                <span className="text-xs text-muted-foreground truncate">
                  {file.name}
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
