/**
 * useTaxCalendar Hook
 * 
 * Main React hook for managing tax calendar state.
 * Provides calendar events, filtering, and CRUD operations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type TaxDeadline,
  type DeadlineType,
  type DeadlineStatus,
  type CalendarMonth,
  type UpcomingDeadline,
  type ReminderAdvance,
  getUpcomingDeadlines,
  getDaysUntilDeadline,
  calculateDeadlineStatus,
  generateCalendarMonth,
  sortDeadlinesByDate,
  filterDeadlinesByType,
  filterDeadlinesByStatus,
  filterDeadlinesByYear,
  formatDeadlineDate,
  formatRelativeDeadline,
  getDeadlineTypeLabel,
  getStatusColor,
  getUrgencyColor,
} from '@/lib/tax-calendar';
import {
  getCalendarEvents,
  getCalendarEventById,
  createCustomDeadline,
  updateCustomDeadline,
  deleteCustomDeadline,
  markEventCompleted,
  markEventDismissed,
  reopenEvent,
  recordReminderSent,
  syncStandardDeadlines,
} from '@/lib/db-tax-calendar';

// ============= TYPES =============

export interface CalendarState {
  events: TaxDeadline[];
  isLoading: boolean;
  error: string | null;
}

export interface CalendarFilters {
  types: DeadlineType[];
  statuses: DeadlineStatus[];
  financialYear: number | 'all';
  searchQuery: string;
}

export interface UseTaxCalendarReturn {
  // State
  events: TaxDeadline[];
  isLoading: boolean;
  error: string | null;
  
  // Filters
  filters: CalendarFilters;
  setFilterTypes: (types: DeadlineType[]) => void;
  setFilterStatuses: (statuses: DeadlineStatus[]) => void;
  setFilterFinancialYear: (year: number | 'all') => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  
  // Filtered results
  filteredEvents: TaxDeadline[];
  upcomingDeadlines: UpcomingDeadline[];
  upcomingCount: number;
  overdueCount: number;
  dueSoonCount: number;
  
  // Calendar view
  getCalendarMonth: (year: number, month: number) => CalendarMonth;
  getEventsForDate: (date: Date) => TaxDeadline[];
  
  // Actions
  refresh: () => Promise<void>;
  syncDeadlines: () => Promise<{ added: number; updated: number }>;
  
  // Event CRUD
  getEvent: (id: string) => Promise<TaxDeadline | null>;
  createEvent: (params: {
    title: string;
    description: string;
    dueDate: Date;
    financialYear: number;
  }) => Promise<string>;
  updateEvent: (id: string, params: {
    title?: string;
    description?: string;
    dueDate?: Date;
    financialYear?: number;
  }) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  
  // Event status
  markCompleted: (id: string) => Promise<void>;
  markDismissed: (id: string) => Promise<void>;
  reopen: (id: string) => Promise<void>;
  
  // Reminders
  recordReminder: (eventId: string, advanceDays: ReminderAdvance) => Promise<void>;
  
  // Utility
  getDaysUntil: (dueDate: Date) => number;
  formatDate: (date: Date) => string;
  formatRelative: (daysUntil: number, isOverdue: boolean) => string;
  getTypeLabel: (type: DeadlineType) => string;
  getStatusLabel: (status: DeadlineStatus) => string;
  getStatusColor: (status: DeadlineStatus) => string;
  getUrgencyColor: (urgency: UpcomingDeadline['urgency']) => string;
}

// ============= DEFAULT VALUES =============

const defaultFilters: CalendarFilters = {
  types: [],
  statuses: [],
  financialYear: 'all',
  searchQuery: '',
};

// ============= HOOK IMPLEMENTATION =============

export function useTaxCalendar(): UseTaxCalendarReturn {
  // ============= STATE =============
  
  const [state, setState] = useState<CalendarState>({
    events: [],
    isLoading: true,
    error: null,
  });
  
  const [filters, setFilters] = useState<CalendarFilters>(defaultFilters);
  
  // ============= LOAD DATA =============
  
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const events = await getCalendarEvents();
      
      // Update status for each event based on current date
      const updatedEvents = events.map(event => ({
        ...event,
        status: calculateDeadlineStatus(event.dueDate, event.completedAt),
      }));
      
      setState({
        events: updatedEvents,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load calendar events',
      }));
    }
  }, []);
  
  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  // ============= SYNC DEADLINES =============
  
  const syncDeadlines = useCallback(async () => {
    const result = await syncStandardDeadlines();
    await refresh();
    return result;
  }, [refresh]);
  
  // ============= FILTERING =============
  
  const setFilterTypes = useCallback((types: DeadlineType[]) => {
    setFilters(prev => ({ ...prev, types }));
  }, []);
  
  const setFilterStatuses = useCallback((statuses: DeadlineStatus[]) => {
    setFilters(prev => ({ ...prev, statuses }));
  }, []);
  
  const setFilterFinancialYear = useCallback((year: number | 'all') => {
    setFilters(prev => ({ ...prev, financialYear: year }));
  }, []);
  
  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);
  
  // Apply filters
  const filteredEvents = useMemo(() => {
    let filtered = [...state.events];
    
    // Filter by type
    if (filters.types.length > 0) {
      filtered = filterDeadlinesByType(filtered, filters.types);
    }
    
    // Filter by status
    if (filters.statuses.length > 0) {
      filtered = filterDeadlinesByStatus(filtered, filters.statuses);
    }
    
    // Filter by financial year
    if (filters.financialYear !== 'all') {
      filtered = filterDeadlinesByYear(filtered, filters.financialYear);
    }
    
    // Filter by search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query)
      );
    }
    
    return sortDeadlinesByDate(filtered);
  }, [state.events, filters]);
  
  // ============= UPCOMING DEADLINES =============
  
  const upcomingDeadlines = useMemo(() => {
    return getUpcomingDeadlines(state.events, undefined, false);
  }, [state.events]);
  
  const upcomingCount = useMemo(() => {
    return state.events.filter(e => e.status === 'upcoming').length;
  }, [state.events]);
  
  const overdueCount = useMemo(() => {
    return state.events.filter(e => e.status === 'overdue').length;
  }, [state.events]);
  
  const dueSoonCount = useMemo(() => {
    return state.events.filter(e => e.status === 'due_soon').length;
  }, [state.events]);
  
  // ============= CALENDAR VIEW =============
  
  const getCalendarMonth = useCallback((year: number, month: number): CalendarMonth => {
    return generateCalendarMonth(state.events, year, month);
  }, [state.events]);
  
  const getEventsForDate = useCallback((date: Date): TaxDeadline[] => {
    return state.events.filter(event => {
      const due = new Date(event.dueDate);
      return (
        due.getFullYear() === date.getFullYear() &&
        due.getMonth() === date.getMonth() &&
        due.getDate() === date.getDate()
      );
    });
  }, [state.events]);
  
  // ============= EVENT CRUD =============
  
  const getEvent = useCallback(async (id: string): Promise<TaxDeadline | null> => {
    return await getCalendarEventById(id);
  }, []);
  
  const createEvent = useCallback(async (params: {
    title: string;
    description: string;
    dueDate: Date;
    financialYear: number;
  }): Promise<string> => {
    const id = await createCustomDeadline(
      params.title,
      params.description,
      params.dueDate,
      params.financialYear
    );
    await refresh();
    return id;
  }, [refresh]);
  
  const updateEvent = useCallback(async (
    id: string,
    params: {
      title?: string;
      description?: string;
      dueDate?: Date;
      financialYear?: number;
    }
  ): Promise<void> => {
    await updateCustomDeadline(id, params);
    await refresh();
  }, [refresh]);
  
  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    await deleteCustomDeadline(id);
    await refresh();
  }, [refresh]);
  
  // ============= EVENT STATUS =============
  
  const markCompleted = useCallback(async (id: string): Promise<void> => {
    await markEventCompleted(id);
    await refresh();
  }, [refresh]);
  
  const markDismissed = useCallback(async (id: string): Promise<void> => {
    await markEventDismissed(id);
    await refresh();
  }, [refresh]);
  
  const reopen = useCallback(async (id: string): Promise<void> => {
    await reopenEvent(id);
    await refresh();
  }, [refresh]);
  
  // ============= REMINDERS =============
  
  const recordReminder = useCallback(async (eventId: string, advanceDays: ReminderAdvance): Promise<void> => {
    await recordReminderSent(eventId, advanceDays);
    await refresh();
  }, [refresh]);
  
  // ============= UTILITY FUNCTIONS =============
  
  const getDaysUntil = useCallback((dueDate: Date): number => {
    return getDaysUntilDeadline(dueDate);
  }, []);
  
  const formatDate = useCallback((date: Date): string => {
    return formatDeadlineDate(date);
  }, []);
  
  const formatRelative = useCallback((daysUntil: number, isOverdue: boolean): string => {
    return formatRelativeDeadline(daysUntil, isOverdue);
  }, []);
  
  const getTypeLabel = useCallback((type: DeadlineType): string => {
    return getDeadlineTypeLabel(type);
  }, []);
  
  const getStatusLabel = useCallback((status: DeadlineStatus): string => {
    return getStatusLabel(status);
  }, []);
  
  const getStatusColorFn = useCallback((status: DeadlineStatus): string => {
    return getStatusColor(status);
  }, []);
  
  const getUrgencyColorFn = useCallback((urgency: UpcomingDeadline['urgency']): string => {
    return getUrgencyColor(urgency);
  }, []);
  
  // ============= RETURN =============
  
  return {
    // State
    events: state.events,
    isLoading: state.isLoading,
    error: state.error,
    
    // Filters
    filters,
    setFilterTypes,
    setFilterStatuses,
    setFilterFinancialYear,
    setSearchQuery,
    clearFilters,
    
    // Filtered results
    filteredEvents,
    upcomingDeadlines,
    upcomingCount,
    overdueCount,
    dueSoonCount,
    
    // Calendar view
    getCalendarMonth,
    getEventsForDate,
    
    // Actions
    refresh,
    syncDeadlines,
    
    // Event CRUD
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    
    // Event status
    markCompleted,
    markDismissed,
    reopen,
    
    // Reminders
    recordReminder,
    
    // Utility
    getDaysUntil,
    formatDate,
    formatRelative,
    getTypeLabel,
    getStatusLabel,
    getStatusColor: getStatusColorFn,
    getUrgencyColor: getUrgencyColorFn,
  };
}

// ============= useUpcomingDeadlines Hook =============

export interface UseUpcomingDeadlinesOptions {
  limit?: number;
  includeCompleted?: boolean;
  types?: DeadlineType[];
}

export interface UseUpcomingDeadlinesReturn {
  deadlines: UpcomingDeadline[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export function useUpcomingDeadlines(options: UseUpcomingDeadlinesOptions = {}): UseUpcomingDeadlinesReturn {
  const { limit = 5, includeCompleted = false, types } = options;
  
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadDeadlines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let events = await getCalendarEvents();
      
      // Filter by types if specified
      if (types && types.length > 0) {
        events = filterDeadlinesByType(events, types);
      }
      
      const upcoming = getUpcomingDeadlines(events, limit, includeCompleted);
      setDeadlines(upcoming);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load upcoming deadlines');
    } finally {
      setIsLoading(false);
    }
  }, [limit, includeCompleted, types]);
  
  useEffect(() => {
    loadDeadlines();
  }, [loadDeadlines]);
  
  const criticalCount = deadlines.filter(d => d.urgency === 'critical').length;
  const highCount = deadlines.filter(d => d.urgency === 'high').length;
  const mediumCount = deadlines.filter(d => d.urgency === 'medium').length;
  const lowCount = deadlines.filter(d => d.urgency === 'low').length;
  
  return {
    deadlines,
    isLoading,
    error,
    refresh: loadDeadlines,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
  };
}

// ============= useReminderSettings Hook =============

import {
  type ReminderSettings,
} from '@/lib/tax-calendar';
import {
  getReminderSettings,
  updateReminderSettings,
} from '@/lib/db-tax-calendar';

export interface UseReminderSettingsReturn {
  settings: ReminderSettings | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  update: (settings: Partial<ReminderSettings>) => Promise<void>;
  toggleEnabled: () => Promise<void>;
  toggleType: (type: 'BAS' | 'PAYG' | 'TAX_RETURN' | 'CUSTOM') => Promise<void>;
  setAdvanceDays: (days: ReminderAdvance[]) => Promise<void>;
  addAdvanceDay: (day: ReminderAdvance) => Promise<void>;
  removeAdvanceDay: (day: ReminderAdvance) => Promise<void>;
}

export function useReminderSettings(): UseReminderSettingsReturn {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getReminderSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminder settings');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  const update = useCallback(async (newSettings: Partial<ReminderSettings>) => {
    await updateReminderSettings(newSettings);
    await loadSettings();
  }, [loadSettings]);
  
  const toggleEnabled = useCallback(async () => {
    if (!settings) return;
    await update({ enabled: !settings.enabled });
  }, [settings, update]);
  
  const toggleType = useCallback(async (type: 'BAS' | 'PAYG' | 'TAX_RETURN' | 'CUSTOM') => {
    if (!settings) return;
    
    const keyMap = {
      BAS: 'notifyBAS',
      PAYG: 'notifyPAYG',
      TAX_RETURN: 'notifyTaxReturn',
      CUSTOM: 'notifyCustom',
    } as const;
    
    await update({ [keyMap[type]]: !settings[keyMap[type]] });
  }, [settings, update]);
  
  const setAdvanceDays = useCallback(async (days: ReminderAdvance[]) => {
    await update({ advanceDays: days.sort((a, b) => a - b) });
  }, [update]);
  
  const addAdvanceDay = useCallback(async (day: ReminderAdvance) => {
    if (!settings) return;
    if (settings.advanceDays.includes(day)) return;
    
    const newDays = [...settings.advanceDays, day].sort((a, b) => a - b);
    await update({ advanceDays: newDays });
  }, [settings, update]);
  
  const removeAdvanceDay = useCallback(async (day: ReminderAdvance) => {
    if (!settings) return;
    
    const newDays = settings.advanceDays.filter(d => d !== day);
    await update({ advanceDays: newDays });
  }, [settings, update]);
  
  return {
    settings,
    isLoading,
    error,
    refresh: loadSettings,
    update,
    toggleEnabled,
    toggleType,
    setAdvanceDays,
    addAdvanceDay,
    removeAdvanceDay,
  };
}
