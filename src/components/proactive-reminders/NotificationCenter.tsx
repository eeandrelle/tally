/**
 * NotificationCenter Component
 * 
 * A comprehensive notification center with:
 * - List of all reminders
 * - Filtering and search
 * - Quick actions
 * - Integration with reminder settings
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { 
  useNotificationCenter,
  useReminderPreferences,
  useReminderCleanup,
} from '@/hooks/useProactiveReminders';
import { ReminderList } from './ReminderList';
import { ReminderSettings } from './ReminderSettings';
import type { ProactiveReminder } from '@/lib/proactive-reminders';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  CheckCheck,
  Settings,
  Trash2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDashboardReminders } from '@/hooks/useProactiveReminders';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('notifications');
  
  const {
    reminders,
    batches,
    isLoading,
    error,
    filterType,
    filterPriority,
    filterStatus,
    setFilterType,
    setFilterPriority,
    setFilterStatus,
    filteredReminders,
    refresh,
    snooze,
    dismiss,
    complete,
    acknowledge,
    dismissAll,
    acknowledgeAll,
    totalCount,
    unreadCount,
    hasCritical,
  } = useNotificationCenter();

  const {
    preferences,
    isLoading: prefsLoading,
    updateGlobal,
    updateType,
    resetToDefaults,
  } = useReminderPreferences();

  const { cleanup, isCleaning, lastCleanupCount } = useReminderCleanup();

  const handleAction = (reminder: ProactiveReminder) => {
    if (reminder.actionRoute) {
      navigate({ to: reminder.actionRoute });
    }
    if (!reminder.acknowledged) {
      acknowledge(reminder.id);
    }
  };

  const handleSnooze = async (id: string, duration: '1hour' | '4hours' | '1day' | '1week') => {
    try {
      await snooze(id, duration);
      const labels: Record<typeof duration, string> = {
        '1hour': '1 hour',
        '4hours': '4 hours',
        '1day': '1 day',
        '1week': '1 week',
      };
      toast.success(`Reminder snoozed for ${labels[duration]}`);
    } catch {
      toast.error('Failed to snooze reminder');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismiss(id);
      toast.success('Reminder dismissed');
    } catch {
      toast.error('Failed to dismiss reminder');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await complete(id);
      toast.success('Reminder marked as complete');
    } catch {
      toast.error('Failed to complete reminder');
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledge(id);
    } catch {
      // Silently fail for acknowledge
    }
  };

  const handleDismissAll = async () => {
    try {
      await dismissAll();
      toast.success('All reminders dismissed');
    } catch {
      toast.error('Failed to dismiss reminders');
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await acknowledgeAll();
      toast.success('All reminders marked as read');
    } catch {
      toast.error('Failed to acknowledge reminders');
    }
  };

  const handleSavePreferences = async (newPrefs: typeof preferences) => {
    try {
      // Update global settings
      await updateGlobal({
        enabled: newPrefs.enabled,
        quietHoursEnabled: newPrefs.quietHoursEnabled,
        quietHoursStart: newPrefs.quietHoursStart,
        quietHoursEnd: newPrefs.quietHoursEnd,
        maxRemindersPerDay: newPrefs.maxRemindersPerDay,
        batchSimilarReminders: newPrefs.batchSimilarReminders,
        channels: newPrefs.channels,
        snoozeDefaults: newPrefs.snoozeDefaults,
      });

      // Update type-specific settings
      for (const [type, settings] of Object.entries(newPrefs.types)) {
        await updateType(type as keyof typeof newPrefs.types, settings);
      }

      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleCleanup = async () => {
    const count = await cleanup();
    if (count > 0) {
      toast.success(`Cleaned up ${count} expired reminders`);
      refresh();
    } else {
      toast.info('No expired reminders to clean up');
    }
  };

  // Error state
  if (error) {
    return (
      <Card className={cn('h-full', className)}>
        <CardContent className="flex flex-col items-center justify-center h-full py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium">Failed to load notifications</h3>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={refresh}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <CardTitle>Notification Center</CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {lastCleanupCount > 0 && (
              <span className="text-xs text-muted-foreground">
                Cleaned up {lastCleanupCount}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCleanup}
              disabled={isCleaning}
              title="Clean up expired reminders"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Total:</span>
            <Badge variant="secondary">{totalCount}</Badge>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Unread:</span>
              <Badge>{unreadCount}</Badge>
            </div>
          )}
          {hasCritical && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <Badge variant="destructive">Critical</Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mb-4">
          <TabsTrigger value="notifications" className="flex-1">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="flex-1 flex flex-col mt-0">
          {/* Batches summary (if any) */}
          {batches.length > 1 && !isLoading && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {batches.map((batch) => (
                  <Badge
                    key={batch.key}
                    variant={filterType === batch.type ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setFilterType(filterType === batch.type ? 'all' : batch.type)}
                  >
                    {batch.summary}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Reminders list */}
          <ScrollArea className="flex-1 px-4 py-4">
            <ReminderList
              reminders={filteredReminders}
              isLoading={isLoading}
              onDismiss={handleDismiss}
              onSnooze={handleSnooze}
              onComplete={handleComplete}
              onAcknowledge={handleAcknowledge}
              onAction={handleAction}
              onDismissAll={handleDismissAll}
              onAcknowledgeAll={handleAcknowledgeAll}
              showFilters={true}
              showTabs={false}
              compact={false}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 mt-0">
          <ScrollArea className="h-full px-4">
            <ReminderSettings
              preferences={preferences}
              onSave={handleSavePreferences}
              onReset={resetToDefaults}
              isSaving={prefsLoading}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

/**
 * Compact Notification Center for sidebar/dashboard
 */
export function NotificationCenterCompact({ className }: NotificationCenterProps) {
  const navigate = useNavigate();
  const {
    reminders,
    isLoading,
    totalUnread,
    criticalCount,
    topReminders,
    refresh,
    dismiss,
    acknowledge,
  } = useDashboardReminders();

  const handleAction = (reminder: ProactiveReminder) => {
    if (reminder.actionRoute) {
      navigate({ to: reminder.actionRoute });
    }
    if (!reminder.acknowledged) {
      acknowledge(reminder.id);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {totalUnread > 0 && (
              <Badge variant="default" className="ml-2">
                {totalUnread}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/reminders' })}
          >
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topReminders.map((reminder) => (
              <ReminderCardCompact
                key={reminder.id}
                reminder={reminder}
                onAction={() => handleAction(reminder)}
                onDismiss={() => dismiss(reminder.id)}
              />
            ))}
            
            {reminders.length > 5 && (
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => navigate({ to: '/reminders' })}
              >
                <Clock className="h-4 w-4 mr-2" />
                {reminders.length - 5} more reminders
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Internal component for compact card
import { ReminderCard } from './ReminderCard';

function ReminderCardCompact({
  reminder,
  onAction,
  onDismiss,
}: {
  reminder: ProactiveReminder;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <ReminderCard
      reminder={reminder}
      onAction={onAction}
      onDismiss={onDismiss}
      compact
    />
  );
}
