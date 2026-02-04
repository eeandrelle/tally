/**
 * D5 Other Work-Related Expenses Library
 * 
 * ATO Category D5: Other work-related expenses
 * Covers: Phone, internet, home office running costs, union fees, 
 * subscriptions, technical publications, tools, protective equipment, and other work expenses
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
  | 'overtime-meals'
  | 'travel'
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
  provider?: string; // For phone/internet/union fees
  membershipType?: string; // For union fees
  isUnder300?: boolean; // For tools/equipment
}

export interface D5Workpaper {
  taxYear: string;
  expenses: D5Expense[];
  notes?: string;
  lastModified: string;
  preparerName?: string;
  clientName?: string;
}

export interface D5Summary {
  total: number;
  byType: Record<D5ExpenseType, { total: number; count: number }>;
  count: number;
  receiptCoverage: number;
  estimatedTaxSavings: number; // At 32.5% tax rate
  requiresReceiptReview: boolean;
}

export const D5_EXPENSE_TYPES: Record<D5ExpenseType, { 
  label: string; 
  description: string;
  examples: string[];
  defaultApportionment?: number;
  atoGuidance?: string;
  requiresReceipt?: boolean;
  receiptThreshold?: number;
}> = {
  'phone': {
    label: 'Phone Expenses',
    description: 'Work-related phone calls and phone rental',
    examples: ['Mobile phone bills', 'Landline rental', 'Work calls', 'Roaming charges for work'],
    defaultApportionment: 50,
    atoGuidance: 'You can claim a deduction for phone expenses if you use your phone for work. You must apportion costs between work and private use. Keep a 4-week diary to establish work percentage.',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'internet': {
    label: 'Internet Expenses',
    description: 'Work-related internet usage',
    examples: ['Home internet', 'Mobile data', 'Wi-Fi hotspot', 'Broadband'],
    defaultApportionment: 25,
    atoGuidance: 'If you work from home and use the internet, you can claim a portion based on work use. Keep a diary for 4 weeks to establish your work percentage. Typical claim: 10-50%.',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'home-office-running': {
    label: 'Home Office Running Costs',
    description: 'Non-WFH home office expenses (not using fixed rate method)',
    examples: ['Electricity for office', 'Gas heating', 'Office cleaning', 'Office repairs', 'Office lighting'],
    defaultApportionment: 10,
    atoGuidance: 'For home office running costs NOT claimed via the WFH fixed rate method. Calculate based on floor area percentage and usage hours. Must not claim same expense twice.',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'union-fees': {
    label: 'Union & Association Fees',
    description: 'Union fees and professional association subscriptions',
    examples: ['Union membership', 'Professional body fees', 'Industry association', 'Registration fees', 'License renewal'],
    defaultApportionment: 100,
    atoGuidance: 'You can claim a deduction for union fees and subscriptions to trade, business or professional associations. Must be related to current employment.',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'subscriptions': {
    label: 'Subscriptions',
    description: 'Work-related subscriptions',
    examples: ['Software subscriptions', 'Professional tools', 'Online services', 'Cloud storage', 'Domain names'],
    defaultApportionment: 100,
    atoGuidance: 'Subscriptions to work-related software, tools, or online services directly related to your work. Must be used for income-producing activities.',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'publications': {
    label: 'Technical Publications',
    description: 'Technical or professional publications',
    examples: ['Technical journals', 'Industry magazines', 'Professional books', 'Reference materials', 'Research papers'],
    defaultApportionment: 100,
    atoGuidance: 'Publications directly related to your current employment that maintain or improve your knowledge. Not claimable if for personal interest.',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'tools-equipment': {
    label: 'Tools & Equipment',
    description: 'Small tools and equipment under $300',
    examples: ['Hand tools', 'Calculator', 'Computer accessories', 'Safety equipment under $300', 'Desk lamp'],
    defaultApportionment: 100,
    atoGuidance: 'Tools and equipment costing $300 or less can be claimed immediately in D5. Items over $300 must be depreciated (go to D6 Low-Value Pool).',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'protective-items': {
    label: 'Protective Items',
    description: 'Protective items not covered elsewhere',
    examples: ['Sunscreen', 'Sunglasses', 'Hard hat', 'Safety glasses', 'Ear protection', 'Face masks'],
    defaultApportionment: 100,
    atoGuidance: 'Protective items required for your work that are not covered under D3 (Clothing). Must be necessary for workplace safety.',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'briefcase': {
    label: 'Briefcase / Work Bag',
    description: 'Work bag or briefcase',
    examples: ['Work bag', 'Briefcase', 'Laptop bag', 'Tool bag', 'Professional tote'],
    defaultApportionment: 100,
    atoGuidance: 'A bag or briefcase used primarily for work purposes. Must not be used significantly for private purposes. Under $300 can be claimed here; over $300 requires depreciation.',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'stationery': {
    label: 'Stationery',
    description: 'Work-related stationery and consumables',
    examples: ['Pens', 'Notepads', 'Printer paper', 'Ink cartridges', 'Folders', 'Staplers'],
    defaultApportionment: 100,
    atoGuidance: 'Stationery items used exclusively or primarily for work purposes. Keep receipts for purchases over $10.',
    requiresReceipt: true,
    receiptThreshold: 10,
  },
  'overtime-meals': {
    label: 'Overtime Meals',
    description: 'Meals consumed during overtime work',
    examples: ['Dinner during overtime', 'Meal allowances', 'Overtime meal payments'],
    defaultApportionment: 100,
    atoGuidance: 'Only claimable if you work overtime and receive an overtime meal allowance under an industrial instrument. Must be included in your income and declared.',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'travel': {
    label: 'Work Travel',
    description: 'Work-related travel not covered in other categories',
    examples: ['Public transport for work', 'Taxis for work', 'Parking for work meetings', 'Tolls'],
    defaultApportionment: 100,
    atoGuidance: 'Work-related travel that is not regular commuting or already claimed in D1/D2. Must be directly related to income-producing activities.',
    requiresReceipt: true,
    receiptThreshold: 0,
  },
  'other': {
    label: 'Other Work Expenses',
    description: 'Other deductible work expenses',
    examples: ['Bank fees on work account', 'Tax advice', 'Income protection insurance', 'First aid courses', 'Working with Children Check'],
    defaultApportionment: 100,
    atoGuidance: 'Other expenses directly related to earning your income that are not claimed elsewhere. Must have receipts and be work-related.',
    requiresReceipt: true,
    receiptThreshold: 0,
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
4. Claim that percentage of your phone bill

Common apportionments:
• Occasional work use: 10-25%
• Regular work use: 25-50%
• Heavy work use: 50-75%`,
    reasonableRates: null,
    recordKeeping: ['Itemized bills', '4-week work diary', 'Call logs highlighting work calls'],
  },
  internet: {
    title: 'Internet Expenses',
    content: `To claim internet expenses:
1. Keep a 4-week diary showing work usage
2. Calculate work percentage based on time or data usage
3. If you work from home, claim a portion
4. Common apportionments: 10-50% depending on usage

Note: Cannot claim if already included in WFH shortcut method.`,
    reasonableRates: null,
    recordKeeping: ['Internet bills', '4-week usage diary', 'Work-from-home records'],
  },
  'union-fees': {
    title: 'Union & Association Fees',
    content: `You can claim:
• Union membership fees
• Professional association subscriptions
• Registration fees required for your job
• Trade or business association fees
• License renewal fees

Note: You cannot claim:
• Payments to political parties
• Social club memberships
• Gym memberships (unless specifically required)
• Personal subscriptions`,
    reasonableRates: null,
    recordKeeping: ['Annual membership statements', 'Receipts for fees paid', 'Bank statements showing deductions'],
  },
  'tools-equipment': {
    title: 'Tools & Equipment',
    content: `Immediate deduction (D5):
• Items costing $300 or less
• Claim full amount in year of purchase
• Must be used for work

Depreciation required (D6):
• Items costing more than $300
• Must be depreciated over effective life
• Use low-value pool if under $1,000

Common effective lives:
• Laptops: 3 years
• Phones/Tablets: 2 years
• Tools: 5-10 years`,
    reasonableRates: null,
    recordKeeping: ['Purchase receipts', 'Date of purchase', 'Business use percentage'],
  },
  'overtime-meals': {
    title: 'Overtime Meals',
    content: `To claim overtime meal expenses:
1. You must work overtime
2. You must receive an overtime meal allowance
3. The allowance must be shown on your income statement
4. You can claim up to the reasonable amount without receipts
5. Above reasonable amounts, you need receipts for all amounts

2024-25 reasonable amounts vary by location and circumstances.`,
    reasonableRates: {
      '2024-25': '$33.95 per meal (base rate)',
    },
    recordKeeping: ['Pay slips showing meal allowance', 'Receipts if claiming above reasonable amount', 'Overtime records'],
  },
};

// Common validation warnings
export const COMMON_WARNINGS = {
  highApportionment: (percentage: number, type: string) => 
    `${type}: ${percentage}% work use may be high - ensure you have documentation to support this claim`,
  lowApportionmentHighAmount: (percentage: number, amount: number) => 
    `Low work percentage (${percentage}%) on significant expense ($${amount})`,
  missingReceipt: (type: string, amount: number) => 
    `${type}: No receipt linked for $${amount} expense`,
  possibleWrongCategory: (description: string, correctCategory: string) => 
    `"${description}" might belong in ${correctCategory} instead of D5`,
  doubleClaimRisk: 'Ensure this expense is not being claimed in another category (D1-D4)',
  privateUseWarning: 'Review apportionment - ATO may question private use percentage',
  deprecationRequired: (amount: number) => 
    `Item costing $${amount} exceeds $300 threshold and should be depreciated (D6)`,
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
    'overtime-meals': { total: 0, count: 0 },
    'travel': { total: 0, count: 0 },
    'other': { total: 0, count: 0 },
  };

  let total = 0;
  let withReceipts = 0;
  let highValueWithoutReceipts = 0;

  for (const expense of workpaper.expenses) {
    const claimableAmount = expense.amount * (expense.workRelatedPercentage / 100);
    byType[expense.type].total += claimableAmount;
    byType[expense.type].count += 1;
    total += claimableAmount;
    
    if (expense.receiptId) {
      withReceipts++;
    } else if (expense.amount > 50) {
      highValueWithoutReceipts++;
    }
  }

  // Calculate estimated tax savings at 32.5% (common marginal rate)
  const estimatedTaxSavings = total * 0.325;

  return {
    total,
    byType,
    count: workpaper.expenses.length,
    receiptCoverage: workpaper.expenses.length > 0 
      ? Math.round((withReceipts / workpaper.expenses.length) * 100) 
      : 0,
    estimatedTaxSavings,
    requiresReceiptReview: highValueWithoutReceipts > 0,
  };
}

export function validateD5Workpaper(workpaper: D5Workpaper): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  if (workpaper.expenses.length === 0) {
    info.push('No expenses added yet. Add your first work-related expense to get started.');
  }

  // Check for high apportionment percentages
  for (const expense of workpaper.expenses) {
    const typeLabel = D5_EXPENSE_TYPES[expense.type].label;

    // High work percentage warning
    if (expense.workRelatedPercentage > 90 && expense.type !== 'union-fees') {
      warnings.push(COMMON_WARNINGS.highApportionment(expense.workRelatedPercentage, typeLabel));
    }

    // Low work percentage on significant expense
    if (expense.workRelatedPercentage < 20 && expense.amount > 100) {
      warnings.push(COMMON_WARNINGS.lowApportionmentHighAmount(expense.workRelatedPercentage, expense.amount));
    }

    // Missing receipt warnings
    if (!expense.receiptId) {
      const threshold = D5_EXPENSE_TYPES[expense.type].receiptThreshold || 50;
      if (expense.amount > threshold) {
        warnings.push(COMMON_WARNINGS.missingReceipt(typeLabel, expense.amount));
      }
    }

    // Check for items over $300 that should be depreciated
    if (expense.type === 'tools-equipment' && expense.amount > 300 && !expense.isUnder300) {
      warnings.push(COMMON_WARNINGS.deprecationRequired(expense.amount));
    }

    // Check for briefcase over $300
    if (expense.type === 'briefcase' && expense.amount > 300) {
      warnings.push(`Briefcase/Bag over $300 should be depreciated (D6) unless under low-value pool threshold`);
    }

    // Overtime meals specific checks
    if (expense.type === 'overtime-meals') {
      if (!expense.notes?.toLowerCase().includes('allowance')) {
        warnings.push('Overtime meals: Ensure you received an overtime meal allowance and it is declared in your income');
      }
    }

    // Phone/Internet diary reminder
    if ((expense.type === 'phone' || expense.type === 'internet') && !expense.apportionmentReason) {
      info.push(`${typeLabel}: Consider adding apportionment reasoning (e.g., "4-week diary")`);
    }
  }

  // Check for common D5 items that might belong elsewhere
  const hasVehicle = workpaper.expenses.some(e => 
    e.description.toLowerCase().includes('fuel') || 
    e.description.toLowerCase().includes('car') ||
    e.description.toLowerCase().includes('vehicle') ||
    e.description.toLowerCase().includes('registration') && e.type === 'other'
  );
  if (hasVehicle) {
    warnings.push(COMMON_WARNINGS.possibleWrongCategory('Vehicle-related expenses', 'D1 (Car Expenses)'));
  }

  const hasClothing = workpaper.expenses.some(e =>
    e.description.toLowerCase().includes('uniform') ||
    e.description.toLowerCase().includes('laundry') ||
    (e.description.toLowerCase().includes('clothing') && e.type === 'other')
  );
  if (hasClothing) {
    warnings.push(COMMON_WARNINGS.possibleWrongCategory('Uniform/clothing expenses', 'D3 (Clothing)'));
  }

  const hasEducation = workpaper.expenses.some(e =>
    e.description.toLowerCase().includes('course') ||
    e.description.toLowerCase().includes('tuition') ||
    e.description.toLowerCase().includes('study') ||
    e.description.toLowerCase().includes('education')
  );
  if (hasEducation) {
    warnings.push(COMMON_WARNINGS.possibleWrongCategory('Education-related expenses', 'D4 (Self-Education)'));
  }

  // Check for potential WFH double-claiming
  const hasHomeOffice = workpaper.expenses.some(e => e.type === 'home-office-running');
  const hasWfhMethod = workpaper.expenses.some(e => 
    e.notes?.toLowerCase().includes('wfh') || 
    e.notes?.toLowerCase().includes('working from home')
  );
  if (hasHomeOffice || hasWfhMethod) {
    info.push('Ensure home office expenses are not also being claimed via the WFH fixed rate method to avoid double-dipping');
  }

  return { 
    valid: errors.length === 0, 
    errors, 
    warnings,
    info,
  };
}

export function exportD5Workpaper(workpaper: D5Workpaper): object {
  const summary = calculateD5Summary(workpaper);
  const validation = validateD5Workpaper(workpaper);
  
  return {
    category: 'D5',
    categoryName: 'Other Work-Related Expenses',
    taxYear: workpaper.taxYear,
    exportDate: new Date().toISOString(),
    preparerName: workpaper.preparerName,
    clientName: workpaper.clientName,
    summary: {
      totalClaim: summary.total,
      estimatedTaxSavings: summary.estimatedTaxSavings,
      expenseCount: summary.count,
      receiptCoverage: summary.receiptCoverage,
    },
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
      provider: e.provider,
      membershipType: e.membershipType,
      notes: e.notes,
      apportionmentReason: e.apportionmentReason,
    })),
    byType: summary.byType,
    validation: {
      valid: validation.valid,
      warningCount: validation.warnings.length,
      infoCount: validation.info.length,
    },
    notes: workpaper.notes,
    lastModified: workpaper.lastModified,
  };
}

// Export for tax return lodgment
export function exportForTaxLodge(workpaper: D5Workpaper): {
  d5Amount: number;
  itemCount: number;
  declaration: string;
} {
  const summary = calculateD5Summary(workpaper);
  
  return {
    d5Amount: summary.total,
    itemCount: summary.count,
    declaration: `I declare that the D5 Other Work-Related Expenses claim of $${summary.total.toFixed(2)} is true and correct and supported by documentation.`,
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
      provider: 'Telstra',
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
      provider: 'NBN Co',
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
      provider: 'CPA Australia',
      membershipType: 'Full Member',
    },
    {
      id: '4',
      type: 'subscriptions',
      description: 'Adobe Creative Cloud - work use',
      amount: 648,
      method: 'actual',
      workRelatedPercentage: 80,
      date: '2024-01-15',
      provider: 'Adobe',
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
    {
      id: '6',
      type: 'tools-equipment',
      description: 'Wireless mouse and keyboard',
      amount: 89,
      method: 'actual',
      workRelatedPercentage: 100,
      date: '2024-02-10',
      isUnder300: true,
    },
    {
      id: '7',
      type: 'protective-items',
      description: 'Safety glasses for site visits',
      amount: 45,
      method: 'actual',
      workRelatedPercentage: 100,
      date: '2024-05-05',
    },
  ];
}

// Calculate suggested apportionment based on usage patterns
export function suggestApportionment(expenseType: D5ExpenseType, usagePattern?: string): number {
  // Union fees and some other types are always 100%
  const always100Types: D5ExpenseType[] = ['union-fees', 'subscriptions', 'publications', 'protective-items', 'briefcase', 'stationery'];
  if (always100Types.includes(expenseType)) {
    return 100;
  }

  const defaults: Record<string, number> = {
    'light': 15,
    'occasional': 25,
    'regular': 50,
    'heavy': 75,
    'exclusive': 100,
  };

  if (usagePattern && defaults[usagePattern]) {
    return defaults[usagePattern];
  }

  return D5_EXPENSE_TYPES[expenseType].defaultApportionment || 100;
}

// Get expense type statistics
export function getExpenseTypeStats(): { 
  type: D5ExpenseType; 
  label: string; 
  avgClaim: number;
  commonPercentage: number;
}[] {
  return [
    { type: 'phone', label: 'Phone', avgClaim: 480, commonPercentage: 50 },
    { type: 'internet', label: 'Internet', avgClaim: 210, commonPercentage: 25 },
    { type: 'union-fees', label: 'Union Fees', avgClaim: 600, commonPercentage: 100 },
    { type: 'subscriptions', label: 'Subscriptions', avgClaim: 350, commonPercentage: 100 },
    { type: 'stationery', label: 'Stationery', avgClaim: 85, commonPercentage: 100 },
    { type: 'tools-equipment', label: 'Tools', avgClaim: 150, commonPercentage: 100 },
  ];
}
