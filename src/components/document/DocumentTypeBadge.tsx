import { cn } from "../../lib/utils";
import {
  Receipt,
  Banknote,
  TrendingUp,
  FileText,
  FileSignature,
  FileQuestion,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import {
  DocumentType,
  DocumentTypeResult,
  getDocumentTypeLabel,
  getRecommendedAction,
} from "../../lib/document-detection";

interface DocumentTypeBadgeProps {
  type: DocumentType;
  confidence?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconMap = {
  receipt: Receipt,
  bank_statement: Banknote,
  dividend_statement: TrendingUp,
  invoice: FileText,
  contract: FileSignature,
  unknown: FileQuestion,
};

const colorMap = {
  receipt: "bg-blue-100 text-blue-700 border-blue-200",
  bank_statement: "bg-green-100 text-green-700 border-green-200",
  dividend_statement: "bg-purple-100 text-purple-700 border-purple-200",
  invoice: "bg-orange-100 text-orange-700 border-orange-200",
  contract: "bg-red-100 text-red-700 border-red-200",
  unknown: "bg-gray-100 text-gray-700 border-gray-200",
};

export function DocumentTypeBadge({
  type,
  confidence,
  showLabel = true,
  size = "md",
  className,
}: DocumentTypeBadgeProps) {
  const Icon = iconMap[type];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  };
  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        colorMap[type],
        sizeClasses[size],
        className
      )}
    >
      <Icon size={iconSizes[size]} />
      {showLabel && <span>{getDocumentTypeLabel(type)}</span>}
      {confidence !== undefined && (
        <span className="opacity-70">({Math.round(confidence * 100)}%)</span>
      )}
    </span>
  );
}

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
  const level =
    confidence >= 0.85 ? "high" : confidence >= 0.60 ? "medium" : "low";

  const config = {
    high: {
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      label: "High Confidence",
    },
    medium: {
      icon: AlertCircle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      label: "Medium Confidence",
    },
    low: {
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      label: "Low Confidence",
    },
  };

  const { icon: Icon, color, bgColor, borderColor, label } = config[level];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  };
  const iconSizes = { sm: 12, md: 14, lg: 18 };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border",
        bgColor,
        borderColor,
        color,
        sizeClasses[size],
        className
      )}
    >
      <Icon size={iconSizes[size]} />
      {showLabel && <span>{label}</span>}
      <span className="opacity-70">{Math.round(confidence * 100)}%</span>
    </span>
  );
}

interface DetectionStatusProps {
  isDetecting: boolean;
  result: DocumentTypeResult | null;
  error: string | null;
  className?: string;
}

export function DetectionStatus({
  isDetecting,
  result,
  error,
  className,
}: DetectionStatusProps) {
  if (isDetecting) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Analyzing document...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 text-red-600", className)}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Waiting for document...
      </div>
    );
  }

  const action = getRecommendedAction(result);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <DocumentTypeBadge type={result.type} confidence={result.confidence} />
      <ConfidenceIndicator confidence={result.confidence} />
      {action === "review" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
          <AlertCircle size={12} />
          Review Recommended
        </span>
      )}
      {action === "manual" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertTriangle size={12} />
          Manual Entry Required
        </span>
      )}
    </div>
  );
}

interface DocumentDetectionCardProps {
  fileName: string;
  fileSize?: string;
  isDetecting: boolean;
  result: DocumentTypeResult | null;
  error: string | null;
  onAccept?: () => void;
  onReview?: () => void;
  onReject?: () => void;
  className?: string;
}

export function DocumentDetectionCard({
  fileName,
  fileSize,
  isDetecting,
  result,
  error,
  onAccept,
  onReview,
  onReject,
  className,
}: DocumentDetectionCardProps) {
  const action = result ? getRecommendedAction(result) : null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{fileName}</p>
          {fileSize && (
            <p className="text-xs text-muted-foreground">{fileSize}</p>
          )}
        </div>
        <DetectionStatus
          isDetecting={isDetecting}
          result={result}
          error={error}
        />
      </div>

      {result && action && (
        <div className="mt-4 flex gap-2">
          {action === "accept" && onAccept && (
            <button
              onClick={onAccept}
              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <CheckCircle2 size={14} />
              Accept
            </button>
          )}
          {(action === "review" || action === "manual") && onReview && (
            <button
              onClick={onReview}
              className="inline-flex items-center gap-1 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700"
            >
              <AlertCircle size={14} />
              Review
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="inline-flex items-center gap-1 rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  );
}
