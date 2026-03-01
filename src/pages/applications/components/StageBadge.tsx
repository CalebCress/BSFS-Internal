import { Badge } from "@/components/ui/badge";
import { STAGES, type Stage } from "@/lib/constants";

export function StageBadge({ stage }: { stage: Stage }) {
  const config = STAGES[stage];
  return (
    <Badge variant="secondary" className={config.color}>
      {config.label}
    </Badge>
  );
}
