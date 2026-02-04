/**
 * useDividendAlerts Hook
 * 
 * React hooks for dividend alert management
 * Provides:
 * - useDividendAlerts: Main alert management hook
 * - useAlertSettings: Alert configuration management
 * - useAlertGenerator: Automated alert generation
 * 
 * @module useDividendAlerts
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type {
  DividendAlert,
  AlertSettings,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertFilterOptions,
  AlertGenerationResult,
  PatternDeviation,
  FrequencyChangeDetection,
  PaymentAnomaly,
} from '../lib/dividend-alerts';
import {
  detectPatternDeviations,
  detectFrequencyChanges,
  detectPaymentAnomalies,
  generateAlerts,
  filterAlerts,
  sortAlertsByPriority,
  acknowledgeAlert as acknowledgeAlertLib,
  resolveAlert as resolveAlertLib,
  dismissAlert as dismissAlertLib,
  calculateAlertStatistics,
  DEFAULT_ALERT_SETTINGS,
  getSeverityColor,
  getSeverityIcon,
  getAlertTypeLabel,
  getAlertTypeIcon,
  getStatusColor,
} from '../lib/dividend-alerts';
import {
  saveDividendAlert,
  saveDividendAlerts,
  getAllDividendAlerts,
  getActiveAlerts,
  getDividendAlerts,
  updateAlertStatus,
  acknowledgeAlert as dbAcknowledgeAlert,
  resolveAlert as dbResolveAlert,
  dismissAlert as dbDismissAlert,
  getAlertSettings,
  updateAlertSettings,
  resetAlertSettings,
  getAlertStatistics,
  getActiveAlertCount,
  getCriticalAlertCount,
  startAlertRun,
  completeAlertRun,
  failAlertRun,
  getAlertDashboardSummary,
  initDividendAlertDatabase,
} from '../lib/db-dividend-alerts';
import { getAllDividendPatterns, getDividendPaymentHistory } from '../lib/db-dividend-patterns';
import { getAllDividendEntries } from '../lib/db-franking-credits';
import type { DividendPayment } from '../lib/dividend-tracker';
import type { DividendPattern } from '../lib/dividend-patterns';

// ============================================================================
// HOOK: useDividendAlerts
// ============================================================================

interface UseDividendAlertsOptions {
  autoLoad?: boolean;
  filters?: AlertFilterOptions;
}

interface UseDividendAlertsReturn {
  // Data
  alerts: DividendAlert[];
  filteredAlerts: DividendAlert[];
  activeAlerts: DividendAlert[];
  
  // Statistics
  statistics: ReturnType<typeof calculateAlertStatistics> | null;
  activeCount: number;
  criticalCount: number;
  
  // Loading states
  isLoading: boolean;
  isProcessing: boolean;
  error: Error | null;
  
  // Filters
  filters: AlertFilterOptions;
  setFilters: (filters: AlertFilterOptions | ((prev: AlertFilterOptions) => AlertFilterOptions)) => void;
  clearFilters: () => void;
  
  // Actions
  loadAlerts: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string, notes?: string) => Promise<void>;
  dismissAlert: (alertId: string, notes?: string) => Promise<void>;
  deleteAlert: (alertId: string) => Promise<void>;
  
  // Selection
  selectedAlert: DividendAlert | null;
  selectAlert: (alert: DividendAlert | null) => void;
  
  // Utilities
  exportToJSON: () => Promise<string>;
  exportToCSV: () => Promise<string>;
  
  // Severity/type helpers
  getSeverityColor: typeof getSeverityColor;
  getSeverityIcon: typeof getSeverityIcon;
  getAlertTypeLabel: typeof getAlertTypeLabel;
  getAlertTypeIcon: typeof getAlertTypeIcon;
  getStatusColor: typeof getStatusColor;
}

export function useDividendAlerts(
  options: UseDividendAlertsOptions = {}
): UseDividendAlertsReturn {
  const { autoLoad = true, filters: initialFilters = {} } = options;

  const [alerts, setAlerts] = useState<DividendAlert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<DividendAlert[]>([]);
  const [statistics, setStatistics] = useState<ReturnType<typeof calculateAlertStatistics> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<AlertFilterOptions>(initialFilters);
  const [selectedAlert, setSelectedAlert] = useState<DividendAlert | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  // Load all alerts
  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await initDividendAlertDatabase();
      
      const [allAlerts, active, stats, aCount, cCount] = await Promise.all([
        getAllDividendAlerts(),
        getActiveAlerts(),
        getAlertStatistics().then(calculateAlertStatistics),
        getActiveAlertCount(),
        getCriticalAlertCount(),
      ]);

      setAlerts(allAlerts);
      setActiveAlerts(active);
      setStatistics(stats);
      setActiveCount(aCount);
      setCriticalCount(cCount);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load alerts');
      setError(error);
      toast.error('Failed to load dividend alerts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh alerts
  const refreshAlerts = useCallback(async () => {
    await loadAlerts();
    toast.success('Alerts refreshed');
  }, [loadAlerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    const filtered = filterAlerts(alerts, filters);
    return sortAlertsByPriority(filtered);
  }, [alerts, filters]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    setIsProcessing(true);

    try {
      await dbAcknowledgeAlert(alertId);
      
      // Update local state
      setAlerts(prev => prev.map(a => 
        a.id === alertId 
          ? acknowledgeAlertLib(a)
          : a
      ));
      
      toast.success('Alert acknowledged');
      await loadAlerts(); // Refresh to get updated counts
    } catch (err) {
      toast.error('Failed to acknowledge alert');
    } finally {
      setIsProcessing(false);
    }
  }, [loadAlerts]);

  // Resolve alert
  const resolveAlert = useCallback(async (alertId: string, notes?: string) => {
    setIsProcessing(true);

    try {
      await dbResolveAlert(alertId, notes);
      
      setAlerts(prev => prev.map(a => 
        a.id === alertId 
          ? resolveAlertLib(a, notes)
          : a
      ));
      
      toast.success('Alert resolved');
      await loadAlerts();
    } catch (err) {
      toast.error('Failed to resolve alert');
    } finally {
      setIsProcessing(false);
    }
  }, [loadAlerts]);

  // Dismiss alert
  const dismissAlert = useCallback(async (alertId: string, notes?: string) => {
    setIsProcessing(true);

    try {
      await dbDismissAlert(alertId, notes);
      
      setAlerts(prev => prev.map(a => 
        a.id === alertId 
          ? dismissAlertLib(a, notes)
          : a
      ));
      
      toast.success('Alert dismissed');
      await loadAlerts();
    } catch (err) {
      toast.error('Failed to dismiss alert');
    } finally {
      setIsProcessing(false);
    }
  }, [loadAlerts]);

  // Delete alert
  const deleteAlert = useCallback(async (alertId: string) => {
    setIsProcessing(true);

    try {
      const { deleteDividendAlert } = await import('../lib/db-dividend-alerts');
      await deleteDividendAlert(alertId);
      
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      
      toast.success('Alert deleted');
      await loadAlerts();
    } catch (err) {
      toast.error('Failed to delete alert');
    } finally {
      setIsProcessing(false);
    }
  }, [loadAlerts]);

  // Select alert
  const selectAlert = useCallback((alert: DividendAlert | null) => {
    setSelectedAlert(alert);
  }, []);

  // Export to JSON
  const exportToJSON = useCallback(async () => {
    const { exportAlertsToJSON } = await import('../lib/db-dividend-alerts');
    return exportAlertsToJSON();
  }, []);

  // Export to CSV
  const exportToCSV = useCallback(async () => {
    const { exportAlertsToCSV } = await import('../lib/db-dividend-alerts');
    return exportAlertsToCSV();
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadAlerts();
    }
  }, [autoLoad, loadAlerts]);

  return {
    alerts,
    filteredAlerts,
    activeAlerts,
    statistics,
    activeCount,
    criticalCount,
    isLoading,
    isProcessing,
    error,
    filters,
    setFilters,
    clearFilters,
    loadAlerts,
    refreshAlerts,
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    deleteAlert,
    selectedAlert,
    selectAlert,
    exportToJSON,
    exportToCSV,
    getSeverityColor,
    getSeverityIcon,
    getAlertTypeLabel,
    getAlertTypeIcon,
    getStatusColor,
  };
}

// ============================================================================
// HOOK: useAlertSettings
// ============================================================================

interface UseAlertSettingsReturn {
  settings: AlertSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AlertSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export function useAlertSettings(): UseAlertSettingsReturn {
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await initDividendAlertDatabase();
      const loaded = await getAlertSettings();
      setSettings(loaded);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load settings');
      setError(error);
      toast.error('Failed to load alert settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<AlertSettings>) => {
    setIsSaving(true);

    try {
      await updateAlertSettings(newSettings);
      const updated = await getAlertSettings();
      setSettings(updated);
      toast.success('Alert settings updated');
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const resetSettings = useCallback(async () => {
    setIsSaving(true);

    try {
      await resetAlertSettings();
      const reset = await getAlertSettings();
      setSettings(reset);
      toast.success('Settings reset to defaults');
    } catch (err) {
      toast.error('Failed to reset settings');
    } finally {
      setIsSaving(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    error,
    loadSettings,
    updateSettings,
    resetSettings,
  };
}

// ============================================================================
// HOOK: useAlertGenerator
// ============================================================================

interface UseAlertGeneratorOptions {
  autoGenerate?: boolean;
  autoGenerateIntervalMinutes?: number;
  onGenerationComplete?: (result: AlertGenerationResult) => void;
}

interface UseAlertGeneratorReturn {
  // State
  isGenerating: boolean;
  progress: number;
  lastResult: AlertGenerationResult | null;
  error: Error | null;
  
  // Detection results
  deviations: PatternDeviation[];
  frequencyChanges: FrequencyChangeDetection[];
  anomalies: PaymentAnomaly[];
  
  // Actions
  generateAlerts: () => Promise<void>;
  generateForHolding: (holdingId: string) => Promise<void>;
  clearResults: () => void;
  
  // Settings
  settings: AlertSettings | null;
  updateSettings: (settings: Partial<AlertSettings>) => Promise<void>;
}

export function useAlertGenerator(
  options: UseAlertGeneratorOptions = {}
): UseAlertGeneratorReturn {
  const { 
    autoGenerate = false, 
    autoGenerateIntervalMinutes = 60,
    onGenerationComplete,
  } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<AlertGenerationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [deviations, setDeviations] = useState<PatternDeviation[]>([]);
  const [frequencyChanges, setFrequencyChanges] = useState<FrequencyChangeDetection[]>([]);
  const [anomalies, setAnomalies] = useState<PaymentAnomaly[]>([]);
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const loaded = await getAlertSettings();
      setSettings(loaded);
      return loaded;
    } catch (err) {
      return DEFAULT_ALERT_SETTINGS;
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<AlertSettings>) => {
    try {
      await updateAlertSettings(newSettings);
      const updated = await getAlertSettings();
      setSettings(updated);
    } catch (err) {
      toast.error('Failed to update settings');
    }
  }, []);

  // Generate alerts
  const generateAlerts = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    const runId = await startAlertRun();
    const startTime = Date.now();

    try {
      // Load settings
      const currentSettings = settings || await loadSettings();
      
      if (!currentSettings.enabled) {
        toast.info('Alert generation is disabled in settings');
        return;
      }

      setProgress(10);

      // Load patterns and payments
      const [patterns, allPayments] = await Promise.all([
        getAllDividendPatterns(),
        getAllDividendEntries().then(entries => 
          entries.map(e => ({
            ...e,
            id: e.id || 0,
            source: 'manual' as const,
            sharesHeld: 0,
            dividendPerShare: 0,
            asxCode: undefined,
          }))
        ),
      ]);

      setProgress(30);

      // Detect pattern deviations
      const detectedDeviations = detectPatternDeviations(patterns, allPayments, currentSettings);
      setDeviations(detectedDeviations);
      setProgress(50);

      // Detect frequency changes
      const detectedChanges = detectFrequencyChanges(patterns, allPayments, currentSettings);
      setFrequencyChanges(detectedChanges);
      setProgress(70);

      // Detect payment anomalies
      const detectedAnomalies = detectPaymentAnomalies(patterns, allPayments, currentSettings);
      setAnomalies(detectedAnomalies);
      setProgress(90);

      // Generate alerts
      const result = generateAlerts(detectedDeviations, detectedChanges, detectedAnomalies, currentSettings);

      // Save alerts to database
      if (result.alerts.length > 0) {
        await saveDividendAlerts(result.alerts);
      }

      // Complete run record
      const duration = Date.now() - startTime;
      await completeAlertRun(
        runId,
        result.totalGenerated,
        result.bySeverity,
        detectedDeviations.length,
        detectedChanges.length,
        detectedAnomalies.length,
        duration
      );

      setLastResult(result);
      setProgress(100);

      if (result.totalGenerated > 0) {
        toast.success(`Generated ${result.totalGenerated} alerts`);
      } else {
        toast.info('No new alerts generated');
      }

      onGenerationComplete?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Alert generation failed');
      setError(error);
      await failAlertRun(runId, error.message);
      toast.error(`Alert generation failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, settings, loadSettings, onGenerationComplete]);

  // Generate alerts for a specific holding
  const generateForHolding = useCallback(async (holdingId: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      const currentSettings = settings || await loadSettings();
      
      // Get pattern and payments for this holding
      const pattern = await getAllDividendPatterns().then(p => p.find(pt => pt.id === holdingId));
      const payments = await getDividendPaymentHistory(holdingId);
      
      if (!pattern) {
        toast.warning('No pattern found for this holding');
        return;
      }

      // Convert to DividendPayment format
      const dividendPayments: DividendPayment[] = payments.map(p => ({
        id: p.id,
        companyName: p.companyName,
        dividendAmount: p.dividendAmount,
        frankingPercentage: p.frankingPercentage,
        frankingCredit: 0,
        grossedUpDividend: 0,
        dateReceived: p.dateReceived,
        taxYear: p.taxYear || '',
        notes: '',
        source: 'manual',
        sharesHeld: 0,
        dividendPerShare: 0,
        asxCode: p.asxCode,
      }));

      // Detect deviations
      const detectedDeviations = detectPatternDeviations([pattern], dividendPayments, currentSettings);
      setDeviations(detectedDeviations);

      // Generate alerts
      const result = generateAlerts(detectedDeviations, [], [], currentSettings);

      if (result.alerts.length > 0) {
        await saveDividendAlerts(result.alerts);
        toast.success(`Generated ${result.alerts.length} alerts for ${pattern.companyName}`);
      } else {
        toast.info(`No alerts generated for ${pattern.companyName}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Generation failed');
      setError(error);
      toast.error(`Failed to generate alerts: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [settings, loadSettings]);

  // Clear results
  const clearResults = useCallback(() => {
    setLastResult(null);
    setDeviations([]);
    setFrequencyChanges([]);
    setAnomalies([]);
    setProgress(0);
  }, []);

  // Auto-generate on interval
  useEffect(() => {
    if (autoGenerate && autoGenerateIntervalMinutes > 0) {
      intervalRef.current = setInterval(() => {
        generateAlerts();
      }, autoGenerateIntervalMinutes * 60 * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoGenerate, autoGenerateIntervalMinutes, generateAlerts]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    isGenerating,
    progress,
    lastResult,
    error,
    deviations,
    frequencyChanges,
    anomalies,
    generateAlerts,
    generateForHolding,
    clearResults,
    settings,
    updateSettings,
  };
}

// ============================================================================
// HOOK: useAlertDashboard
// ============================================================================

interface UseAlertDashboardReturn {
  summary: {
    totalActive: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    recentAlerts: DividendAlert[];
  } | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAlertDashboard(): UseAlertDashboardReturn {
  const [summary, setSummary] = useState<UseAlertDashboardReturn['summary']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await initDividendAlertDatabase();
      const data = await getAlertDashboardSummary();
      setSummary(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load dashboard');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return {
    summary,
    isLoading,
    error,
    refresh,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export type {
  DividendAlert,
  AlertSettings,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertFilterOptions,
  AlertGenerationResult,
  PatternDeviation,
  FrequencyChangeDetection,
  PaymentAnomaly,
};

// Re-export utility functions
export {
  getSeverityColor,
  getSeverityIcon,
  getAlertTypeLabel,
  getAlertTypeIcon,
  getStatusColor,
  DEFAULT_ALERT_SETTINGS,
};
