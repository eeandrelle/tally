/**
 * ScoreCard Component
 * 
 * Displays the overall completeness score with visual progress indicator
 * and color-coded status.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw,
  Download,
  FileText,
  Clock,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScoreCardProps {
  /** Overall score (0-100) */
  score: number;
  /** Color status based on score */
  colorStatus: 'red' | 'amber' | 'green';
  /** Individual section scores */
  sectionScores?: {
    income: number;
    deductions: number;
    documents: number;
    optimization: number;
  };
  /** Number of missing items */
  missingItemsCount: number;
  /** Tax estimate data */
  taxEstimate?: {
    estimatedRefund: number;
    estimatedTaxOwing: number;
  };
  /** Estimated completion time in minutes */
  estimatedCompletionTime?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Callback to refresh the score */
  onRefresh?: () => void;
  /** Callback to export the report */
  onExport?: () => void;
  /** Additional class name */
  className?: string;
}

export function ScoreCard({
  score,
  colorStatus,
  sectionScores,
  missingItemsCount,
  taxEstimate,
  estimatedCompletionTime,
  isLoading = false,
  onRefresh,
  onExport,
  className
}: ScoreCardProps) {
  // Get status configuration
  const statusConfig = {
    red: {
      icon: AlertCircle,
      label: 'Needs Work',
      description: 'Significant items need attention before lodgment',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      progressColor: 'bg-red-500'
    },
    amber: {
      icon: AlertTriangle,
      label: 'Getting There',
      description: 'A few items to complete before ready',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      progressColor: 'bg-amber-500'
    },
    green: {
      icon: CheckCircle2,
      label: 'Ready to Lodge',
      description: 'Your tax return is complete and ready',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      progressColor: 'bg-green-500'
    }
  };

  const config = statusConfig[colorStatus];
  const StatusIcon = config.icon;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header with main score */}
      <CardHeader className={cn("pb-4", config.bgColor)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl",
              config.bgColor,
              config.borderColor,
              "border"
            )}>
              <StatusIcon className={cn("h-8 w-8", config.color)} />
            </div>
            <div>
              <CardTitle className="text-2xl">Completeness Score</CardTitle>
              <CardDescription className="text-base mt-1">
                {config.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Refresh
              </Button>
            )}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Main score display */}
        <div className="flex items-center gap-8 mb-8">
          <div className="text-center">
            <div className={cn(
              "text-6xl font-bold",
              config.color
            )}>
              {score}%
            </div>
            <Badge 
              variant="outline" 
              className={cn("mt-2", config.borderColor, config.color)}
            >
              {config.label}
            </Badge>
          </div>

          <div className="flex-1 space-y-4">
            {/* Overall progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{score}%</span>
              </div>
              <Progress 
                value={score} 
                className="h-3"
              />
            </div>

            {/* Section scores */}
            {sectionScores && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <ScoreBar 
                  label="Income" 
                  score={sectionScores.income} 
                  icon={DollarSign}
                />
                <ScoreBar 
                  label="Deductions" 
                  score={sectionScores.deductions}
                  icon={TrendingUp}
                />
                <ScoreBar 
                  label="Documents" 
                  score={sectionScores.documents}
                  icon={FileText}
                />
                <ScoreBar 
                  label="Optimization" 
                  score={sectionScores.optimization}
                  icon={CheckCircle2}
                />
              </div>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <StatBox
            label="Missing Items"
            value={missingItemsCount}
            icon={AlertCircle}
            color={missingItemsCount > 0 ? 'text-amber-600' : 'text-green-600'}
          />
          
          {taxEstimate && (
            <StatBox
              label={taxEstimate.estimatedRefund > 0 ? "Estimated Refund" : "Tax Owing"}
              value={formatCurrency(
                taxEstimate.estimatedRefund > 0 
                  ? taxEstimate.estimatedRefund 
                  : taxEstimate.estimatedTaxOwing
              )}
              icon={DollarSign}
              color={taxEstimate.estimatedRefund > 0 ? 'text-green-600' : 'text-red-600'}
            />
          )}

          {estimatedCompletionTime !== undefined && (
            <StatBox
              label="Est. Time to Complete"
              value={`${estimatedCompletionTime} min`}
              icon={Clock}
              color="text-blue-600"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============= SUBCOMPONENTS =============

interface ScoreBarProps {
  label: string;
  score: number;
  icon: React.ElementType;
}

function ScoreBar({ label, score, icon: Icon }: ScoreBarProps) {
  const getColorClass = (s: number) => {
    if (s >= 80) return 'bg-green-500';
    if (s >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <span className="font-medium">{score}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-500", getColorClass(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

function StatBox({ label, value, icon: Icon, color }: StatBoxProps) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <div className={cn("text-2xl font-bold mb-1", color)}>
        {value}
      </div>
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
    </div>
  );
}

// ============= COMPACT VARIANT =============

export interface CompactScoreCardProps {
  score: number;
  colorStatus: 'red' | 'amber' | 'green';
  missingItemsCount: number;
  onClick?: () => void;
  className?: string;
}

export function CompactScoreCard({
  score,
  colorStatus,
  missingItemsCount,
  onClick,
  className
}: CompactScoreCardProps) {
  const config = {
    red: { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    amber: { color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    green: { color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
  }[colorStatus];

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
              config.bgColor,
              config.color
            )}>
              {score}%
            </div>
            <div>
              <p className="font-medium">Tax Return Ready</p>
              <p className="text-sm text-muted-foreground">
                {missingItemsCount > 0 
                  ? `${missingItemsCount} items need attention`
                  : 'Ready to lodge'
                }
              </p>
            </div>
          </div>
          <div className={cn(
            "w-2 h-2 rounded-full",
            colorStatus === 'green' ? 'bg-green-500' :
            colorStatus === 'amber' ? 'bg-amber-500' : 'bg-red-500'
          )} />
        </div>
      </CardContent>
    </Card>
  );
}

export default ScoreCard;