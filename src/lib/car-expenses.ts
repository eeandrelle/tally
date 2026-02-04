/**
 * D1 Car Expenses Workpaper Library
 * Supports both Logbook Method and Cents-per-Kilometre Method
 * 
 * ATO 2024-25 Rates:
 * - Cents per km: 78c per km (up to 5,000 work km)
 * - Logbook method: Actual expenses × business use percentage
 */

export interface LogbookEntry {
  id: string;
  startDate: string;
  endDate: string;
  startOdometer: number;
  endOdometer: number;
  totalKms: number;
  businessKms: number;
  businessPercentage: number;
  purpose: string;
}

export interface CarExpense {
  id: string;
  date: string;
  description: string;
  category: 'fuel' | 'registration' | 'insurance' | 'maintenance' | 'depreciation' | 'interest' | 'leasing' | 'other';
  amount: number;
  receiptUrl?: string;
}

export interface CentsPerKmCalculation {
  workKilometres: number;
  rate: number; // cents per km
  maxKilometres: number;
  claimableKilometres: number;
  totalClaim: number;
}

export interface LogbookMethodCalculation {
  logbookPeriod: {
    startDate: string;
    endDate: string;
    totalWeeks: number;
  };
  totalExpenses: number;
  businessUsePercentage: number;
  businessPortionClaim: number;
  odometerRecords: {
    startOfYear: number;
    endOfYear: number;
    totalKms: number;
  };
}

export interface CarExpenseWorkpaper {
  id: string;
  taxYear: string;
  vehicleDescription: string;
  registrationNumber?: string;
  engineCapacity?: 'small' | 'medium' | 'large'; // For cents per km reference only
  selectedMethod: 'cents-per-km' | 'logbook' | null;
  
  // Cents per km method
  centsPerKmData?: {
    workKilometres: number;
    reasonForClaim: string;
  };
  
  // Logbook method
  logbookData?: {
    entries: LogbookEntry[];
    expenses: CarExpense[];
    odometerStartOfYear: number;
    odometerEndOfYear: number;
  };
  
  createdAt: string;
  updatedAt: string;
}

// ATO 2024-25 Cents per kilometre rate
export const CENTS_PER_KM_RATE = 0.78; // $0.78 per km
export const MAX_CENTS_PER_KM_KILOMETRES = 5000;

// Car expense categories with ATO descriptions
export const CAR_EXPENSE_CATEGORIES = {
  fuel: {
    label: 'Fuel and Oil',
    atoDescription: 'Fuel, oil, and lubricant costs',
    icon: 'Fuel',
  },
  registration: {
    label: 'Registration',
    atoDescription: 'Vehicle registration fees',
    icon: 'FileCheck',
  },
  insurance: {
    label: 'Insurance',
    atoDescription: 'Comprehensive, third party, and other vehicle insurance',
    icon: 'Shield',
  },
  maintenance: {
    label: 'Repairs & Maintenance',
    atoDescription: 'Servicing, repairs, tyres, and maintenance',
    icon: 'Wrench',
  },
  depreciation: {
    label: 'Depreciation',
    atoDescription: 'Decline in value of the vehicle (capital costs)',
    icon: 'TrendingDown',
  },
  interest: {
    label: 'Loan Interest',
    atoDescription: 'Interest on car loan or finance',
    icon: 'Percent',
  },
  leasing: {
    label: 'Lease Payments',
    atoDescription: 'Operating lease or hire purchase payments',
    icon: 'CreditCard',
  },
  other: {
    label: 'Other',
    atoDescription: 'Other car-related expenses',
    icon: 'MoreHorizontal',
  },
} as const;

export type CarExpenseCategory = keyof typeof CAR_EXPENSE_CATEGORIES;

/**
 * Calculate cents-per-kilometre claim
 */
export function calculateCentsPerKmClaim(workKilometres: number): CentsPerKmCalculation {
  const claimableKilometres = Math.min(workKilometres, MAX_CENTS_PER_KM_KILOMETRES);
  return {
    workKilometres,
    rate: CENTS_PER_KM_RATE * 100, // Convert to cents for display
    maxKilometres: MAX_CENTS_PER_KM_KILOMETRES,
    claimableKilometres,
    totalClaim: claimableKilometres * CENTS_PER_KM_RATE,
  };
}

/**
 * Calculate business use percentage from logbook entry
 */
export function calculateBusinessPercentage(entry: Omit<LogbookEntry, 'id' | 'businessPercentage'>): number {
  if (entry.totalKms === 0) return 0;
  return Math.round((entry.businessKms / entry.totalKms) * 100 * 100) / 100; // 2 decimal places
}

/**
 * Calculate total business use percentage across all logbook entries
 */
export function calculateTotalBusinessPercentage(entries: LogbookEntry[]): number {
  if (entries.length === 0) return 0;
  
  const totalKms = entries.reduce((sum, e) => sum + e.totalKms, 0);
  const totalBusinessKms = entries.reduce((sum, e) => sum + e.businessKms, 0);
  
  if (totalKms === 0) return 0;
  return Math.round((totalBusinessKms / totalKms) * 100 * 100) / 100;
}

/**
 * Calculate total expenses by category
 */
export function calculateExpensesByCategory(expenses: CarExpense[]): Record<CarExpenseCategory, number> {
  const totals = {
    fuel: 0,
    registration: 0,
    insurance: 0,
    maintenance: 0,
    depreciation: 0,
    interest: 0,
    leasing: 0,
    other: 0,
  };
  
  expenses.forEach(expense => {
    totals[expense.category] += expense.amount;
  });
  
  return totals;
}

/**
 * Calculate total of all car expenses
 */
export function calculateTotalExpenses(expenses: CarExpense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Calculate logbook method claim
 */
export function calculateLogbookMethodClaim(
  entries: LogbookEntry[],
  expenses: CarExpense[],
  odometerStartOfYear: number,
  odometerEndOfYear: number
): LogbookMethodCalculation {
  const totalExpenses = calculateTotalExpenses(expenses);
  const businessUsePercentage = calculateTotalBusinessPercentage(entries);
  const businessPortionClaim = totalExpenses * (businessUsePercentage / 100);
  
  // Calculate logbook period
  let startDate = '';
  let endDate = '';
  let totalWeeks = 0;
  
  if (entries.length > 0) {
    const dates = entries.map(e => new Date(e.startDate));
    const endDates = entries.map(e => new Date(e.endDate));
    startDate = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0];
    endDate = new Date(Math.max(...endDates.map(d => d.getTime()))).toISOString().split('T')[0];
    
    const msPerWeek = 1000 * 60 * 60 * 24 * 7;
    totalWeeks = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerWeek);
  }
  
  return {
    logbookPeriod: {
      startDate,
      endDate,
      totalWeeks,
    },
    totalExpenses,
    businessUsePercentage,
    businessPortionClaim,
    odometerRecords: {
      startOfYear: odometerStartOfYear,
      endOfYear: odometerEndOfYear,
      totalKms: odometerEndOfYear - odometerStartOfYear,
    },
  };
}

/**
 * Compare both methods and recommend the best one
 */
export interface MethodComparison {
  centsPerKm: {
    claim: number;
    workKilometres: number;
    maxKilometres: number;
  };
  logbook: {
    claim: number;
    totalExpenses: number;
    businessPercentage: number;
    entriesCount: number;
  };
  recommended: 'cents-per-km' | 'logbook';
  difference: number;
  reasoning: string;
}

export function compareMethods(
  workKilometres: number,
  logbookEntries: LogbookEntry[],
  expenses: CarExpense[],
  odometerStartOfYear: number,
  odometerEndOfYear: number
): MethodComparison {
  const centsPerKmResult = calculateCentsPerKmClaim(workKilometres);
  const logbookResult = calculateLogbookMethodClaim(
    logbookEntries,
    expenses,
    odometerStartOfYear,
    odometerEndOfYear
  );
  
  const centsPerKmClaim = centsPerKmResult.totalClaim;
  const logbookClaim = logbookResult.businessPortionClaim;
  
  const recommended = logbookClaim > centsPerKmClaim ? 'logbook' : 'cents-per-km';
  const difference = Math.abs(logbookClaim - centsPerKmClaim);
  
  let reasoning = '';
  if (recommended === 'logbook') {
    reasoning = `The logbook method gives you a larger deduction of $${logbookClaim.toFixed(2)} compared to $${centsPerKmClaim.toFixed(2)} with cents per km. This is because your actual car expenses ($${logbookResult.totalExpenses.toFixed(2)}) with ${logbookResult.businessUsePercentage.toFixed(1)}% business use exceed the standard rate.`;
  } else {
    if (workKilometres >= MAX_CENTS_PER_KM_KILOMETRES) {
      reasoning = `The cents per km method gives you the maximum deduction of $${centsPerKmClaim.toFixed(2)} (capped at ${MAX_CENTS_PER_KM_KILOMETRES.toLocaleString()} km). To potentially claim more, you'd need to use the logbook method with actual expenses.`;
    } else {
      reasoning = `The cents per km method gives you a deduction of $${centsPerKmClaim.toFixed(2)} based on your ${workKilometres} work kilometres. This is simpler and gives you a better result than the logbook method ($${logbookClaim.toFixed(2)}).`;
    }
  }
  
  return {
    centsPerKm: {
      claim: centsPerKmClaim,
      workKilometres,
      maxKilometres: MAX_CENTS_PER_KM_KILOMETRES,
    },
    logbook: {
      claim: logbookClaim,
      totalExpenses: logbookResult.totalExpenses,
      businessPercentage: logbookResult.businessUsePercentage,
      entriesCount: logbookEntries.length,
    },
    recommended,
    difference,
    reasoning,
  };
}

/**
 * Generate work kilometres estimate based on common work trip patterns
 */
export interface WorkTripPattern {
  description: string;
  daysPerWeek: number;
  weeksPerYear: number;
  kilometresPerTrip: number;
}

export function calculateWorkKilometresFromPatterns(patterns: WorkTripPattern[]): number {
  return patterns.reduce((total, pattern) => {
    return total + (pattern.daysPerWeek * pattern.weeksPerYear * pattern.kilometresPerTrip);
  }, 0);
}

/**
 * Validate if logbook meets ATO requirements
 */
export interface LogbookValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateLogbook(entries: LogbookEntry[]): LogbookValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (entries.length === 0) {
    errors.push('At least one logbook entry is required');
  }
  
  // Check minimum 12-week period
  if (entries.length > 0) {
    const dates = entries.map(e => new Date(e.startDate));
    const endDates = entries.map(e => new Date(e.endDate));
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...endDates.map(d => d.getTime())));
    const weeksDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
    
    if (weeksDiff < 12) {
      errors.push(`Logbook period must be at least 12 continuous weeks (currently ${Math.floor(weeksDiff)} weeks)`);
    }
    
    if (weeksDiff > 16) {
      warnings.push('Logbook period exceeds 16 weeks - this is fine but not required');
    }
  }
  
  // Check each entry has required fields
  entries.forEach((entry, index) => {
    if (!entry.purpose || entry.purpose.trim() === '') {
      errors.push(`Entry ${index + 1}: Business purpose is required`);
    }
    if (entry.businessKms > entry.totalKms) {
      errors.push(`Entry ${index + 1}: Business kilometres cannot exceed total kilometres`);
    }
    if (entry.totalKms !== entry.endOdometer - entry.startOdometer) {
      warnings.push(`Entry ${index + 1}: Odometer readings don't match total kilometres`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Export workpaper data for tax filing
 */
export interface WorkpaperExport {
  taxYear: string;
  category: 'D1';
  categoryName: string;
  method: 'cents-per-km' | 'logbook';
  claimAmount: number;
  supportingDocuments: {
    logbookEntries?: number;
    receipts?: number;
    odometerRecords?: boolean;
  };
  calculations: CentsPerKmCalculation | LogbookMethodCalculation;
}

export function exportWorkpaper(workpaper: CarExpenseWorkpaper): WorkpaperExport | null {
  if (!workpaper.selectedMethod) return null;
  
  let claimAmount = 0;
  let calculations: CentsPerKmCalculation | LogbookMethodCalculation;
  
  if (workpaper.selectedMethod === 'cents-per-km' && workpaper.centsPerKmData) {
    const result = calculateCentsPerKmClaim(workpaper.centsPerKmData.workKilometres);
    claimAmount = result.totalClaim;
    calculations = result;
  } else if (workpaper.selectedMethod === 'logbook' && workpaper.logbookData) {
    const result = calculateLogbookMethodClaim(
      workpaper.logbookData.entries,
      workpaper.logbookData.expenses,
      workpaper.logbookData.odometerStartOfYear,
      workpaper.logbookData.odometerEndOfYear
    );
    claimAmount = result.businessPortionClaim;
    calculations = result;
  } else {
    return null;
  }
  
  return {
    taxYear: workpaper.taxYear,
    category: 'D1',
    categoryName: 'Work-related car expenses',
    method: workpaper.selectedMethod,
    claimAmount,
    supportingDocuments: {
      logbookEntries: workpaper.logbookData?.entries.length,
      receipts: workpaper.logbookData?.expenses.length,
      odometerRecords: !!workpaper.logbookData?.odometerStartOfYear && !!workpaper.logbookData?.odometerEndOfYear,
    },
    calculations,
  };
}
