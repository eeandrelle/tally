// D4 Self-Education Expenses - ATO Tax Workpaper
// https://www.ato.gov.au/Individuals/Tax-return/2024/In-detail/Deductions-you-can-claim/D4-Self-education-expenses

export type EducationExpenseType =
  | 'course_fees'
  | 'textbooks'
  | 'stationery'
  | 'travel'
  | 'equipment'
  | 'depreciation'
  | 'internet'
  | 'other';

export type CourseType =
  | 'tertiary_degree'
  | 'tertiary_diploma'
  | 'vocational'
  | 'professional'
  | 'short_course'
  | 'seminar'
  | 'conference'
  | 'other';

export type StudyMode = 'full_time' | 'part_time' | 'online' | 'mixed';

export interface EducationExpense {
  id: string;
  type: EducationExpenseType;
  description: string;
  amount: number;
  date: string;
  courseName?: string;
  provider?: string;
  receiptId?: string;
  isApportioned?: boolean;
  privateUsePercentage?: number;
  workRelatedPercentage?: number;
}

export interface Course {
  id: string;
  name: string;
  provider: string;
  courseType: CourseType;
  studyMode: StudyMode;
  startDate: string;
  endDate?: string;
  isWorkRelated: boolean;
  leadsToQualification: boolean;
  maintainsImprovesSkills: boolean;
  resultsInIncomeIncrease: boolean;
}

export interface DepreciatingAsset {
  id: string;
  name: string;
  cost: number;
  purchaseDate: string;
  effectiveLifeYears: number;
  businessUsePercentage: number;
  method: 'diminishing_value' | 'prime_cost';
  openingBalance?: number;
  declineInValue?: number;
  closingBalance?: number;
}

export interface SelfEducationData {
  taxYear: number;
  courses: Course[];
  expenses: EducationExpense[];
  depreciatingAssets: DepreciatingAsset[];
  taxableIncomeReduction: number;
  totalDeductible: number;
}

// ATO D4 expense categories
export const EDUCATION_EXPENSE_TYPES: { value: EducationExpenseType; label: string; description: string; requiresApportionment: boolean }[] = [
  {
    value: 'course_fees',
    label: 'Course Fees',
    description: 'Tuition fees, enrollment fees, student union fees',
    requiresApportionment: false,
  },
  {
    value: 'textbooks',
    label: 'Textbooks & Materials',
    description: 'Required textbooks, study guides, course materials',
    requiresApportionment: false,
  },
  {
    value: 'stationery',
    label: 'Stationery',
    description: 'Notebooks, pens, printing, photocopying',
    requiresApportionment: true,
  },
  {
    value: 'travel',
    label: 'Travel Expenses',
    description: 'Travel between home and place of education, or work and education',
    requiresApportionment: false,
  },
  {
    value: 'equipment',
    label: 'Equipment (≤$300)',
    description: 'Computers, tablets, calculators costing $300 or less',
    requiresApportionment: true,
  },
  {
    value: 'depreciation',
    label: 'Depreciation (> $300)',
    description: 'Equipment costing more than $300 (depreciated over effective life)',
    requiresApportionment: true,
  },
  {
    value: 'internet',
    label: 'Internet & Phone',
    description: 'Internet access and phone calls related to study',
    requiresApportionment: true,
  },
  {
    value: 'other',
    label: 'Other Expenses',
    description: 'Accommodation, meals (if required to be away from home), childcare',
    requiresApportionment: false,
  },
];

export const COURSE_TYPES: { value: CourseType; label: string; description: string }[] = [
  { value: 'tertiary_degree', label: 'University Degree', description: 'Bachelor, Master, PhD' },
  { value: 'tertiary_diploma', label: 'Diploma/Advanced Diploma', description: 'TAFE or university diploma' },
  { value: 'vocational', label: 'Vocational Training', description: 'Certificate courses, apprenticeships' },
  { value: 'professional', label: 'Professional Development', description: 'Industry certifications, licensing' },
  { value: 'short_course', label: 'Short Course', description: 'Workshops, online courses' },
  { value: 'seminar', label: 'Seminar/Webinar', description: 'Professional seminars, webinars' },
  { value: 'conference', label: 'Conference', description: 'Industry conferences, conventions' },
  { value: 'other', label: 'Other', description: 'Other educational activity' },
];

export const STUDY_MODES: { value: StudyMode; label: string }[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'online', label: 'Online/Distance' },
  { value: 'mixed', label: 'Mixed Mode' },
];

// ATO $250 reduction rule
// Self-education expenses are reduced by $250 unless specific exceptions apply
export function calculateTaxableIncomeReduction(expenses: EducationExpense[]): number {
  const deductibleExpenses = expenses.filter(e => {
    // These expenses reduce the $250 threshold but aren't themselves deductible
    return e.type !== 'travel' && e.type !== 'other';
  });

  const totalDeductibleAmount = deductibleExpenses.reduce((sum, e) => {
    const workRelatedAmount = e.amount * (e.workRelatedPercentage ?? 100) / 100;
    return sum + workRelatedAmount;
  }, 0);

  return Math.min(250, totalDeductibleAmount);
}

// Calculate total self-education deduction
export function calculateSelfEducationDeduction(
  expenses: EducationExpense[],
  depreciatingAssets: DepreciatingAsset[],
  taxableIncomeReduction: number
): number {
  // Calculate expense deductions
  const expenseDeduction = expenses.reduce((sum, expense) => {
    let amount = expense.amount;

    // Apply work-related percentage
    amount = amount * (expense.workRelatedPercentage ?? 100) / 100;

    // For stationery, equipment, depreciation, internet - apply private use apportionment
    if (expense.isApportioned && expense.privateUsePercentage) {
      amount = amount * (100 - expense.privateUsePercentage) / 100;
    }

    return sum + amount;
  }, 0);

  // Calculate depreciation deductions
  const depreciationDeduction = depreciatingAssets.reduce((sum, asset) => {
    return sum + (asset.declineInValue || 0);
  }, 0);

  const totalDeduction = expenseDeduction + depreciationDeduction;

  // Apply $250 reduction
  return Math.max(0, totalDeduction - taxableIncomeReduction);
}

// Calculate depreciation for an asset
export function calculateDeclineInValue(
  cost: number,
  businessUsePercentage: number,
  effectiveLifeYears: number,
  method: 'diminishing_value' | 'prime_cost',
  openingBalance?: number
): number {
  const baseValue = openingBalance ?? cost;
  const businessUse = businessUsePercentage / 100;

  if (method === 'prime_cost') {
    // Prime cost method: (Cost / Effective life) × Business use %
    return (baseValue / effectiveLifeYears) * businessUse;
  } else {
    // Diminishing value method: (Opening value × 2 / Effective life) × Business use %
    return (baseValue * 2 / effectiveLifeYears) * businessUse;
  }
}

// Generate ATO D4 workpaper summary
export function generateD4WorkpaperSummary(data: SelfEducationData): {
  courseCount: number;
  totalExpenses: number;
  totalDepreciation: number;
  taxableIncomeReduction: number;
  deductibleAmount: number;
  expensesByType: Record<EducationExpenseType, number>;
} {
  const totalExpenses = data.expenses.reduce((sum, e) => {
    const workRelated = e.amount * (e.workRelatedPercentage ?? 100) / 100;
    if (e.isApportioned && e.privateUsePercentage) {
      return sum + (workRelated * (100 - e.privateUsePercentage) / 100);
    }
    return sum + workRelated;
  }, 0);

  const totalDepreciation = data.depreciatingAssets.reduce((sum, a) => sum + (a.declineInValue || 0), 0);

  const expensesByType = data.expenses.reduce((acc, expense) => {
    const amount = expense.amount * (expense.workRelatedPercentage ?? 100) / 100;
    acc[expense.type] = (acc[expense.type] ?? 0) + amount;
    return acc;
  }, {} as Record<EducationExpenseType, number>);

  return {
    courseCount: data.courses.length,
    totalExpenses,
    totalDepreciation,
    taxableIncomeReduction: data.taxableIncomeReduction,
    deductibleAmount: data.totalDeductible,
    expensesByType,
  };
}

// ATO guidance on self-education eligibility
export const ATO_GUIDANCE = {
  title: 'D4 Self-Education Expenses',
  description: 'You can claim a deduction for self-education expenses if your study relates to your current employment and maintains or improves the specific skills or knowledge you need in your current employment, or is likely to result in an increase in your income from your current employment.',
  eligibleIf: [
    'The course maintains or improves specific skills/knowledge required for your current employment',
    'The course is likely to result in an increase in income from your current employment',
    'You can show the connection between the course and your current work activities',
  ],
  notEligibleIf: [
    'The course is only generally related to your current field',
    'The course enables you to get new employment (different occupation)',
    'The study is taken for personal reasons or hobbies',
    'You received government assistance or employer reimbursement for the expenses',
  ],
  recordKeeping: 'You must keep receipts, invoices, and statements for all expenses claimed. For depreciation, keep records of purchase dates and costs.',
  reference: 'https://www.ato.gov.au/Individuals/Tax-return/2024/In-detail/Deductions-you-can-claim/D4-Self-education-expenses',
};

// Create empty self-education data
export function createEmptySelfEducationData(taxYear: number = 2024): SelfEducationData {
  return {
    taxYear,
    courses: [],
    expenses: [],
    depreciatingAssets: [],
    taxableIncomeReduction: 250,
    totalDeductible: 0,
  };
}
