import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type InterviewStage = "telephone" | "assessment_center";

const STAGE_LABELS = {
  telephone: "Telephone Interview",
  assessment_center: "Assessment Centre",
} as const;

/**
 * Bulk-send booking invites to everyone in an interview stage.
 *
 * Deliberately shows exact recipient counts before sending, since this is the
 * one action in the app that emails a whole cohort at once.
 */
export function SendInvitesDialog({ stage }: { stage: InterviewStage }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [includeAlreadyInvited, setIncludeAlreadyInvited] = useState(false);

  const counts = useQuery(api.interviewInvites.getInviteCounts, { stage });
  const sendInvites = useMutation(api.interviewInvites.sendInvitesForStage);

  const recipientCount = counts
    ? includeAlreadyInvited
      ? counts.total
      : counts.notYetInvited
    : 0;

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await sendInvites({ stage, includeAlreadyInvited });
      toast.success(
        `Queued ${result.sent} invite${result.sent !== 1 ? "s" : ""}` +
          (result.skipped > 0 ? `, skipped ${result.skipped} already invited` : "")
      );
      setOpen(false);
      setIncludeAlreadyInvited(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send the invites"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail className="mr-2 h-4 w-4" />
          Send booking invites
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send {STAGE_LABELS[stage]} invites</DialogTitle>
          <DialogDescription>
            Each applicant gets a personal link to choose their own time.
          </DialogDescription>
        </DialogHeader>

        {counts === undefined ? (
          <p className="text-sm text-muted-foreground">Loading recipients...</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  In {STAGE_LABELS[stage]}
                </span>
                <Badge variant="secondary">{counts.total}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Not yet invited</span>
                <Badge variant="secondary">{counts.notYetInvited}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Already invited</span>
                <Badge variant="secondary">{counts.alreadyInvited}</Badge>
              </div>
            </div>

            {counts.alreadyInvited > 0 && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="includeAlreadyInvited"
                  checked={includeAlreadyInvited}
                  onChange={(e) => setIncludeAlreadyInvited(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="includeAlreadyInvited"
                  className="cursor-pointer text-sm"
                >
                  Also re-send to the {counts.alreadyInvited} already invited
                  <span className="block text-xs text-muted-foreground">
                    Their existing link keeps working - this just emails it again.
                  </span>
                </label>
              </div>
            )}

            <p className="text-sm">
              {recipientCount === 0 ? (
                <span className="text-muted-foreground">
                  No one to email right now.
                </span>
              ) : (
                <>
                  This will email{" "}
                  <span className="font-semibold">
                    {recipientCount} applicant{recipientCount !== 1 ? "s" : ""}
                  </span>
                  .
                </>
              )}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSend()}
            disabled={sending || recipientCount === 0}
          >
            {sending
              ? "Sending..."
              : `Send ${recipientCount} invite${recipientCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
