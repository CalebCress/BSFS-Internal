import { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Building2,
  ExternalLink,
  FileText,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  InternshipFormDialog,
  type InternshipFormInitial,
} from "./components/InternshipFormDialog";

type Status =
  | "not_started"
  | "applied"
  | "online_assessment"
  | "hirevue"
  | "technical_interview"
  | "assessment_centre"
  | "final"
  | "offer"
  | "rejected"
  | "withdrew";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "applied", label: "Applied" },
  { value: "online_assessment", label: "Online assessment" },
  { value: "hirevue", label: "HireVue / video" },
  { value: "technical_interview", label: "Technical interview" },
  { value: "assessment_centre", label: "Assessment centre" },
  { value: "final", label: "Final / superday" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrew", label: "Withdrew" },
];

const STATUS_LABEL: Record<Status, string> = STATUS_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<Status, string>,
);

const STATUS_COLOUR: Record<Status, string> = {
  not_started: "bg-muted text-muted-foreground",
  applied: "bg-blue-50 text-blue-700",
  online_assessment: "bg-indigo-50 text-indigo-700",
  hirevue: "bg-violet-50 text-violet-700",
  technical_interview: "bg-amber-50 text-amber-700",
  assessment_centre: "bg-orange-50 text-orange-700",
  final: "bg-fuchsia-50 text-fuchsia-700",
  offer: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  withdrew: "bg-zinc-100 text-zinc-600",
};

// Mirror the backend helper so the UI label is correct without extra round-trips.
function currentTrackrSeason(now: Date = new Date()): string {
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  return month >= 4 ? String(year + 1) : String(year);
}

type ProgrammeType = "summer-internships" | "spring-weeks";

const PROGRAMME_TYPE_STORAGE_KEY = "bsfs_internship_programme_type";

function loadProgrammeType(): ProgrammeType {
  if (typeof window === "undefined") return "summer-internships";
  const v = window.localStorage.getItem(PROGRAMME_TYPE_STORAGE_KEY);
  return v === "spring-weeks" ? "spring-weeks" : "summer-internships";
}

const PROGRAMME_TYPE_LABEL: Record<ProgrammeType, string> = {
  "summer-internships": "summer internships",
  "spring-weeks": "spring weeks",
};

function formatDeadline(ts: number | undefined): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isOpen(now: number, openingDate?: number, closingDate?: number): boolean {
  if (closingDate && closingDate < now) return false;
  if (openingDate && openingDate > now) return false;
  return true;
}

// Trackr returns "Yes" / "No" / "Optional" (case varies). Return null when unknown.
function renderCoverLetter(value: string | undefined | null): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "yes" || v === "required") return "Required";
  if (v === "no" || v === "not required") return "Not required";
  if (v === "optional") return "Optional";
  return value.trim();
}

export function InternshipTrackerPage() {
  const season = currentTrackrSeason();
  const { profile, hasAdminAccess } = useCurrentProfile();
  const [programmeType, setProgrammeType] = useState<ProgrammeType>(() =>
    loadProgrammeType(),
  );
  useEffect(() => {
    window.localStorage.setItem(PROGRAMME_TYPE_STORAGE_KEY, programmeType);
  }, [programmeType]);

  const programmes = useQuery(api.internships.list, { season, programmeType });
  const setProgress = useMutation(api.internships.setProgress);
  const deleteInternship = useMutation(api.internships.deleteUserInternship);
  const refreshTrackr = useAction(api.internshipsSync.refresh);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "trackr" | "user">("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [hasLinkOnly, setHasLinkOnly] = useState(false);
  const [noCoverLetterOnly, setNoCoverLetterOnly] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InternshipFormInitial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Id<"internshipProgrammes"> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of programmes ?? []) {
      for (const c of p.categories) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [programmes]);

  const now = Date.now();
  const filtered = useMemo(() => {
    if (!programmes) return [];
    const q = search.trim().toLowerCase();
    return programmes
      .filter((p) => {
        if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
        if (statusFilter !== "all" && p.myStatus !== statusFilter) return false;
        if (categoryFilter !== "all" && !p.categories.includes(categoryFilter)) {
          return false;
        }
        if (openOnly && !isOpen(now, p.openingDate, p.closingDate)) return false;
        if (hasLinkOnly && !p.url) return false;
        if (noCoverLetterOnly && renderCoverLetter(p.coverLetter) === "Required") {
          return false;
        }
        if (q) {
          const haystack = `${p.name} ${p.companyName} ${p.categories.join(" ")} ${p.locations.join(" ")}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Open with nearest deadline first; closed/no deadline last
        const aOpen = isOpen(now, a.openingDate, a.closingDate);
        const bOpen = isOpen(now, b.openingDate, b.closingDate);
        if (aOpen !== bOpen) return aOpen ? -1 : 1;
        const aDl = a.closingDate ?? Number.POSITIVE_INFINITY;
        const bDl = b.closingDate ?? Number.POSITIVE_INFINITY;
        return aDl - bDl;
      });
  }, [
    programmes,
    search,
    sourceFilter,
    statusFilter,
    categoryFilter,
    openOnly,
    hasLinkOnly,
    noCoverLetterOnly,
    now,
  ]);

  const handleSetProgress = async (programmeId: Id<"internshipProgrammes">, status: Status) => {
    try {
      await setProgress({ programmeId, status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update progress");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refreshTrackr({ season, programmeType });
      toast.success(
        `Synced ${res.count} ${PROGRAMME_TYPE_LABEL[programmeType]} for ${season}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInternship({ programmeId: deleteTarget });
      toast.success("Internship removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setDeleteTarget(null);
    }
  };

  const myUserId = profile?.userId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Internship Tracker</h1>
          <p className="text-muted-foreground">
            UK Finance {PROGRAMME_TYPE_LABEL[programmeType]} for {season}. Track your application progress per role.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={programmeType}
            onValueChange={(v) => {
              if (v === "summer-internships" || v === "spring-weeks") {
                setProgrammeType(v);
              }
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="spring-weeks" aria-label="Spring weeks">
              Spring
            </ToggleGroupItem>
            <ToggleGroupItem value="summer-internships" aria-label="Summer internships">
              Summer
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => {
              if (v === "grid" || v === "list") setViewMode(v);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          {hasAdminAccess && (
            <Button
              variant="outline"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Syncing..." : "Refresh from API"}
            </Button>
          )}
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Internship
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company or role..."
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | Status)}
            >
              <SelectTrigger>
                <SelectValue placeholder="My status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sourceFilter}
              onValueChange={(v) => setSourceFilter(v as "all" | "trackr" | "user")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="trackr">From The Trackr</SelectItem>
                <SelectItem value="user">Member-added</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Open applications only
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasLinkOnly}
                onChange={(e) => setHasLinkOnly(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Has a link
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={noCoverLetterOnly}
                onChange={(e) => setNoCoverLetterOnly(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Cover letter not required
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Listings */}
      {programmes === undefined ? (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid gap-3"
          }
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          {programmes.length === 0
            ? "No internships yet. " +
              (hasAdminAccess
                ? "Click Refresh from API to pull listings."
                : "Check back soon — listings sync daily.")
            : "No internships match these filters."}
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid gap-3"
          }
        >
          {filtered.map((p) => {
            const status = p.myStatus as Status;
            const deadline = formatDeadline(p.closingDate);
            const open = isOpen(now, p.openingDate, p.closingDate);
            const canEdit =
              p.source === "user" && (p.addedBy === myUserId || hasAdminAccess);
            const coverLetterChip = renderCoverLetter(p.coverLetter);

            const titleBlock = (
              <div className="flex flex-wrap items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">{p.companyName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold">{p.name}</span>
                {p.source === "user" && (
                  <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                    <UserPlus className="mr-1 h-3 w-3" />
                    Member-added
                  </Badge>
                )}
                {!open && (
                  <Badge variant="secondary" className="bg-zinc-100 text-zinc-600">
                    Closed
                  </Badge>
                )}
              </div>
            );

            const tagsBlock = (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {p.categories.map((c) => (
                  <Badge key={c} variant="outline" className="font-normal">
                    {c}
                  </Badge>
                ))}
                {p.locations.map((l) => (
                  <span key={l} className="rounded bg-muted px-1.5 py-0.5">
                    {l}
                  </span>
                ))}
              </div>
            );

            const metaBlock = (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {deadline && (
                  <span>
                    Deadline: <span className="font-medium text-foreground">{deadline}</span>
                    {p.rolling ? " (rolling)" : ""}
                  </span>
                )}
                {coverLetterChip && (
                  <Badge variant="outline" className="gap-1 font-normal">
                    <FileText className="h-3 w-3" />
                    Cover letter: {coverLetterChip}
                  </Badge>
                )}
                {viewMode === "list" && p.process && <span>Process: {p.process}</span>}
                {viewMode === "list" && p.currentStage && (
                  <span>Stage: {p.currentStage}</span>
                )}
              </div>
            );

            const statusSelect = (
              <Select
                value={status}
                onValueChange={(v) => void handleSetProgress(p._id, v as Status)}
              >
                <SelectTrigger className={STATUS_COLOUR[status]}>
                  <SelectValue>{STATUS_LABEL[status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );

            const actionButtons = (
              <div className="flex gap-2">
                {p.url ? (
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Apply
                    </a>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    No link yet
                  </Button>
                )}
                {canEdit && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing({
                          programmeId: p._id,
                          name: p.name,
                          companyName: p.companyName,
                          url: p.url ?? "",
                          categories: p.categories,
                          locations: p.locations,
                          closingDate: p.closingDate,
                          openingDate: p.openingDate,
                          notes: p.notes ?? undefined,
                          season: p.season,
                          programmeType:
                            p.type === "spring-weeks"
                              ? "spring-weeks"
                              : "summer-internships",
                        });
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(p._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            );

            if (viewMode === "grid") {
              return (
                <Card key={p._id} className="flex h-full flex-col">
                  <CardContent className="flex flex-1 flex-col gap-2 p-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs font-medium text-muted-foreground">
                          {p.companyName}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-snug">{p.name}</h3>
                        {!open && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 bg-zinc-100 text-[10px] text-zinc-600"
                          >
                            Closed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {p.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.categories.slice(0, 3).map((c) => (
                          <Badge
                            key={c}
                            variant="outline"
                            className="font-normal text-[10px]"
                          >
                            {c}
                          </Badge>
                        ))}
                        {p.categories.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{p.categories.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                      {deadline && (
                        <div>
                          <span className="font-medium text-foreground">{deadline}</span>
                          {p.rolling ? " · rolling" : ""}
                        </div>
                      )}
                      {coverLetterChip && (
                        <div>Cover letter: {coverLetterChip}</div>
                      )}
                      {p.source === "user" && (
                        <div className="flex items-center gap-1 text-purple-700">
                          <UserPlus className="h-3 w-3" />
                          Member-added
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex flex-col gap-1.5 pt-1.5">
                      <Select
                        value={status}
                        onValueChange={(v) =>
                          void handleSetProgress(p._id, v as Status)
                        }
                      >
                        <SelectTrigger
                          className={`h-8 text-xs ${STATUS_COLOUR[status]}`}
                        >
                          <SelectValue>{STATUS_LABEL[status]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1.5">
                        {p.url ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 flex-1 text-xs"
                          >
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-1 h-3 w-3" />
                              Apply
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 flex-1 text-xs"
                            disabled
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            No link yet
                          </Button>
                        )}
                        {canEdit && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => {
                                setEditing({
                                  programmeId: p._id,
                                  name: p.name,
                                  companyName: p.companyName,
                                  url: p.url ?? "",
                                  categories: p.categories,
                                  locations: p.locations,
                                  closingDate: p.closingDate,
                                  openingDate: p.openingDate,
                                  notes: p.notes ?? undefined,
                                  season: p.season,
                                });
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => setDeleteTarget(p._id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={p._id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      {titleBlock}
                      {tagsBlock}
                      {metaBlock}
                      {p.notes && (
                        <p className="text-xs text-muted-foreground">{p.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-stretch gap-2 md:w-56 md:shrink-0">
                      {statusSelect}
                      {actionButtons}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <InternshipFormDialog
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setEditing(null);
        }}
        initial={editing}
        defaultSeason={season}
        defaultProgrammeType={programmeType}
        existingCategories={allCategories}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove this internship?</DialogTitle>
            <DialogDescription>
              This will also clear progress that members have tracked against it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
