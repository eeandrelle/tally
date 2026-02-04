/**
 * ReminderList Component
 * 
 * Displays a list of proactive reminders with filtering and grouping
 */

import { useState, useMemo } from 'react';
import type { ProactiveReminder, ProactiveReminderType, ReminderPriority } from '@/lib/proactive-reminders';
import { ReminderCard, ReminderCardSkeleton } from './ReminderCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Filter,
  Lightbulb,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface ReminderListProps {
  reminders: ProactiveReminder[];
  isLoading?: boolean;
  onDismiss?: (id: string) => void;
  onSnooze?: (id: string, duration: '1hour' | '4hours' | '1day' | '1week') => void;
  onComplete?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onAction?: (reminder: ProactiveReminder) => void;
  onDismissAll?: () => void;
  onAcknowledgeAll?: () => void;
  compact?: boolean;
  showFilters?: boolean;
  showTabs?: boolean;
  groupByType?: boolean;
  className?: string;
}

const typeIcons: Record<ProactiveReminderType, typeof Calendar> = {
  eofy_countdown: Calendar,
  missing_document: FileText,
  expected_dividend: DollarSign,
  optimization_opportunity: Lightbulb,
  deadline_approaching: Clock,
  receipt_upload: Receipt,
};

const typeLabels: Record<ProactiveReminderType, string> = {
  eofy_countdown: 'EOFY Countdown',
  missing_document: 'Missing Documents',
  expected_dividend: 'Expected Dividends',
  optimization_opportunity: 'Optimization Opportunities',
  deadline_approaching: 'Upcoming Deadlines',
  receipt_upload: 'Receipt Uploads',
};

export function ReminderList({
  reminders,
  isLoading = false,
  onDismiss,
  onSnooze,
  onComplete,
  onAcknowledge,
  onAction,
  onDismissAll,
  onAcknowledgeAll,
  compact = false,
  showFilters = true,
  showTabs = true,
  groupByType = false,
  className,
}: ReminderListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ProactiveReminderType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<ReminderPriority | 'all'>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Filter reminders based on search and filters
  const filteredReminders = useMemo(() => {
    return reminders.filter(reminder => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          reminder.title.toLowerCase().includes(query) ||
          reminder.message.toLowerCase().includes(query) ||
          reminder.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filterType !== 'all' && reminder.type !== filterType) return false;

      // Priority filter
      if (filterPriority !== 'all' && reminder.priority !== filterPriority) return false;

      // Tab filter
      if (activeTab === 'unread' && reminder.acknowledged) return false;
      if (activeTab === 'critical' && reminder.priority !== 'critical') return false;
      if (activeTab === 'high' && !['critical', 'high'].includes(reminder.priority)) return false;

      return true;
    });
  }, [reminders, searchQuery, filterType, filterPriority, activeTab]);

  // Group reminders by type if requested
  const groupedReminders = useMemo(() => {
    if (!groupByType) return null;

    const groups: Record<ProactiveReminderType, ProactiveReminder[]> = {
      eofy_countdown: [],
      missing_document: [],
      expected_dividend: [],
      optimization_opportunity: [],
      deadline_approaching: [],
      receipt_upload: [],
    };

    for (const reminder of filteredReminders) {
      groups[reminder.type].push(reminder);
    }

    return groups;
  }, [filteredReminders, groupByType]);

  // Counts for tabs
  const counts = useMemo(() => ({
    all: reminders.length,
    unread: reminders.filter(r => !r.acknowledged).length,
    critical: reminders.filter(r => r.priority === 'critical').length,
    high: reminders.filter(r => ['critical', 'high'].includes(r.priority)).length,
  }), [reminders]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(3)].map((_, i) => (
          <ReminderCardSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  // Empty state
  if (filteredReminders.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">All caught up!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {searchQuery || filterType !== 'all' || filterPriority !== 'all'
            ? 'No reminders match your filters.'
            : 'You have no active reminders at the moment.'}
        </p>
        {(searchQuery || filterType !== 'all' || filterPriority !== 'all') && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
              setFilterPriority('all');
              setActiveTab('all');
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with filters */}
      {showFilters && (
        <div className="space-y-4">
          {/* Search and filter controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reminders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(v) => setFilterType(v as ProactiveReminderType | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(typeLabels).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as ReminderPriority | 'all')}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk actions */}
          {filteredReminders.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {filteredReminders.length} reminder{filteredReminders.length !== 1 ? 's' : ''}
              </span>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAcknowledgeAll}
                  disabled={!filteredReminders.some(r => !r.acknowledged)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismissAll}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Dismiss all
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {showTabs && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">
                {counts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              <Badge variant="secondary" className="ml-2">
                {counts.unread}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="critical">
              Critical
              <Badge variant="secondary" className="ml-2">
                {counts.critical}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="high">
              High Priority
              <Badge variant="secondary" className="ml-2">
                {counts.high}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {renderReminders()}
          </TabsContent>
        </Tabs>
      )}

      {/* List without tabs */}
      {!showTabs && renderReminders()}
    </div>
  );

  function renderReminders() {
    if (groupByType && groupedReminders) {
      return (
        <Accordion type="multiple" defaultValue={Object.keys(groupedReminders)} className="space-y-2">
          {(Object.entries(groupedReminders) as [ProactiveReminderType, ProactiveReminder[][])
            .filter(([, items]) => items.length > 0)
            .map(([type, items]) => {
              const TypeIcon = typeIcons[type];
              return (
                <AccordionItem key={type} value={type} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <TypeIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{typeLabels[type]}</span>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pb-3">
                      {items.map((reminder) => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onDismiss={onDismiss}
                          onSnooze={onSnooze}
                          onComplete={onComplete}
                          onAcknowledge={onAcknowledge}
                          onAction={onAction}
                          compact={compact}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
        </Accordion>
      );
    }

    return (
      <div className="space-y-3">
        {filteredReminders.map((reminder) => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            onDismiss={onDismiss}
            onSnooze={onSnooze}
            onComplete={onComplete}
            onAcknowledge={onAcknowledge}
            onAction={onAction}
            compact={compact}
          />
        ))}
      </div>
    );
  }
}
