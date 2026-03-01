import { Badge } from "@/components/ui/badge";
import { STOCK_RATINGS } from "@/lib/constants";

interface RatingBadgeProps {
  rating: number;
  size?: "sm" | "md";
}

export function RatingBadge({ rating, size = "md" }: RatingBadgeProps) {
  const rounded = Math.round(rating) as keyof typeof STOCK_RATINGS;
  const config = STOCK_RATINGS[rounded] ?? STOCK_RATINGS[3];

  return (
    <Badge
      variant="secondary"
      className={`${config.color} ${size === "sm" ? "text-[10px] px-1.5 py-0" : ""}`}
    >
      {rating % 1 === 0 ? config.label : `${rating.toFixed(1)} - ${config.label}`}
    </Badge>
  );
}
