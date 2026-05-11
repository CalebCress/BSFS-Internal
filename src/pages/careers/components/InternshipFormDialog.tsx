import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProgrammeType = "summer-internships" | "spring-weeks";

export interface InternshipFormInitial {
  programmeId: Id<"internshipProgrammes">;
  name: string;
  companyName: string;
  url: string;
  categories: string[];
  locations: string[];
  closingDate?: number;
  openingDate?: number;
  notes?: string;
  season: string;
  programmeType?: ProgrammeType;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: InternshipFormInitial | null;
  defaultSeason: string;
  defaultProgrammeType: ProgrammeType;
  existingCategories: string[];
}

function dateToInputValue(ts: number | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inputValueToDate(s: string): number | undefined {
  if (!s) return undefined;
  const ts = Date.parse(`${s}T00:00:00.000Z`);
  return Number.isNaN(ts) ? undefined : ts;
}

export function InternshipFormDialog({
  open,
  onOpenChange,
  initial,
  defaultSeason,
  defaultProgrammeType,
  existingCategories,
}: Props) {
  const addInternship = useMutation(api.internships.addUserInternship);
  const updateInternship = useMutation(api.internships.updateUserInternship);

  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [locations, setLocations] = useState("");
  const [openingDate, setOpeningDate] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCompanyName(initial?.companyName ?? "");
      setUrl(initial?.url ?? "");
      setSelectedCategories(initial?.categories ?? []);
      setLocations(initial?.locations.join(", ") ?? "");
      setOpeningDate(dateToInputValue(initial?.openingDate));
      setClosingDate(dateToInputValue(initial?.closingDate));
      setNotes(initial?.notes ?? "");
      setCategorySearch("");
    }
  }, [open, initial]);

  const allCategoryOptions = useMemo(() => {
    const set = new Set<string>([...existingCategories, ...selectedCategories]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [existingCategories, selectedCategories]);

  const trimmedSearch = categorySearch.trim();
  const showAddNew =
    trimmedSearch.length > 0 &&
    !allCategoryOptions.some((c) => c.toLowerCase() === trimmedSearch.toLowerCase());

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const addNewCategory = () => {
    if (!trimmedSearch) return;
    if (!selectedCategories.some((c) => c.toLowerCase() === trimmedSearch.toLowerCase())) {
      setSelectedCategories((prev) => [...prev, trimmedSearch]);
    }
    setCategorySearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter the role name");
      return;
    }
    if (!companyName.trim()) {
      toast.error("Please enter the company name");
      return;
    }
    if (!url.trim()) {
      toast.error("Please enter the application URL");
      return;
    }

    const payload = {
      name: name.trim(),
      companyName: companyName.trim(),
      url: url.trim(),
      categories: selectedCategories,
      locations: locations
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
      openingDate: inputValueToDate(openingDate),
      closingDate: inputValueToDate(closingDate),
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (initial) {
        await updateInternship({
          programmeId: initial.programmeId,
          season: initial.season,
          programmeType: initial.programmeType ?? defaultProgrammeType,
          ...payload,
        });
        toast.success("Internship updated");
      } else {
        await addInternship({
          season: defaultSeason,
          programmeType: defaultProgrammeType,
          ...payload,
        });
        toast.success("Internship added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>{initial ? "Edit Internship" : "Add Internship"}</DialogTitle>
          <DialogDescription>
            Share an internship you found so other members can track it too.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Goldman Sachs"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Role / Programme name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer Analyst Programme"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Application URL</Label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedCategories.length > 0
                      ? `${selectedCategories.length} selected`
                      : "Select categories..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search or type to add..."
                      value={categorySearch}
                      onValueChange={setCategorySearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {showAddNew ? null : "No categories yet."}
                      </CommandEmpty>
                      {showAddNew && (
                        <CommandGroup heading="New">
                          <CommandItem
                            value={`__add__${trimmedSearch}`}
                            onSelect={addNewCategory}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add &ldquo;{trimmedSearch}&rdquo;
                          </CommandItem>
                        </CommandGroup>
                      )}
                      {allCategoryOptions.length > 0 && (
                        <CommandGroup heading="Existing">
                          {allCategoryOptions.map((cat) => {
                            const isSelected = selectedCategories.includes(cat);
                            return (
                              <CommandItem
                                key={cat}
                                value={cat}
                                onSelect={() => toggleCategory(cat)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {cat}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedCategories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="gap-1 pr-1">
                      {cat}
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="rounded-sm hover:bg-muted-foreground/20"
                        aria-label={`Remove ${cat}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Type a new value and click <strong>Add</strong> to create it.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Locations</Label>
              <Input
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                placeholder="e.g. London, Edinburgh"
              />
              <p className="text-xs text-muted-foreground">Comma-separated.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Opens</Label>
                <Input
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything useful for other members"
                rows={3}
              />
            </div>
          </div>

          <div className="border-t p-6 pt-4">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving..." : initial ? "Save Changes" : "Add Internship"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
