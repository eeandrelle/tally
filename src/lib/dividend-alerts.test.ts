/**
 * Dividend Alerts Unit Tests
 * 
 * Tests for:
 * - Pattern deviation detection
 * - Frequency change detection
 * - Payment anomaly detection
 * - Alert severity classification
 * 
 * @module dividend-alerts.test
 */

import { describe, it, expect } from 'vitest';
import {
  // Detection functions
  detectPatternDeviations,
  detectFrequencyChanges,
  detectPaymentAnomalies,
  generateAlerts,
  
  // Management functions
  filterAlerts,
  sortAlertsByPriority,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  calculateAlertStatistics,
  
  // Utility functions
  getSeverityColor,
  getAlertTypeLabel,
  getStatusColor,
  DEFAULT_ALERT_SETTINGS,
} from './dividend-alerts';
import type {
  DividendAlert,
  AlertSettings,
  DividendPattern,
  DividendPayment,
} from './dividend-alerts';

// ============================================================================
// TEST DATA
// ============================================================================

const mockPattern = (overrides?: Partial<DividendPattern>): DividendPattern => ({
  id: 'TEST',
  asxCode: 'TEST',
  companyName: 'Test Company',
  frequency: 'quarterly',
  confidence: 'high',
  confidenceScore: 85,
  detectedPattern: 'Quarterly (Mar/Jun/Sep/Dec)',
  seasonalPattern: { months: [3, 6, 9, 12], description: 'Mar/Jun/Sep/Dec' },
  analysisDate: new Date().toISOString(),
  paymentsAnalyzed: 8,
  dateRange: { start: '2023-01-01', end: '2024-01-01' },
  patternStability: 'stable',
  patternChanges: [],
  nextExpectedPayment: {
    estimatedDate: '2024-03-15',
    estimatedAmount: 100,
    confidence: 'high',
  },
  statistics: {
    averageInterval: 91,
    intervalStdDev: 5,
    minInterval: 85,
    maxInterval: 98,
    coefficientOfVariation: 0.05,
    totalAmount: 800,
    averageAmount: 100,
    amountTrend: 'stable',
    seasonalConsistency: 0.9,
  },
  ...overrides,
});

const mockPayment = (overrides?: Partial<DividendPayment>): DividendPayment => ({
  id: 1,
  companyName: 'Test Company',
  dividendAmount: 100,
  frankingPercentage: 100,
  frankingCredit: 42.86,
  grossedUpDividend: 142.86,
  dateReceived: '2023-12-15',
  taxYear: '2023-24',
  notes: '',
  source: 'manual',
  sharesHeld: 1000,
  dividendPerShare: 0.10,
  ...overrides,
});

// ============================================================================
// PATTERN DEVIATION DETECTION TESTS
// ============================================================================

describe('Pattern Deviation Detection', () => {
  it('should detect missed payment when overdue', () => {
    const patterns = [mockPattern({
      nextExpectedPayment: {
        estimatedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days ago
        estimatedAmount: 100,
        confidence: 'high',
      },
    })];
    
    const payments: DividendPayment[] = []; // No recent payments
    
    const deviations = detectPatternDeviations(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(deviations).toHaveLength(1);
    expect(deviations[0].daysOverdue).toBeGreaterThanOrEqual(20);
    expect(deviations[0].suggestedAction).toBe('investigate');
  });

  it('should not detect deviation if payment received', () => {
    const expectedDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const patterns = [mockPattern({
      nextExpectedPayment: {
        estimatedDate: expectedDate,
        estimatedAmount: 100,
        confidence: 'high',
      },
    })];
    
    // Payment received after expected date
    const payments = [mockPayment({
      dateReceived: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      asxCode: 'TEST',
    })];
    
    const deviations = detectPatternDeviations(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(deviations).toHaveLength(0);
  });

  it('should suggest "contact_company" for severely overdue payments', () => {
    const patterns = [mockPattern({
      nextExpectedPayment: {
        estimatedDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 35 days ago
        estimatedAmount: 100,
        confidence: 'high',
      },
    })];
    
    const payments: DividendPayment[] = [];
    
    const deviations = detectPatternDeviations(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(deviations).toHaveLength(1);
    expect(deviations[0].daysOverdue).toBeGreaterThanOrEqual(35);
    expect(deviations[0].suggestedAction).toBe('contact_company');
  });

  it('should skip uncertain patterns when alertOnLowConfidence is false', () => {
    const patterns = [mockPattern({
      confidence: 'uncertain',
      nextExpectedPayment: {
        estimatedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimatedAmount: 100,
        confidence: 'low',
      },
    })];
    
    const payments: DividendPayment[] = [];
    const settings: AlertSettings = {
      ...DEFAULT_ALERT_SETTINGS,
      alertOnLowConfidence: false,
    };
    
    const deviations = detectPatternDeviations(patterns, payments, settings);
    
    expect(deviations).toHaveLength(0);
  });

  it('should include uncertain patterns when alertOnLowConfidence is true', () => {
    const patterns = [mockPattern({
      confidence: 'uncertain',
      nextExpectedPayment: {
        estimatedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimatedAmount: 100,
        confidence: 'low',
      },
    })];
    
    const payments: DividendPayment[] = [];
    const settings: AlertSettings = {
      ...DEFAULT_ALERT_SETTINGS,
      alertOnLowConfidence: true,
    };
    
    const deviations = detectPatternDeviations(patterns, payments, settings);
    
    expect(deviations).toHaveLength(1);
  });

  it('should calculate historical reliability correctly', () => {
    const patterns = [mockPattern({
      frequency: 'quarterly',
      nextExpectedPayment: {
        estimatedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimatedAmount: 100,
        confidence: 'high',
      },
    })];
    
    // Regular quarterly payments
    const payments = [
      mockPayment({ dateReceived: '2023-03-15' }),
      mockPayment({ dateReceived: '2023-06-15' }),
      mockPayment({ dateReceived: '2023-09-15' }),
      mockPayment({ dateReceived: '2023-12-15' }),
    ];
    
    const deviations = detectPatternDeviations(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(deviations).toHaveLength(1);
    expect(deviations[0].historicalReliability).toBeGreaterThanOrEqual(0.5);
  });
});

// ============================================================================
// FREQUENCY CHANGE DETECTION TESTS
// ============================================================================

describe('Frequency Change Detection', () => {
  it('should detect frequency change from quarterly to yearly', () => {
    const patterns = [mockPattern({
      frequency: 'quarterly',
      paymentsAnalyzed: 8,
    })];
    
    // First 4 payments quarterly, last 2 yearly (much larger gap)
    const payments = [
      mockPayment({ dateReceived: '2022-03-15', dividendAmount: 100, asxCode: 'TEST' }),
      mockPayment({ dateReceived: '2022-06-15', dividendAmount: 100, asxCode: 'TEST' }),
      mockPayment({ dateReceived: '2022-09-15', dividendAmount: 100, asxCode: 'TEST' }),
      mockPayment({ dateReceived: '2022-12-15', dividendAmount: 100, asxCode: 'TEST' }),
      // Gap - switched to yearly
      mockPayment({ dateReceived: '2023-12-15', dividendAmount: 400, asxCode: 'TEST' }),
      mockPayment({ dateReceived: '2024-12-15', dividendAmount: 400, asxCode: 'TEST' }),
    ];
    
    const changes = detectFrequencyChanges(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(changes).toHaveLength(1);
    expect(changes[0].previousFrequency).toBe('quarterly');
    expect(changes[0].currentFrequency).toBe('yearly');
  });

  it('should not detect change with insufficient payments', () => {
    const patterns = [mockPattern({ paymentsAnalyzed: 3 })];
    
    const payments = [
      mockPayment({ dateReceived: '2023-01-01' }),
      mockPayment({ dateReceived: '2023-02-01' }),
      mockPayment({ dateReceived: '2023-03-01' }),
    ];
    
    const changes = detectFrequencyChanges(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(changes).toHaveLength(0);
  });

  it('should not detect change when disabled in settings', () => {
    const patterns = [mockPattern({ paymentsAnalyzed: 8 })];
    
    const payments = [
      mockPayment({ dateReceived: '2022-03-15' }),
      mockPayment({ dateReceived: '2022-06-15' }),
      mockPayment({ dateReceived: '2022-09-15' }),
      mockPayment({ dateReceived: '2022-12-15' }),
      mockPayment({ dateReceived: '2023-06-15' }),
      mockPayment({ dateReceived: '2023-12-15' }),
    ];
    
    const settings: AlertSettings = {
      ...DEFAULT_ALERT_SETTINGS,
      detectFrequencyChanges: false,
    };
    
    const changes = detectFrequencyChanges(patterns, payments, settings);
    
    expect(changes).toHaveLength(0);
  });
});

// ============================================================================
// PAYMENT ANOMALY DETECTION TESTS
// ============================================================================

describe('Payment Anomaly Detection', () => {
  it('should detect amount spike above threshold', () => {
    const patterns = [mockPattern()];
    
    const payments = [
      mockPayment({ dateReceived: '2023-01-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-02-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-03-01', dividendAmount: 100 }),
      // 50% increase - above default 30% threshold
      mockPayment({ dateReceived: '2023-04-01', dividendAmount: 150 }),
    ];
    
    const anomalies = detectPaymentAnomalies(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].anomalyType).toBe('amount_spike');
    expect(anomalies[0].deviationPercent).toBe(50);
  });

  it('should detect amount drop below threshold', () => {
    const patterns = [mockPattern()];
    
    const payments = [
      mockPayment({ dateReceived: '2023-01-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-02-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-03-01', dividendAmount: 100 }),
      // 50% decrease
      mockPayment({ dateReceived: '2023-04-01', dividendAmount: 50 }),
    ];
    
    const anomalies = detectPaymentAnomalies(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].anomalyType).toBe('amount_drop');
    expect(anomalies[0].deviationPercent).toBe(-50);
  });

  it('should not detect anomaly below threshold', () => {
    const patterns = [mockPattern()];
    
    const payments = [
      mockPayment({ dateReceived: '2023-01-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-02-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-03-01', dividendAmount: 100 }),
      // 10% increase - below default 30% threshold
      mockPayment({ dateReceived: '2023-04-01', dividendAmount: 110 }),
    ];
    
    const anomalies = detectPaymentAnomalies(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(anomalies).toHaveLength(0);
  });

  it('should not detect anomalies with insufficient history', () => {
    const patterns = [mockPattern()];
    
    const payments = [
      mockPayment({ dateReceived: '2023-01-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-02-01', dividendAmount: 200 }), // 100% increase
    ];
    
    const anomalies = detectPaymentAnomalies(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(anomalies).toHaveLength(0);
  });

  it('should respect custom anomaly threshold', () => {
    const patterns = [mockPattern()];
    
    const payments = [
      mockPayment({ dateReceived: '2023-01-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-02-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-03-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-04-01', dividendAmount: 150 }), // 50% increase
    ];
    
    const settings: AlertSettings = {
      ...DEFAULT_ALERT_SETTINGS,
      amountAnomalyThreshold: 60, // Only alert on 60%+ changes
    };
    
    const anomalies = detectPaymentAnomalies(patterns, payments, settings);
    
    expect(anomalies).toHaveLength(0);
  });

  it('should classify 100%+ deviation as critical severity', () => {
    const patterns = [mockPattern()];
    
    const payments = [
      mockPayment({ dateReceived: '2023-01-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-02-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-03-01', dividendAmount: 100 }),
      mockPayment({ dateReceived: '2023-04-01', dividendAmount: 210 }), // 110% increase
    ];
    
    const anomalies = detectPaymentAnomalies(patterns, payments, DEFAULT_ALERT_SETTINGS);
    
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].severity).toBe('critical');
  });
});

// ============================================================================
// ALERT GENERATION TESTS
// ============================================================================

describe('Alert Generation', () => {
  it('should generate correct number of alerts', () => {
    const deviations = [
      {
        holdingId: 'TEST1',
        companyName: 'Test 1',
        asxCode: 'T1',
        patternId: 'p1',
        expectedDate: '2024-01-01',
        expectedAmount: 100,
        daysOverdue: 15,
        confidence: 'high',
        lastPaymentDate: '2023-10-01',
        suggestedAction: 'investigate' as const,
        historicalReliability: 0.9,
      },
    ];
    
    const frequencyChanges: ReturnType<typeof detectFrequencyChanges> = [];
    const anomalies: ReturnType<typeof detectPaymentAnomalies> = [];
    
    const result = generateAlerts(deviations, frequencyChanges, anomalies, DEFAULT_ALERT_SETTINGS);
    
    expect(result.totalGenerated).toBe(1);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe('missed_payment');
    expect(result.alerts[0].severity).toBe('warning'); // 15 days = warning
  });

  it('should classify severe missed payment as critical', () => {
    const deviations = [
      {
        holdingId: 'TEST1',
        companyName: 'Test 1',
        asxCode: 'T1',
        patternId: 'p1',
        expectedDate: '2024-01-01',
        expectedAmount: 100,
        daysOverdue: 35, // Severe
        confidence: 'high',
        lastPaymentDate: '2023-10-01',
        suggestedAction: 'contact_company' as const,
        historicalReliability: 0.9,
      },
    ];
    
    const result = generateAlerts(deviations, [], [], DEFAULT_ALERT_SETTINGS);
    
    expect(result.alerts[0].severity).toBe('critical');
  });

  it('should track alert counts by severity', () => {
    const deviations = [
      { ...generateDeviation(15, 'warning'), holdingId: 'TEST1', companyName: 'Test 1' },
      { ...generateDeviation(35, 'critical'), holdingId: 'TEST2', companyName: 'Test 2' },
      { ...generateDeviation(5, 'info'), holdingId: 'TEST3', companyName: 'Test 3' },
    ];
    
    const result = generateAlerts(deviations, [], [], DEFAULT_ALERT_SETTINGS);
    
    expect(result.bySeverity.critical).toBe(1);
    expect(result.bySeverity.warning).toBe(1);
    expect(result.bySeverity.info).toBe(1);
  });

  function generateDeviation(daysOverdue: number, severity: string) {
    return {
      holdingId: 'TEST',
      companyName: 'Test',
      patternId: 'p1',
      expectedDate: '2024-01-01',
      expectedAmount: 100,
      daysOverdue,
      confidence: 'high' as const,
      lastPaymentDate: '2023-10-01',
      suggestedAction: (daysOverdue > 30 ? 'contact_company' : daysOverdue > 14 ? 'investigate' : 'wait') as 'contact_company' | 'investigate' | 'wait',
      historicalReliability: 0.9,
    };
  }
});

// ============================================================================
// ALERT MANAGEMENT TESTS
// ============================================================================

describe('Alert Management', () => {
  const mockAlert = (overrides?: Partial<DividendAlert>): DividendAlert => ({
    id: 'alert-1',
    type: 'missed_payment',
    severity: 'warning',
    status: 'active',
    holdingId: 'TEST',
    companyName: 'Test Company',
    title: 'Test Alert',
    message: 'Test message',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  it('should acknowledge alert', () => {
    const alert = mockAlert();
    const acknowledged = acknowledgeAlert(alert, 'user123');
    
    expect(acknowledged.status).toBe('acknowledged');
    expect(acknowledged.acknowledgedBy).toBe('user123');
    expect(acknowledged.updatedAt).toBeDefined();
  });

  it('should resolve alert', () => {
    const alert = mockAlert();
    const resolved = resolveAlert(alert, 'Issue resolved');
    
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedAt).toBeDefined();
    expect(resolved.notes).toBe('Issue resolved');
  });

  it('should dismiss alert', () => {
    const alert = mockAlert();
    const dismissed = dismissAlert(alert, 'False positive');
    
    expect(dismissed.status).toBe('dismissed');
    expect(dismissed.notes).toBe('False positive');
  });

  it('should filter alerts by severity', () => {
    const alerts = [
      mockAlert({ id: '1', severity: 'critical' }),
      mockAlert({ id: '2', severity: 'warning' }),
      mockAlert({ id: '3', severity: 'info' }),
    ];
    
    const filtered = filterAlerts(alerts, { severity: ['critical', 'warning'] });
    
    expect(filtered).toHaveLength(2);
    expect(filtered.every(a => a.severity !== 'info')).toBe(true);
  });

  it('should filter alerts by type', () => {
    const alerts = [
      mockAlert({ id: '1', type: 'missed_payment' }),
      mockAlert({ id: '2', type: 'amount_anomaly' }),
      mockAlert({ id: '3', type: 'frequency_change' }),
    ];
    
    const filtered = filterAlerts(alerts, { type: ['missed_payment'] });
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe('missed_payment');
  });

  it('should filter alerts by status', () => {
    const alerts = [
      mockAlert({ id: '1', status: 'active' }),
      mockAlert({ id: '2', status: 'resolved' }),
      mockAlert({ id: '3', status: 'dismissed' }),
    ];
    
    const filtered = filterAlerts(alerts, { status: ['active'] });
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe('active');
  });

  it('should search alerts by query', () => {
    const alerts = [
      mockAlert({ id: '1', companyName: 'Apple Inc', title: 'Payment missed' }),
      mockAlert({ id: '2', companyName: 'Microsoft', title: 'Amount anomaly' }),
      mockAlert({ id: '3', companyName: 'Google', title: 'Frequency change' }),
    ];
    
    const filtered = filterAlerts(alerts, { searchQuery: 'apple' });
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].companyName).toBe('Apple Inc');
  });

  it('should sort alerts by priority', () => {
    const alerts = [
      mockAlert({ id: '1', severity: 'info', status: 'active', createdAt: '2024-01-03T00:00:00Z' }),
      mockAlert({ id: '2', severity: 'critical', status: 'active', createdAt: '2024-01-01T00:00:00Z' }),
      mockAlert({ id: '3', severity: 'warning', status: 'active', createdAt: '2024-01-02T00:00:00Z' }),
      mockAlert({ id: '4', severity: 'critical', status: 'resolved', createdAt: '2024-01-04T00:00:00Z' }),
    ];
    
    const sorted = sortAlertsByPriority(alerts);
    
    // Active critical first
    expect(sorted[0].id).toBe('2');
    // Then active warning
    expect(sorted[1].id).toBe('3');
    // Then active info
    expect(sorted[2].id).toBe('1');
    // Then resolved
    expect(sorted[3].id).toBe('4');
  });

  it('should calculate alert statistics', () => {
    const alerts = [
      mockAlert({ id: '1', severity: 'critical', status: 'active', type: 'missed_payment' }),
      mockAlert({ id: '2', severity: 'warning', status: 'active', type: 'missed_payment' }),
      mockAlert({ id: '3', severity: 'info', status: 'acknowledged', type: 'frequency_change' }),
      mockAlert({ id: '4', severity: 'warning', status: 'resolved', type: 'amount_anomaly' }),
    ];
    
    const stats = calculateAlertStatistics(alerts);
    
    expect(stats.totalAlerts).toBe(4);
    expect(stats.activeAlerts).toBe(2);
    expect(stats.bySeverity.critical).toBe(1);
    expect(stats.bySeverity.warning).toBe(2);
    expect(stats.bySeverity.info).toBe(1);
    expect(stats.byType.missed_payment).toBe(2);
    expect(stats.byStatus.active).toBe(2);
    expect(stats.byStatus.acknowledged).toBe(1);
    expect(stats.byStatus.resolved).toBe(1);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Utility Functions', () => {
  it('should return correct severity color', () => {
    expect(getSeverityColor('critical')).toContain('red');
    expect(getSeverityColor('warning')).toContain('amber');
    expect(getSeverityColor('info')).toContain('blue');
  });

  it('should return correct alert type labels', () => {
    expect(getAlertTypeLabel('missed_payment')).toBe('Missed Payment');
    expect(getAlertTypeLabel('frequency_change')).toBe('Frequency Change');
    expect(getAlertTypeLabel('amount_anomaly')).toBe('Amount Anomaly');
  });

  it('should return correct status colors', () => {
    expect(getStatusColor('active')).toContain('red');
    expect(getStatusColor('resolved')).toContain('green');
    expect(getStatusColor('dismissed')).toContain('gray');
  });
});

// ============================================================================
// DEFAULT SETTINGS TESTS
// ============================================================================

describe('Default Settings', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_ALERT_SETTINGS.enabled).toBe(true);
    expect(DEFAULT_ALERT_SETTINGS.missedPaymentThresholdDays).toBe(14);
    expect(DEFAULT_ALERT_SETTINGS.detectFrequencyChanges).toBe(true);
    expect(DEFAULT_ALERT_SETTINGS.detectAmountAnomalies).toBe(true);
    expect(DEFAULT_ALERT_SETTINGS.amountAnomalyThreshold).toBe(30);
    expect(DEFAULT_ALERT_SETTINGS.alertOnLowConfidence).toBe(false);
  });
});
