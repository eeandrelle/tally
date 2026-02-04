/**
 * TaxCalendarView
 * 
 * Monthly/weekly calendar display for tax deadlines.
 * Supports month navigation, event highlighting, and date selection.
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
} from 'lucide-react';
import {
  type TaxDeadline,
} from '@/lib/tax-calendar';

interface TaxCalendarViewProps {
  events: TaxDeadline[];
  onSelectDate: (date: Date, events: TaxDeadline[]) => void;
  onSelectEvent: (event: TaxDeadline) => void;
  onAddCustom: (date: Date) => void;
  selectedDate?: Date;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function TaxCalendarView({
  events,
  onSelectDate,
  onSelectEvent,
  onAddCustom,
  selectedDate,
}: TaxCalendarViewProps) {
  const [viewDate, setViewDate] = useState(new Date());
  
  // Get calendar data
  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Get events for this month
    const monthEvents = events.filter(event => {
      const eventDate = new Date(event.dueDate);
      return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
    
    // Group events by date
    const eventsByDate = new Map<number, TaxDeadline[]>();
    monthEvents.forEach(event => {
      const date = new Date(event.dueDate).getDate();
      const existing = eventsByDate.get(date) || [];
      existing.push(event);
      eventsByDate.set(date, existing);
    });
    
    return {
      year,
      month,
      daysInMonth,
      startingDayOfWeek,
      eventsByDate,
    };
  }, [viewDate, events]);
  
  // Navigation
  const goToPreviousMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);
  
  const goToNextMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);
  
  const goToToday = useCallback(() => {
    setViewDate(new Date());
  }, []);
  
  const handleMonthChange = useCallback((month: string) => {
    setViewDate(prev => new Date(prev.getFullYear(), parseInt(month), 1));
  }, []);
  
  const handleYearChange = useCallback((year: string) => {
    setViewDate(prev => new Date(parseInt(year), prev.getMonth(), 1));
  }, []);
  
  // Generate year options (current year +/- 3)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);
  }, []);
  
  // Check if date is today
  const isToday = useCallback((day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === calendarData.month &&
      today.getFullYear() === calendarData.year
    );
  }, [calendarData]);
  
  // Check if date is selected
  const isSelected = useCallback((day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === calendarData.month &&
      selectedDate.getFullYear() === calendarData.year
    );
  }, [selectedDate, calendarData]);
  
  // Get status indicator
  const getStatusIndicator = (dayEvents: TaxDeadline[]) => {
    const hasOverdue = dayEvents.some(e => e.status === 'overdue');
    const hasDueSoon = dayEvents.some(e => e.status === 'due_soon');
    
    if (hasOverdue) return 'border-red-500 bg-red-50 dark:bg-red-950/20';
    if (hasDueSoon) return 'border-amber-500 bg-amber-50 dark:bg-amber-950/20';
    return '';
  };
  
  // Handle date click
  const handleDateClick = (day: number) => {
    const date = new Date(calendarData.year, calendarData.month, day);
    const dayEvents = calendarData.eventsByDate.get(day) || [];
    onSelectDate(date, dayEvents);
  };
  
  // Handle add custom click
  const handleAddCustom = (e: React.MouseEvent, day: number) => {
    e.stopPropagation();
    const date = new Date(calendarData.year, calendarData.month, day);
    onAddCustom(date);
  };
  
  // Calculate days for grid
  const days = useMemo(() => {
    const totalSlots = 42; // 6 rows x 7 columns
    const days: { day: number | null; events: TaxDeadline[] }[] = [];
    
    // Empty slots for days before the first of the month
    for (let i = 0; i < calendarData.startingDayOfWeek; i++) {
      days.push({ day: null, events: [] });
    }
    
    // Days of the month
    for (let day = 1; day <= calendarData.daysInMonth; day++) {
      days.push({
        day,
        events: calendarData.eventsByDate.get(day) || [],
      });
    }
    
    // Empty slots to fill the grid
    const remainingSlots = totalSlots - days.length;
    for (let i = 0; i < remainingSlots; i++) {
      days.push({ day: null, events: [] });
    }
    
    return days;
  }, [calendarData]);
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Tax Calendar
          </CardTitle>
          
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Select
                value={calendarData.month.toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={month} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={calendarData.year.toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={goToToday}
              className="ml-2"
            >
              Today
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {DAYS.map(day => (
              <div
                key={day}
                className="py-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((slot, index) => {
              if (!slot.day) {
                return (
                  <div
                    key={index}
                    className="min-h-[80px] sm:min-h-[100px] border-b border-r bg-muted/20"
                  />
                );
              }
              
              const day = slot.day!; // Safe because we checked !slot.day above
              const today = isToday(day);
              const selected = isSelected(day);
              const statusClass = getStatusIndicator(slot.events);
              
              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "min-h-[80px] sm:min-h-[100px] p-1 border-b border-r cursor-pointer transition-colors relative group",
                    today && "bg-primary/5",
                    selected && "ring-2 ring-primary ring-inset",
                    statusClass,
                    !selected && !statusClass && "hover:bg-muted/50"
                  )}
                >
                  {/* Date Number */}
                  <div className="flex items-center justify-between p-1">
                    <span
                      className={cn(
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                        today && "bg-primary text-primary-foreground",
                        !today && "text-foreground"
                      )}
                    >
                      {day}
                    </span>
                    
                    {/* Add Custom Button (on hover) */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleAddCustom(e, day)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-0.5 mt-1">
                    {slot.events.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                        className={cn(
                          "text-[10px] sm:text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors",
                          event.status === 'overdue' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                          event.status === 'due_soon' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                          event.status === 'completed' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 line-through opacity-60",
                          event.status === 'dismissed' && "bg-gray-100 text-gray-600 line-through opacity-50",
                          event.status === 'upcoming' && "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                      >
                        {event.title}
                      </div>
                    ))}
                    {slot.events.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1.5">
                        +{slot.events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">BAS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-muted-foreground">PAYG</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Tax Return</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-muted-foreground">Custom</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Due Soon</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
