import { Badge } from "@/components/ui/badge";
import { ReviewStatus } from "@/lib/db";
import { HelpCircle, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const statusConfig: Record<ReviewStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ReactNode;
  className?: string;
}> = {
  none: {
    label: "No Review",
    variant: "secondary",
    icon: null,
    className: "opacity-50",
  },
  pending: {
    label: "Needs Review",
    variant: "destructive",
    icon: <HelpCircle className="h-3 w-3" />,
    className: "bg-amber-500 hover:bg-amber-600",
  },
  in_review: {
    label: "In Review",
    variant: "default",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-blue-500 hover:bg-blue-600",
  },
  reviewed: {
    label: "Reviewed",
    variant: "default",
    icon: <CheckCircle className="h-3 w-3" />,
    className: "bg-green-500 hover:bg-green-600",
  },
  dismissed: {
    label: "Dismissed",
    variant: "outline",
    icon: <XCircle className="h-3 w-3" />,
    className: "text-muted-foreground",
  },
};

export function ReviewStatusBadge({ 
  status, 
  showLabel = true, 
  size = "md" 
}: ReviewStatusBadgeProps) {
  const config = statusConfig[status];
  
  if (status === "none" && !showLabel) {
    return null;
  }

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs"} gap-1`}
    >
      {config.icon}
      {showLabel && config.label}
    </Badge>
  );
}

export function ReviewStatusIcon({ status }: { status: ReviewStatus }) {
  const config = statusConfig[status];
  if (!config.icon) return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  return <span className={config.className}>{config.icon}</span>;
}

export function getReviewStatusLabel(status: ReviewStatus): string {
  return statusConfig[status]?.label || status;
}

export function getReviewStatusOptions(): { value: ReviewStatus; label: string }[] {
  return [
    { value: "none", label: "No Review Needed" },
    { value: "pending", label: "Needs Professional Review" },
    { value: "in_review", label: "In Review with Accountant" },
    { value: "reviewed", label: "Reviewed & Approved" },
    { value: "dismissed", label: "Dismissed (No Action Needed)" },
  ];
}
