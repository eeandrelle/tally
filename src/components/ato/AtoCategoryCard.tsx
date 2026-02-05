/**
 * ATO Category Card Component
 * 
 * Displays detailed information about an ATO deduction category.
 */

import { useState } from "react";
import { AtoCategory, AtoCategoryCode } from "@/lib/ato-categories";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  ChevronDown, 
  ChevronUp, 
  Receipt, 
  Clock, 
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AtoCategoryCardProps {
  category: AtoCategory;
  isEnabled?: boolean;
  claimAmount?: number;
  onToggle?: (code: AtoCategoryCode, enabled: boolean) => void;
  onClick?: (category: AtoCategory) => void;
  className?: string;
  compact?: boolean;
}

export function AtoCategoryCard({
  category,
  isEnabled = true,
  claimAmount,
  onToggle,
  onClick,
  className,
  compact = false
}: AtoCategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const priorityColor = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200"
  }[category.priority];

  if (compact) {
    return (
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          !isEnabled && "opacity-60",
          className
        )}
        onClick={() => onClick?.(category)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono font-bold text-sm">{category.code}</span>
                <Badge variant="secondary" className={cn("text-xs", priorityColor)}>
                  {category.priority}
                </Badge>
              </div>
              <h4 className="font-medium text-sm truncate">{category.name}</h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {category.shortDescription}
              </p>
            </div>
            {claimAmount !== undefined && (
              <div className="text-right">
                <span className="font-semibold text-sm">
                  ${claimAmount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(!isEnabled && "opacity-60", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono font-bold text-lg bg-primary/10 px-2 py-0.5 rounded">
                {category.code}
              </span>
              <Badge variant="secondary" className={priorityColor}>
                {category.priority} priority
              </Badge>
              {category.estimatedUsersPercentage > 20 && (
                <Badge variant="outline" className="text-xs">
                  Common ({category.estimatedUsersPercentage}%)
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <CardDescription className="mt-1.5">
              {category.shortDescription}
            </CardDescription>
          </div>
          {onToggle && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Enabled</span>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => onToggle(category.code, checked)}
              />
            </div>
          )}
        </div>
        
        {claimAmount !== undefined && claimAmount > 0 && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg">
            <span className="text-sm text-muted-foreground">Claimed this year:</span>
            <span className="ml-2 font-bold text-lg">${claimAmount.toLocaleString()}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-4">
          {/* Quick Info */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className={cn(
                category.receiptRequirements.required === "required" && "text-amber-600 font-medium"
              )}>
                {category.receiptRequirements.required === "required" ? "Receipts required" : 
                 category.receiptRequirements.required === "depends" ? "Receipts may be needed" :
                 "No receipts needed"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                {category.recordKeeping.period === "5_years" ? "Keep 5 years" :
                 category.recordKeeping.period === "12_weeks" ? "12 week log" :
                 category.recordKeeping.period === "28_days" ? "28 day diary" :
                 "Records required"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span>{category.eligibilityCriteria.length} criteria</span>
            </div>
          </div>

          {/* Eligibility Criteria Preview */}
          <div className="space-y-2">
            <h5 className="font-medium text-sm">Eligibility</h5>
            <ul className="space-y-1">
              {category.eligibilityCriteria.slice(0, 3).map((criteria, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                  <span>{criteria}</span>
                </li>
              ))}
              {category.eligibilityCriteria.length > 3 && (
                <li className="text-sm text-muted-foreground">
                  +{category.eligibilityCriteria.length - 3} more...
                </li>
              )}
            </ul>
          </div>

          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Show more details
              </>
            )}
          </Button>

          {isExpanded && (
            <div className="space-y-4">
              {/* Full Description */}
              <div className="text-sm text-muted-foreground">
                {category.fullDescription}
              </div>

              {/* Claim Limits */}
              {category.claimLimits && (
                <div className="p-3 bg-muted rounded-lg">
                  <h5 className="font-medium text-sm mb-1">Claim Limits</h5>
                  <p className="text-sm text-muted-foreground">
                    {category.claimLimits.description}
                  </p>
                </div>
              )}

              {/* Common Mistakes */}
              <div className="space-y-2">
                <h5 className="font-medium text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Common Mistakes to Avoid
                </h5>
                <ul className="space-y-1">
                  {category.commonMistakes.slice(0, 3).map((mistake, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tips */}
              <div className="space-y-2">
                <h5 className="font-medium text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Tips
                </h5>
                <ul className="space-y-1">
                  {category.tips.slice(0, 3).map((tip, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-yellow-400">★</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Examples */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="font-medium text-sm text-green-700">✓ Claimable Examples</h5>
                  <ul className="space-y-1">
                    {category.examples.claimable.slice(0, 3).map((ex, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        • {ex}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h5 className="font-medium text-sm text-red-700">✗ Not Claimable</h5>
                  <ul className="space-y-1">
                    {category.examples.notClaimable.slice(0, 3).map((ex, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        • {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* ATO Reference */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.open(category.atoReference, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on ATO Website
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AtoCategoryCard;
