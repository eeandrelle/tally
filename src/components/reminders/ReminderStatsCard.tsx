/**
 * ReminderStatsCard Component
 * 
 * Displays a single stat metric for the reminder dashboard.
 * 
 * @module components/reminders/ReminderStatsCard
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// Props
// ============================================================================

interface ReminderStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  trend?: {
    value: string | number;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ReminderStatsCard({
  title,
  value,
  icon,
  description,
  variant = 'default',
  trend,
  className,
}: ReminderStatsCardProps) {
  const variantStyles = {
    default: 'bg-card',
    success: 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
    destructive: 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
  };

  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    destructive: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  };

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn('p-2 rounded-lg', iconStyles[variant])}>
            {icon}
          </div>
          {trend && (
            <span className={cn(
              'text-xs font-medium',
              trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {trend.positive ? '+' : '-'}{trend.value} {trend.label}
            </span>
          )}
        </div>
        
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
