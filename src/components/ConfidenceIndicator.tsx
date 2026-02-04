import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getConfidenceLabel } from "@/lib/ocr";

interface ConfidenceIndicatorProps {
  confidence: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConfidenceIndicator({
  confidence,
  showLabel = true,
  size = "md",
  className,
}: ConfidenceIndicatorProps) {
  const { label, color } = getConfidenceLabel(confidence);
  const percentage = Math.round(confidence * 100);

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  const colorClasses = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        {showLabel && (
          <span className="text-xs text-muted-foreground">OCR Confidence</span>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">{percentage}%</span>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0",
              color === "green" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              color === "yellow" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
              color === "red" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {label}
          </Badge>
        </div>
      </div>
      <div className="relative">
        <Progress
          value={percentage}
          className={cn(sizeClasses[size], "bg-muted")}
        />
        <div
          className={cn(
            "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
            sizeClasses[size],
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
