/**
 * Extracted Number Badge Component (TAL-102)
 * 
 * Displays an extracted number with its type, confidence, and normalized value
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExtractedNumber, NumberType } from "@/lib/number-extraction";

interface NumberTypeBadgeProps {
  type: NumberType;
  className?: string;
}

const typeColors: Record<NumberType, string> = {
  amount: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  date: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  abn: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  acn: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  account_number: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  invoice_number: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100",
  gst: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  tax: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  percentage: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100",
  quantity: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  unknown: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
};

const typeLabels: Record<NumberType, string> = {
  amount: "Amount",
  date: "Date",
  abn: "ABN",
  acn: "ACN",
  account_number: "Account",
  invoice_number: "Invoice #",
  gst: "GST",
  tax: "Tax",
  percentage: "%",
  quantity: "Qty",
  unknown: "Unknown",
};

export function NumberTypeBadge({ type, className }: NumberTypeBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(typeColors[type], "font-medium", className)}
    >
      {typeLabels[type]}
    </Badge>
  );
}

interface ConfidenceIndicatorProps {
  confidence: number;
  className?: string;
}

export function ConfidenceIndicator({ confidence, className }: ConfidenceIndicatorProps) {
  const percentage = Math.round(confidence * 100);
  
  let colorClass = "text-red-500";
  if (confidence >= 0.9) colorClass = "text-green-500";
  else if (confidence >= 0.7) colorClass = "text-yellow-500";
  else if (confidence >= 0.5) colorClass = "text-orange-500";

  return (
    <span className={cn("text-xs font-medium", colorClass, className)}>
      {percentage}%
    </span>
  );
}

interface ExtractedNumberCardProps {
  number: ExtractedNumber;
  className?: string;
}

export function ExtractedNumberCard({ number, className }: ExtractedNumberCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border bg-card",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <NumberTypeBadge type={number.type} />
        <div>
          <p className="font-medium text-sm">{number.value}</p>
          {number.normalized && number.normalized !== number.value && (
            <p className="text-xs text-muted-foreground">
              → {String(number.normalized)}
            </p>
          )}
        </div>
      </div>
      <ConfidenceIndicator confidence={number.confidence} />
    </div>
  );
}

interface ExtractedNumberListProps {
  numbers: ExtractedNumber[];
  groupByType?: boolean;
  className?: string;
}

export function ExtractedNumberList({
  numbers,
  groupByType = true,
  className,
}: ExtractedNumberListProps) {
  if (numbers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No numbers extracted
      </div>
    );
  }

  if (groupByType) {
    const byType = numbers.reduce((acc, num) => {
      if (!acc[num.type]) acc[num.type] = [];
      acc[num.type].push(num);
      return acc;
    }, {} as Record<NumberType, ExtractedNumber[]>);

    return (
      <div className={cn("space-y-4", className)}>
        {(Object.keys(byType) as NumberType[]).map((type) => (
          <div key={type}>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <NumberTypeBadge type={type} />
              <span className="text-muted-foreground">({byType[type].length})</span>
            </h4>
            <div className="space-y-2">
              {byType[type].map((num, index) => (
                <ExtractedNumberCard key={`${type}-${index}`} number={num} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {numbers.map((num, index) => (
        <ExtractedNumberCard key={index} number={num} />
      ))}
    </div>
  );
}

export default {
  NumberTypeBadge,
  ConfidenceIndicator,
  ExtractedNumberCard,
  ExtractedNumberList,
};
