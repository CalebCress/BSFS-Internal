import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { STOCK_RATINGS, SENTIMENT, type Sentiment } from "@/lib/constants";

interface ThesisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockId: Id<"stocks">;
  stockTicker: string;
  /** Pass existing thesis data when editing */
  existing?: {
    rating: number;
    thesis: string;
    sentiment: string;
    priceTarget?: number;
  };
}

export function ThesisDialog({
  open,
  onOpenChange,
  stockId,
  stockTicker,
  existing,
}: ThesisDialogProps) {
  const submitThesis = useMutation(api.stockTheses.submit);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState<number>(existing?.rating ?? 3);
  const [sentiment, setSentiment] = useState<Sentiment>(
    (existing?.sentiment as Sentiment) ?? "neutral"
  );
  const [thesis, setThesis] = useState(existing?.thesis ?? "");
  const [priceTarget, setPriceTarget] = useState(
    existing?.priceTarget?.toString() ?? ""
  );

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setRating(existing?.rating ?? 3);
      setSentiment((existing?.sentiment as Sentiment) ?? "neutral");
      setThesis(existing?.thesis ?? "");
      setPriceTarget(existing?.priceTarget?.toString() ?? "");
    }
  }, [open, existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thesis.trim()) {
      toast.error("Thesis text is required");
      return;
    }

    setSubmitting(true);
    try {
      await submitThesis({
        stockId,
        rating,
        thesis: thesis.trim(),
        sentiment,
        priceTarget: priceTarget ? parseFloat(priceTarget) : undefined,
      });
      toast.success(
        existing
          ? `Updated thesis for ${stockTicker}`
          : `Submitted thesis for ${stockTicker}`
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit thesis"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Edit" : "Write"} Thesis — {stockTicker}
          </DialogTitle>
          <DialogDescription>
            Share your investment thesis and rating for this stock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {([1, 2, 3, 4, 5] as const).map((r) => {
                const config =
                  STOCK_RATINGS[r as keyof typeof STOCK_RATINGS];
                return (
                  <Button
                    key={r}
                    type="button"
                    variant={rating === r ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setRating(r)}
                  >
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Sentiment */}
          <div className="space-y-2">
            <Label>Sentiment</Label>
            <Select
              value={sentiment}
              onValueChange={(v) => setSentiment(v as Sentiment)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SENTIMENT) as Sentiment[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SENTIMENT[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Thesis text */}
          <div className="space-y-2">
            <Label>Thesis</Label>
            <Textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              placeholder="Describe your investment thesis..."
              rows={5}
              required
            />
          </div>

          {/* Price target */}
          <div className="space-y-2">
            <Label>Price Target (optional)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={priceTarget}
              onChange={(e) => setPriceTarget(e.target.value)}
              placeholder="e.g. 150.00"
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "Submitting..."
              : existing
                ? "Update Thesis"
                : "Submit Thesis"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
