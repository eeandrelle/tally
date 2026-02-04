/**
 * Dividend Pattern Detection Engine
 * 
 * ML-based detection of dividend payment frequency patterns.
 * Analyzes historical dividend payments to detect:
 * - Payment frequency: monthly, quarterly, half-yearly, yearly, irregular
 * - Seasonal patterns (e.g., Q1/Q2/Q3/Q4 timing)
 * - Pattern changes over time
 * - Confidence scoring for detected patterns
 * 
 * @module dividend-patterns
 */

// ============================================================================
// TYPES
// ============================================================================

/** Payment frequency types */
export type PaymentFrequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'irregular' | 'unknown';

/** Pattern confidence levels */
export type PatternConfidence = 'high' | 'medium' | 'low' | 'uncertain';

/** Individual dividend payment record for pattern analysis */
export interface DividendPaymentRecord {
  id: number;
  companyName: string;
  asxCode?: string;
  dividendAmount: number;
  frankingPercentage: number;
  dateReceived: string; // ISO date string
  taxYear?: string;
}

/** Detected pattern for a holding */
export interface DividendPattern {
  id: string; // holdingId
  asxCode?: string;
  companyName: string;
  
  // Pattern detection results
  frequency: PaymentFrequency;
  confidence: PatternConfidence;
  confidenceScore: number; // 0-100
  
  // Pattern details
  detectedPattern: string;
  seasonalPattern?: {
    months: number[]; // 1-12 representing Jan-Dec
    description: string;
  };
  
  // Analysis metadata
  analysisDate: string;
  paymentsAnalyzed: number;
  dateRange: {
    start: string;
    end: string;
  };
  
  // Pattern stability
  patternStability: 'stable' | 'changing' | 'volatile';
  patternChanges: PatternChange[];
  
  // Predictions
  nextExpectedPayment?: {
    estimatedDate: string;
    estimatedAmount: number;
    confidence: PatternConfidence;
  };
  
  // Statistics
  statistics: PatternStatistics;
}

/** Pattern change record */
export interface PatternChange {
  id: string;
  changeDate: string;
  fromFrequency: PaymentFrequency;
  toFrequency: PaymentFrequency;
  reason: string;
  detectedAt: string;
}

/** Pattern statistics */
export interface PatternStatistics {
  averageInterval: number; // days
  intervalStdDev: number;
  minInterval: number;
  maxInterval: number;
  coefficientOfVariation: number;
  totalAmount: number;
  averageAmount: number;
  amountTrend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  seasonalConsistency: number; // 0-1
}

/** Analysis result for a batch of holdings */
export interface PatternAnalysisResult {
  patterns: DividendPattern[];
  analyzedAt: string;
  totalHoldings: number;
  patternsDetected: number;
  errors: string[];
}

/** Expected dividend prediction */
export interface ExpectedDividend {
  id: string;
  companyName: string;
  asxCode?: string;
  estimatedPaymentDate: string;
  estimatedAmount: number;
  estimatedFrankingCredits: number;
  estimatedFrankingPercentage: number;
  confidence: PatternConfidence;
  basedOn: {
    patternId: string;
    frequency: PaymentFrequency;
    lastPaymentDate: string;
    averageAmount: number;
    paymentsCount: number;
  };
  daysUntil: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FREQUENCY_THRESHOLDS = {
  monthly: { min: 25, max: 40, target: 30 },
  quarterly: { min: 80, max: 100, target: 91 },
  'half-yearly': { min: 170, max: 200, target: 182 },
  yearly: { min: 350, max: 380, target: 365 },
};

const MIN_PAYMENTS_FOR_DETECTION: Record<PaymentFrequency, number> = {
  monthly: 6,
  quarterly: 4,
  'half-yearly': 2,
  yearly: 2,
  irregular: 3,
  unknown: 0,
};

// ============================================================================
// CORE PATTERN DETECTION
// ============================================================================

/**
 * Main pattern detection function
 * Analyzes dividend payments and determines the payment frequency pattern
 */
export function detectPattern(payments: DividendPaymentRecord[]): DividendPattern | null {
  if (!payments || payments.length === 0) {
    return null;
  }

  // Sort payments by date
  const sorted = [...payments].sort((a, b) => 
    new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime()
  );

  const dates = sorted.map(p => new Date(p.dateReceived));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Calculate intervals between payments
  const intervals = calculateIntervals(dates);
  
  // Detect frequency
  const frequencyResult = detectFrequencyFromIntervals(intervals, sorted.length);
  
  // Detect seasonal pattern
  const seasonalPattern = detectSeasonalPattern(sorted);
  
  // Calculate statistics
  const statistics = calculateStatistics(sorted, intervals);
  
  // Detect pattern changes
  const patternChanges = detectPatternChanges(sorted, intervals);
  
  // Determine pattern stability
  const patternStability = determinePatternStability(intervals, patternChanges);
  
  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(
    frequencyResult.frequency,
    sorted.length,
    intervals,
    statistics
  );
  
  // Determine confidence level
  const confidence = getConfidenceLevel(confidenceScore);
  
  // Predict next payment
  const nextExpectedPayment = predictNextPayment(
    last.dateReceived,
    frequencyResult.frequency,
    sorted,
    statistics.averageAmount
  );

  return {
    id: generateHoldingId(first.asxCode, first.companyName),
    asxCode: first.asxCode,
    companyName: first.companyName,
    frequency: frequencyResult.frequency,
    confidence,
    confidenceScore,
    detectedPattern: getPatternDescription(frequencyResult.frequency, seasonalPattern),
    seasonalPattern,
    analysisDate: new Date().toISOString(),
    paymentsAnalyzed: sorted.length,
    dateRange: {
      start: first.dateReceived,
      end: last.dateReceived,
    },
    patternStability,
    patternChanges,
    nextExpectedPayment,
    statistics,
  };
}

/**
 * Calculate intervals between consecutive payments in days
 */
function calculateIntervals(dates: Date[]): number[] {
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const days = Math.round((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(days);
  }
  return intervals;
}

/**
 * Detect payment frequency from intervals
 */
function detectFrequencyFromIntervals(
  intervals: number[],
  paymentCount: number
): { frequency: PaymentFrequency; score: number } {
  if (paymentCount === 1) {
    return { frequency: 'unknown', score: 0 };
  }

  if (intervals.length === 0) {
    return { frequency: 'unknown', score: 0 };
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  
  // Calculate how well each frequency matches
  const scores = Object.entries(FREQUENCY_THRESHOLDS).map(([freq, thresholds]) => {
    const diff = Math.abs(avgInterval - thresholds.target);
    const range = thresholds.max - thresholds.min;
    const score = Math.max(0, 1 - diff / (range / 2));
    return { frequency: freq as PaymentFrequency, score };
  });

  // Check variance
  const variance = calculateVariance(intervals);
  const varianceThreshold = avgInterval * 0.25; // 25% tolerance

  // If variance is too high, consider irregular
  if (variance > varianceThreshold * varianceThreshold && paymentCount >= 4) {
    // Check if it might still be a loose pattern
    const bestScore = scores.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    if (bestScore.score > 0.6) {
      return bestScore;
    }
    
    return { frequency: 'irregular', score: 0.3 };
  }

  // Return best matching frequency
  const best = scores.reduce((best, current) => 
    current.score > best.score ? current : best
  );

  // If score is too low, mark as irregular
  if (best.score < 0.4) {
    return { frequency: 'irregular', score: best.score };
  }

  return best;
}

/**
 * Detect seasonal payment patterns (e.g., Mar/Jun/Sep/Dec for quarterly)
 */
function detectSeasonalPattern(payments: DividendPaymentRecord[]): {
  months: number[];
  description: string;
} | undefined {
  if (payments.length < 2) return undefined;

  const months = payments.map(p => new Date(p.dateReceived).getMonth() + 1); // 1-12
  const monthCounts = new Map<number, number>();
  
  months.forEach(month => {
    monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
  });

  // Find months that appear more than once
  const recurringMonths: number[] = [];
  monthCounts.forEach((count, month) => {
    if (count >= 2) {
      recurringMonths.push(month);
    }
  });

  if (recurringMonths.length === 0) return undefined;

  // Sort by month number
  recurringMonths.sort((a, b) => a - b);

  // Generate description
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const description = recurringMonths
    .map(m => monthNames[m - 1])
    .join('/');

  return {
    months: recurringMonths,
    description,
  };
}

/**
 * Calculate comprehensive statistics
 */
function calculateStatistics(
  payments: DividendPaymentRecord[],
  intervals: number[]
): PatternStatistics {
  const amounts = payments.map(p => p.dividendAmount);
  const totalAmount = amounts.reduce((a, b) => a + b, 0);
  const averageAmount = totalAmount / amounts.length;
  
  // Interval statistics
  const avgInterval = intervals.length > 0 
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
    : 0;
  
  const intervalStdDev = calculateStdDev(intervals);
  
  // Coefficient of variation (CV) - measure of relative variability
  const coefficientOfVariation = avgInterval > 0 ? intervalStdDev / avgInterval : 0;
  
  // Amount trend
  const amountTrend = calculateAmountTrend(amounts);
  
  // Seasonal consistency
  const seasonalConsistency = calculateSeasonalConsistency(payments);

  return {
    averageInterval: Math.round(avgInterval),
    intervalStdDev: Math.round(intervalStdDev),
    minInterval: intervals.length > 0 ? Math.min(...intervals) : 0,
    maxInterval: intervals.length > 0 ? Math.max(...intervals) : 0,
    coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    averageAmount: Math.round(averageAmount * 100) / 100,
    amountTrend,
    seasonalConsistency: Math.round(seasonalConsistency * 100) / 100,
  };
}

/**
 * Detect pattern changes in payment history
 */
function detectPatternChanges(
  payments: DividendPaymentRecord[],
  intervals: number[]
): PatternChange[] {
  const changes: PatternChange[] = [];
  
  if (intervals.length < 3) return changes;

  // Look for significant shifts in interval patterns
  const windowSize = 3;
  
  for (let i = windowSize; i < intervals.length - windowSize; i++) {
    const beforeAvg = intervals.slice(i - windowSize, i).reduce((a, b) => a + b, 0) / windowSize;
    const afterAvg = intervals.slice(i, i + windowSize).reduce((a, b) => a + b, 0) / windowSize;
    
    // Check for significant change (more than 40% difference)
    const changeRatio = Math.abs(afterAvg - beforeAvg) / beforeAvg;
    
    if (changeRatio > 0.4) {
      const fromFreq = classifyInterval(beforeAvg);
      const toFreq = classifyInterval(afterAvg);
      
      if (fromFreq !== toFreq) {
        changes.push({
          id: `change-${i}`,
          changeDate: payments[i + 1].dateReceived,
          fromFrequency: fromFreq,
          toFrequency: toFreq,
          reason: `Interval changed from ${Math.round(beforeAvg)} to ${Math.round(afterAvg)} days`,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  return changes;
}

/**
 * Determine pattern stability based on intervals and changes
 */
function determinePatternStability(
  intervals: number[],
  changes: PatternChange[]
): 'stable' | 'changing' | 'volatile' {
  if (changes.length > 1) return 'volatile';
  if (changes.length === 1) return 'changing';
  
  if (intervals.length < 3) return 'changing';
  
  const cv = calculateStdDev(intervals) / (intervals.reduce((a, b) => a + b, 0) / intervals.length);
  
  if (cv < 0.15) return 'stable';
  if (cv < 0.3) return 'changing';
  return 'volatile';
}

/**
 * Calculate confidence score (0-100)
 */
function calculateConfidenceScore(
  frequency: PaymentFrequency,
  paymentCount: number,
  intervals: number[],
  statistics: PatternStatistics
): number {
  let score = 0;
  
  // Base score from payment count
  const minRequired = MIN_PAYMENTS_FOR_DETECTION[frequency] || 3;
  const countScore = Math.min(paymentCount / minRequired, 1) * 30;
  score += countScore;
  
  // Consistency score
  const consistencyScore = (1 - Math.min(statistics.coefficientOfVariation, 1)) * 40;
  score += consistencyScore;
  
  // Interval alignment score
  if (intervals.length > 0) {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const targetInterval = FREQUENCY_THRESHOLDS[frequency as keyof typeof FREQUENCY_THRESHOLDS]?.target || avgInterval;
    const alignment = 1 - Math.abs(avgInterval - targetInterval) / targetInterval;
    score += Math.max(0, alignment) * 20;
  }
  
  // Seasonal consistency bonus
  score += statistics.seasonalConsistency * 10;
  
  return Math.round(score);
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score: number): PatternConfidence {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 25) return 'low';
  return 'uncertain';
}

/**
 * Predict next payment based on pattern
 */
function predictNextPayment(
  lastPaymentDate: string,
  frequency: PaymentFrequency,
  payments: DividendPaymentRecord[],
  averageAmount: number
): {
  estimatedDate: string;
  estimatedAmount: number;
  confidence: PatternConfidence;
} | undefined {
  if (frequency === 'irregular' || frequency === 'unknown') {
    // For irregular patterns, use average interval if we have enough data
    if (payments.length < 4) return undefined;
    
    const intervals = calculateIntervals(payments.map(p => new Date(p.dateReceived)));
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    const lastDate = new Date(lastPaymentDate);
    const nextDate = new Date(lastDate.getTime() + avgInterval * 24 * 60 * 60 * 1000);
    
    return {
      estimatedDate: nextDate.toISOString().split('T')[0],
      estimatedAmount: Math.round(averageAmount * 100) / 100,
      confidence: 'low',
    };
  }

  const lastDate = new Date(lastPaymentDate);
  const nextDate = new Date(lastDate);
  let confidence: PatternConfidence = 'medium';
  
  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(lastDate.getMonth() + 1);
      confidence = payments.length >= 6 ? 'high' : 'medium';
      break;
    case 'quarterly':
      nextDate.setMonth(lastDate.getMonth() + 3);
      confidence = payments.length >= 4 ? 'high' : 'medium';
      break;
    case 'half-yearly':
      nextDate.setMonth(lastDate.getMonth() + 6);
      confidence = payments.length >= 3 ? 'high' : 'medium';
      break;
    case 'yearly':
      nextDate.setFullYear(lastDate.getFullYear() + 1);
      confidence = payments.length >= 3 ? 'medium' : 'low';
      break;
  }
  
  // Adjust to same day of month if possible
  const lastDay = lastDate.getDate();
  const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
  nextDate.setDate(Math.min(lastDay, maxDay));

  return {
    estimatedDate: nextDate.toISOString().split('T')[0],
    estimatedAmount: Math.round(averageAmount * 100) / 100,
    confidence,
  };
}

// ============================================================================
// BATCH ANALYSIS
// ============================================================================

/**
 * Analyze patterns for multiple holdings
 */
export function analyzePatterns(
  holdings: Map<string, DividendPaymentRecord[]>
): PatternAnalysisResult {
  const patterns: DividendPattern[] = [];
  const errors: string[] = [];
  
  holdings.forEach((payments, key) => {
    try {
      const pattern = detectPattern(payments);
      if (pattern) {
        patterns.push(pattern);
      }
    } catch (error) {
      errors.push(`Error analyzing ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  return {
    patterns,
    analyzedAt: new Date().toISOString(),
    totalHoldings: holdings.size,
    patternsDetected: patterns.length,
    errors,
  };
}

/**
 * Group payments by holding (ASX code or company name)
 */
export function groupPaymentsByHolding(
  payments: DividendPaymentRecord[]
): Map<string, DividendPaymentRecord[]> {
  const holdings = new Map<string, DividendPaymentRecord[]>();
  
  for (const payment of payments) {
    const key = payment.asxCode || payment.companyName.toUpperCase().trim();
    
    if (!holdings.has(key)) {
      holdings.set(key, []);
    }
    holdings.get(key)!.push(payment);
  }
  
  return holdings;
}

// ============================================================================
// EXPECTED DIVIDENDS
// ============================================================================

/**
 * Generate expected upcoming dividends based on detected patterns
 */
export function generateExpectedDividends(
  patterns: DividendPattern[],
  lookAheadDays: number = 90
): ExpectedDividend[] {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + lookAheadDays);
  
  const expected: ExpectedDividend[] = [];
  
  for (const pattern of patterns) {
    if (!pattern.nextExpectedPayment) continue;
    
    const nextDate = new Date(pattern.nextExpectedPayment.estimatedDate);
    
    // Include if within lookahead window and not in the past
    if (nextDate >= today && nextDate <= futureDate) {
      const daysUntil = Math.ceil(
        (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Estimate franking credits
      const frankingRate = pattern.statistics.totalAmount > 0 ? 0.7 : 0; // Assume 70% franked if no data
      const frankingCredits = pattern.nextExpectedPayment.estimatedAmount * frankingRate * 0.3 / 0.7;
      
      expected.push({
        id: pattern.id,
        companyName: pattern.companyName,
        asxCode: pattern.asxCode,
        estimatedPaymentDate: pattern.nextExpectedPayment.estimatedDate,
        estimatedAmount: pattern.nextExpectedPayment.estimatedAmount,
        estimatedFrankingCredits: Math.round(frankingCredits * 100) / 100,
        estimatedFrankingPercentage: Math.round(frankingRate * 100),
        confidence: pattern.nextExpectedPayment.confidence,
        basedOn: {
          patternId: pattern.id,
          frequency: pattern.frequency,
          lastPaymentDate: pattern.dateRange.end,
          averageAmount: pattern.statistics.averageAmount,
          paymentsCount: pattern.paymentsAnalyzed,
        },
        daysUntil,
      });
    }
  }
  
  // Sort by date
  return expected.sort((a, b) => 
    new Date(a.estimatedPaymentDate).getTime() - new Date(b.estimatedPaymentDate).getTime()
  );
}

/**
 * Generate expected dividends for the next 12 months
 */
export function generateExpectedDividendCalendar(
  patterns: DividendPattern[]
): ExpectedDividend[] {
  const expected: ExpectedDividend[] = [];
  
  for (const pattern of patterns) {
    if (pattern.frequency === 'irregular' || pattern.frequency === 'unknown') continue;
    
    // Generate next 4 occurrences
    const lastDate = new Date(pattern.dateRange.end);
    const monthsToAdd = getMonthsForFrequency(pattern.frequency);
    
    for (let i = 1; i <= 4; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setMonth(lastDate.getMonth() + monthsToAdd * i);
      
      const frankingRate = 70; // Default assumption
      
      expected.push({
        id: `${pattern.id}-${i}`,
        companyName: pattern.companyName,
        asxCode: pattern.asxCode,
        estimatedPaymentDate: nextDate.toISOString().split('T')[0],
        estimatedAmount: pattern.statistics.averageAmount,
        estimatedFrankingCredits: Math.round(pattern.statistics.averageAmount * 0.7 * 0.3 / 0.7 * 100) / 100,
        estimatedFrankingPercentage: frankingRate,
        confidence: i === 1 ? pattern.confidence : 'low',
        basedOn: {
          patternId: pattern.id,
          frequency: pattern.frequency,
          lastPaymentDate: pattern.dateRange.end,
          averageAmount: pattern.statistics.averageAmount,
          paymentsCount: pattern.paymentsAnalyzed,
        },
        daysUntil: Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      });
    }
  }
  
  return expected.sort((a, b) => 
    new Date(a.estimatedPaymentDate).getTime() - new Date(b.estimatedPaymentDate).getTime()
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

function calculateStdDev(values: number[]): number {
  return Math.sqrt(calculateVariance(values));
}

function classifyInterval(interval: number): PaymentFrequency {
  if (interval < 45) return 'monthly';
  if (interval < 110) return 'quarterly';
  if (interval < 250) return 'half-yearly';
  if (interval < 400) return 'yearly';
  return 'irregular';
}

function calculateAmountTrend(amounts: number[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
  if (amounts.length < 3) return 'stable';
  
  // Simple linear regression slope
  const n = amounts.length;
  const xMean = (n - 1) / 2;
  const yMean = amounts.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (amounts[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  
  // Calculate coefficient of variation
  const cv = calculateStdDev(amounts) / yMean;
  
  if (cv > 0.3) return 'volatile';
  if (Math.abs(slope) / yMean < 0.05) return 'stable';
  return slope > 0 ? 'increasing' : 'decreasing';
}

function calculateSeasonalConsistency(payments: DividendPaymentRecord[]): number {
  if (payments.length < 4) return 0;
  
  const months = payments.map(p => new Date(p.dateReceived).getMonth() + 1);
  const monthCounts = new Map<number, number>();
  
  months.forEach(month => {
    monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
  });
  
  // Calculate how consistent the months are
  const total = months.length;
  const expectedPerMonth = total / 12;
  
  let variance = 0;
  for (let i = 1; i <= 12; i++) {
    const count = monthCounts.get(i) || 0;
    variance += Math.pow(count - expectedPerMonth, 2);
  }
  
  // Normalize to 0-1 scale (1 = perfectly consistent)
  const maxVariance = total * total; // Worst case: all payments in same month
  return 1 - Math.sqrt(variance) / Math.sqrt(maxVariance);
}

function getPatternDescription(
  frequency: PaymentFrequency,
  seasonalPattern?: { months: number[]; description: string }
): string {
  if (seasonalPattern) {
    return `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} (${seasonalPattern.description})`;
  }
  
  const descriptions: Record<PaymentFrequency, string> = {
    monthly: 'Monthly Payments',
    quarterly: 'Quarterly Payments',
    'half-yearly': 'Half-Yearly Payments',
    yearly: 'Annual Payments',
    irregular: 'Irregular Payments',
    unknown: 'Unknown Pattern',
  };
  
  return descriptions[frequency];
}

function getMonthsForFrequency(frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'monthly': return 1;
    case 'quarterly': return 3;
    case 'half-yearly': return 6;
    case 'yearly': return 12;
    default: return 12;
  }
}

function generateHoldingId(asxCode: string | undefined, companyName: string): string {
  return asxCode || companyName.toUpperCase().trim().replace(/\s+/g, '_');
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Export pattern data as JSON
 */
export function exportPatternsToJSON(patterns: DividendPattern[]): string {
  return JSON.stringify(patterns, null, 2);
}

/**
 * Export pattern data as CSV
 */
export function exportPatternsToCSV(patterns: DividendPattern[]): string {
  const headers = [
    'Holding ID',
    'ASX Code',
    'Company Name',
    'Frequency',
    'Confidence',
    'Confidence Score',
    'Pattern',
    'Payments Analyzed',
    'Next Expected Date',
    'Next Expected Amount',
    'Pattern Stability',
  ];
  
  const rows = patterns.map(p => [
    p.id,
    p.asxCode || '',
    p.companyName,
    p.frequency,
    p.confidence,
    p.confidenceScore.toString(),
    p.detectedPattern,
    p.paymentsAnalyzed.toString(),
    p.nextExpectedPayment?.estimatedDate || '',
    p.nextExpectedPayment?.estimatedAmount.toFixed(2) || '',
    p.patternStability,
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Format pattern for display
 */
export function formatPatternSummary(pattern: DividendPattern): string {
  return `${pattern.companyName}: ${pattern.frequency} (${pattern.confidence} confidence, ${pattern.confidenceScore}%)`;
}

/**
 * Get human-readable frequency label
 */
export function getFrequencyLabel(frequency: PaymentFrequency): string {
  const labels: Record<PaymentFrequency, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    'half-yearly': 'Half-Yearly',
    yearly: 'Yearly',
    irregular: 'Irregular',
    unknown: 'Unknown',
  };

  return labels[frequency] || frequency;
}

/**
 * Get color class for confidence level
 */
export function getConfidenceColor(confidence: PatternConfidence): string {
  const colors: Record<PatternConfidence, string> = {
    high: 'text-green-600 dark:text-green-400 bg-green-500/10',
    medium: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    low: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
    uncertain: 'text-gray-600 dark:text-gray-400 bg-gray-500/10',
  };

  return colors[confidence];
}

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Generate test payment data for a specific pattern
 */
export function generateTestPayments(
  companyName: string,
  asxCode: string,
  frequency: PaymentFrequency,
  count: number,
  startDate: string = '2023-01-01'
): DividendPaymentRecord[] {
  const payments: DividendPaymentRecord[] = [];
  let currentDate = new Date(startDate);
  
  const baseAmount = 100;
  const intervalDays = FREQUENCY_THRESHOLDS[frequency as keyof typeof FREQUENCY_THRESHOLDS]?.target || 91;
  
  for (let i = 0; i < count; i++) {
    // Add some randomness to amount (±10%)
    const amount = baseAmount * (0.9 + Math.random() * 0.2);
    
    payments.push({
      id: i + 1,
      companyName,
      asxCode,
      dividendAmount: Math.round(amount * 100) / 100,
      frankingPercentage: 100,
      dateReceived: currentDate.toISOString().split('T')[0],
    });
    
    // Add some randomness to interval (±10 days)
    const actualInterval = intervalDays + Math.floor(Math.random() * 20) - 10;
    currentDate = new Date(currentDate.getTime() + actualInterval * 24 * 60 * 60 * 1000);
  }
  
  return payments;
}
