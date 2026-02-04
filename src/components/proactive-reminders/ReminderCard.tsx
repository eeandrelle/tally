/**
 * ReminderCard Component
 * 
 * Displays a single proactive reminder with actions
 */

import { useState } from 'react';
import type { ProactiveReminder, ReminderPriority, ProactiveReminderType } from '@/lib/proactive-reminders';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlarmClock,
  Bell,
  Calendar,
  Check,
  Clock,
  DollarSign,
  FileText,
  Lightbulb,
  MoreHorizontal,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';

interface ReminderCardProps {
  reminder: ProactiveReminder;
  onDismiss?: (id: string) => void;
  onSnooze?: (id: string, duration: '1hour' | '4hours' | '1day' | '1week') => void;
  onComplete?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onAction?: (reminder: ProactiveReminder) => void;
  compact?: boolean;
  className?: string;
}

const priorityConfig: Record<ReminderPriority, { color: string; bgColor: string; label: string }> = {
  critical: { color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', label: 'Critical' },
  high: { color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', label: 'High' },
  medium: { color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200', label: 'Medium' },
  low: { color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', label: 'Low' },
};

const typeIcons: Record<ProactiveReminderType, typeof Calendar> = {
  eofy_countdown: Calendar,
  missing_document: FileText,
  expected_dividend: DollarSign,
  optimization_opportunity: Lightbulb,
  deadline_approaching: AlarmClock,
  receipt_upload: Receipt,
};

const typeLabels: Record<ProactiveReminderType, string> = {
  eofy_countdown: 'EOFY',
  missing_document: 'Missing Document',
  expected_dividend: 'Dividend',
  optimization_opportunity: 'Optimization',
  deadline_approaching: 'Deadline',
  receipt_upload: 'Receipt',
};

export function ReminderCard({
  reminder,
  onDismiss,
  onSnooze,
  onComplete,
  onAcknowledge,
  onAction,
  compact = false,
  className,
}: ReminderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const priority = priorityConfig[reminder.priority];
  const TypeIcon = typeIcons[reminder.type];

  const handleDismiss = () => {
    onDismiss?.(reminder.id);
  };

  const handleSnooze = (duration: '1hour' | '4hours' | '1day' | '1week') => {
    onSnooze?.(reminder.id, duration);
  };

  const handleAcknowledge = () => {
    onAcknowledge?.(reminder.id);
  };

  const handleAction = () => {
    onAction?.(reminder);
  };

  // Compact view for dashboard/inline display
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
          priority.bgColor,
          !reminder.acknowledged && 'ring-1 ring-inset ring-opacity-50',
          className
        )}
        onClick={handleAction}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={cn('p-2 rounded-full bg-white/80', priority.color)}>
          <TypeIcon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-medium text-sm truncate', priority.color)}>
              {reminder.title}
            </span>
            {!reminder.acknowledged && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-current animate-pulse" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {reminder.message}
          </p>
        </div>

        {isHovered && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleAcknowledge();
              }}
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Full card view
  return (
    <Card
      className={cn(
        'transition-all duration-200',
        priority.bgColor,
        !reminder.acknowledged && 'ring-2 ring-opacity-50 ring-current',
        reminder.status === 'snoozed' && 'opacity-75',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg bg-white/80', priority.color)}>
              <TypeIcon className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={cn('font-semibold', priority.color)}>
                  {reminder.title}
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {typeLabels[reminder.type]}
                </Badge>
                {!reminder.acknowledged && (
                  <Badge variant="default" className="text-xs bg-current">
                    New
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">
                {reminder.message}
              </p>
              
              {reminder.details && isExpanded && (
                <p className="text-sm text-muted-foreground mt-2 p-2 bg-white/50 rounded">
                  {reminder.details}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', priority.color)}>
              {priority.label}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {reminder.details && (
                  <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? 'Show less' : 'Show more'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleAcknowledge}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as read
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDismiss}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Dismiss
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(reminder.scheduledFor).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          
          {reminder.tags && reminder.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {reminder.tags.slice(0, 3).join(', ')}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        {reminder.actionLabel && (
          <Button
            size="sm"
            onClick={handleAction}
            className={cn('flex-1', priority.color.replace('text-', 'bg-').replace('600', '600 hover:'))}
          >
            {reminder.actionLabel}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <AlarmClock className="h-4 w-4 mr-2" />
              Snooze
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSnooze('1hour')}>
              <Clock className="h-4 w-4 mr-2" />
              1 hour
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSnooze('4hours')}>
              <Clock className="h-4 w-4 mr-2" />
              4 hours
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSnooze('1day')}>
              <Clock className="h-4 w-4 mr-2" />
              1 day
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSnooze('1week')}>
              <Clock className="h-4 w-4 mr-2" />
              1 week
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          <X className="h-4 w-4 mr-2" />
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * ReminderCard Skeleton for loading states
 */
export function ReminderCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-1">
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-muted/50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
      </CardContent>
      <CardFooter>
        <div className="h-9 w-full bg-muted rounded animate-pulse" />
      </CardFooter>
    </Card>
  );
}
