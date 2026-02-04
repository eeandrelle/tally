/**
 * PaymentPatternBadge Component
 * 
 * Displays detected dividend payment frequency with confidence indicator
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PaymentFrequency, PatternConfidence, DividendPattern } from '@/lib/dividend-patterns';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  HelpCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface PaymentPatternBadgeProps {
  frequency?: PaymentFrequency;
  confidence?: PatternConfidence;
  confidenceScore?: number;
  showScore?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pattern?: DividendPattern; // Full pattern data for tooltip
  className?: string;
}

const frequencyIcons: Record<PaymentFrequency, typeof Calendar> = {
  monthly: Clock,
  quarterly: Calendar,
  'half-yearly': Calendar,
  yearly: Calendar,
  irregular: AlertCircle,
  unknown: HelpCircle,
};

const frequencyLabels: Record<PaymentFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'half-yearly': 'Half-Yearly',
  yearly: 'Yearly',
  irregular: 'Irregular',
  unknown: 'Unknown',
};

const confidenceIcons: Record<PatternConfidence, typeof CheckCircle2> = {
  high: CheckCircle2,
  medium: TrendingUp,
  low: AlertCircle,
  uncertain: XCircle,
};

const confidenceLabels: Record<PatternConfidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
  uncertain: 'Uncertain',
};

const frequencyColors: Record<PaymentFrequency, string> = {
  monthly: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  quarterly: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
  'half-yearly': 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
  yearly: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800',
  irregular: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
  unknown: 'bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800',
};

const confidenceColors: Record<PatternConfidence, string> = {
  high: 'bg-green-500/10 text-green-600',
  medium: 'bg-amber-500/10 text-amber-600',
  low: 'bg-orange-500/10 text-orange-600',
  uncertain: 'bg-gray-500/10 text-gray-600',
};

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0 h-5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function PaymentPatternBadge({
  frequency = 'unknown',
  confidence = 'uncertain',
  confidenceScore,
  showScore = false,
  showTooltip = true,
  size = 'md',
  pattern,
  className,
}: PaymentPatternBadgeProps) {
  const FrequencyIcon = frequencyIcons[frequency];
  const ConfidenceIcon = confidenceIcons[confidence];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'font-medium inline-flex items-center gap-1 transition-colors',
        frequencyColors[frequency],
        sizeClasses[size],
        className
      )}
    >
      <FrequencyIcon className={iconSizes[size]} />
      <span>{frequencyLabels[frequency]}</span>
      {showScore && confidenceScore !== undefined && (
        <span className="opacity-75">({confidenceScore}%)</span>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FrequencyIcon className="h-4 w-4" />
              <span className="font-medium">{frequencyLabels[frequency]} Payments</span>
            </div>
            
            {pattern ? (
              <div className="text-xs space-y-1 text-muted-foreground">
                {pattern.seasonalPattern && (
                  <p>Seasonal pattern: {pattern.seasonalPattern.description}</p>
                )}
                <p>Based on {pattern.paymentsAnalyzed} payments</p>
                <p>Average interval: {pattern.statistics.averageInterval} days</p>
                <p>Amount trend: {pattern.statistics.amountTrend}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Payment frequency based on historical analysis
              </p>
            )}

            <div className="flex items-center gap-2 pt-1 border-t">
              <ConfidenceIcon className={cn('h-3.5 w-3.5', confidenceColors[confidence].split(' ')[1])} />
              <span className="text-xs">
                {confidenceLabels[confidence]}
                {confidenceScore !== undefined && ` (${confidenceScore}%)`}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PatternConfidenceBadgeProps {
  confidence: PatternConfidence;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PatternConfidenceBadge({
  confidence,
  score,
  showScore = false,
  size = 'md',
  className,
}: PatternConfidenceBadgeProps) {
  const ConfidenceIcon = confidenceIcons[confidence];

  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium inline-flex items-center gap-1',
        confidenceColors[confidence],
        sizeClasses[size],
        className
      )}
    >
      <ConfidenceIcon className={iconSizes[size]} />
      <span>{confidenceLabels[confidence]}</span>
      {showScore && score !== undefined && (
        <span className="opacity-75">({score}%)</span>
      )}
    </Badge>
  );
}

interface PaymentPatternSummaryProps {
  pattern: DividendPattern;
  className?: string;
}

export function PaymentPatternSummary({ pattern, className }: PaymentPatternSummaryProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <PaymentPatternBadge
          frequency={pattern.frequency}
          confidence={pattern.confidence}
          confidenceScore={pattern.confidenceScore}
          pattern={pattern}
          size="lg"
        />
        <PatternConfidenceBadge
          confidence={pattern.confidence}
          score={pattern.confidenceScore}
          showScore
          size="sm"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        {pattern.detectedPattern}
        {pattern.seasonalPattern && (
          <span className="ml-1">• Typically paid in {pattern.seasonalPattern.description}</span>
        )}
      </div>

      {pattern.nextExpectedPayment && (
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Next expected:</span>{' '}
            <span className="font-medium">
              {new Date(pattern.nextExpectedPayment.estimatedDate).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Est. amount:</span>{' '}
            <span className="font-medium">
              ${pattern.nextExpectedPayment.estimatedAmount.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentPatternBadge;
