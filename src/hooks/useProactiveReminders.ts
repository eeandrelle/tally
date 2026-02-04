/**
 * useProactiveReminders Hook
 * 
 * React hook for managing proactive reminders in Tally.
 * Provides state management, actions, and persistence.
 * 
 * @module hooks/useProactiveReminders
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Reminder,
  ReminderConfig,
  ReminderType,
  ReminderPriority,
  ReminderStats,
  ReminderEngineInput,
  DEFAULT_REMINDER_CONFIG,
  generateReminders,
  getActiveReminders,
  dismissReminder,
  completeReminder,
  snoozeReminder,
  calculateReminderStats,
} from '@/lib/proactive-reminders';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY = 'tally_proactive_reminders';
const CONFIG_KEY = 'tally_reminder_config';
const LAST_CHECK_KEY = 'tally_reminders_last_check';

// ============================================================================
// Types
// ============================================================================

export interface UseProactiveRemindersOptions {
  initialReminders?: Reminder[];
  config?: Partial<ReminderConfig>;
  autoCheckInterval?: number; // ms
  enablePersistence?: boolean;
}

export interface UseProactiveRemindersReturn {
  // State
  reminders: Reminder[];
  config: ReminderConfig;
  isLoading: boolean;
  lastCheck: Date | null;
  
  // Filtered views
  activeReminders: Reminder[];
  criticalReminders: Reminder[];
  highPriorityReminders: Reminder[];
  remindersByType: Record<ReminderType, Reminder[]>;
  remindersByPriority: Record<ReminderPriority, Reminder[]>;
  
  // Stats
  stats: ReminderStats;
  unreadCount: number;
  
  // Dashboard helpers
  totalUnread: number;
  criticalCount: number;
  highPriorityCount: number;
  topReminders: Reminder[];
  hasActionableReminders: boolean;
  actionSummary: string;
  
  // Actions
  refreshReminders: (input: ReminderEngineInput) => void;
  refresh: () => void; // alias for refreshReminders with empty input
  dismiss: (id: string) => void;
  complete: (id: string) => void;
  snooze: (id: string, days: number) => void;
  acknowledge: (id: string) => void; // alias for complete
  updateConfig: (updates: Partial<ReminderConfig>) => void;
  resetAll: () => void;
  
  // Bulk actions
  dismissAll: () => void;
  completeAll: () => void;
  dismissByType: (type: ReminderType) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function loadFromStorage(): { reminders: Reminder[]; config: ReminderConfig; lastCheck: Date | null } {
  try {
    const remindersJson = localStorage.getItem(STORAGE_KEY);
    const configJson = localStorage.getItem(CONFIG_KEY);
    const lastCheckStr = localStorage.getItem(LAST_CHECK_KEY);

    return {
      reminders: remindersJson ? JSON.parse(remindersJson) : [],
      config: configJson ? { ...DEFAULT_REMINDER_CONFIG, ...JSON.parse(configJson) } : DEFAULT_REMINDER_CONFIG,
      lastCheck: lastCheckStr ? new Date(lastCheckStr) : null,
    };
  } catch {
    return {
      reminders: [],
      config: DEFAULT_REMINDER_CONFIG,
      lastCheck: null,
    };
  }
}

function saveToStorage(reminders: Reminder[], config: ReminderConfig, lastCheck: Date): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    localStorage.setItem(LAST_CHECK_KEY, lastCheck.toISOString());
  } catch (error) {
    console.error('Failed to save reminders to storage:', error);
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useProactiveReminders(
  options: UseProactiveRemindersOptions = {}
): UseProactiveRemindersReturn {
  const {
    initialReminders,
    config: initialConfig,
    autoCheckInterval,
    enablePersistence = true,
  } = options;

  // Initialize state from storage or props
  const [state, setState] = useState(() => {
    if (enablePersistence && !initialReminders) {
      const stored = loadFromStorage();
      return {
        reminders: stored.reminders,
        config: initialConfig ? { ...stored.config, ...initialConfig } : stored.config,
        lastCheck: stored.lastCheck,
      };
    }
    return {
      reminders: initialReminders || [],
      config: { ...DEFAULT_REMINDER_CONFIG, ...initialConfig },
      lastCheck: null,
    };
  });

  const [isLoading, setIsLoading] = useState(false);

  // Persist state changes
  useEffect(() => {
    if (enablePersistence) {
      saveToStorage(state.reminders, state.config, state.lastCheck || new Date());
    }
  }, [state.reminders, state.config, state.lastCheck, enablePersistence]);

  // Derived state
  const activeReminders = useMemo(() => {
    return getActiveReminders(state.reminders, state.config);
  }, [state.reminders, state.config]);

  const criticalReminders = useMemo(() => {
    return activeReminders.filter(r => r.priority === 'critical');
  }, [activeReminders]);

  const highPriorityReminders = useMemo(() => {
    return activeReminders.filter(r => r.priority === 'high' || r.priority === 'critical');
  }, [activeReminders]);

  const remindersByType = useMemo(() => {
    return state.reminders.reduce((acc, reminder) => {
      if (!acc[reminder.type]) acc[reminder.type] = [];
      acc[reminder.type].push(reminder);
      return acc;
    }, {} as Record<ReminderType, Reminder[]>);
  }, [state.reminders]);

  const remindersByPriority = useMemo(() => {
    return state.reminders.reduce((acc, reminder) => {
      if (!acc[reminder.priority]) acc[reminder.priority] = [];
      acc[reminder.priority].push(reminder);
      return acc;
    }, {} as Record<ReminderPriority, Reminder[]>);
  }, [state.reminders]);

  const stats = useMemo(() => {
    return calculateReminderStats(state.reminders);
  }, [state.reminders]);

  const unreadCount = useMemo(() => {
    return activeReminders.filter(r => 
      !r.dismissedAt && !r.completedAt && 
      (!state.lastCheck || new Date(r.createdAt) > state.lastCheck)
    ).length;
  }, [activeReminders, state.lastCheck]);

  // Dashboard helper properties
  const totalUnread = unreadCount;
  const criticalCount = criticalReminders.length;
  const highPriorityCount = highPriorityReminders.length;
  const topReminders = activeReminders.slice(0, 5); // Top 5 reminders
  const hasActionableReminders = activeReminders.length > 0;
  
  const actionSummary = useMemo(() => {
    if (criticalCount > 0) {
      return `${criticalCount} critical reminder${criticalCount === 1 ? '' : 's'} need${criticalCount === 1 ? 's' : ''} attention`;
    }
    if (highPriorityCount > 0) {
      return `${highPriorityCount} high priority reminder${highPriorityCount === 1 ? '' : 's'}`;
    }
    if (activeReminders.length > 0) {
      return `${activeReminders.length} active reminder${activeReminders.length === 1 ? '' : 's'}`;
    }
    return 'No actionable reminders';
  }, [criticalCount, highPriorityCount, activeReminders.length]);

  // Actions
  const refreshReminders = useCallback((input: ReminderEngineInput) => {
    setIsLoading(true);
    
    try {
      const newReminders = generateReminders(input, state.config);
      
      // Merge new reminders with existing, avoiding duplicates
      const existingIds = new Set(state.reminders.map(r => r.id));
      const uniqueNewReminders = newReminders.filter(r => !existingIds.has(r.id));
      
      setState(prev => ({
        ...prev,
        reminders: [...prev.reminders, ...uniqueNewReminders],
        lastCheck: new Date(),
      }));
    } catch (error) {
      console.error('Failed to generate reminders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [state.config, state.reminders]);

  // Empty refresh function (for API compatibility)
  const refresh = useCallback(() => {
    // This is a placeholder - in real usage, the component would call refreshReminders with actual input
    console.warn('refresh() called without input. Use refreshReminders(input) instead.');
  }, []);

  const dismiss = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      reminders: prev.reminders.map(r => 
        r.id === id ? dismissReminder(r) : r
      ),
    }));
  }, []);

  const complete = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      reminders: prev.reminders.map(r => 
        r.id === id ? completeReminder(r) : r
      ),
    }));
  }, []);

  // Alias for complete
  const acknowledge = complete;

  const snooze = useCallback((id: string, days: number) => {
    setState(prev => ({
      ...prev,
      reminders: prev.reminders.map(r => 
        r.id === id ? snoozeReminder(r, days) : r
      ),
    }));
  }, []);

  const updateConfig = useCallback((updates: Partial<ReminderConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...updates },
    }));
  }, []);

  const resetAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      reminders: [],
      lastCheck: new Date(),
    }));
  }, []);

  // Bulk actions
  const dismissAll = useCallback(() => {
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      reminders: prev.reminders.map(r => ({
        ...r,
        dismissedAt: now,
        updatedAt: now,
      })),
    }));
  }, []);

  const completeAll = useCallback(() => {
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      reminders: prev.reminders.map(r => ({
        ...r,
        completedAt: now,
        updatedAt: now,
      })),
    }));
  }, []);

  const dismissByType = useCallback((type: ReminderType) => {
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      reminders: prev.reminders.map(r => 
        r.type === type 
          ? { ...r, dismissedAt: now, updatedAt: now }
          : r
      ),
    }));
  }, []);

  // Auto-check interval
  useEffect(() => {
    if (!autoCheckInterval) return;

    const interval = setInterval(() => {
      // Trigger a refresh if the caller provides the input data
      // This is typically done by the component that has access to the data
    }, autoCheckInterval);

    return () => clearInterval(interval);
  }, [autoCheckInterval]);

  return {
    reminders: state.reminders,
    config: state.config,
    isLoading,
    lastCheck: state.lastCheck,
    activeReminders,
    criticalReminders,
    highPriorityReminders,
    remindersByType,
    remindersByPriority,
    stats,
    unreadCount,
    totalUnread,
    criticalCount,
    highPriorityCount,
    topReminders,
    hasActionableReminders,
    actionSummary,
    refreshReminders,
    refresh,
    dismiss,
    complete,
    snooze,
    acknowledge,
    updateConfig,
    resetAll,
    dismissAll,
    completeAll,
    dismissByType,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for checking if there are any critical reminders
 */
export function useHasCriticalReminders(): boolean {
  const { criticalReminders } = useProactiveReminders();
  return criticalReminders.length > 0;
}

/**
 * Hook for getting reminders by type
 */
export function useRemindersByType(type: ReminderType): Reminder[] {
  const { remindersByType } = useProactiveReminders();
  return remindersByType[type] || [];
}

/**
 * Hook for getting the most urgent reminder
 */
export function useMostUrgentReminder(): Reminder | null {
  const { activeReminders } = useProactiveReminders();
  return activeReminders[0] || null;
}

/**
 * Hook for dashboard reminders (alias for useProactiveReminders)
 */
export function useDashboardReminders() {
  return useProactiveReminders();
}

/**
 * Hook for notification center
 */
export function useNotificationCenter() {
  const reminders = useProactiveReminders();
  
  return {
    ...reminders,
    // Add any notification-center specific functionality here
    markAllAsRead: reminders.completeAll,
    clearAll: reminders.dismissAll,
  };
}

/**
 * Hook for reminder preferences (placeholder - to be implemented with database)
 */
export function useReminderPreferences() {
  const { config, updateConfig } = useProactiveReminders();
  
  return {
    preferences: config,
    updatePreferences: updateConfig,
    isLoading: false,
  };
}

/**
 * Hook for reminder cleanup (placeholder - to be implemented)
 */
export function useReminderCleanup() {
  const { dismissAll, completeAll } = useProactiveReminders();
  
  return {
    cleanupOldReminders: dismissAll,
    archiveCompleted: completeAll,
  };
}
