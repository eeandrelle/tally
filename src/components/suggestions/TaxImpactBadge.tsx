import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';

export interface TaxImpactBadgeProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
  format?: 'currency' | 'percentage' | 'both';
}

/**
 * TaxImpactBadge - Displays the tax impact of a suggestion
 * 
 * Shows positive impact (savings) in green, negative in red, neutral in gray
 */
export function TaxImpactBadge({
  amount,
  size = 'md',
  showIcon = true,
  showLabel = false,
  className,
  format = 'currency',
}: TaxImpactBadgeProps) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const isNeutral = amount === 0;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const getVariantClasses = () => {
    if (isPositive) {
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    }
    if (isNegative) {
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
  };

  const getIcon = () => {
    if (isPositive) return <TrendingUp size={iconSizes[size]} />;
    if (isNegative) return <TrendingDown size={iconSizes[size]} />;
    return <Minus size={iconSizes[size]} />;
  };

  const getLabel = () => {
    if (showLabel) {
      if (isPositive) return 'Save';
      if (isNegative) return 'Cost';
      return 'No change';
    }
    return null;
  };

  const formatAmount = () => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(absAmount);
    
    if (isNegative) return `-${formatted}`;
    return formatted;
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        sizeClasses[size],
        getVariantClasses(),
        className
      )}
    >
      {showIcon && getIcon()}
      {getLabel() && <span className="opacity-75">{getLabel()}</span>}
      <span>{formatAmount()}</span>
    </span>
  );
}

/**
 * Compact version for lists
 */
export function TaxImpactCompact({ amount, className }: { amount: number; className?: string }) {
  const isPositive = amount > 0;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isPositive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400',
        className
      )}
    >
      {isPositive ? '+' : ''}
      {new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)}
    </span>
  );
}

/**
 * Detailed tax impact display with comparison
 */
export interface TaxImpactDetailProps {
  currentBenefit: number;
  suggestedBenefit: number;
  difference: number;
  className?: string;
}

export function TaxImpactDetail({
  currentBenefit,
  suggestedBenefit,
  difference,
  className,
}: TaxImpactDetailProps) {
  const isImprovement = difference > 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Current tax benefit:</span>
        <span className="font-medium">
          {new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
          }).format(currentBenefit)}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">After change:</span>
        <span className="font-medium">
          {new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
          }).format(suggestedBenefit)}
        </span>
      </div>
      
      <div className="border-t pt-2">
        <div className="flex items-center justify-between">
          <span className={cn(
            'font-medium',
            isImprovement ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {isImprovement ? 'Tax savings:' : 'Tax cost:'}
          </span>
          <TaxImpactBadge amount={difference} size="md" showIcon={false} />
        </div>
      </div>
    </div>
  );
}

/**
 * Summary card showing total tax impact
 */
export interface TaxImpactSummaryProps {
  totalSavings: number;
  acceptedSavings: number;
  pendingSavings: number;
  className?: string;
}

export function TaxImpactSummary({
  totalSavings,
  acceptedSavings,
  pendingSavings,
  className,
}: TaxImpactSummaryProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-4', className)}>
      <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <DollarSign size={18} />
          <span className="text-sm font-medium">Total Potential</span>
        </div>
        <div className="mt-1 text-2xl font-bold text-green-800 dark:text-green-300">
          {new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
          }).format(totalSavings)}
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
          <TrendingUp size={18} />
          <span className="text-sm font-medium">Accepted</span>
        </div>
        <div className="mt-1 text-2xl font-bold text-blue-800 dark:text-blue-300">
          {new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
          }).format(acceptedSavings)}
        </div>
      </div>

      <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Minus size={18} />
          <span className="text-sm font-medium">Pending</span>
        </div>
        <div className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-300">
          {new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
          }).format(pendingSavings)}
        </div>
      </div>
    </div>
  );
}