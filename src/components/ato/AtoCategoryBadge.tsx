/**
 * ATO Category Badge Component
 * 
 * Displays a badge showing the ATO category code with color coding.
 */

import { AtoCategoryCode } from "@/lib/ato-categories";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AtoCategoryBadgeProps {
  code: AtoCategoryCode;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

const priorityColors: Record<string, string> = {
  D1: "bg-blue-100 text-blue-800 border-blue-300",
  D2: "bg-blue-100 text-blue-800 border-blue-300",
  D3: "bg-purple-100 text-purple-800 border-purple-300",
  D4: "bg-purple-100 text-purple-800 border-purple-300",
  D5: "bg-purple-100 text-purple-800 border-purple-300",
  D6: "bg-orange-100 text-orange-800 border-orange-300",
  D7: "bg-green-100 text-green-800 border-green-300",
  D8: "bg-pink-100 text-pink-800 border-pink-300",
  D9: "bg-gray-100 text-gray-800 border-gray-300",
  D10: "bg-emerald-100 text-emerald-800 border-emerald-300",
  D11: "bg-cyan-100 text-cyan-800 border-cyan-300",
  D12: "bg-yellow-100 text-yellow-800 border-yellow-300",
  D13: "bg-indigo-100 text-indigo-800 border-indigo-300",
  D14: "bg-violet-100 text-violet-800 border-violet-300",
  D15: "bg-teal-100 text-teal-800 border-teal-300",
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-0.5",
  lg: "text-base px-3 py-1"
};

export function AtoCategoryBadge({ 
  code, 
  size = "md", 
  showName = false,
  className 
}: AtoCategoryBadgeProps) {
  return (
    <Badge 
      variant="outline"
      className={cn(
        "font-mono font-semibold",
        priorityColors[code] || "bg-gray-100 text-gray-800",
        sizeClasses[size],
        className
      )}
    >
      {code}
    </Badge>
  );
}

export function AtoCategoryPill({
  code,
  name,
  size = "md",
  className
}: {
  code: AtoCategoryCode;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-full border",
      priorityColors[code] || "bg-gray-100 text-gray-800",
      size === "sm" && "px-2 py-0.5 text-xs",
      size === "md" && "px-3 py-1 text-sm",
      size === "lg" && "px-4 py-2 text-base",
      className
    )}>
      <span className="font-mono font-bold">{code}</span>
      <span className="opacity-90">{name}</span>
    </div>
  );
}

export default AtoCategoryBadge;
