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

interface UploadReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: "regional_reports" | "special_reports";
}

export function UploadReportDialog({
  open,
  onOpenChange,
  category,
}: UploadReportDialogProps) {
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const uploadReport = useMutation(api.resources.uploadReport);
  const profiles = useQuery(api.profiles.listProfiles, { includeAlumni: true });

  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [presenterUserId, setPresenterUserId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [presenterPopoverOpen, setPresenterPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allMembers = profiles ?? [];
  const presenterRequired = category === "regional_reports";
  const labelKind = category === "regional_reports" ? "Regional Report" : "Special Report";
  const presenterLabel = category === "regional_reports" ? "Presenter" : "Presenter / Author";

  const reset = () => {
    setTitle("");
    setPresenterUserId("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!file) {
      toast.error("Please select a PDF file");
      return;
    }
    if (presenterRequired && !presenterUserId) {
      toast.error("Please select a presenter");
      return;
    }

    setSubmitting(true);
    try {
      const url = await generateUploadUrl();
      const result = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      await uploadReport({
        title: title.trim(),
        fileStorageId: storageId as Id<"_storage">,
        category,
        presenterUserId: presenterUserId
          ? (presenterUserId as Id<"users">)
          : undefined,
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
          <DialogTitle>Upload {labelKind}</DialogTitle>
          <DialogDescription>
            Upload a {labelKind.toLowerCase()} PDF.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. ${labelKind} Title`}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              {presenterLabel}
              {!presenterRequired && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (optional)
                </span>
              )}
            </Label>
            <Popover
              open={presenterPopoverOpen}
              onOpenChange={setPresenterPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={presenterPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {presenterUserId
                    ? allMembers.find((m) => m.userId === presenterUserId)
                        ?.displayName ?? "Select member..."
                    : "Select member..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0">
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
                            setPresenterUserId(
                              presenterUserId === member.userId
                                ? ""
                                : member.userId
                            );
                            setPresenterPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              presenterUserId === member.userId
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
