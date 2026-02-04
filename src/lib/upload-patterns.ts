/**
 * Missing Upload Pattern Detection Engine
 * 
 * Analyzes historical document uploads to detect patterns for:
 * - Bank statements (monthly patterns)
 * - Dividend statements (quarterly/half-yearly/yearly patterns)
 * - PAYG summaries (annual patterns)
 * 
 * @module upload-patterns
 */

// ============================================================================
// TYPES
// ============================================================================

/** Document types that can have upload patterns */
export type DocumentType = 'bank_statement' | 'dividend_statement' | 'payg_summary' | 'other';

/** Pattern frequency types */
export type PatternFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'irregular' | 'unknown';

/** Pattern confidence levels */
export type PatternConfidence = 'high' | 'medium' | 'low' | 'uncertain';

/** Individual document upload record */
export interface DocumentUploadRecord {
  id: string;
  documentType: DocumentType;
  source: string; // e.g., bank name, company name, employer name
  uploadDate: string; // ISO date string
  periodStart?: string; // For statements with periods
  periodEnd?: string;
  taxYear?: string;
  metadata?: Record<string, unknown>;
}

/** Detected pattern for a document source */
export interface DocumentPattern {
  id: string;
  documentType: DocumentType;
  source: string; // e.g., "Commonwealth Bank", "Telstra", "Company XYZ"
  sourceId?: string; // Optional ID reference
  
  // Pattern details
  frequency: PatternFrequency;
  confidence: PatternConfidence;
  confidenceScore: number; // 0-100
  
  // Expected timing
  expectedDayOfMonth?: number; // 1-31 for monthly patterns
  expectedMonths?: number[]; // 0-11 for quarterly/half-yearly/yearly
  
  // Analysis metadata
  analysisDate: string;
  uploadsAnalyzed: number;
  dateRange: {
    start: string;
    end: string;
  };
  
  // Pattern stability
  patternStability: 'stable' | 'changing' | 'volatile';
  patternChanges: PatternChange[];
  
  // Statistics
  statistics: PatternStatistics;
  
  // Next expected
  nextExpectedDate?: string;
  gracePeriodDays: number; // Days after expected date before flagging as missing
}

/** Pattern change record */
export interface PatternChange {
  id: string;
  changeDate: string;
  fromFrequency: PatternFrequency;
  toFrequency: PatternFrequency;
  reason?: string;
}

/** Pattern statistics */
export interface PatternStatistics {
  averageIntervalDays: number;
  intervalStdDev: number;
  minIntervalDays: number;
  maxIntervalDays: number;
  coefficientOfVariation: number;
  consistencyScore: number; // 0-1
}

/** Analysis result for a batch */
export interface PatternAnalysisResult {
  patterns: DocumentPattern[];
  analyzedAt: string;
  totalSources: number;
  patternsDetected: number;
  errors: string[];
}

/** Missing document detection result */
export interface MissingDocument {
  id: string;
  documentType: DocumentType;
  source: string;
  patternId: string;
  expectedDate: string;
  gracePeriodEnd: string;
  daysOverdue: number;
  isMissing: boolean; // True if past grace period
  confidence: PatternConfidence;
  lastUploadDate?: string;
  historicalUploads: number;
}

/** Expected document prediction */
export interface ExpectedDocument {
  id: string;
  documentType: DocumentType;
  source: string;
  patternId: string;
  estimatedArrivalDate: string;
  gracePeriodEnd: string;
  confidence: PatternConfidence;
  basedOn: {
    patternType: PatternFrequency;
    lastUploadDate: string;
    uploadsCount: number;
  };
  daysUntilExpected: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FREQUENCY_THRESHOLDS = {
  monthly: { min: 25, max: 40, target: 30 },
  quarterly: { min: 80, max: 100, target: 91 },
  half_yearly: { min: 170, max: 200, target: 182 },
  yearly: { min: 350, max: 380, target: 365 },
};

const MIN_UPLOADS_FOR_DETECTION: Record<PatternFrequency, number> = {
  monthly: 3,
  quarterly: 3,
  half_yearly: 2,
  yearly: 2,
  irregular: 3,
  unknown: 0,
};

const DEFAULT_GRACE_PERIOD_DAYS = 7;

const FREQUENCY_GRACE_PERIODS: Record<PatternFrequency, number> = {
  monthly: 5,
  quarterly: 10,
  half_yearly: 14,
  yearly: 21,
  irregular: 14,
  unknown: 7,
};

// ============================================================================
// PATTERN DETECTION
// ============================================================================

/**
 * Main pattern detection function
 * Analyzes document uploads and determines the upload frequency pattern
 */
export function detectPattern(
  documentType: DocumentType,
  source: string,
  uploads: DocumentUploadRecord[]
): DocumentPattern | null {
  if (!uploads || uploads.length === 0) {
    return null;
  }

  // Sort uploads by date
  const sorted = [...uploads].sort((a, b) => 
    new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Calculate intervals between uploads
  const intervals = calculateIntervals(sorted.map(u => new Date(u.uploadDate)));
  
  // Detect frequency based on document type and intervals
  const frequencyResult = detectFrequencyFromIntervals(intervals, sorted.length, documentType);
  
  // Detect expected timing (day of month, months)
  const timingPattern = detectTimingPattern(sorted, frequencyResult.frequency);
  
  // Calculate statistics
  const statistics = calculateStatistics(intervals);
  
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
  
  // Predict next expected date
  const nextExpectedDate = predictNextUploadDate(
    last.uploadDate,
    frequencyResult.frequency,
    timingPattern
  );

  // Determine grace period
  const gracePeriodDays = FREQUENCY_GRACE_PERIODS[frequencyResult.frequency];

  return {
    id: generatePatternId(documentType, source),
    documentType,
    source,
    frequency: frequencyResult.frequency,
    confidence,
    confidenceScore,
    expectedDayOfMonth: timingPattern.dayOfMonth,
    expectedMonths: timingPattern.months,
    analysisDate: new Date().toISOString(),
    uploadsAnalyzed: sorted.length,
    dateRange: {
      start: first.uploadDate,
      end: last.uploadDate,
    },
    patternStability,
    patternChanges,
    statistics,
    nextExpectedDate,
    gracePeriodDays,
  };
}

/**
 * Calculate intervals between consecutive uploads in days
 */
function calculateIntervals(dates: Date[]): number[] {
  const intervals: number[] = [];
  
  for (let i = 1; i < dates.length; i++) {
    const diff = dates[i].getTime() - dates[i - 1].getTime();
    intervals.push(Math.round(diff / (1000 * 60 * 60 * 24)));
  }
  
  return intervals;
}

/**
 * Detect frequency from intervals between uploads
 */
function detectFrequencyFromIntervals(
  intervals: number[],
  uploadCount: number,
  documentType: DocumentType
): { frequency: PatternFrequency; reason: string } {
  if (intervals.length === 0) {
    return { frequency: 'unknown', reason: 'Insufficient data' };
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Check against thresholds
  for (const [freq, thresholds] of Object.entries(FREQUENCY_THRESHOLDS)) {
    if (avgInterval >= thresholds.min && avgInterval <= thresholds.max) {
      const minUploads = MIN_UPLOADS_FOR_DETECTION[freq as PatternFrequency];
      if (uploadCount >= minUploads) {
        return { 
          frequency: freq as PatternFrequency, 
          reason: `Average interval ${avgInterval.toFixed(0)} days matches ${freq} pattern` 
        };
      }
    }
  }

  // Check for irregular pattern
  const stdDev = calculateStdDev(intervals);
  const cv = stdDev / avgInterval;
  
  if (cv > 0.5 && uploadCount >= MIN_UPLOADS_FOR_DETECTION.irregular) {
    return { frequency: 'irregular', reason: 'High variability in intervals' };
  }

  // Document type hints
  if (documentType === 'bank_statement' && uploadCount >= 3) {
    return { frequency: 'monthly', reason: 'Bank statements typically monthly' };
  }
  
  if (documentType === 'payg_summary' && uploadCount >= 1) {
    return { frequency: 'yearly', reason: 'PAYG summaries are annual' };
  }

  return { frequency: 'unknown', reason: 'Pattern unclear from available data' };
}

/**
 * Detect timing pattern (day of month, specific months)
 */
function detectTimingPattern(
  uploads: DocumentUploadRecord[],
  frequency: PatternFrequency
): { dayOfMonth?: number; months?: number[] } {
  const dates = uploads.map(u => new Date(u.uploadDate));
  
  // Calculate most common day of month
  const dayCounts: Record<number, number> = {};
  dates.forEach(d => {
    const day = d.getDate();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  
  const mostCommonDay = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  const dayOfMonth = mostCommonDay && parseInt(mostCommonDay[0]);
  
  // For quarterly/half-yearly/yearly, detect months
  let months: number[] | undefined;
  if (frequency === 'quarterly' || frequency === 'half_yearly' || frequency === 'yearly') {
    const monthCounts: Record<number, number> = {};
    dates.forEach(d => {
      const month = d.getMonth();
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    
    // Get months that appear more than once or represent clear pattern
    months = Object.entries(monthCounts)
      .filter(([_, count]) => count >= 1)
      .map(([month]) => parseInt(month))
      .sort((a, b) => a - b);
  }
  
  return { dayOfMonth, months };
}

/**
 * Calculate pattern statistics
 */
function calculateStatistics(intervals: number[]): PatternStatistics {
  if (intervals.length === 0) {
    return {
      averageIntervalDays: 0,
      intervalStdDev: 0,
      minIntervalDays: 0,
      maxIntervalDays: 0,
      coefficientOfVariation: 0,
      consistencyScore: 0,
    };
  }

  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const stdDev = calculateStdDev(intervals);
  const cv = stdDev / avg;
  
  // Consistency score: 1 - coefficient of variation (clamped to 0-1)
  const consistencyScore = Math.max(0, Math.min(1, 1 - cv));

  return {
    averageIntervalDays: Math.round(avg),
    intervalStdDev: Math.round(stdDev * 100) / 100,
    minIntervalDays: Math.min(...intervals),
    maxIntervalDays: Math.max(...intervals),
    coefficientOfVariation: Math.round(cv * 100) / 100,
    consistencyScore: Math.round(consistencyScore * 100) / 100,
  };
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Detect pattern changes over time
 */
function detectPatternChanges(
  uploads: DocumentUploadRecord[],
  intervals: number[]
): PatternChange[] {
  const changes: PatternChange[] = [];
  
  if (intervals.length < 4) return changes;
  
  // Look for significant changes in interval patterns
  const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
  const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  // If average interval changed significantly, record a pattern change
  if (Math.abs(secondAvg - firstAvg) / firstAvg > 0.3) {
    const changeDate = uploads[Math.floor(uploads.length / 2)].uploadDate;
    const fromFreq = categorizeInterval(firstAvg);
    const toFreq = categorizeInterval(secondAvg);
    
    if (fromFreq !== toFreq) {
      changes.push({
        id: generateChangeId(),
        changeDate,
        fromFrequency: fromFreq,
        toFrequency: toFreq,
        reason: `Interval changed from ${Math.round(firstAvg)} to ${Math.round(secondAvg)} days`,
      });
    }
  }
  
  return changes;
}

/**
 * Categorize an interval into a frequency
 */
function categorizeInterval(interval: number): PatternFrequency {
  for (const [freq, thresholds] of Object.entries(FREQUENCY_THRESHOLDS)) {
    if (interval >= thresholds.min && interval <= thresholds.max) {
      return freq as PatternFrequency;
    }
  }
  return 'irregular';
}

/**
 * Determine pattern stability
 */
function determinePatternStability(
  intervals: number[],
  changes: PatternChange[]
): DocumentPattern['patternStability'] {
  if (changes.length > 0) return 'changing';
  
  if (intervals.length < 3) return 'volatile';
  
  const cv = calculateStdDev(intervals) / (intervals.reduce((a, b) => a + b, 0) / intervals.length);
  
  if (cv < 0.2) return 'stable';
  if (cv < 0.5) return 'changing';
  return 'volatile';
}

/**
 * Calculate confidence score (0-100)
 */
function calculateConfidenceScore(
  frequency: PatternFrequency,
  uploadCount: number,
  intervals: number[],
  statistics: PatternStatistics
): number {
  let score = 0;
  
  // Base score from upload count
  const minUploads = MIN_UPLOADS_FOR_DETECTION[frequency] || 3;
  score += Math.min(30, (uploadCount / minUploads) * 30);
  
  // Consistency bonus
  score += statistics.consistencyScore * 40;
  
  // Frequency-specific bonuses
  if (frequency !== 'unknown' && frequency !== 'irregular') {
    score += 20;
  }
  
  // Penalty for high variability
  if (statistics.coefficientOfVariation > 0.5) {
    score -= 15;
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score: number): PatternConfidence {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'low';
  return 'uncertain';
}

/**
 * Predict next upload date based on pattern
 */
function predictNextUploadDate(
  lastUploadDate: string,
  frequency: PatternFrequency,
  timingPattern: { dayOfMonth?: number; months?: number[] }
): string | undefined {
  const lastDate = new Date(lastUploadDate);
  const now = new Date();
  
  let nextDate = new Date(lastDate);
  
  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'half_yearly':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'irregular':
      // Use average interval if available, otherwise default to 30 days
      nextDate.setDate(nextDate.getDate() + 30);
      break;
    default:
      return undefined;
  }
  
  // Adjust to expected day of month if known
  if (timingPattern.dayOfMonth && frequency !== 'irregular') {
    const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    nextDate.setDate(Math.min(timingPattern.dayOfMonth, maxDay));
  }
  
  // If next date is in the past, keep adding intervals until future
  while (nextDate < now) {
    switch (frequency) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'half_yearly':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 30);
    }
  }
  
  return nextDate.toISOString().split('T')[0];
}

// ============================================================================
// MISSING DOCUMENT DETECTION
// ============================================================================

/**
 * Detect missing documents based on patterns
 */
export function detectMissingDocuments(
  patterns: DocumentPattern[],
  recentUploads: DocumentUploadRecord[],
  asOfDate: Date = new Date()
): MissingDocument[] {
  const missing: MissingDocument[] = [];
  
  for (const pattern of patterns) {
    // Skip low confidence patterns
    if (pattern.confidence === 'uncertain') continue;
    
    // Check if we've already uploaded since the expected date
    const alreadyUploaded = recentUploads.some(upload => 
      upload.documentType === pattern.documentType &&
      upload.source === pattern.source &&
      pattern.nextExpectedDate &&
      new Date(upload.uploadDate) >= new Date(pattern.nextExpectedDate)
    );
    
    if (alreadyUploaded) continue;
    
    // Calculate expected and grace period dates
    const expectedDate = pattern.nextExpectedDate 
      ? new Date(pattern.nextExpectedDate) 
      : null;
    
    if (!expectedDate) continue;
    
    const gracePeriodEnd = new Date(expectedDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + pattern.gracePeriodDays);
    
    const daysOverdue = Math.max(0, Math.floor(
      (asOfDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
    ));
    
    const isMissing = asOfDate > gracePeriodEnd;
    
    // Only include if we're past the expected date (even if not yet missing)
    if (asOfDate >= expectedDate) {
      missing.push({
        id: generateMissingId(pattern.id),
        documentType: pattern.documentType,
        source: pattern.source,
        patternId: pattern.id,
        expectedDate: expectedDate.toISOString().split('T')[0],
        gracePeriodEnd: gracePeriodEnd.toISOString().split('T')[0],
        daysOverdue,
        isMissing,
        confidence: pattern.confidence,
        lastUploadDate: pattern.dateRange.end,
        historicalUploads: pattern.uploadsAnalyzed,
      });
    }
  }
  
  // Sort by days overdue (most overdue first)
  return missing.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Get expected upcoming documents
 */
export function getExpectedDocuments(
  patterns: DocumentPattern[],
  daysAhead: number = 30
): ExpectedDocument[] {
  const expected: ExpectedDocument[] = [];
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + daysAhead);
  
  for (const pattern of patterns) {
    if (!pattern.nextExpectedDate || pattern.confidence === 'uncertain') continue;
    
    const expectedDate = new Date(pattern.nextExpectedDate);
    
    if (expectedDate <= cutoff) {
      const daysUntil = Math.ceil(
        (expectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expected.push({
        id: generateExpectedId(pattern.id),
        documentType: pattern.documentType,
        source: pattern.source,
        patternId: pattern.id,
        estimatedArrivalDate: pattern.nextExpectedDate,
        gracePeriodEnd: new Date(expectedDate.getTime() + pattern.gracePeriodDays * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0],
        confidence: pattern.confidence,
        basedOn: {
          patternType: pattern.frequency,
          lastUploadDate: pattern.dateRange.end,
          uploadsCount: pattern.uploadsAnalyzed,
        },
        daysUntilExpected: Math.max(0, daysUntil),
      });
    }
  }
  
  // Sort by days until expected (soonest first)
  return expected.sort((a, b) => a.daysUntilExpected - b.daysUntilExpected);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique pattern ID
 */
function generatePatternId(documentType: DocumentType, source: string): string {
  const sanitized = source.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `pattern-${documentType}-${sanitized}-${Date.now()}`;
}

/**
 * Generate unique change ID
 */
function generateChangeId(): string {
  return `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique missing document ID
 */
function generateMissingId(patternId: string): string {
  return `missing-${patternId}-${Date.now()}`;
}

/**
 * Generate unique expected document ID
 */
function generateExpectedId(patternId: string): string {
  return `expected-${patternId}-${Date.now()}`;
}

/**
 * Group uploads by source
 */
export function groupUploadsBySource(
  uploads: DocumentUploadRecord[]
): Record<string, DocumentUploadRecord[]> {
  return uploads.reduce((groups, upload) => {
    const key = `${upload.documentType}:${upload.source}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(upload);
    return groups;
  }, {} as Record<string, DocumentUploadRecord[]>);
}

/**
 * Batch analyze patterns from grouped uploads
 */
export function analyzeUploadPatterns(
  groupedUploads: Record<string, DocumentUploadRecord[]>
): PatternAnalysisResult {
  const patterns: DocumentPattern[] = [];
  const errors: string[] = [];
  
  for (const [key, uploads] of Object.entries(groupedUploads)) {
    try {
      const [documentType, ...sourceParts] = key.split(':');
      const source = sourceParts.join(':'); // Reconstruct source in case it contained ':'
      
      const pattern = detectPattern(
        documentType as DocumentType,
        source,
        uploads
      );
      
      if (pattern) {
        patterns.push(pattern);
      }
    } catch (error) {
      errors.push(`Error analyzing ${key}: ${error}`);
    }
  }
  
  return {
    patterns,
    analyzedAt: new Date().toISOString(),
    totalSources: Object.keys(groupedUploads).length,
    patternsDetected: patterns.length,
    errors,
  };
}

/**
 * Get pattern label for display
 */
export function getFrequencyLabel(frequency: PatternFrequency): string {
  const labels: Record<PatternFrequency, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    half_yearly: 'Half-Yearly',
    yearly: 'Yearly',
    irregular: 'Irregular',
    unknown: 'Unknown',
  };
  return labels[frequency];
}

/**
 * Get document type label
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    bank_statement: 'Bank Statement',
    dividend_statement: 'Dividend Statement',
    payg_summary: 'PAYG Summary',
    other: 'Other',
  };
  return labels[type];
}

/**
 * Format expected date relative to now
 */
export function formatExpectedDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const daysDiff = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysDiff === 0) return 'Today';
  if (daysDiff === 1) return 'Tomorrow';
  if (daysDiff < 0) return `${Math.abs(daysDiff)} days ago`;
  if (daysDiff <= 7) return `In ${daysDiff} days`;
  
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}
