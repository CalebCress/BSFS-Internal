import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Check, X, Mail, Linkedin, FileDown } from "lucide-react";
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

export function MemberApprovalsPage() {
  const pending = useQuery(api.profiles.listPendingSignUps);
  const approve = useMutation(api.profiles.approveMember);
  const reject = useMutation(api.profiles.rejectMember);

  const handleApprove = async (profileId: Id<"profiles">, name: string) => {
    try {
      await approve({ profileId });
      toast.success(`${name} has been approved`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve member"
      );
    }
  };

  const handleReject = async (profileId: Id<"profiles">, name: string) => {
    try {
      await reject({ profileId });
      toast.success(`${name} has been rejected`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject member"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Member Approvals
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and approve new membership requests.
        </p>
      </div>

      {pending === undefined ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="font-medium">No pending applications</p>
          <p className="text-sm">
            New member sign-ups will appear here for review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Badge variant="secondary" className="text-sm">
            {pending.length} pending{" "}
            {pending.length === 1 ? "application" : "applications"}
          </Badge>

          {pending.map((member) => (
            <div
              key={member._id}
              className="flex items-start gap-4 rounded-lg border p-4"
            >
              <Avatar className="h-14 w-14">
                {member.photoUrl && (
                  <AvatarImage
                    src={member.photoUrl}
                    alt={member.displayName}
                  />
                )}
                <AvatarFallback className="text-lg">
                  {getInitials(member.displayName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">
                    {member.displayName}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800"
                  >
                    Pending
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-1">
                  {member.email && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {member.email}
                    </span>
                  )}
                  {member.linkedIn && (
                    <a
                      href={member.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  )}
                  {member.cvUrl && (
                    <a
                      href={member.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Download CV
                    </a>
                  )}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() =>
                    void handleApprove(member._id, member.displayName)
                  }
                >
                  <Check className="mr-1 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    void handleReject(member._id, member.displayName)
                  }
                >
                  <X className="mr-1 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
