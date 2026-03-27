import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatAdvisoryTime } from "@/lib/utils";

interface TimeHintProps {
  minutes: number | null | undefined;
  color?: string;
}

export function TimeHint({ minutes, color }: TimeHintProps) {
  const label = formatAdvisoryTime(minutes);
  if (!label) return null;

  return (
    <Badge color={color ?? "#6366f1"} className="shrink-0">
      <Clock size={11} />
      {label}
    </Badge>
  );
}
