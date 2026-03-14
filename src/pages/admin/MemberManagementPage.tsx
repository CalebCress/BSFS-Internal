import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
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
import { Search, Trash2, Mail } from "lucide-react";
import { ROLES, MEMBER_STATUSES, SPECIAL_ROLES, type MemberStatus } from "@/lib/constants";
import { toast } from "sonner";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MemberManagementPage() {
  const { profile: myProfile, isBoardMember } = useCurrentProfile();
  const allMembers = useQuery(api.profiles.listAllMembers);
  const updateRole = useMutation(api.profiles.updateRole);
  const updateSpecialRole = useMutation(api.profiles.updateSpecialRole);
  const removeMember = useMutation(api.profiles.removeMember);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmRemove, setConfirmRemove] = useState<{
    id: Id<"profiles">;
    name: string;
  } | null>(null);

  const filtered = (allMembers ?? []).filter((m) => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesSearch =
        m.displayName.toLowerCase().includes(q) ||
        (m.email?.toLowerCase().includes(q) ?? false);
      if (!matchesSearch) return false;
    }
    // Status filter
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  const handleRoleChange = async (
    profileId: Id<"profiles">,
    role: "board_member" | "committee_member" | "alumni",
    name: string
  ) => {
    try {
      await updateRole({ profileId, role });
      toast.success(`${name} is now a ${ROLES[role].label}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update role"
      );
    }
  };

  const handleSpecialRoleChange = async (
    profileId: Id<"profiles">,
    specialRole: "admin" | "attendance_tracker" | "none",
    name: string
  ) => {
    try {
      await updateSpecialRole({ profileId, specialRole });
      const label =
        specialRole === "none"
          ? "None"
          : SPECIAL_ROLES[specialRole].label;
      toast.success(`${name}'s special access set to ${label}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update special role"
      );
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await removeMember({ profileId: confirmRemove.id });
      toast.success(`${confirmRemove.name} has been removed`);
      setConfirmRemove(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove member"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Manage Members
        </h1>
        <p className="text-muted-foreground mt-1">
          Change member roles and remove members.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members count */}
      {allMembers && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {allMembers.length} member{allMembers.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Members Table */}
      {allMembers === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {search || statusFilter !== "all"
            ? "No members match your filters."
            : "No members found."}
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className={`grid ${isBoardMember ? "grid-cols-[1fr_140px_180px_180px_60px]" : "grid-cols-[1fr_140px_180px_60px]"} items-center gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
            <span>Member</span>
            <span>Status</span>
            <span>Role</span>
            {isBoardMember && <span>Special Access</span>}
            <span className="text-right">Actions</span>
          </div>
          {filtered.map((member) => {
            const isMe = member.userId === myProfile?.userId;
            const statusConfig = MEMBER_STATUSES[member.status as MemberStatus];
            return (
              <div
                key={member._id}
                className={`grid ${isBoardMember ? "grid-cols-[1fr_140px_180px_180px_60px]" : "grid-cols-[1fr_140px_180px_60px]"} items-center gap-4 border-b last:border-b-0 px-4 py-3`}
              >
                {/* Member info */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    {member.photoUrl && (
                      <AvatarImage
                        src={member.photoUrl}
                        alt={member.displayName}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {getInitials(member.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {member.displayName}
                      </span>
                      {isMe && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 shrink-0"
                        >
                          You
                        </Badge>
                      )}
                    </div>
                    {member.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <Badge
                  variant="secondary"
                  className={statusConfig?.color ?? ""}
                >
                  {statusConfig?.label ?? member.status}
                </Badge>

                {/* Role selector */}
                <Select
                  value={member.role}
                  onValueChange={(val) =>
                    void handleRoleChange(
                      member._id,
                      val as "board_member" | "committee_member" | "alumni",
                      member.displayName
                    )
                  }
                  disabled={isMe}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="board_member">
                      {ROLES.board_member.label}
                    </SelectItem>
                    <SelectItem value="committee_member">
                      {ROLES.committee_member.label}
                    </SelectItem>
                    <SelectItem value="alumni">
                      {ROLES.alumni.label}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Special role selector (board members only) */}
                {isBoardMember && (
                  <Select
                    value={(member as any).specialRole ?? "none"}
                    onValueChange={(val) =>
                      void handleSpecialRoleChange(
                        member._id,
                        val as "admin" | "attendance_tracker" | "none",
                        member.displayName
                      )
                    }
                    disabled={
                      isMe ||
                      member.role === "board_member" ||
                      member.role === "alumni"
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="admin">
                        {SPECIAL_ROLES.admin.label}
                      </SelectItem>
                      <SelectItem value="attendance_tracker">
                        {SPECIAL_ROLES.attendance_tracker.label}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Remove button */}
                <div className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={isMe}
                    onClick={() =>
                      setConfirmRemove({
                        id: member._id,
                        name: member.displayName,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Remove Dialog */}
      <Dialog
        open={confirmRemove !== null}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">
                {confirmRemove?.name}
              </span>
              ? This will delete their profile, uploaded files, and all their
              stock theses. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRemove()}
            >
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
