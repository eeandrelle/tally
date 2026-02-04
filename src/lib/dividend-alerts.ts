/**
 * Dividend Alert System
 * 
 * Detects and generates alerts for dividend payment anomalies:
 * - Pattern deviations (missed expected payments)
 * - Frequency changes (company changes payment schedule)
 * - Payment anomalies (unusual amounts, unexpected payments)
 * - Upcoming expected payments
 * 
 * @module dividend-alerts
 */

import type { DividendPattern, PaymentFrequency, PatternConfidence, DividendPaymentRecord } from './dividend-patterns';
import type { DividendPayment } from './dividend-tracker';

// ============================================================================
// TYPES
// ============================================================================

/** Alert severity levels */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/** Alert types */
export type AlertType = 
  | 'missed_payment'      // Expected dividend didn't arrive
  | 'frequency_change'    // Company changed payment schedule
  | 'amount_anomaly'      // Unusual payment amount
  | 'early_payment'       // Payment arrived earlier than expected
  | 'late_payment'        // Payment arrived later than expected
  | 'new_pattern'         // New payment pattern detected
  | 'upcoming_payment'    // Upcoming expected payment (info)
  | 'pattern_uncertain';  // Low confidence in detected pattern

/** Alert status */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

/** Dividend alert */
export interface DividendAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  
  // Company/Holding info
  holdingId: string;
  asxCode?: string;
  companyName: string;
  
  // Alert details
  title: string;
  message: string;
  details?: Record<string, unknown>;
  
  // Dates
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  
  // Expected vs actual
  expectedDate?: string;
  expectedAmount?: number;
  actualDate?: string;
  actualAmount?: number;
  
  // Pattern info
  patternId?: string;
  previousPattern?: PaymentFrequency;
  currentPattern?: PaymentFrequency;
  
  // Deviation metrics
  daysDeviation?: number;
  amountDeviation?: number;
  amountDeviationPercent?: number;
  
  // Related payment
  paymentId?: number;
  
  // User actions
  acknowledgedBy?: string;
  notes?: string;
}

/** Alert configuration/settings */
export interface AlertSettings {
  // Global settings
  enabled: boolean;
  
  // Missed payment detection
  missedPaymentThresholdDays: number;
  missedPaymentSeverity: AlertSeverity;
  
  // Frequency change detection
  detectFrequencyChanges: boolean;
  frequencyChangeSeverity: AlertSeverity;
  
  // Amount anomaly detection
  detectAmountAnomalies: boolean;
  amountAnomalyThreshold: number; // Percentage deviation
  amountAnomalySeverity: AlertSeverity;
  
  // Late/early payment detection
  detectTimingDeviations: boolean;
  timingDeviationThresholdDays: number;
  timingDeviationSeverity: AlertSeverity;
  
  // Upcoming payment reminders
  upcomingPaymentReminders: boolean;
  upcomingPaymentDays: number;
  
  // Low confidence alerts
  alertOnLowConfidence: boolean;
  
  // Quiet hours (don't generate new alerts)
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;
}

/** Alert statistics */
export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  bySeverity: Record<AlertSeverity, number>;
  byType: Record<AlertType, number>;
  byStatus: Record<AlertStatus, number>;
  averageResolutionTimeHours?: number;
  mostAffectedHolding?: string;
}

/** Pattern deviation detection result */
export interface PatternDeviation {
  holdingId: string;
  companyName: string;
  asxCode?: string;
  patternId: string;
  
  // Expected
  expectedDate: string;
  expectedAmount: number;
  
  // Deviation info
  daysOverdue: number;
  confidence: PatternConfidence;
  lastPaymentDate: string;
  
  // Suggested action
  suggestedAction: 'wait' | 'investigate' | 'contact_company';
  
  // Historical reliability
  historicalReliability: number; // 0-1
}

/** Frequency change detection result */
export interface FrequencyChangeDetection {
  holdingId: string;
  companyName: string;
  asxCode?: string;
  
  previousFrequency: PaymentFrequency;
  currentFrequency: PaymentFrequency;
  
  // Change details
  detectedAt: string;
  evidence: {
    recentIntervals: number[];
    previousIntervals: number[];
    recentAverage: number;
    previousAverage: number;
  };
  
  // Confidence
  confidence: PatternConfidence;
  reason: string;
}

/** Payment anomaly detection result */
export interface PaymentAnomaly {
  holdingId: string;
  companyName: string;
  asxCode?: string;
  paymentId: number;
  
  // Payment details
  paymentDate: string;
  paymentAmount: number;
  
  // Anomaly details
  anomalyType: 'amount_spike' | 'amount_drop' | 'unexpected_payment' | 'irregular_timing';
  severity: AlertSeverity;
  
  // Comparison
  averageAmount: number;
  expectedRange: { min: number; max: number };
  deviationPercent: number;
  
  // Historical context
  previousPayments: number;
  historicalAverage: number;
}

/** Alert generation result */
export interface AlertGenerationResult {
  alerts: DividendAlert[];
  generatedAt: string;
  
  // Breakdown
  missedPayments: PatternDeviation[];
  frequencyChanges: FrequencyChangeDetection[];
  amountAnomalies: PaymentAnomaly[];
  
  // Stats
  totalGenerated: number;
  bySeverity: Record<AlertSeverity, number>;
}

/** Alert filter options */
export interface AlertFilterOptions {
  severity?: AlertSeverity[];
  type?: AlertType[];
  status?: AlertStatus[];
  holdingId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: true,
  missedPaymentThresholdDays: 14,
  missedPaymentSeverity: 'warning',
  detectFrequencyChanges: true,
  frequencyChangeSeverity: 'info',
  detectAmountAnomalies: true,
  amountAnomalyThreshold: 30, // 30% deviation
  amountAnomalySeverity: 'warning',
  detectTimingDeviations: true,
  timingDeviationThresholdDays: 7,
  timingDeviationSeverity: 'info',
  upcomingPaymentReminders: true,
  upcomingPaymentDays: 7,
  alertOnLowConfidence: false,
  quietHoursEnabled: false,
};

const FREQUENCY_INTERVALS: Record<PaymentFrequency, number> = {
  monthly: 30,
  quarterly: 91,
  'half-yearly': 182,
  yearly: 365,
  irregular: 90,
  unknown: 90,
};

// ============================================================================
// PATTERN DEVIATION DETECTION
// ============================================================================

/**
 * Detect pattern deviations - missing expected dividend payments
 * Compares actual payment history against detected patterns
 */
export function detectPatternDeviations(
  patterns: DividendPattern[],
  recentPayments: DividendPayment[],
  settings: AlertSettings = DEFAULT_ALERT_SETTINGS
): PatternDeviation[] {
  const deviations: PatternDeviation[] = [];
  const today = new Date();
  
  for (const pattern of patterns) {
    // Skip uncertain patterns unless explicitly enabled
    if (pattern.confidence === 'uncertain' && !settings.alertOnLowConfidence) {
      continue;
    }
    
    // Skip if no next expected payment
    if (!pattern.nextExpectedPayment) {
      continue;
    }
    
    const expectedDate = new Date(pattern.nextExpectedPayment.estimatedDate);
    const thresholdDate = new Date(expectedDate);
    thresholdDate.setDate(thresholdDate.getDate() + settings.missedPaymentThresholdDays);
    
    // Check if we've already received a payment after the expected date
    const holdingPayments = recentPayments.filter(p => {
      const holdingKey = p.asxCode || p.companyName.toUpperCase().trim();
      return holdingKey === pattern.id || holdingKey === pattern.asxCode;
    });
    
    const receivedAfterExpected = holdingPayments.some(p => {
      const paymentDate = new Date(p.dateReceived);
      return paymentDate >= expectedDate;
    });
    
    // If payment already received, skip
    if (receivedAfterExpected) {
      continue;
    }
    
    // Check if we're past the expected date
    if (today > expectedDate) {
      const daysOverdue = Math.floor(
        (today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Calculate historical reliability
      const historicalReliability = calculateHistoricalReliability(
        pattern,
        holdingPayments
      );
      
      // Determine suggested action based on severity
      let suggestedAction: PatternDeviation['suggestedAction'] = 'wait';
      if (daysOverdue > 30) {
        suggestedAction = 'contact_company';
      } else if (daysOverdue > 14) {
        suggestedAction = 'investigate';
      }
      
      deviations.push({
        holdingId: pattern.id,
        companyName: pattern.companyName,
        asxCode: pattern.asxCode,
        patternId: pattern.id,
        expectedDate: pattern.nextExpectedPayment.estimatedDate,
        expectedAmount: pattern.nextExpectedPayment.estimatedAmount,
        daysOverdue,
        confidence: pattern.nextExpectedPayment.confidence,
        lastPaymentDate: pattern.dateRange.end,
        suggestedAction,
        historicalReliability,
      });
    }
  }
  
  // Sort by days overdue (most overdue first)
  return deviations.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Calculate historical reliability of a pattern
 * Based on how consistently payments have arrived on time
 */
function calculateHistoricalReliability(
  pattern: DividendPattern,
  payments: DividendPayment[]
): number {
  if (payments.length < 2) return 0.5;
  
  const sorted = [...payments].sort((a, b) => 
    new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime()
  );
  
  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.round(
      (new Date(sorted[i].dateReceived).getTime() - new Date(sorted[i - 1].dateReceived).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    intervals.push(days);
  }
  
  // Expected interval based on frequency
  const expectedInterval = FREQUENCY_INTERVALS[pattern.frequency] || 90;
  
  // Count how many intervals were within reasonable range
  const tolerance = expectedInterval * 0.25; // 25% tolerance
  let onTimeCount = 0;
  
  for (const interval of intervals) {
    if (Math.abs(interval - expectedInterval) <= tolerance) {
      onTimeCount++;
    }
  }
  
  return intervals.length > 0 ? onTimeCount / intervals.length : 0.5;
}

// ============================================================================
// FREQUENCY CHANGE DETECTION
// ============================================================================

/**
 * Detect when a company changes their dividend payment frequency
 * Compares recent intervals against historical patterns
 */
export function detectFrequencyChanges(
  patterns: DividendPattern[],
  allPayments: DividendPayment[],
  settings: AlertSettings = DEFAULT_ALERT_SETTINGS
): FrequencyChangeDetection[] {
  if (!settings.detectFrequencyChanges) {
    return [];
  }
  
  const changes: FrequencyChangeDetection[] = [];
  
  for (const pattern of patterns) {
    // Need enough payments to detect changes
    if (pattern.paymentsAnalyzed < 4) continue;
    
    // Get payments for this holding
    const holdingPayments = allPayments.filter(p => {
      const holdingKey = p.asxCode || p.companyName.toUpperCase().trim();
      return holdingKey === pattern.id || holdingKey === pattern.asxCode;
    }).sort((a, b) => 
      new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime()
    );
    
    if (holdingPayments.length < 4) continue;
    
    // Split into recent and previous periods
    const splitIndex = Math.floor(holdingPayments.length / 2);
    const previousPayments = holdingPayments.slice(0, splitIndex);
    const recentPayments = holdingPayments.slice(splitIndex);
    
    // Calculate intervals for each period
    const previousIntervals = calculatePaymentIntervals(previousPayments);
    const recentIntervals = calculatePaymentIntervals(recentPayments);
    
    if (previousIntervals.length === 0 || recentIntervals.length === 0) continue;
    
    const previousAverage = previousIntervals.reduce((a, b) => a + b, 0) / previousIntervals.length;
    const recentAverage = recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length;
    
    // Detect frequencies
    const previousFrequency = intervalToFrequency(previousAverage);
    const currentFrequency = intervalToFrequency(recentAverage);
    
    // Check if frequency changed meaningfully
    if (previousFrequency !== currentFrequency && 
        !isSimilarFrequency(previousFrequency, currentFrequency)) {
      
      // Calculate confidence based on data quality
      const recentStdDev = calculateStdDev(recentIntervals);
      const recentCV = recentAverage > 0 ? recentStdDev / recentAverage : 1;
      const confidence: PatternConfidence = recentCV < 0.2 ? 'high' : recentCV < 0.4 ? 'medium' : 'low';
      
      changes.push({
        holdingId: pattern.id,
        companyName: pattern.companyName,
        asxCode: pattern.asxCode,
        previousFrequency,
        currentFrequency,
        detectedAt: new Date().toISOString(),
        evidence: {
          recentIntervals,
          previousIntervals,
          recentAverage,
          previousAverage,
        },
        confidence,
        reason: `Payment interval changed from ${Math.round(previousAverage)} to ${Math.round(recentAverage)} days`,
      });
    }
  }
  
  return changes;
}

/**
 * Calculate intervals between consecutive payments
 */
function calculatePaymentIntervals(payments: DividendPayment[]): number[] {
  const intervals: number[] = [];
  
  for (let i = 1; i < payments.length; i++) {
    const days = Math.round(
      (new Date(payments[i].dateReceived).getTime() - 
       new Date(payments[i - 1].dateReceived).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    intervals.push(days);
  }
  
  return intervals;
}

/**
 * Convert interval to frequency
 */
function intervalToFrequency(interval: number): PaymentFrequency {
  if (interval < 40) return 'monthly';
  if (interval < 110) return 'quarterly';
  if (interval < 250) return 'half-yearly';
  return 'yearly';
}

/**
 * Check if two frequencies are similar (e.g., quarterly vs half-yearly might be borderline)
 */
function isSimilarFrequency(a: PaymentFrequency, b: PaymentFrequency): boolean {
  if (a === b) return true;
  
  // Consider quarterly and half-yearly as potentially similar if data is noisy
  const similarGroups: PaymentFrequency[][] = [
    ['monthly'],
    ['quarterly', 'half-yearly'],
    ['yearly'],
    ['irregular', 'unknown'],
  ];
  
  for (const group of similarGroups) {
    if (group.includes(a) && group.includes(b)) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// PAYMENT ANOMALY DETECTION
// ============================================================================

/**
 * Detect payment anomalies - unusual amounts or unexpected payments
 */
export function detectPaymentAnomalies(
  patterns: DividendPattern[],
  payments: DividendPayment[],
  settings: AlertSettings = DEFAULT_ALERT_SETTINGS
): PaymentAnomaly[] {
  if (!settings.detectAmountAnomalies && !settings.detectTimingDeviations) {
    return [];
  }
  
  const anomalies: PaymentAnomaly[] = [];
  
  // Group payments by holding
  const paymentsByHolding = new Map<string, DividendPayment[]>();
  
  for (const payment of payments) {
    const key = payment.asxCode || payment.companyName.toUpperCase().trim();
    if (!paymentsByHolding.has(key)) {
      paymentsByHolding.set(key, []);
    }
    paymentsByHolding.get(key)!.push(payment);
  }
  
  for (const [holdingKey, holdingPayments] of paymentsByHolding) {
    if (holdingPayments.length < 3) continue; // Need history for anomaly detection
    
    const pattern = patterns.find(p => p.id === holdingKey || p.asxCode === holdingKey);
    const sorted = [...holdingPayments].sort((a, b) => 
      new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime()
    );
    
    // Get most recent payment
    const mostRecent = sorted[sorted.length - 1];
    
    // Calculate statistics from historical payments (excluding most recent)
    const historical = sorted.slice(0, -1);
    const amounts = historical.map(p => p.dividendAmount);
    const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = calculateStdDev(amounts);
    
    // Check for amount anomaly
    if (settings.detectAmountAnomalies) {
      const deviation = mostRecent.dividendAmount - averageAmount;
      const deviationPercent = averageAmount > 0 ? (deviation / averageAmount) * 100 : 0;
      const absoluteDeviationPercent = Math.abs(deviationPercent);
      
      if (absoluteDeviationPercent > settings.amountAnomalyThreshold) {
        const anomalyType: PaymentAnomaly['anomalyType'] = 
          deviation > 0 ? 'amount_spike' : 'amount_drop';
        
        // Determine severity based on deviation magnitude
        let severity: AlertSeverity = settings.amountAnomalySeverity;
        if (absoluteDeviationPercent > 100) {
          severity = 'critical';
        } else if (absoluteDeviationPercent > 50) {
          severity = 'warning';
        }
        
        anomalies.push({
          holdingId: holdingKey,
          companyName: mostRecent.companyName,
          asxCode: mostRecent.asxCode,
          paymentId: mostRecent.id || 0,
          paymentDate: mostRecent.dateReceived,
          paymentAmount: mostRecent.dividendAmount,
          anomalyType,
          severity,
          averageAmount,
          expectedRange: {
            min: averageAmount - stdDev * 2,
            max: averageAmount + stdDev * 2,
          },
          deviationPercent,
          previousPayments: historical.length,
          historicalAverage: averageAmount,
        });
      }
    }
    
    // Check for timing anomaly
    if (settings.detectTimingDeviations && pattern) {
      const expectedInterval = FREQUENCY_INTERVALS[pattern.frequency] || 90;
      
      if (historical.length >= 2) {
        const lastPayment = historical[historical.length - 1];
        const actualInterval = Math.round(
          (new Date(mostRecent.dateReceived).getTime() - 
           new Date(lastPayment.dateReceived).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        
        const timingDeviation = Math.abs(actualInterval - expectedInterval);
        
        if (timingDeviation > settings.timingDeviationThresholdDays) {
          const anomalyType: PaymentAnomaly['anomalyType'] = 
            actualInterval < expectedInterval ? 'irregular_timing' : 'irregular_timing';
          
          anomalies.push({
            holdingId: holdingKey,
            companyName: mostRecent.companyName,
            asxCode: mostRecent.asxCode,
            paymentId: mostRecent.id || 0,
            paymentDate: mostRecent.dateReceived,
            paymentAmount: mostRecent.dividendAmount,
            anomalyType,
            severity: settings.timingDeviationSeverity,
            averageAmount,
            expectedRange: {
              min: averageAmount - stdDev * 2,
              max: averageAmount + stdDev * 2,
            },
            deviationPercent: 0,
            previousPayments: historical.length,
            historicalAverage: averageAmount,
          });
        }
      }
    }
  }
  
  return anomalies.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ============================================================================
// ALERT GENERATION
// ============================================================================

/**
 * Generate dividend alerts from detected issues
 */
export function generateAlerts(
  deviations: PatternDeviation[],
  frequencyChanges: FrequencyChangeDetection[],
  anomalies: PaymentAnomaly[],
  settings: AlertSettings = DEFAULT_ALERT_SETTINGS
): AlertGenerationResult {
  const alerts: DividendAlert[] = [];
  const bySeverity: Record<AlertSeverity, number> = { info: 0, warning: 0, critical: 0 };
  
  // Generate alerts for missed payments
  for (const deviation of deviations) {
    const severity = deviation.daysOverdue > 30 ? 'critical' : 
                     deviation.daysOverdue > 14 ? 'warning' : 'info';
    
    const alert: DividendAlert = {
      id: generateAlertId('missed', deviation.holdingId),
      type: 'missed_payment',
      severity,
      status: 'active',
      holdingId: deviation.holdingId,
      asxCode: deviation.asxCode,
      companyName: deviation.companyName,
      title: `${deviation.companyName}: Expected Dividend Overdue`,
      message: `Expected dividend payment is ${deviation.daysOverdue} days overdue. ` +
               `Based on historical ${deviation.confidence} confidence pattern.`,
      details: {
        suggestedAction: deviation.suggestedAction,
        historicalReliability: deviation.historicalReliability,
        lastPaymentDate: deviation.lastPaymentDate,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expectedDate: deviation.expectedDate,
      expectedAmount: deviation.expectedAmount,
      daysDeviation: deviation.daysOverdue,
      patternId: deviation.patternId,
    };
    
    alerts.push(alert);
    bySeverity[severity]++;
  }
  
  // Generate alerts for frequency changes
  for (const change of frequencyChanges) {
    if (settings.detectFrequencyChanges) {
      const alert: DividendAlert = {
        id: generateAlertId('freq', change.holdingId),
        type: 'frequency_change',
        severity: settings.frequencyChangeSeverity,
        status: 'active',
        holdingId: change.holdingId,
        asxCode: change.asxCode,
        companyName: change.companyName,
        title: `${change.companyName}: Payment Schedule Changed`,
        message: `Payment frequency appears to have changed from ${change.previousFrequency} ` +
                 `to ${change.currentFrequency}. ${change.reason}`,
        details: {
          previousIntervals: change.evidence.previousIntervals,
          recentIntervals: change.evidence.recentIntervals,
          confidence: change.confidence,
        },
        createdAt: change.detectedAt,
        updatedAt: change.detectedAt,
        previousPattern: change.previousFrequency,
        currentPattern: change.currentFrequency,
      };
      
      alerts.push(alert);
      bySeverity[settings.frequencyChangeSeverity]++;
    }
  }
  
  // Generate alerts for payment anomalies
  for (const anomaly of anomalies) {
    const typeMap: Record<PaymentAnomaly['anomalyType'], AlertType> = {
      'amount_spike': anomaly.deviationPercent > 50 ? 'amount_anomaly' : 'early_payment',
      'amount_drop': 'amount_anomaly',
      'unexpected_payment': 'amount_anomaly',
      'irregular_timing': anomaly.deviationPercent > 0 ? 'late_payment' : 'early_payment',
    };
    
    const type = typeMap[anomaly.anomalyType];
    const titleMap: Record<PaymentAnomaly['anomalyType'], string> = {
      'amount_spike': `${anomaly.companyName}: Unusually High Dividend Payment`,
      'amount_drop': `${anomaly.companyName}: Unusually Low Dividend Payment`,
      'unexpected_payment': `${anomaly.companyName}: Unexpected Dividend Payment`,
      'irregular_timing': `${anomaly.companyName}: Irregular Payment Timing`,
    };
    
    const alert: DividendAlert = {
      id: generateAlertId('anomaly', anomaly.holdingId, anomaly.paymentId),
      type,
      severity: anomaly.severity,
      status: 'active',
      holdingId: anomaly.holdingId,
      asxCode: anomaly.asxCode,
      companyName: anomaly.companyName,
      title: titleMap[anomaly.anomalyType],
      message: generateAnomalyMessage(anomaly),
      details: {
        averageAmount: anomaly.averageAmount,
        expectedRange: anomaly.expectedRange,
        previousPayments: anomaly.previousPayments,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      actualDate: anomaly.paymentDate,
      actualAmount: anomaly.paymentAmount,
      amountDeviation: anomaly.deviationPercent,
      amountDeviationPercent: anomaly.deviationPercent,
      paymentId: anomaly.paymentId,
    };
    
    alerts.push(alert);
    bySeverity[anomaly.severity]++;
  }
  
  return {
    alerts,
    generatedAt: new Date().toISOString(),
    missedPayments: deviations,
    frequencyChanges,
    amountAnomalies: anomalies,
    totalGenerated: alerts.length,
    bySeverity,
  };
}

/**
 * Generate human-readable anomaly message
 */
function generateAnomalyMessage(anomaly: PaymentAnomaly): string {
  const percentStr = Math.abs(anomaly.deviationPercent).toFixed(1);
  
  switch (anomaly.anomalyType) {
    case 'amount_spike':
      return `Payment of ${formatCurrency(anomaly.paymentAmount)} is ${percentStr}% higher than ` +
             `historical average of ${formatCurrency(anomaly.historicalAverage)}. ` +
             `This could be a special dividend or bonus payment.`;
    case 'amount_drop':
      return `Payment of ${formatCurrency(anomaly.paymentAmount)} is ${percentStr}% lower than ` +
             `historical average of ${formatCurrency(anomaly.historicalAverage)}. ` +
             `This may indicate reduced company earnings.`;
    case 'unexpected_payment':
      return `Unexpected dividend payment received. This payment was not predicted based on ` +
             `the detected payment pattern.`;
    case 'irregular_timing':
      return `Payment arrived outside the expected timeframe based on historical patterns.`;
    default:
      return `Unusual payment detected.`;
  }
}

// ============================================================================
// ALERT MANAGEMENT
// ============================================================================

/**
 * Filter alerts based on criteria
 */
export function filterAlerts(
  alerts: DividendAlert[],
  filters: AlertFilterOptions
): DividendAlert[] {
  return alerts.filter(alert => {
    if (filters.severity?.length && !filters.severity.includes(alert.severity)) {
      return false;
    }
    if (filters.type?.length && !filters.type.includes(alert.type)) {
      return false;
    }
    if (filters.status?.length && !filters.status.includes(alert.status)) {
      return false;
    }
    if (filters.holdingId && alert.holdingId !== filters.holdingId) {
      return false;
    }
    if (filters.dateFrom && alert.createdAt < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && alert.createdAt > filters.dateTo) {
      return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchable = `${alert.companyName} ${alert.title} ${alert.message}`.toLowerCase();
      if (!searchable.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Sort alerts by priority
 */
export function sortAlertsByPriority(alerts: DividendAlert[]): DividendAlert[] {
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  const statusOrder: Record<AlertStatus, number> = { active: 0, acknowledged: 1, resolved: 2, dismissed: 3 };
  
  return [...alerts].sort((a, b) => {
    // First by status (active first)
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Then by severity
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    
    // Then by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(
  alert: DividendAlert,
  acknowledgedBy?: string
): DividendAlert {
  return {
    ...alert,
    status: 'acknowledged',
    acknowledgedBy,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Resolve an alert
 */
export function resolveAlert(alert: DividendAlert, notes?: string): DividendAlert {
  return {
    ...alert,
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: notes || alert.notes,
  };
}

/**
 * Dismiss an alert
 */
export function dismissAlert(alert: DividendAlert, notes?: string): DividendAlert {
  return {
    ...alert,
    status: 'dismissed',
    updatedAt: new Date().toISOString(),
    notes: notes || alert.notes,
  };
}

/**
 * Calculate alert statistics
 */
export function calculateAlertStatistics(alerts: DividendAlert[]): AlertStatistics {
  const bySeverity: Record<AlertSeverity, number> = { info: 0, warning: 0, critical: 0 };
  const byType: Record<AlertType, number> = {
    missed_payment: 0,
    frequency_change: 0,
    amount_anomaly: 0,
    early_payment: 0,
    late_payment: 0,
    new_pattern: 0,
    upcoming_payment: 0,
    pattern_uncertain: 0,
  };
  const byStatus: Record<AlertStatus, number> = { active: 0, acknowledged: 0, resolved: 0, dismissed: 0 };
  
  const holdingCounts = new Map<string, number>();
  let totalResolutionTime = 0;
  let resolvedCount = 0;
  
  for (const alert of alerts) {
    bySeverity[alert.severity]++;
    byType[alert.type]++;
    byStatus[alert.status]++;
    
    holdingCounts.set(alert.holdingId, (holdingCounts.get(alert.holdingId) || 0) + 1);
    
    if (alert.resolvedAt && alert.createdAt) {
      const resolutionTime = new Date(alert.resolvedAt).getTime() - new Date(alert.createdAt).getTime();
      totalResolutionTime += resolutionTime;
      resolvedCount++;
    }
  }
  
  // Find most affected holding
  let mostAffectedHolding: string | undefined;
  let maxCount = 0;
  for (const [holdingId, count] of holdingCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostAffectedHolding = holdingId;
    }
  }
  
  return {
    totalAlerts: alerts.length,
    activeAlerts: byStatus.active,
    bySeverity,
    byType,
    byStatus,
    averageResolutionTimeHours: resolvedCount > 0 
      ? Math.round((totalResolutionTime / resolvedCount) / (1000 * 60 * 60) * 10) / 10 
      : undefined,
    mostAffectedHolding,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

function generateAlertId(type: string, holdingId: string, paymentId?: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `alert-${type}-${holdingId}-${paymentId || ''}-${timestamp}-${random}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    critical: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
    warning: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    info: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return colors[severity];
}

/**
 * Get severity icon name
 */
export function getSeverityIcon(severity: AlertSeverity): string {
  const icons: Record<AlertSeverity, string> = {
    critical: 'AlertCircle',
    warning: 'AlertTriangle',
    info: 'Info',
  };
  return icons[severity];
}

/**
 * Get alert type label
 */
export function getAlertTypeLabel(type: AlertType): string {
  const labels: Record<AlertType, string> = {
    missed_payment: 'Missed Payment',
    frequency_change: 'Frequency Change',
    amount_anomaly: 'Amount Anomaly',
    early_payment: 'Early Payment',
    late_payment: 'Late Payment',
    new_pattern: 'New Pattern',
    upcoming_payment: 'Upcoming Payment',
    pattern_uncertain: 'Uncertain Pattern',
  };
  return labels[type];
}

/**
 * Get alert type icon
 */
export function getAlertTypeIcon(type: AlertType): string {
  const icons: Record<AlertType, string> = {
    missed_payment: 'CalendarX',
    frequency_change: 'Repeat',
    amount_anomaly: 'TrendingUp',
    early_payment: 'Clock',
    late_payment: 'Clock',
    new_pattern: 'Sparkles',
    upcoming_payment: 'Calendar',
    pattern_uncertain: 'HelpCircle',
  };
  return icons[type];
}

/**
 * Get status color
 */
export function getStatusColor(status: AlertStatus): string {
  const colors: Record<AlertStatus, string> = {
    active: 'text-red-600 dark:text-red-400',
    acknowledged: 'text-amber-600 dark:text-amber-400',
    resolved: 'text-green-600 dark:text-green-400',
    dismissed: 'text-gray-600 dark:text-gray-400',
  };
  return colors[status];
}

/**
 * Export alerts to JSON
 */
export function exportAlertsToJSON(alerts: DividendAlert[]): string {
  return JSON.stringify(alerts, null, 2);
}

/**
 * Export alerts to CSV
 */
export function exportAlertsToCSV(alerts: DividendAlert[]): string {
  const headers = [
    'ID',
    'Type',
    'Severity',
    'Status',
    'Company',
    'ASX Code',
    'Title',
    'Message',
    'Created At',
    'Resolved At',
    'Expected Amount',
    'Actual Amount',
  ];
  
  const rows = alerts.map(a => [
    a.id,
    a.type,
    a.severity,
    a.status,
    a.companyName,
    a.asxCode || '',
    a.title,
    a.message,
    a.createdAt,
    a.resolvedAt || '',
    a.expectedAmount?.toString() || '',
    a.actualAmount?.toString() || '',
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
