import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { type Id } from "../../../convex/_generated/dataModel";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ToggleLeft, ToggleRight, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const SEASONS = ["Winter", "Summer", "Fall", "Spring"] as const;

export function FormsPage() {
  const forms = useQuery(api.applicationForms.list);
  const createForm = useMutation(api.applicationForms.create);
  const activateForm = useMutation(api.applicationForms.activate);
  const deactivateForm = useMutation(api.applicationForms.deactivate);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [season, setSeason] = useState<string>("Winter");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const semester = `${season} ${year}`;
      await createForm({ title: `${semester} Application`, semester });
      toast.success(`Created ${semester} application round`);
      setDialogOpen(false);
    } catch {
      toast.error("Failed to create application round");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (
    id: Id<"applicationForms">,
    currentlyActive: boolean
  ) => {
    try {
      if (currentlyActive) {
        await deactivateForm({ id });
        toast.success("Application round closed");
      } else {
        await activateForm({ id });
        toast.success(
          "Application round opened. Any previously open round has been closed."
        );
      }
    } catch {
      toast.error("Failed to update application round");
    }
  };

  const copyApplyLink = () => {
    const url = `${window.location.origin}/apply`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Application link copied to clipboard");
    });
  };

  const isLoading = forms === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Application Forms
          </h1>
          <p className="text-muted-foreground">
            Create and manage application rounds for recruitment cycles.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyApplyLink}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Copy Apply Link
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Round
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Application Round</DialogTitle>
                <DialogDescription>
                  Create a new application round for a semester. The round will
                  be created as closed — you can open it when ready.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Season</Label>
                    <Select value={season} onValueChange={setSeason}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEASONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      min={2020}
                      max={2040}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => void handleCreate()} disabled={creating}>
                  {creating ? "Creating..." : "Create Round"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-[300px] w-full" />
      ) : forms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No application rounds yet. Create one to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semester</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Applicants</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form._id}>
                  <TableCell className="font-medium">
                    {form.semester}
                  </TableCell>
                  <TableCell>{form.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        form.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {form.isActive ? "Open" : "Closed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {form.applicantCount}
                  </TableCell>
                  <TableCell>
                    {formatDate(form.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void handleToggle(form._id, form.isActive)
                      }
                    >
                      {form.isActive ? (
                        <>
                          <ToggleRight className="mr-1 h-4 w-4" /> Close
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="mr-1 h-4 w-4" /> Open
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
