/**
 * ReminderBadge Component
 * 
 * Notification badge for the header/navigation showing active reminders.
 * 
 * @module components/reminders/ReminderBadge
 */

import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ReminderList } from './ReminderList';
import { useProactiveReminders } from '@/hooks/useProactiveReminders';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

// ============================================================================
// Props
// ============================================================================

interface ReminderBadgeProps {
  className?: string;
  compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ReminderBadge({ className, compact = false }: ReminderBadgeProps) {
  const {
    activeReminders,
    criticalReminders,
    unreadCount,
    dismiss,
    complete,
    snooze,
  } = useProactiveReminders();

  const hasCritical = criticalReminders.length > 0;
  const totalCount = activeReminders.length;

  if (compact) {
    return (
      <Link to="/reminders" className={cn('relative', className)}>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className={cn(
              'absolute -top-1 -right-1 h-5 w-5 rounded-full text-[10px] font-medium text-white flex items-center justify-center',
              hasCritical ? 'bg-red-500 animate-pulse' : 'bg-primary'
            )}>
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
        </Button>
      </Link>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative', className)}>
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className={cn(
              'absolute -top-1 -right-1 h-5 w-5 rounded-full text-[10px] font-medium text-white flex items-center justify-center',
              hasCritical ? 'bg-red-500 animate-pulse' : 'bg-primary'
            )}>
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Reminders</h4>
            {hasCritical && (
              <span className="text-xs text-red-500 font-medium">
                {criticalReminders.length} critical
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unreadCount} new reminder{unreadCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          <ReminderList
            reminders={activeReminders.slice(0, 5)}
            compact
            onDismiss={dismiss}
            onComplete={complete}
            onSnooze={snooze}
            maxHeight="max-h-[300px]"
          />
        </div>
        
        <div className="p-3 border-t bg-muted/50">
          <Link to="/reminders">
            <Button variant="ghost" className="w-full" size="sm">
              View All Reminders
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
