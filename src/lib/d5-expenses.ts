/**
 * D5 Other Work-Related Expenses Library
 * 
 * ATO Category D5: Other work-related expenses
 * Covers: Phone, internet, home office running costs, union fees, 
 * subscriptions, technical publications, tools, and other work expenses
 */

export type D5ExpenseType = 
  | 'phone'
  | 'internet'
  | 'home-office-running'
  | 'union-fees'
  | 'subscriptions'
  | 'publications'
  | 'tools-equipment'
  | 'protective-items'
  | 'briefcase'
  | 'stationery'
  | 'other';

export type D5ClaimMethod = 'actual' | 'estimate' | 'apportioned';

export interface D5Expense {
  id: string;
  type: D5ExpenseType;
  description: string;
  amount: number;
  method: D5ClaimMethod;
  workRelatedPercentage: number; // 0-100
  receiptId?: string;
  receiptUrl?: string;
  date?: string;
  notes?: string;
  apportionmentReason?: string; // e.g., "50% work use"
}

export interface D5Workpaper {
  taxYear: string;
  expenses: D5Expense[];
  notes?: string;
  lastModified: string;
}

export interface D5Summary {
  total: number;
  byType: Record<D5ExpenseType, { total: number; count: number }>;
  count: number;
  receiptCoverage: number;
}

export const D5_EXPENSE_TYPES: Record<D5ExpenseType, { 
  label: string; 
  description: string;
  examples: string[];
  defaultApportionment?: number;
  atoGuidance?: string;
}> = {
  'phone': {
    label: 'Phone Expenses',
    description: 'Work-related phone calls and phone rental',
    examples: ['Mobile phone bills', 'Landline rental', 'Work calls'],
    defaultApportionment: 50,
    atoGuidance: 'You can claim a deduction for phone expenses if you use your phone for work. You must apportion costs between work and private use.',
  },
  'internet': {
    label: 'Internet Expenses',
    description: 'Work-related internet usage',
    examples: ['Home internet', 'Mobile data', 'Wi-Fi hotspot'],
    defaultApportionment: 25,
    atoGuidance: 'If you work from home and use the internet, you can claim a portion based on work use. Keep a diary for 4 weeks to establish your work percentage.',
  },
  'home-office-running': {
    label: 'Home Office Running Costs',
    description: 'Non-WFH home office expenses (not using fixed rate)',
    examples: ['Electricity for office', 'Gas heating', 'Office cleaning', 'Office repairs'],
    defaultApportionment: 10,
    atoGuidance: 'For home office running costs NOT claimed via the fixed rate method. Calculate based on floor area percentage and usage hours.',
  },
  'union-fees': {
    label: 'Union & Association Fees',
    description: 'Union fees and professional association subscriptions',
    examples: ['Union membership', 'Professional body fees', 'Industry association', 'Registration fees'],
    atoGuidance: 'You can claim a deduction for union fees and subscriptions to trade, business or professional associations.',
  },
  'subscriptions': {
    label: 'Subscriptions',
    description: 'Work-related subscriptions',
    examples: ['Software subscriptions', 'Professional tools', 'Online services', 'Cloud storage'],
    atoGuidance: 'Subscriptions to work-related journals, periodicals, or online services directly related to your work.',
  },
  'publications': {
    label: 'Technical Publications',
    description: 'Technical or professional publications',
    examples: ['Technical journals', 'Industry magazines', 'Professional books', 'Reference materials'],
    atoGuidance: 'Publications directly related to your current employment that maintain or improve your knowledge.',
  },
  'tools-equipment': {
    label: 'Tools & Equipment',
    description: 'Small tools and equipment under $300',
    examples: ['Hand tools', 'Calculator', 'Computer accessories', 'Safety equipment'],
    atoGuidance: 'Tools and equipment costing $300 or less can be claimed immediately. Items over $300 may need depreciation.',
  },
  'protective-items': {
    label: 'Protective Items',
    description: 'Protective items not covered elsewhere',
    examples: ['Sunscreen', 'Sunglasses', 'Hard hat', 'Safety glasses'],
    atoGuidance: 'Protective items required for your work that are not covered under D3 (Clothing).',
  },
  'briefcase': {
    label: 'Briefcase / Bag',
    description: 'Work bag or briefcase',
    examples: ['Work bag', 'Briefcase', 'Laptop bag', 'Tool bag'],
    atoGuidance: 'A bag or briefcase used primarily for work purposes. Must not be used significantly for private purposes.',
  },
  'stationery': {
    label: 'Stationery',
    description: 'Work-related stationery',
    examples: ['Pens', 'Notepads', 'Printer paper', 'Ink cartridges'],
    atoGuidance: 'Stationery items used exclusively or primarily for work purposes.',
  },
  'other': {
    label: 'Other Work Expenses',
    description: 'Other deductible work expenses',
    examples: ['Bank fees on work account', 'Tax advice', 'Overtime meals (if eligible)', 'First aid courses'],
    atoGuidance: 'Other expenses directly related to earning your income that are not claimed elsewhere.',
  },
};

// ATO guidance for specific expense types
export const ATO_GUIDANCE = {
  phone: {
    title: 'Phone Expenses',
    content: `To claim phone expenses:
1. Keep itemized bills highlighting work calls
2. Keep a 4-week diary of work vs personal calls
3. Calculate work percentage: (Work calls ÷ Total calls) × 100
4. Claim that percentage of your phone bill`,
    reasonableRates: null,
  },
  internet: {
    title: 'Internet Expenses',
    content: `To claim internet expenses:
1. Keep a 4-week diary showing work usage
2. Calculate work percentage based on time or data
3. If you work from home, you can claim a portion
4. Common apportionments: 10-50% depending on usage`,
    reasonableRates: null,
  },
  'union-fees': {
    title: 'Union & Association Fees',
    content: `You can claim:
- Union membership fees
- Professional association subscriptions
- Registration fees required for your job
- Trade or business association fees

Note: You cannot claim:
- Payments to political parties
- Social club memberships
- Gym memberships (unless required by employer)`,
    reasonableRates: null,
  },
};

export function createD5Workpaper(taxYear: string): D5Workpaper {
  return {
    taxYear,
    expenses: [],
    lastModified: new Date().toISOString(),
  };
}

export function calculateD5Summary(workpaper: D5Workpaper): D5Summary {
  const byType: D5Summary['byType'] = {
    'phone': { total: 0, count: 0 },
    'internet': { total: 0, count: 0 },
    'home-office-running': { total: 0, count: 0 },
    'union-fees': { total: 0, count: 0 },
    'subscriptions': { total: 0, count: 0 },
    'publications': { total: 0, count: 0 },
    'tools-equipment': { total: 0, count: 0 },
    'protective-items': { total: 0, count: 0 },
    'briefcase': { total: 0, count: 0 },
    'stationery': { total: 0, count: 0 },
    'other': { total: 0, count: 0 },
  };

  let total = 0;
  let withReceipts = 0;

  for (const expense of workpaper.expenses) {
    const claimableAmount = expense.amount * (expense.workRelatedPercentage / 100);
    byType[expense.type].total += claimableAmount;
    byType[expense.type].count += 1;
    total += claimableAmount;
    if (expense.receiptId) withReceipts++;
  }

  return {
    total,
    byType,
    count: workpaper.expenses.length,
    receiptCoverage: workpaper.expenses.length > 0 
      ? Math.round((withReceipts / workpaper.expenses.length) * 100) 
      : 0,
  };
}

export function validateD5Workpaper(workpaper: D5Workpaper): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (workpaper.expenses.length === 0) {
    warnings.push('No expenses added yet');
  }

  // Check for high apportionment percentages
  for (const expense of workpaper.expenses) {
    if (expense.workRelatedPercentage > 90) {
      warnings.push(`${D5_EXPENSE_TYPES[expense.type].label}: ${expense.workRelatedPercentage}% work use may be high - ensure you have documentation`);
    }
    if (expense.workRelatedPercentage < 10 && expense.amount > 100) {
      warnings.push(`${D5_EXPENSE_TYPES[expense.type].label}: Low work percentage (${expense.workRelatedPercentage}%) on significant expense`);
    }
    if (!expense.receiptId && expense.amount > 50) {
      warnings.push(`${D5_EXPENSE_TYPES[expense.type].label}: No receipt linked for $${expense.amount} expense`);
    }
  }

  // Check for common D5 items that might belong elsewhere
  const hasVehicle = workpaper.expenses.some(e => 
    e.description.toLowerCase().includes('fuel') || 
    e.description.toLowerCase().includes('car')
  );
  if (hasVehicle) {
    warnings.push('Vehicle expenses should generally be claimed under D1, not D5');
  }

  const hasClothing = workpaper.expenses.some(e =>
    e.description.toLowerCase().includes('uniform') ||
    e.description.toLowerCase().includes('laundry')
  );
  if (hasClothing) {
    warnings.push('Uniform and laundry expenses should be claimed under D3, not D5');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function exportD5Workpaper(workpaper: D5Workpaper): object {
  const summary = calculateD5Summary(workpaper);
  
  return {
    category: 'D5',
    categoryName: 'Other Work-Related Expenses',
    taxYear: workpaper.taxYear,
    totalClaim: summary.total,
    expenseCount: summary.count,
    expenses: workpaper.expenses.map(e => ({
      type: e.type,
      typeLabel: D5_EXPENSE_TYPES[e.type].label,
      description: e.description,
      amount: e.amount,
      workRelatedPercentage: e.workRelatedPercentage,
      claimableAmount: e.amount * (e.workRelatedPercentage / 100),
      method: e.method,
      date: e.date,
      hasReceipt: !!e.receiptId,
      notes: e.notes,
    })),
    byType: summary.byType,
    notes: workpaper.notes,
    exportedAt: new Date().toISOString(),
  };
}

// Generate sample data for testing
export function generateSampleD5Expenses(taxYear: string): D5Expense[] {
  return [
    {
      id: '1',
      type: 'phone',
      description: 'Mobile phone - 12 months',
      amount: 960,
      method: 'apportioned',
      workRelatedPercentage: 50,
      date: '2024-06-15',
      apportionmentReason: '50% work calls based on 4-week diary',
    },
    {
      id: '2',
      type: 'internet',
      description: 'Home internet - 12 months',
      amount: 840,
      method: 'apportioned',
      workRelatedPercentage: 30,
      date: '2024-06-15',
      apportionmentReason: '30% work use based on time tracking',
    },
    {
      id: '3',
      type: 'union-fees',
      description: 'Professional association membership',
      amount: 450,
      method: 'actual',
      workRelatedPercentage: 100,
      date: '2024-03-01',
    },
    {
      id: '4',
      type: 'subscriptions',
      description: 'Adobe Creative Cloud - work use',
      amount: 648,
      method: 'actual',
      workRelatedPercentage: 80,
      date: '2024-01-15',
      apportionmentReason: 'Used for client projects',
    },
    {
      id: '5',
      type: 'stationery',
      description: 'Printer paper, ink, notepads',
      amount: 125,
      method: 'actual',
      workRelatedPercentage: 100,
      date: '2024-04-20',
    },
  ];
}
