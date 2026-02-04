/**
 * WFH Expenses Library
 * Work From Home deduction calculations following ATO guidelines
 * Supports Fixed Rate, Actual Cost, and Shortcut methods
 */

// WFH Method Types
export type WfhMethod = 'fixed' | 'actual' | 'shortcut';

// ATO Rates (2023-24 onwards)
export const WFH_RATES = {
  fixed: {
    ratePerHour: 0.67, // 67 cents per hour (from 1 July 2023)
    description: 'Fixed Rate Method',
    recordKeeping: 'Timesheet or diary of hours worked',
  },
  shortcut: {
    ratePerHour: 0.80, // 80 cents per hour (temporary COVID rate, now extended)
    description: 'Shortcut Method',
    recordKeeping: 'Timesheet or diary of hours worked',
    note: 'All-inclusive: covers electricity, gas, cleaning, depreciation',
  },
  actual: {
    description: 'Actual Cost Method',
    recordKeeping: 'Detailed receipts for all expenses + floor area %',
  },
} as const;

// Expense Categories for Actual Cost Method
export interface WfhExpense {
  id: string;
  category: WfhExpenseCategory;
  description: string;
  amount: number;
  date: string;
  receiptUrl?: string;
}

export type WfhExpenseCategory =
  | 'electricity'
  | 'gas'
  | 'cleaning'
  | 'depreciation'
  | 'internet'
  | 'phone'
  | 'stationery'
  | 'furniture'
  | 'equipment'
  | 'other';

export const WFH_EXPENSE_CATEGORIES: Record<WfhExpenseCategory, { label: string; description: string; atoCode?: string }> = {
  electricity: {
    label: 'Electricity',
    description: 'Lighting, heating/cooling, computer equipment',
    atoCode: 'D5',
  },
  gas: {
    label: 'Gas',
    description: 'Heating for work area',
    atoCode: 'D5',
  },
  cleaning: {
    label: 'Cleaning',
    description: 'Dedicated work area cleaning costs',
    atoCode: 'D5',
  },
  depreciation: {
    label: 'Depreciation',
    description: 'Furniture, equipment over $300 (declining value)',
    atoCode: 'D6',
  },
  internet: {
    label: 'Internet',
    description: 'Work-related portion of internet costs',
    atoCode: 'D5',
  },
  phone: {
    label: 'Phone',
    description: 'Work-related calls and phone rental',
    atoCode: 'D5',
  },
  stationery: {
    label: 'Stationery',
    description: 'Printer paper, ink, pens, etc.',
    atoCode: 'D5',
  },
  furniture: {
    label: 'Furniture',
    description: 'Desk, chair, shelving (immediate deduction if ≤$300)',
    atoCode: 'D5',
  },
  equipment: {
    label: 'Equipment',
    description: 'Computer, monitor, keyboard (immediate if ≤$300)',
    atoCode: 'D5',
  },
  other: {
    label: 'Other',
    description: 'Other work-related home office expenses',
    atoCode: 'D5',
  },
};

// Work Area Types
export type WorkAreaType = 'dedicated' | 'shared' | 'multi-purpose';

export const WORK_AREA_TYPES: Record<WorkAreaType, { label: string; description: string }> = {
  dedicated: {
    label: 'Dedicated Room',
    description: 'A room used exclusively for work (e.g., home office)',
  },
  shared: {
    label: 'Shared Space',
    description: 'A specific work area in a shared room (e.g., desk in living room)',
  },
  'multi-purpose': {
    label: 'Multi-Purpose Area',
    description: 'Work in various areas (kitchen table, couch, etc.)',
  },
};

// Main WFH Workpaper State
export interface WfhWorkpaper {
  id: string;
  taxYear: string;
  workArea: {
    type: WorkAreaType;
    floorAreaSqm?: number;
    totalHomeAreaSqm?: number;
    description?: string;
  };
  hoursWorked: {
    regularHours: number; // Hours per week on average
    diaryRecords: DiaryEntry[];
    totalHoursForYear: number;
  };
  methods: {
    fixed: FixedMethodCalculation;
    shortcut: ShortcutMethodCalculation;
    actual: ActualMethodCalculation;
  };
  selectedMethod?: WfhMethod;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  hours: number;
  description?: string;
}

export interface FixedMethodCalculation {
  hoursWorked: number;
  ratePerHour: number;
  totalDeduction: number;
  additionalExpenses: number; // Phone, internet, stationery, depreciation
}

export interface ShortcutMethodCalculation {
  hoursWorked: number;
  ratePerHour: number;
  totalDeduction: number;
  note: string;
}

export interface ActualMethodCalculation {
  expenses: WfhExpense[];
  floorAreaPercentage: number;
  workRelatedPercentage: number;
  totalDeduction: number;
  breakdown: Record<WfhExpenseCategory, number>;
}

// Calculation Functions

/**
 * Calculate Fixed Rate Method deduction
 * 67 cents per hour + additional expenses
 */
export function calculateFixedMethod(
  hoursWorked: number,
  additionalExpenses: number = 0
): FixedMethodCalculation {
  const ratePerHour = WFH_RATES.fixed.ratePerHour;
  const baseDeduction = Math.round(hoursWorked * ratePerHour * 100) / 100;
  
  return {
    hoursWorked,
    ratePerHour,
    totalDeduction: Math.round((baseDeduction + additionalExpenses) * 100) / 100,
    additionalExpenses,
  };
}

/**
 * Calculate Shortcut Method deduction
 * 80 cents per hour (all-inclusive)
 */
export function calculateShortcutMethod(hoursWorked: number): ShortcutMethodCalculation {
  const ratePerHour = WFH_RATES.shortcut.ratePerHour;
  const totalDeduction = Math.round(hoursWorked * ratePerHour * 100) / 100;
  
  return {
    hoursWorked,
    ratePerHour,
    totalDeduction,
    note: 'All-inclusive rate: covers electricity, gas, cleaning, and depreciation',
  };
}

/**
 * Calculate Actual Cost Method deduction
 * Based on actual expenses with floor area percentage
 */
export function calculateActualMethod(
  expenses: WfhExpense[],
  floorAreaPercentage: number,
  workRelatedPercentage: number = 100
): ActualMethodCalculation {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const adjustedExpenses = totalExpenses * (floorAreaPercentage / 100) * (workRelatedPercentage / 100);
  
  const breakdown: Record<WfhExpenseCategory, number> = {
    electricity: 0,
    gas: 0,
    cleaning: 0,
    depreciation: 0,
    internet: 0,
    phone: 0,
    stationery: 0,
    furniture: 0,
    equipment: 0,
    other: 0,
  };
  
  expenses.forEach(expense => {
    const adjustedAmount = expense.amount * (floorAreaPercentage / 100) * (workRelatedPercentage / 100);
    breakdown[expense.category] += adjustedAmount;
  });
  
  // Round all values
  Object.keys(breakdown).forEach(key => {
    breakdown[key as WfhExpenseCategory] = Math.round(breakdown[key as WfhExpenseCategory] * 100) / 100;
  });
  
  return {
    expenses,
    floorAreaPercentage,
    workRelatedPercentage,
    totalDeduction: Math.round(adjustedExpenses * 100) / 100,
    breakdown,
  };
}

/**
 * Compare all three methods and recommend the best one
 */
export function compareMethods(
  fixed: FixedMethodCalculation,
  shortcut: ShortcutMethodCalculation,
  actual: ActualMethodCalculation
): {
  recommended: WfhMethod;
  comparison: { method: WfhMethod; amount: number; difference: number }[];
  explanation: string;
} {
  const methods = [
    { method: 'fixed' as WfhMethod, amount: fixed.totalDeduction },
    { method: 'shortcut' as WfhMethod, amount: shortcut.totalDeduction },
    { method: 'actual' as WfhMethod, amount: actual.totalDeduction },
  ];
  
  // Sort by amount descending
  methods.sort((a, b) => b.amount - a.amount);
  
  const maxAmount = methods[0].amount;
  const comparison = methods.map(m => ({
    method: m.method,
    amount: m.amount,
    difference: Math.round((maxAmount - m.amount) * 100) / 100,
  }));
  
  const recommended = methods[0].method;
  
  let explanation = '';
  switch (recommended) {
    case 'fixed':
      explanation = 'The Fixed Rate Method gives you the highest deduction. You can claim 67¢ per hour plus separate deductions for phone, internet, and depreciation.';
      break;
    case 'shortcut':
      explanation = 'The Shortcut Method gives you the highest deduction with the simplest record-keeping. The 80¢ rate covers all expenses.';
      break;
    case 'actual':
      explanation = 'The Actual Cost Method gives you the highest deduction based on your specific expenses. This works best when you have significant home office costs.';
      break;
  }
  
  return {
    recommended,
    comparison,
    explanation,
  };
}

/**
 * Generate ATO-compliant workpaper summary
 */
export function generateWfhSummary(workpaper: WfhWorkpaper): string {
  const method = workpaper.selectedMethod;
  if (!method) return 'No method selected';
  
  const calc = workpaper.methods[method];
  let summary = `WORK FROM HOME DEDUCTIONS - ${workpaper.taxYear}\n`;
  summary += `================================\n\n`;
  summary += `Work Area: ${WORK_AREA_TYPES[workpaper.workArea.type].label}\n`;
  if (workpaper.workArea.floorAreaSqm) {
    summary += `Floor Area: ${workpaper.workArea.floorAreaSqm}m²`;
    if (workpaper.workArea.totalHomeAreaSqm) {
      summary += ` of ${workpaper.workArea.totalHomeAreaSqm}m² total`;
    }
    summary += '\n';
  }
  summary += `\nMethod Used: ${WFH_RATES[method].description.toUpperCase()}\n`;
  summary += `Hours Worked: ${workpaper.hoursWorked.totalHoursForYear}\n`;
  
  if (method === 'fixed') {
    const fixed = calc as FixedMethodCalculation;
    summary += `Rate: ${formatCurrency(fixed.ratePerHour)}/hour\n`;
    summary += `Base Deduction: ${formatCurrency(fixed.totalDeduction - fixed.additionalExpenses)}\n`;
    if (fixed.additionalExpenses > 0) {
      summary += `Additional Expenses: ${formatCurrency(fixed.additionalExpenses)}\n`;
    }
    summary += `\nTOTAL DEDUCTION: ${formatCurrency(fixed.totalDeduction)}\n`;
  } else if (method === 'shortcut') {
    const shortcut = calc as ShortcutMethodCalculation;
    summary += `Rate: ${formatCurrency(shortcut.ratePerHour)}/hour\n`;
    summary += `\nTOTAL DEDUCTION: ${formatCurrency(shortcut.totalDeduction)}\n`;
    summary += `\nNote: ${shortcut.note}\n`;
  } else {
    const actual = calc as ActualMethodCalculation;
    summary += `Floor Area %: ${actual.floorAreaPercentage}%\n`;
    summary += `Work-Related %: ${actual.workRelatedPercentage}%\n\n`;
    summary += `Expense Breakdown:\n`;
    Object.entries(actual.breakdown).forEach(([category, amount]) => {
      if (amount > 0) {
        summary += `  ${WFH_EXPENSE_CATEGORIES[category as WfhExpenseCategory].label}: ${formatCurrency(amount)}\n`;
      }
    });
    summary += `\nTOTAL DEDUCTION: ${formatCurrency(actual.totalDeduction)}\n`;
  }
  
  if (workpaper.notes) {
    summary += `\nNotes: ${workpaper.notes}\n`;
  }
  
  return summary;
}

// Helper function for currency formatting
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

// Validation functions
export function validateWfhWorkpaper(workpaper: WfhWorkpaper): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!workpaper.workArea.type) {
    errors.push('Work area type is required');
  }
  
  if (workpaper.hoursWorked.totalHoursForYear <= 0) {
    errors.push('Hours worked must be greater than 0');
  }
  
  if (workpaper.hoursWorked.totalHoursForYear > 8760) {
    errors.push('Hours worked exceeds maximum possible (8760 hours in a year)');
  }
  
  if (!workpaper.selectedMethod) {
    errors.push('Please select a calculation method');
  }
  
  // Validate actual method requirements
  if (workpaper.selectedMethod === 'actual') {
    if (!workpaper.workArea.floorAreaSqm || !workpaper.workArea.totalHomeAreaSqm) {
      errors.push('Actual cost method requires floor area measurements');
    }
    const actual = workpaper.methods.actual;
    if (actual.expenses.length === 0) {
      errors.push('Actual cost method requires at least one expense');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Create empty workpaper
export function createEmptyWfhWorkpaper(taxYear: string): WfhWorkpaper {
  const now = new Date().toISOString();
  return {
    id: `wfh-${Date.now()}`,
    taxYear,
    workArea: {
      type: 'shared',
    },
    hoursWorked: {
      regularHours: 0,
      diaryRecords: [],
      totalHoursForYear: 0,
    },
    methods: {
      fixed: {
        hoursWorked: 0,
        ratePerHour: WFH_RATES.fixed.ratePerHour,
        totalDeduction: 0,
        additionalExpenses: 0,
      },
      shortcut: {
        hoursWorked: 0,
        ratePerHour: WFH_RATES.shortcut.ratePerHour,
        totalDeduction: 0,
        note: WFH_RATES.shortcut.note,
      },
      actual: {
        expenses: [],
        floorAreaPercentage: 0,
        workRelatedPercentage: 100,
        totalDeduction: 0,
        breakdown: {
          electricity: 0,
          gas: 0,
          cleaning: 0,
          depreciation: 0,
          internet: 0,
          phone: 0,
          stationery: 0,
          furniture: 0,
          equipment: 0,
          other: 0,
        },
      },
    },
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}
