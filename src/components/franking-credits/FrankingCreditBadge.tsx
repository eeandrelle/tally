/**
 * FrankingCreditBadge Component
 * 
 * Inline display component for franking credit information.
 * Shows franking percentage, credit amount, and grossed-up value in a compact badge format.
 * 
 * @example
 * <FrankingCreditBadge 
 *   dividendAmount={700} 
 *   frankingPercentage={100} 
 *   showGrossedUp 
 * />
 */

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { calculateFrankingFromDividend, formatCurrency } from '@/lib/franking-credits';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface FrankingCreditBadgeProps {
  /** Dividend amount received */
  dividendAmount: number;
  /** Franking percentage (0-100) */
  frankingPercentage: number;
  /** Whether to show the grossed-up amount */
  showGrossedUp?: boolean;
  /** Whether to show detailed tooltip */
  showTooltip?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional className for styling */
  className?: string;
}

export function FrankingCreditBadge({
  dividendAmount,
  frankingPercentage,
  showGrossedUp = false,
  showTooltip = true,
  size = 'md',
  className,
}: FrankingCreditBadgeProps) {
  const calculation = calculateFrankingFromDividend(dividendAmount, frankingPercentage);
  
  // Determine badge variant based on franking percentage
  const getVariant = () => {
    if (frankingPercentage === 100) return 'default';
    if (frankingPercentage === 0) return 'secondary';
    return 'outline';
  };

  // Get icon based on franking percentage
  const getIcon = () => {
    if (frankingPercentage === 100) return <CheckCircle2 className="h-3 w-3" />;
    if (frankingPercentage === 0) return <Circle className="h-3 w-3" />;
    return <AlertCircle className="h-3 w-3" />;
  };

  // Size-based classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  // Color based on franking percentage
  const getColorClass = () => {
    if (frankingPercentage === 100) return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300';
    if (frankingPercentage === 0) return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300';
    return 'bg-blue-50 text-blue-800 hover:bg-blue-100 border-blue-200';
  };

  const badgeContent = (
    <Badge 
      variant="outline" 
      className={`${sizeClasses[size]} ${getColorClass()} font-medium flex items-center gap-1 ${className || ''}`}
    >
      {getIcon()}
      <span>{frankingPercentage.toFixed(0)}% franked</span>
      {showGrossedUp && (
        <span className="ml-1 opacity-75">
          ({formatCurrency(calculation.grossedUpDividend)} grossed-up)
        </span>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">
              {frankingPercentage === 100 ? 'Fully Franked' : 
               frankingPercentage === 0 ? 'Unfranked' : 
               'Partially Franked'}
            </p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Dividend:</span>
                <span>{formatCurrency(dividendAmount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Franked:</span>
                <span>{formatCurrency(calculation.frankedAmount)}</span>
              </div>
              {calculation.unfrankedAmount > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Unfranked:</span>
                  <span>{formatCurrency(calculation.unfrankedAmount)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Franking Credit:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(calculation.frankingCredit)}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                <span className="text-muted-foreground">Grossed-Up:</span>
                <span className="font-medium">{formatCurrency(calculation.grossedUpDividend)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {frankingPercentage === 100 
                ? 'Tax already paid at 30% company rate' 
                : frankingPercentage === 0 
                ? 'No franking credits attached'
                : `${frankingPercentage}% of dividend has franking credits`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact version of the badge for table rows
 */
export function FrankingCreditBadgeCompact({
  dividendAmount,
  frankingPercentage,
  className,
}: Omit<FrankingCreditBadgeProps, 'size' | 'showGrossedUp' | 'showTooltip'>) {
  const calculation = calculateFrankingFromDividend(dividendAmount, frankingPercentage);
  
  const getColorClass = () => {
    if (frankingPercentage === 100) return 'text-green-700 bg-green-50';
    if (frankingPercentage === 0) return 'text-gray-600 bg-gray-50';
    return 'text-blue-700 bg-blue-50';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColorClass()} ${className || ''}`}>
            {frankingPercentage.toFixed(0)}%
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-sm">
            <p className="font-medium">{frankingPercentage}% franked</p>
            <p className="text-muted-foreground">Credit: {formatCurrency(calculation.frankingCredit)}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Shows franking credit amount as a standalone badge
 */
export function FrankingCreditAmountBadge({
  frankingCredit,
  className,
}: {
  frankingCredit: number;
  className?: string;
}) {
  return (
    <Badge 
      variant="outline" 
      className={`bg-green-50 text-green-700 border-green-200 font-medium ${className || ''}`}
    >
      {formatCurrency(frankingCredit)}
    </Badge>
  );
}
