/**
 * Income Dashboard Library
 * Centralized income tracking and projections
 */

export type IncomeType = 
  | 'salary'
  | 'dividends'
  | 'interest'
  | 'rental'
  | 'freelance'
  | 'capital_gains'
  | 'government'
  | 'other';

export interface IncomeEntry {
  id: string;
  type: IncomeType;
  source: string; // Employer name, bank name, property address, etc.
  amount: number;
  date: string;
  taxYear: string;
  // Type-specific fields
  frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually' | 'one-time';
  // For salary
  employerAbn?: string;
  // For dividends
  sharesHeld?: number;
  dividendPerShare?: number;
  franked?: boolean;
  frankingCredits?: number;
  // For interest
  accountNumber?: string;
  // For rental
  propertyAddress?: string;
  // For capital gains
  assetName?: string;
  purchaseDate?: string;
  // Metadata
  isProjected: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeSource {
  id: string;
  type: IncomeType;
  name: string;
  description?: string;
  // Expected/patterned income
  expectedAmount?: number;
  expectedFrequency?: IncomeEntry['frequency'];
  // YTD tracking
  totalReceived: number;
  lastPaymentDate?: string;
  nextExpectedDate?: string;
  // Status
  isActive: boolean;
}

export interface IncomeSummary {
  taxYear: string;
  // Totals by type
  byType: Record<IncomeType, {
    total: number;
    count: number;
    sources: string[];
  }>;
  // Overall totals
  totalIncome: number;
  taxableIncome: number;
  // Projections
  projectedAnnual: number;
  ytdProgress: number; // 0-100%
  // Comparisons
  monthOverMonth: number; // percentage change
  yearOverYear: number; // percentage change
}

export interface MonthlyIncome {
  month: string; // YYYY-MM
  total: number;
  byType: Partial<Record<IncomeType, number>>;
}

// Income type metadata
export const INCOME_TYPE_METADATA: Record<IncomeType, {
  label: string;
  description: string;
  icon: string;
  color: string;
  taxable: boolean;
  commonSources: string[];
}> = {
  salary: {
    label: 'Salary & Wages',
    description: 'Employment income including bonuses and commissions',
    icon: 'Briefcase',
    color: '#22c55e',
    taxable: true,
    commonSources: ['Primary employer', 'Secondary job', 'Casual work'],
  },
  dividends: {
    label: 'Dividends',
    description: 'Share dividend payments including franking credits',
    icon: 'TrendingUp',
    color: '#3b82f6',
    taxable: true,
    commonSources: ['Australian shares', 'International shares', 'ETFs'],
  },
  interest: {
    label: 'Interest',
    description: 'Bank interest from savings accounts and term deposits',
    icon: 'Landmark',
    color: '#f59e0b',
    taxable: true,
    commonSources: ['High interest savings', 'Term deposits', 'Bonds'],
  },
  rental: {
    label: 'Rental Income',
    description: 'Income from investment properties',
    icon: 'Home',
    color: '#8b5cf6',
    taxable: true,
    commonSources: ['Residential property', 'Commercial property'],
  },
  freelance: {
    label: 'Freelance & Business',
    description: 'Self-employment and business income',
    icon: 'User',
    color: '#ec4899',
    taxable: true,
    commonSources: ['Consulting', 'Contracting', 'Side business'],
  },
  capital_gains: {
    label: 'Capital Gains',
    description: 'Profits from selling assets like shares or property',
    icon: 'BarChart3',
    color: '#ef4444',
    taxable: true,
    commonSources: ['Share sales', 'Property sales', 'Crypto sales'],
  },
  government: {
    label: 'Government Payments',
    description: 'Centrelink and other government benefits',
    icon: 'Building2',
    color: '#06b6d4',
    taxable: false,
    commonSources: ['JobSeeker', 'Age Pension', 'Family Tax Benefit'],
  },
  other: {
    label: 'Other Income',
    description: 'Miscellaneous income sources',
    icon: 'MoreHorizontal',
    color: '#6b7280',
    taxable: true,
    commonSources: ['Gifts', 'Inheritance', 'Prizes'],
  },
};

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get current tax year
export function getCurrentTaxYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  // Tax year runs July 1 - June 30
  if (month >= 6) { // July or later
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

// Calculate income summary
export function calculateIncomeSummary(
  entries: IncomeEntry[],
  taxYear: string
): IncomeSummary {
  const yearEntries = entries.filter(e => e.taxYear === taxYear);
  
  const byType = {} as IncomeSummary['byType'];
  
  // Initialize all types
  (Object.keys(INCOME_TYPE_METADATA) as IncomeType[]).forEach(type => {
    byType[type] = { total: 0, count: 0, sources: [] };
  });
  
  let totalIncome = 0;
  let taxableIncome = 0;
  
  yearEntries.forEach(entry => {
    byType[entry.type].total += entry.amount;
    byType[entry.type].count += 1;
    if (!byType[entry.type].sources.includes(entry.source)) {
      byType[entry.type].sources.push(entry.source);
    }
    
    totalIncome += entry.amount;
    if (INCOME_TYPE_METADATA[entry.type].taxable) {
      taxableIncome += entry.amount;
    }
  });
  
  // Calculate projection based on current progress
  const now = new Date();
  const taxYearStart = new Date(`${taxYear.split('-')[0]}-07-01`);
  const taxYearEnd = new Date(`${parseInt(taxYear.split('-')[0]) + 1}-06-30`);
  
  const totalDays = (taxYearEnd.getTime() - taxYearStart.getTime()) / (1000 * 60 * 60 * 24);
  const daysElapsed = Math.max(0, (now.getTime() - taxYearStart.getTime()) / (1000 * 60 * 60 * 24));
  const ytdProgress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  
  const projectedAnnual = ytdProgress > 0 ? (totalIncome / ytdProgress) * 100 : 0;
  
  return {
    taxYear,
    byType,
    totalIncome,
    taxableIncome,
    projectedAnnual,
    ytdProgress,
    monthOverMonth: 0, // Would need historical data
    yearOverYear: 0, // Would need previous year data
  };
}

// Group entries by month
export function groupByMonth(entries: IncomeEntry[]): MonthlyIncome[] {
  const monthMap = new Map<string, { total: number; byType: Partial<Record<IncomeType, number>> }>();
  
  entries.forEach(entry => {
    const month = entry.date.slice(0, 7); // YYYY-MM
    if (!monthMap.has(month)) {
      monthMap.set(month, { total: 0, byType: {} });
    }
    const monthData = monthMap.get(month)!;
    monthData.total += entry.amount;
    monthData.byType[entry.type] = (monthData.byType[entry.type] || 0) + entry.amount;
  });
  
  return Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      total: data.total,
      byType: data.byType,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// Get income sources from entries
export function getIncomeSources(entries: IncomeEntry[]): IncomeSource[] {
  const sourceMap = new Map<string, IncomeSource>();
  
  entries.forEach(entry => {
    const key = `${entry.type}-${entry.source}`;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        id: generateId(),
        type: entry.type,
        name: entry.source,
        totalReceived: 0,
        isActive: true,
      });
    }
    const source = sourceMap.get(key)!;
    source.totalReceived += entry.amount;
    if (!source.lastPaymentDate || entry.date > source.lastPaymentDate) {
      source.lastPaymentDate = entry.date;
    }
  });
  
  return Array.from(sourceMap.values());
}

// Create new income entry
export function createIncomeEntry(
  data: Omit<IncomeEntry, 'id' | 'createdAt' | 'updatedAt'>
): IncomeEntry {
  const now = new Date().toISOString();
  return {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
}

// Estimate next payment date based on frequency
export function estimateNextPayment(
  lastDate: string,
  frequency: IncomeEntry['frequency']
): string {
  const last = new Date(lastDate);
  const next = new Date(last);
  
  switch (frequency) {
    case 'weekly':
      next.setDate(last.getDate() + 7);
      break;
    case 'fortnightly':
      next.setDate(last.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(last.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(last.getMonth() + 3);
      break;
    case 'annually':
      next.setFullYear(last.getFullYear() + 1);
      break;
    default:
      return '';
  }
  
  return next.toISOString().split('T')[0];
}

// Export income data
export function exportIncomeData(entries: IncomeEntry[], taxYear: string): string {
  const yearEntries = entries.filter(e => e.taxYear === taxYear);
  const summary = calculateIncomeSummary(entries, taxYear);
  
  const exportData = {
    taxYear,
    exportedAt: new Date().toISOString(),
    summary: {
      totalIncome: summary.totalIncome,
      taxableIncome: summary.taxableIncome,
      byType: summary.byType,
    },
    entries: yearEntries.sort((a, b) => a.date.localeCompare(b.date)),
  };
  
  return JSON.stringify(exportData, null, 2);
}

// Generate CSV export
export function generateIncomeCSV(entries: IncomeEntry[]): string {
  const headers = [
    'Date',
    'Type',
    'Source',
    'Amount',
    'Frequency',
    'Tax Year',
    'Projected',
    'Notes',
  ];
  
  const rows = entries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(entry => [
      entry.date,
      INCOME_TYPE_METADATA[entry.type].label,
      entry.source,
      entry.amount.toFixed(2),
      entry.frequency || '',
      entry.taxYear,
      entry.isProjected ? 'Yes' : 'No',
      entry.notes || '',
    ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
