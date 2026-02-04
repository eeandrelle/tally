/**
 * ReminderDashboard Component
 * 
 * Full dashboard for managing proactive reminders.
 * 
 * @module components/reminders/ReminderDashboard
 */

import React from 'react';
import { useProactiveReminders, UseProactiveRemindersReturn } from '@/hooks/useProactiveReminders';
import { ReminderList, TabbedReminderList } from './ReminderList';
import { ReminderStatsCard } from './ReminderStatsCard';
import { Reminder, ReminderType, ReminderEngineInput } from '@/lib/proactive-reminders';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Inbox,
  Filter,
  MoreHorizontal,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ============================================================================
// Props
// ============================================================================

interface ReminderDashboardProps {
  engineInput?: ReminderEngineInput;
  className?: string;
}

// ============================================================================
// Dashboard Component
// ============================================================================

export function ReminderDashboard({ 
  engineInput,
  className 
}: ReminderDashboardProps) {
  const {
    reminders,
    activeReminders,
    criticalReminders,
    stats,
    unreadCount,
    lastCheck,
    isLoading,
    refreshReminders,
    dismiss,
    complete,
    snooze,
    dismissAll,
    completeAll,
  } = useProactiveReminders({
    autoCheckInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Refresh reminders when engine input changes
  React.useEffect(() => {
    if (engineInput) {
      refreshReminders(engineInput);
    }
  }, [engineInput, refreshReminders]);

  const handleAction = (reminder: Reminder) => {
    if (reminder.actionRoute) {
      // Navigate to the action route
      window.location.href = reminder.actionRoute;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Reminders</h2>
            <p className="text-sm text-muted-foreground">
              {lastCheck 
                ? `Last checked: ${format(lastCheck, 'MMM d, h:mm a')}`
                : 'Never checked'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => engineInput && refreshReminders(engineInput)}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          
          {activeReminders.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={completeAll}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark All Done
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissAll}
              >
                <X className="h-4 w-4 mr-2" />
                Dismiss All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReminderStatsCard
          title="Active Reminders"
          value={stats.activeCount}
          icon={<Bell className="h-4 w-4" />}
          description={stats.activeCount === 1 ? '1 item needs attention' : `${stats.activeCount} items need attention`}
          trend={unreadCount > 0 ? { value: unreadCount, label: 'new', positive: false } : undefined}
        />
        
        <ReminderStatsCard
          title="Critical"
          value={criticalReminders.length}
          icon={<AlertTriangle className="h-4 w-4" />}
          description="Require immediate action"
          variant={criticalReminders.length > 0 ? 'destructive' : 'default'}
        />
        
        <ReminderStatsCard
          title="Completion Rate"
          value={`${stats.completionRate.toFixed(0)}%`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          description={`${stats.completedCount} of ${stats.totalReminders} completed`}
          variant={stats.completionRate >= 75 ? 'success' : 'default'}
        />
        
        <ReminderStatsCard
          title="Snoozed"
          value={stats.snoozedCount}
          icon={<Clock className="h-4 w-4" />}
          description="Will reappear later"
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Reminders</CardTitle>
              <CardDescription>
                Intelligent notifications based on your tax situation
              </CardDescription>
            </div>
            
            {activeReminders.length > 0 && (
              <Badge variant="secondary">
                {activeReminders.length} active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <TabbedReminderList
            reminders={activeReminders}
            criticalCount={criticalReminders.length}
            allCount={activeReminders.length - criticalReminders.length}
            onDismiss={dismiss}
            onComplete={complete}
            onSnooze={snooze}
            onAction={handleAction}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Reminder Types Overview */}
      {stats.totalReminders > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reminder History</CardTitle>
            <CardDescription>
              Breakdown by type and priority
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
