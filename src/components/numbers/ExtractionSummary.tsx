/**
 * Extraction Summary Components (TAL-102)
 * 
 * Components for displaying extraction results summary
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExtractionResult, ExtractionSummary, NumberType } from "@/lib/number-extraction";
import { NumberTypeBadge } from "./NumberBadges";
import {
  DollarSign,
  Calendar,
  Building2,
  Receipt,
  FileText,
  Percent,
  Package,
  Hash,
  CreditCard,
  Landmark,
} from "lucide-react";

interface ExtractionSummaryCardProps {
  summary: ExtractionSummary;
  className?: string;
}

const typeIcons: Record<NumberType, React.ReactNode> = {
  amount: <DollarSign className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  abn: <Building2 className="w-4 h-4" />,
  acn: <Building2 className="w-4 h-4" />,
  account_number: <CreditCard className="w-4 h-4" />,
  invoice_number: <Receipt className="w-4 h-4" />,
  gst: <Landmark className="w-4 h-4" />,
  tax: <Landmark className="w-4 h-4" />,
  percentage: <Percent className="w-4 h-4" />,
  quantity: <Package className="w-4 h-4" />,
  unknown: <Hash className="w-4 h-4" />,
};

export function ExtractionSummaryCard({ summary, className }: ExtractionSummaryCardProps) {
  const confidencePercentage = Math.round(summary.confidence * 100);
  
  let confidenceColor = "bg-red-500";
  if (summary.confidence >= 0.9) confidenceColor = "bg-green-500";
  else if (summary.confidence >= 0.7) confidenceColor = "bg-yellow-500";
  else if (summary.confidence >= 0.5) confidenceColor = "bg-orange-500";

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Extraction Summary</span>
          <Badge variant="secondary">{summary.totalFound} found</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Confidence */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{confidencePercentage}%</span>
          </div>
          <Progress value={confidencePercentage} className={confidenceColor} />
        </div>

        {/* Type breakdown */}
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(summary.byType) as [NumberType, number][])
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{typeIcons[type]}</span>
                  <NumberTypeBadge type={type} />
                </div>
                <span className="font-medium">{count}</span>
              </div>
            ))}
        </div>

        {/* Key findings */}
        <div className="space-y-2 pt-2 border-t">
          {summary.totalAmount && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="font-semibold text-lg">
                ${summary.totalAmount.toFixed(2)}
              </span>
            </div>
          )}
          
          {summary.primaryAbn && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Primary ABN</span>
              <Badge variant="outline" className="font-mono">
                {summary.primaryAbn}
              </Badge>
            </div>
          )}
          
          {summary.dateRange && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date Range</span>
              <span className="text-sm">
                {summary.dateRange.earliest} to {summary.dateRange.latest}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ExtractionResultViewProps {
  result: ExtractionResult;
  className?: string;
}

export function ExtractionResultView({ result, className }: ExtractionResultViewProps) {
  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-4", className)}>
      <div className="lg:col-span-1">
        <ExtractionSummaryCard summary={result.summary} />
      </div>
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Extracted Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.entries(result.summary.byType) as [NumberType, number][])
                .filter(([_, count]) => count > 0)
                .map(([type]) => {
                  const numbers = result.numbers.filter((n) => n.type === type);
                  return (
                    <div key={type}>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <NumberTypeBadge type={type} />
                        <span className="text-muted-foreground">
                          ({numbers.length})
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {numbers.map((num, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 rounded-md border bg-card"
                          >
                            <div>
                              <span className="font-mono text-sm">{num.value}</span>
                              {num.normalized && num.normalized !== num.value && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  → {String(num.normalized)}
                                </span>
                              )}
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                num.confidence >= 0.9
                                  ? "bg-green-100 text-green-800"
                                  : num.confidence >= 0.7
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              )}
                            >
                              {Math.round(num.confidence * 100)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface EmptyExtractionStateProps {
  className?: string;
}

export function EmptyExtractionState({ className }: EmptyExtractionStateProps) {
  return (
    <Card className={cn("text-center py-12", className)}>
      <CardContent>
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No Numbers Extracted</h3>
        <p className="text-sm text-muted-foreground">
          Upload a document to extract amounts, dates, ABNs, and more
        </p>
      </CardContent>
    </Card>
  );
}

interface ExtractingStateProps {
  className?: string;
}

export function ExtractingState({ className }: ExtractingStateProps) {
  return (
    <Card className={cn("text-center py-12", className)}>
      <CardContent>
        <div className="animate-pulse">
          <div className="w-12 h-12 mx-auto bg-muted rounded-lg mb-4" />
          <div className="h-5 bg-muted rounded w-32 mx-auto mb-2" />
          <div className="h-4 bg-muted rounded w-48 mx-auto" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Extracting numbers from document...
        </p>
      </CardContent>
    </Card>
  );
}

export default {
  ExtractionSummaryCard,
  ExtractionResultView,
  EmptyExtractionState,
  ExtractingState,
};
