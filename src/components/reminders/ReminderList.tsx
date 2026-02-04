/**
 * ReminderList Component
 * 
 * Displays a list of reminders with filtering and grouping options.
 * 
 * @module components/reminders/ReminderList
 */

import React from 'react';
import { ReminderCard, ReminderCardSkeleton } from './ReminderCard';
import { Reminder, ReminderType, ReminderPriority } from '@/lib/proactive-reminders';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { Bell, CheckCircle, Filter, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Props
// ============================================================================

interface ReminderListProps {
  reminders: Reminder[];
  onDismiss?: (id: string) => void;
  onComplete?: (id: string) => void;
  onSnooze?: (id: string, days: number) => void;
  onAction?: (reminder: Reminder) => void;
  isLoading?: boolean;
  groupBy?: 'none' | 'type' | 'priority';
  filterBy?: {
    type?: ReminderType[];
    priority?: ReminderPriority[];
  };
  maxHeight?: string;
  compact?: boolean;
  className?: string;
  emptyState?: React.ReactNode;
}

// ============================================================================
// Type Labels
// ============================================================================

const typeLabels: Record<ReminderType, string> = {
  eofy_approaching: 'EOFY Alerts',
  missing_document: 'Missing Documents',
  dividend_expected: 'Dividends',
  optimization_opportunity: 'Optimizations',
  tax_deadline: 'Tax Deadlines',
  document_pattern: 'Patterns',
  review_suggested: 'Reviews',
};

// ============================================================================
// Component
// ============================================================================

export function ReminderList({
  reminders,
  onDismiss,
  onComplete,
  onSnooze,
  onAction,
  isLoading = false,
  groupBy = 'none',
  filterBy,
  maxHeight,
  compact = false,
  className,
  emptyState,
}: ReminderListProps) {
  // Filter reminders
  const filteredReminders = React.useMemo(() => {
    let filtered = reminders;
    
    if (filterBy?.type?.length) {
      filtered = filtered.filter(r => filterBy.type!.includes(r.type));
    }
    
    if (filterBy?.priority?.length) {
      filtered = filtered.filter(r => filterBy.priority!.includes(r.priority));
    }
    
    return filtered;
  }, [reminders, filterBy]);

  // Group reminders
  const groupedReminders = React.useMemo(() => {
    if (groupBy === 'none') {
      return { 'All': filteredReminders };
    }
    
    return filteredReminders.reduce((acc, reminder) => {
      const key = groupBy === 'type' 
        ? typeLabels[reminder.type] 
        : reminder.priority.charAt(0).toUpperCase() + reminder.priority.slice(1);
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(reminder);
      return acc;
    }, {} as Record<string, Reminder[]>);
  }, [filteredReminders, groupBy]);

  // Priority order for sorting groups
  const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];
  const sortedGroups = Object.entries(groupedReminders).sort(([a], [b]) => {
    if (groupBy === 'priority') {
      return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
    }
    return a.localeCompare(b);
  });

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <ReminderCardSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  // Empty state
  if (filteredReminders.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    
    return (
      <EmptyState
        icon={<CheckCircle className="h-12 w-12 text-green-500" />}
        title="All caught up!"
        description="You have no active reminders. We'll notify you when something needs your attention."
        className={className}
      />
    );
  }

  const content = (
    <div className={cn('space-y-4', className)}>
      {sortedGroups.map(([groupName, groupReminders]) => (
        <div key={groupName} className="space-y-2">
          {groupBy !== 'none' && (
            <div className="flex items-center gap-2 px-1">
              <h4 className="text-sm font-medium text-muted-foreground">{groupName}</h4>
              <Badge variant="secondary" className="text-xs">
                {groupReminders.length}
              </Badge>
            </div>
          )}
          
          <div className="space-y-2">
            {groupReminders.map(reminder => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                compact={compact}
                onDismiss={onDismiss ? () => onDismiss(reminder.id) : undefined}
                onComplete={onComplete ? () => onComplete(reminder.id) : undefined}
                onSnooze={onSnooze ? (days) => onSnooze(reminder.id, days) : undefined}
                onAction={onAction ? () => onAction(reminder) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (maxHeight) {
    return (
      <ScrollArea className={maxHeight}>
        {content}
      </ScrollArea>
    );
  }

  return content;
}

// ============================================================================
// Tabbed Reminder List
// ============================================================================

interface TabbedReminderListProps extends Omit<ReminderListProps, 'groupBy'> {
  criticalCount: number;
  allCount: number;
}

export function TabbedReminderList({
  criticalCount,
  allCount,
  reminders,
  ...props
}: TabbedReminderListProps) {
  const criticalReminders = reminders.filter(r => r.priority === 'critical');
  const otherReminders = reminders.filter(r => r.priority !== 'critical');

  return (
    <Tabs defaultValue={criticalCount > 0 ? 'critical' : 'all'} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="critical" className="gap-2">
          Critical
          {criticalCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1">
              {criticalCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="all" className="gap-2">
          All Reminders
          <Badge variant="secondary" className="h-5 min-w-5 px-1">
            {allCount}
          </Badge>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="critical" className="mt-4">
        <ReminderList
          reminders={criticalReminders}
          emptyState={
            <EmptyState
              icon={<CheckCircle className="h-12 w-12 text-green-500" />}
              title="No critical reminders"
              description="Great! You have no critical items requiring immediate attention."
            />
          }
          {...props}
        />
      </TabsContent>
      
      <TabsContent value="all" className="mt-4">
        <ReminderList
          reminders={otherReminders}
          groupBy="priority"
          {...props}
        />
      </TabsContent>
    </Tabs>
  );
}
