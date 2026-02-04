/**
 * Tax Calendar Page
 * 
 * Full-page tax calendar with monthly view, deadline management,
 * and reminder settings.
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CalendarDays,
  ChevronLeft,
  List,
  Settings,
  Plus,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTaxCalendar } from '@/hooks/useTaxCalendar';
import {
  TaxCalendarView,
  UpcomingDeadlinesCard,
  DeadlineDetailDialog,
  ReminderSettingsPanel,
  AddCustomDeadlineDialog,
} from '@/components/tax-calendar';
import { TaxYearSelector } from '@/components/TaxYearSelector';
import { type TaxDeadline } from '@/lib/tax-calendar';

export const Route = createFileRoute('/tax-calendar')({
  component: TaxCalendarPage,
});

function TaxCalendarPage() {
  const {
    events,
    filteredEvents,
    isLoading,
    createEvent,
    markCompleted,
    markDismissed,
    reopen,
    refresh,
    formatDate,
    getTypeLabel,
  } = useTaxCalendar();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<TaxDeadline | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogDate, setAddDialogDate] = useState<Date | undefined>();
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  
  // Handle date selection from calendar
  const handleSelectDate = (date: Date, dateEvents: TaxDeadline[]) => {
    setSelectedDate(date);
    // If there's an event on this date, show it
    if (dateEvents.length > 0) {
      setSelectedEvent(dateEvents[0]);
      setDetailDialogOpen(true);
    }
  };
  
  // Handle event selection
  const handleSelectEvent = (event: TaxDeadline) => {
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  };
  
  // Handle add custom deadline
  const handleAddCustom = (date: Date) => {
    setAddDialogDate(date);
    setAddDialogOpen(true);
  };
  
  // Handle mark complete
  const handleMarkComplete = async (id: string) => {
    setActionLoading(true);
    try {
      await markCompleted(id);
      setDetailDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle dismiss
  const handleDismiss = async (id: string) => {
    setActionLoading(true);
    try {
      await markDismissed(id);
      setDetailDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle reopen
  const handleReopen = async (id: string) => {
    setActionLoading(true);
    try {
      await reopen(id);
      setDetailDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle create custom deadline
  const handleCreateDeadline = async (params: {
    title: string;
    description: string;
    dueDate: Date;
    financialYear: number;
  }) => {
    setActionLoading(true);
    try {
      await createEvent(params);
      setAddDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Get status counts
  const stats = {
    total: events.length,
    upcoming: events.filter(e => e.status === 'upcoming').length,
    dueSoon: events.filter(e => e.status === 'due_soon').length,
    overdue: events.filter(e => e.status === 'overdue').length,
    completed: events.filter(e => e.status === 'completed').length,
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Tax Calendar</h1>
            </div>
          </div>
          <TaxYearSelector />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Stats & Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            {/* Stats Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Upcoming</span>
                  <Badge variant="outline">{stats.upcoming}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Due Soon</span>
                  <Badge variant="default" className="bg-amber-500">{stats.dueSoon}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overdue</span>
                  <Badge variant="destructive">{stats.overdue}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <Badge variant="default" className="bg-green-500">{stats.completed}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span className="text-sm">Total</span>
                  <span className="text-sm">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Upcoming Deadlines */}
            <UpcomingDeadlinesCard limit={5} showViewAll={false} />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setAddDialogDate(new Date());
                    setAddDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Deadline
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={refresh}
                  disabled={isLoading}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Refresh Calendar
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-6">
                {/* Calendar View */}
                <TabsContent value="calendar" className="mt-0">
                  <TaxCalendarView
                    events={filteredEvents}
                    onSelectDate={handleSelectDate}
                    onSelectEvent={handleSelectEvent}
                    onAddCustom={handleAddCustom}
                    selectedDate={selectedDate}
                  />
                </TabsContent>
                
                {/* List View */}
                <TabsContent value="list" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>All Deadlines</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-3">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                          ))}
                        </div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="text-center py-8">
                          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                          <p className="text-muted-foreground">No deadlines found</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredEvents.map(event => {
                            const isOverdue = event.status === 'overdue';
                            const isDueSoon = event.status === 'due_soon';
                            
                            return (
                              <div
                                key={event.id}
                                onClick={() => handleSelectEvent(event)}
                                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                                  isOverdue
                                    ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800'
                                    : isDueSoon
                                    ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800'
                                    : event.status === 'completed'
                                    ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 opacity-60'
                                    : 'border-border'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium truncate">{event.title}</h4>
                                    {isOverdue && (
                                      <Badge variant="destructive" className="text-xs">Overdue</Badge>
                                    )}
                                    {isDueSoon && (
                                      <Badge variant="default" className="bg-amber-500 text-xs">Due Soon</Badge>
                                    )}
                                    {event.status === 'completed' && (
                                      <Badge variant="default" className="bg-green-500 text-xs">Completed</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {event.description}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>{formatDate(event.dueDate)}</span>
                                    <span className="capitalize">{getTypeLabel(event.type)}</span>
                                    <span>FY {event.financialYear}/{event.financialYear + 1}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Settings View */}
                <TabsContent value="settings" className="mt-0">
                  <ReminderSettingsPanel />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>
      
      {/* Dialogs */}
      <DeadlineDetailDialog
        deadline={selectedEvent}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onMarkComplete={handleMarkComplete}
        onDismiss={handleDismiss}
        onReopen={handleReopen}
        isLoading={actionLoading}
      />
      
      <AddCustomDeadlineDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        initialDate={addDialogDate}
        onSubmit={handleCreateDeadline}
        isLoading={actionLoading}
      />
    </div>
  );
}
