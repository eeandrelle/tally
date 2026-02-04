/**
 * ReminderCard Component
 * 
 * Displays a single proactive reminder with actions.
 * 
 * @module components/reminders/ReminderCard
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  X, 
  Check, 
  Clock, 
  Calendar,
  FileText,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Lightbulb
} from 'lucide-react';
import { Reminder, ReminderType, ReminderPriority } from '@/lib/proactive-reminders';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

// ============================================================================
// Type Icons
// ============================================================================

const typeIcons: Record<ReminderType, React.ReactNode> = {
  eofy_approaching: <Calendar className="h-5 w-5" />,
  missing_document: <FileText className="h-5 w-5" />,
  dividend_expected: <DollarSign className="h-5 w-5" />,
  optimization_opportunity: <Lightbulb className="h-5 w-5" />,
  tax_deadline: <AlertTriangle className="h-5 w-5" />,
  document_pattern: <TrendingUp className="h-5 w-5" />,
  review_suggested: <Bell className="h-5 w-5" />,
};

// ============================================================================
// Priority Styles
// ============================================================================

const priorityStyles: Record<ReminderPriority, string> = {
  critical: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
  high: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20',
  medium: 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20',
  low: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
};

const priorityBadges: Record<ReminderPriority, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  critical: { variant: 'destructive', label: 'Critical' },
  high: { variant: 'default', label: 'High' },
  medium: { variant: 'secondary', label: 'Medium' },
  low: { variant: 'outline', label: 'Low' },
};

// ============================================================================
// Props
// ============================================================================

interface ReminderCardProps {
  reminder: Reminder;
  onDismiss?: () => void;
  onComplete?: () => void;
  onSnooze?: (days: number) => void;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ReminderCard({
  reminder,
  onDismiss,
  onComplete,
  onSnooze,
  onAction,
  compact = false,
  className,
}: ReminderCardProps) {
  const priorityStyle = priorityStyles[reminder.priority];
  const priorityBadge = priorityBadges[reminder.priority];
  const typeIcon = typeIcons[reminder.type];
  
  const createdDate = new Date(reminder.createdAt);
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });

  if (compact) {
    return (
      <Card 
        className={cn(
          'border-l-4 hover:shadow-md transition-shadow cursor-pointer',
          priorityStyle,
          className
        )}
        onClick={onAction}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div className="flex-shrink-0 text-muted-foreground">
            {typeIcon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{reminder.title}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
          <Badge variant={priorityBadge.variant} className="text-xs">
            {priorityBadge.label}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'border-l-4 overflow-hidden',
        priorityStyle,
        className
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn(
            'flex-shrink-0 p-2 rounded-lg',
            reminder.priority === 'critical' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            reminder.priority === 'high' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
            reminder.priority === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
            reminder.priority === 'low' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          )}>
            {typeIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold">{reminder.title}</h4>
              <Badge variant={priorityBadge.variant} className="text-xs">
                {priorityBadge.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {timeAgo}
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {reminder.message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {reminder.actionLabel && reminder.actionRoute && (
            <Button 
              size="sm" 
              onClick={onAction}
              className="gap-1.5"
            >
              {reminder.actionLabel}
            </Button>
          )}
          
          <div className="flex-1" />
          
          {onSnooze && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSnooze(7)}
              className="gap-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              Snooze
            </Button>
          )}
          
          {onComplete && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onComplete}
              className="gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Done
            </Button>
          )}
          
          {onDismiss && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onDismiss}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

export function ReminderCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Card className="border-l-4 border-l-muted">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
          </div>
          <div className="h-5 w-14 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-muted">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 bg-muted rounded w-1/2 animate-pulse" />
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
          </div>
        </div>
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-muted rounded animate-pulse" />
          <div className="flex-1" />
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
