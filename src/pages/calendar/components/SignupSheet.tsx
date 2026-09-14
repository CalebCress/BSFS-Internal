import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SignupSheetProps {
  eventId: Id<"events">;
}

/**
 * The block grid of a sign-up sheet event: one row per block, everyone's
 * names, and a button to put your own name on or take it off.
 */
export function SignupSheet({ eventId }: SignupSheetProps) {
  const sheet = useQuery(api.eventSignups.listForEvent, { eventId });
  const toggle = useMutation(api.eventSignups.toggle);
  // Only the block being toggled is disabled, so a member filling several
  // blocks in a row isn't blocked by the previous click's round trip.
  const [pending, setPending] = useState<string | null>(null);

  const handleToggle = async (blockStart: string) => {
    setPending(blockStart);
    try {
      await toggle({ eventId, blockStart });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setPending(null);
    }
  };

  if (sheet === undefined) {
    return <Skeleton className="h-24 w-full" />;
  }
  if (sheet === null) return null;

  const mine = sheet.blocks.filter((b) => b.signedUp).length;

  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {sheet.slotMinutes}-minute blocks
        </span>
        <span>
          {mine === 0
            ? "You're not signed up"
            : `You're in ${mine} block${mine === 1 ? "" : "s"}`}
        </span>
      </div>

      {sheet.blocks.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          The event is shorter than one block, so there is nothing to sign up
          for.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {sheet.blocks.map((block) => (
            <li
              key={block.blockStart}
              className={cn(
                "flex items-start gap-3 px-3 py-2",
                block.signedUp && "bg-green-50/60"
              )}
            >
              <span className="w-[6.5rem] shrink-0 pt-1 text-sm tabular-nums">
                {block.blockStart} &ndash; {block.blockEnd}
              </span>
              <div className="min-w-0 flex-1 pt-1">
                {block.members.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Nobody yet
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {block.members.map((m) => (
                      <span
                        key={m.userId}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          m.isMe
                            ? "bg-green-100 font-medium text-green-800"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {m.isMe ? "You" : m.displayName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant={block.signedUp ? "secondary" : "outline"}
                size="sm"
                className="h-7 shrink-0 px-2 text-xs"
                disabled={pending === block.blockStart}
                onClick={() => void handleToggle(block.blockStart)}
              >
                {block.signedUp ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Signed up
                  </>
                ) : (
                  <>
                    <Plus className="mr-1 h-3 w-3" />
                    Sign up
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
