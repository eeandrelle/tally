/**
 * Rental Property Schedule Workpaper Library
 * 
 * ATO Schedule: Rental Property Schedule (supplementary section)
 * 
 * This workpaper handles:
 * - Multiple rental property tracking
 * - Income tracking (rent received)
 * - Expense categorization per ATO requirements
 * - Capital works deductions (Division 43)
 * - Plant & equipment depreciation (Division 40)
 * - Ownership percentage handling
 * - Taxable income/loss calculations
 */

// ==================== Types ====================

export type OwnershipType = 'sole' | 'joint' | 'partnership' | 'trust';

export interface PropertyAddress {
  street: string;
  suburb: string;
  state: 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
  postcode: string;
  country: string; // Usually 'Australia'
}

export interface RentalProperty {
  id: string;
  address: PropertyAddress;
  dateAcquired: string;
  purchasePrice: number;
  ownershipType: OwnershipType;
  ownershipPercentage: number; // e.g., 50 for 50%
  otherOwners?: string; // Names of other owners if joint
  
  // Property details
  propertyType: 'house' | 'unit' | 'apartment' | 'townhouse' | 'land' | 'commercial';
  firstRentedDate?: string;
  isNewConstruction: boolean;
  constructionDate?: string; // For capital works calculations
  
  // Loan details
  loanAmount?: number;
  loanStartDate?: string;
  
  // Depreciation settings
  capitalWorksRate: 2.5 | 4.0; // Division 43 rate
  capitalWorksCostBase: number; // Construction cost for capital works
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalIncome {
  id: string;
  propertyId: string;
  dateReceived: string;
  amount: number;
  periodStart?: string;
  periodEnd?: string;
  tenantName?: string;
  description?: string;
  receiptUrl?: string;
  notes?: string;
}

// ATO expense categories for rental properties
export type RentalExpenseCategory =
  | 'advertising'
  | 'body-corporate'
  | 'borrowing-expenses'
  | 'cleaning'
  | 'council-rates'
  | 'decline-in-value' // Division 40 depreciation
  | 'gardening'
  | 'insurance'
  | 'interest'
  | 'land-tax'
  | 'legal-expenses'
  | 'pest-control'
  | 'property-agent'
  | 'repairs-maintenance'
  | 'stationery-postage'
  | 'water-charges'
  | 'other';

export interface RentalExpense {
  id: string;
  propertyId: string;
  date: string;
  category: RentalExpenseCategory;
  description: string;
  amount: number;
  vendor?: string;
  receiptUrl?: string;
  isDeductible: boolean;
  notes?: string;
}

// Division 40 - Plant and Equipment Depreciation
export interface PlantEquipmentItem {
  id: string;
  propertyId: string;
  name: string;
  datePurchased: string;
  cost: number;
  effectiveLife: number; // Years
  method: 'diminishing-value' | 'prime-cost';
  openingAdjustableValue: number; // For tax purposes
  privateUsePercent: number; // Default 0
  taxableUsePercent: number; // Usually 100 - privateUsePercent
  
  // Calculated fields
  currentYearDeduction: number;
  closingAdjustableValue: number;
}

// Division 43 - Capital Works Deduction
export interface CapitalWorksEntry {
  id: string;
  propertyId: string;
  description: string;
  constructionType: 'residential' | 'commercial' | 'industrial';
  constructionDate: string;
  cost: number;
  rate: 2.5 | 4.0;
  deductionAmount: number;
  accumulatedDeductions: number;
  remainingValue: number;
}

export interface DepreciationSchedule {
  propertyId: string;
  taxYear: string;
  plantEquipment: PlantEquipmentItem[];
  capitalWorks: CapitalWorksEntry[];
  totalDivision40: number;
  totalDivision43: number;
  totalDepreciation: number;
}

export interface RentalPropertyWorkpaper {
  id: string;
  taxYear: string;
  properties: RentalProperty[];
  income: RentalIncome[];
  expenses: RentalExpense[];
  depreciationSchedules: DepreciationSchedule[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== ATO Category Metadata ====================

export const EXPENSE_CATEGORIES: Record<RentalExpenseCategory, {
  label: string;
  description: string;
  atoReference: string;
  deductible: boolean;
  requiresReceipts: boolean;
  threshold?: number;
  helpText: string;
  examples: string[];
}> = {
  'advertising': {
    label: 'Advertising for Tenants',
    description: 'Costs to advertise for tenants',
    atoReference: 'Rental Schedule - Advertising',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Costs to find tenants including online listings, newspaper ads, and signage.',
    examples: ['realestate.com.au listings', 'Domain ads', 'Newspaper advertising', 'For lease signs'],
  },
  'body-corporate': {
    label: 'Body Corporate Fees',
    description: 'Strata or body corporate fees and charges',
    atoReference: 'Rental Schedule - Body corporate',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Regular body corporate fees are deductible. Special levies for capital improvements may need to be depreciated.',
    examples: ['Quarterly strata levies', 'Administrative fund contributions'],
  },
  'borrowing-expenses': {
    label: 'Borrowing Expenses',
    description: 'Loan establishment fees and other borrowing costs',
    atoReference: 'Rental Schedule - Borrowing expenses',
    deductible: true,
    requiresReceipts: true,
    threshold: 100,
    helpText: 'Deductible over 5 years or loan term (whichever is shorter). If under $100, can claim immediately.',
    examples: ['Loan establishment fees', 'LMI (Lenders Mortgage Insurance)', 'Stamp duty on loan', 'Valuation fees', 'Title search fees'],
  },
  'cleaning': {
    label: 'Cleaning',
    description: 'Property cleaning expenses',
    atoReference: 'Rental Schedule - Cleaning',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Cleaning costs including end-of-lease cleaning and regular cleaning services.',
    examples: ['End of lease cleaning', 'Regular cleaner', 'Carpet cleaning', 'Window cleaning'],
  },
  'council-rates': {
    label: 'Council Rates',
    description: 'Local council rates and charges',
    atoReference: 'Rental Schedule - Council rates',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Council rates are deductible for the period the property was rented or available for rent.',
    examples: ['Annual council rates', 'Garbage collection charges'],
  },
  'decline-in-value': {
    label: 'Decline in Value (Depreciation)',
    description: 'Depreciation of plant and equipment (Division 40)',
    atoReference: 'Division 40 - Depreciation',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Depreciation of fixtures and fittings. New properties from May 2017 have restrictions on claiming depreciation of previously used assets.',
    examples: ['Hot water system', 'Air conditioner', 'Oven', 'Carpets', 'Curtains', 'Furniture'],
  },
  'gardening': {
    label: 'Gardening/Lawn Mowing',
    description: 'Garden maintenance and lawn mowing',
    atoReference: 'Rental Schedule - Gardening',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Regular garden maintenance is deductible. Initial landscaping and capital improvements are not.',
    examples: ['Lawn mowing service', 'Garden maintenance', 'Hedge trimming', 'Weed control'],
  },
  'insurance': {
    label: 'Insurance',
    description: 'Property and landlord insurance',
    atoReference: 'Rental Schedule - Insurance',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Building, contents, and landlord insurance premiums are deductible.',
    examples: ['Building insurance', 'Landlord insurance', 'Contents insurance'],
  },
  'interest': {
    label: 'Interest Expenses',
    description: 'Mortgage interest and loan interest',
    atoReference: 'Rental Schedule - Interest',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Interest on loans used to purchase or improve the rental property. Only deductible for the portion used for investment purposes.',
    examples: ['Mortgage interest', 'Loan interest', 'Line of credit interest'],
  },
  'land-tax': {
    label: 'Land Tax',
    description: 'State land tax charges',
    atoReference: 'Rental Schedule - Land tax',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Land tax is deductible for rental properties. Does not include land tax penalties.',
    examples: ['Annual land tax', 'Land tax assessments'],
  },
  'legal-expenses': {
    label: 'Legal Expenses',
    description: 'Legal fees related to rental property',
    atoReference: 'Rental Schedule - Legal expenses',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Legal fees for tenancy matters and debt collection. Purchase/sale legal costs are capital and not deductible.',
    examples: ['Eviction costs', 'Debt collection', 'Tenancy agreement preparation'],
  },
  'pest-control': {
    label: 'Pest Control',
    description: 'Pest inspection and treatment',
    atoReference: 'Rental Schedule - Pest control',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Regular pest control treatments and inspections are deductible.',
    examples: ['Termite inspections', 'Pest treatments', 'Annual pest control'],
  },
  'property-agent': {
    label: 'Property Agent Fees',
    description: 'Property management and agent fees',
    atoReference: 'Rental Schedule - Property agent',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Property management fees, letting fees, and commission are deductible.',
    examples: ['Property management fees', 'Letting fees', 'Leasing commission', 'Advertising by agent'],
  },
  'repairs-maintenance': {
    label: 'Repairs and Maintenance',
    description: 'Property repairs and ongoing maintenance',
    atoReference: 'Rental Schedule - Repairs',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Repairs fix damage/defects. Maintenance keeps property in good condition. Improvements are capital and depreciable.',
    examples: ['Plumbing repairs', 'Electrical repairs', 'Painting', 'Broken window replacement', 'Gutter cleaning'],
  },
  'stationery-postage': {
    label: 'Stationery/Phone/Postage',
    description: 'Administrative costs',
    atoReference: 'Rental Schedule - Stationery',
    deductible: true,
    requiresReceipts: false,
    threshold: 150,
    helpText: 'Minor administrative costs related to managing the rental property.',
    examples: ['Stationery', 'Phone calls', 'Postage', 'Printing'],
  },
  'water-charges': {
    label: 'Water Charges',
    description: 'Water and sewerage rates',
    atoReference: 'Rental Schedule - Water charges',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Water charges paid by the landlord are deductible. Not deductible if tenant pays.',
    examples: ['Water rates', 'Sewerage charges', 'Water usage charges'],
  },
  'other': {
    label: 'Other Expenses',
    description: 'Other deductible rental expenses',
    atoReference: 'Rental Schedule - Other',
    deductible: true,
    requiresReceipts: true,
    helpText: 'Other expenses not listed above that relate to earning rental income.',
    examples: ['Security patrols', 'Bank fees', 'Bookkeeping fees'],
  },
};

// Capital works rate based on construction date
export function getCapitalWorksRate(constructionDate: string): 2.5 | 4.0 {
  const date = new Date(constructionDate);
  const cutoffDate = new Date('1987-07-18');
  return date < cutoffDate ? 4.0 : 2.5;
}

// ==================== Helper Functions ====================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createEmptyProperty(taxYear: string): RentalProperty {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    address: {
      street: '',
      suburb: '',
      state: 'NSW',
      postcode: '',
      country: 'Australia',
    },
    dateAcquired: '',
    purchasePrice: 0,
    ownershipType: 'sole',
    ownershipPercentage: 100,
    propertyType: 'house',
    isNewConstruction: false,
    capitalWorksRate: 2.5,
    capitalWorksCostBase: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyWorkpaper(taxYear: string): RentalPropertyWorkpaper {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    taxYear,
    properties: [],
    income: [],
    expenses: [],
    depreciationSchedules: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ==================== Calculation Functions ====================

export interface PropertySummary {
  propertyId: string;
  propertyAddress: string;
  ownershipPercentage: number;
  
  // Income
  totalIncome: number;
  
  // Expenses
  expensesByCategory: Record<RentalExpenseCategory, number>;
  totalExpenses: number;
  
  // Depreciation
  division40Depreciation: number;
  division43Deduction: number;
  totalDepreciation: number;
  
  // Net result
  netIncome: number;
  taxableIncome: number; // After applying ownership %
}

export interface WorkpaperTotals {
  properties: PropertySummary[];
  grandTotal: {
    income: number;
    expenses: number;
    depreciation: number;
    netIncome: number;
    taxableIncome: number;
  };
}

export function calculatePropertySummary(
  property: RentalProperty,
  income: RentalIncome[],
  expenses: RentalExpense[],
  depreciationSchedule?: DepreciationSchedule
): PropertySummary {
  // Filter income and expenses for this property
  const propertyIncome = income.filter(i => i.propertyId === property.id);
  const propertyExpenses = expenses.filter(e => e.propertyId === property.id);
  
  // Calculate income
  const totalIncome = propertyIncome.reduce((sum, i) => sum + i.amount, 0);
  
  // Calculate expenses by category
  const expensesByCategory: Record<RentalExpenseCategory, number> = {
    'advertising': 0,
    'body-corporate': 0,
    'borrowing-expenses': 0,
    'cleaning': 0,
    'council-rates': 0,
    'decline-in-value': 0,
    'gardening': 0,
    'insurance': 0,
    'interest': 0,
    'land-tax': 0,
    'legal-expenses': 0,
    'pest-control': 0,
    'property-agent': 0,
    'repairs-maintenance': 0,
    'stationery-postage': 0,
    'water-charges': 0,
    'other': 0,
  };
  
  propertyExpenses.forEach(expense => {
    if (expense.isDeductible) {
      expensesByCategory[expense.category] += expense.amount;
    }
  });
  
  const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
  
  // Calculate depreciation
  const division40Depreciation = depreciationSchedule?.totalDivision40 || 0;
  const division43Deduction = depreciationSchedule?.totalDivision43 || 0;
  const totalDepreciation = division40Depreciation + division43Deduction;
  
  // Net income before ownership split
  const netIncome = totalIncome - totalExpenses - totalDepreciation;
  
  // Apply ownership percentage
  const ownershipFactor = property.ownershipPercentage / 100;
  const taxableIncome = netIncome * ownershipFactor;
  
  return {
    propertyId: property.id,
    propertyAddress: formatAddress(property.address),
    ownershipPercentage: property.ownershipPercentage,
    totalIncome,
    expensesByCategory,
    totalExpenses,
    division40Depreciation,
    division43Deduction,
    totalDepreciation,
    netIncome,
    taxableIncome,
  };
}

export function calculateWorkpaperTotals(workpaper: RentalPropertyWorkpaper): WorkpaperTotals {
  const properties = workpaper.properties.map(property => {
    const schedule = workpaper.depreciationSchedules.find(
      s => s.propertyId === property.id && s.taxYear === workpaper.taxYear
    );
    return calculatePropertySummary(property, workpaper.income, workpaper.expenses, schedule);
  });
  
  const grandTotal = properties.reduce(
    (totals, prop) => ({
      income: totals.income + prop.totalIncome,
      expenses: totals.expenses + prop.totalExpenses,
      depreciation: totals.depreciation + prop.totalDepreciation,
      netIncome: totals.netIncome + prop.netIncome,
      taxableIncome: totals.taxableIncome + prop.taxableIncome,
    }),
    { income: 0, expenses: 0, depreciation: 0, netIncome: 0, taxableIncome: 0 }
  );
  
  return { properties, grandTotal };
}

// Calculate Division 40 depreciation for an item
export function calculateDivision40Deduction(
  item: PlantEquipmentItem,
  daysHeld: number,
  isLeapYear: boolean = false
): number {
  const daysInYear = isLeapYear ? 366 : 365;
  
  if (item.method === 'diminishing-value') {
    // Diminishing value: base value × (days held ÷ 365) × (150% ÷ effective life)
    const rate = 1.5 / item.effectiveLife;
    return item.openingAdjustableValue * (daysHeld / daysInYear) * rate * (item.taxableUsePercent / 100);
  } else {
    // Prime cost: cost × (days held ÷ 365) × (100% ÷ effective life)
    const rate = 1.0 / item.effectiveLife;
    return item.cost * (daysHeld / daysInYear) * rate * (item.taxableUsePercent / 100);
  }
}

// Calculate Division 43 capital works deduction
export function calculateDivision43Deduction(
  cost: number,
  rate: 2.5 | 4.0,
  daysHeld: number,
  isLeapYear: boolean = false
): number {
  const daysInYear = isLeapYear ? 366 : 365;
  return cost * (daysHeld / daysInYear) * (rate / 100);
}

// ==================== Validation ====================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

export function validateWorkpaper(workpaper: RentalPropertyWorkpaper): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];
  
  // Check properties
  if (workpaper.properties.length === 0) {
    errors.push('At least one property must be added');
  }
  
  workpaper.properties.forEach(property => {
    if (!property.address.street || !property.address.suburb || !property.address.postcode) {
      errors.push(`Property ${formatAddress(property.address)} is missing address details`);
    }
    
    if (!property.dateAcquired) {
      warnings.push(`Property ${formatAddress(property.address)} missing acquisition date`);
    }
    
    if (property.ownershipType !== 'sole' && !property.otherOwners) {
      info.push(`Property ${formatAddress(property.address)} - consider adding other owner names for records`);
    }
  });
  
  // Check for expenses without receipts
  const expensesWithoutReceipts = workpaper.expenses.filter(e => !e.receiptUrl && EXPENSE_CATEGORIES[e.category].requiresReceipts);
  if (expensesWithoutReceipts.length > 0) {
    warnings.push(`${expensesWithoutReceipts.length} expense(s) without linked receipts`);
  }
  
  // Check for positive/negative income
  const totals = calculateWorkpaperTotals(workpaper);
  totals.properties.forEach(prop => {
    if (prop.taxableIncome < 0) {
      info.push(`${prop.propertyAddress}: Net rental loss of ${formatCurrency(Math.abs(prop.taxableIncome))} - can offset other income`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

// ==================== Utility Functions ====================

export function formatAddress(address: PropertyAddress): string {
  if (!address.street) return 'Unnamed Property';
  return `${address.street}, ${address.suburb} ${address.state} ${address.postcode}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Get tax year label
export function getTaxYearLabel(taxYear: string): string {
  // Input: "2024-25" -> Output: "2024-25 financial year"
  return `${taxYear} financial year`;
}

// Check if property is eligible for capital works
export function isEligibleForCapitalWorks(constructionDate: string): boolean {
  const date = new Date(constructionDate);
  const eligibilityDate = new Date('1979-08-22');
  return date >= eligibilityDate;
}

// Get state full name
export function getStateFullName(state: PropertyAddress['state']): string {
  const names: Record<PropertyAddress['state'], string> = {
    'NSW': 'New South Wales',
    'VIC': 'Victoria',
    'QLD': 'Queensland',
    'WA': 'Western Australia',
    'SA': 'South Australia',
    'TAS': 'Tasmania',
    'ACT': 'Australian Capital Territory',
    'NT': 'Northern Territory',
  };
  return names[state];
}

// ==================== Export Functions ====================

export interface PropertyExport {
  taxYear: string;
  category: 'Rental Property';
  propertyAddress: string;
  ownershipPercentage: number;
  
  // Income
  grossRentalIncome: number;
  
  // Expenses
  expenses: {
    advertising: number;
    bodyCorporate: number;
    borrowingExpenses: number;
    cleaning: number;
    councilRates: number;
    declineInValue: number;
    gardening: number;
    insurance: number;
    interest: number;
    landTax: number;
    legalExpenses: number;
    pestControl: number;
    propertyAgent: number;
    repairsMaintenance: number;
    stationeryPostage: number;
    waterCharges: number;
    other: number;
  };
  
  // Deductions
  capitalWorksDeductions: number;
  
  // Net result
  netRentalIncome: number;
  yourShareOfNetRentalIncome: number;
}

export function exportPropertyForTax(
  property: RentalProperty,
  summary: PropertySummary
): PropertyExport {
  return {
    taxYear: '', // Filled by workpaper
    category: 'Rental Property',
    propertyAddress: summary.propertyAddress,
    ownershipPercentage: property.ownershipPercentage,
    grossRentalIncome: summary.totalIncome,
    expenses: {
      advertising: summary.expensesByCategory['advertising'],
      bodyCorporate: summary.expensesByCategory['body-corporate'],
      borrowingExpenses: summary.expensesByCategory['borrowing-expenses'],
      cleaning: summary.expensesByCategory['cleaning'],
      councilRates: summary.expensesByCategory['council-rates'],
      declineInValue: summary.expensesByCategory['decline-in-value'] + summary.division40Depreciation,
      gardening: summary.expensesByCategory['gardening'],
      insurance: summary.expensesByCategory['insurance'],
      interest: summary.expensesByCategory['interest'],
      landTax: summary.expensesByCategory['land-tax'],
      legalExpenses: summary.expensesByCategory['legal-expenses'],
      pestControl: summary.expensesByCategory['pest-control'],
      propertyAgent: summary.expensesByCategory['property-agent'],
      repairsMaintenance: summary.expensesByCategory['repairs-maintenance'],
      stationeryPostage: summary.expensesByCategory['stationery-postage'],
      waterCharges: summary.expensesByCategory['water-charges'],
      other: summary.expensesByCategory['other'],
    },
    capitalWorksDeductions: summary.division43Deduction,
    netRentalIncome: summary.netIncome,
    yourShareOfNetRentalIncome: summary.taxableIncome,
  };
}

export interface WorkpaperExport {
  taxYear: string;
  properties: PropertyExport[];
  totalIncome: number;
  totalExpenses: number;
  totalDepreciation: number;
  totalCapitalWorks: number;
  netRentalIncome: number;
  notes?: string;
}

export function exportWorkpaperForTax(workpaper: RentalPropertyWorkpaper): WorkpaperExport {
  const totals = calculateWorkpaperTotals(workpaper);
  
  const propertyExports = totals.properties.map((summary, index) => {
    const property = workpaper.properties[index];
    return exportPropertyForTax(property, summary);
  });
  
  return {
    taxYear: workpaper.taxYear,
    properties: propertyExports,
    totalIncome: totals.grandTotal.income,
    totalExpenses: totals.grandTotal.expenses,
    totalDepreciation: totals.grandTotal.depreciation,
    totalCapitalWorks: totals.properties.reduce((sum, p) => sum + p.division43Deduction, 0),
    netRentalIncome: totals.grandTotal.taxableIncome,
    notes: workpaper.notes,
  };
}

/**
 * Get expenses grouped by category for a property
 */
export function getExpensesByCategory(
  workpaper: RentalPropertyWorkpaper,
  propertyId: string
): Record<string, number> {
  const property = workpaper.properties.find(p => p.id === propertyId);
  if (!property) return {};

  const expenses = workpaper.expenses.filter(e => e.propertyId === propertyId);
  const grouped: Record<string, number> = {};

  for (const expense of expenses) {
    if (!grouped[expense.category]) {
      grouped[expense.category] = 0;
    }
    grouped[expense.category] += expense.amount;
  }

  return grouped;
}

// ==================== Alias Exports for Hook Compatibility ====================

/** @deprecated Use calculatePropertySummary */
export const calculatePropertyTotals = calculatePropertySummary;

/** Alias for exportWorkpaperForTax */
export const exportForTax = exportWorkpaperForTax;

// Type aliases for hook compatibility
export type Division40Asset = PlantEquipmentItem;
export type Division43WriteOff = CapitalWorksEntry;
export type ExpenseCategory = RentalExpenseCategory;
export type PropertyTotals = PropertySummary;

// Effective life table for common rental property assets (ATO guidelines)
export const EFFECTIVE_LIFE_TABLE: Record<string, number> = {
  'Air-conditioning assets': 20,
  'Carpets': 10,
  'Curtains and drapes': 6,
  'Dishwashers': 10,
  'Hot water systems': 12,
  'Ovens': 12,
  'Range hoods': 12,
  'Refrigerators': 10,
  'Stoves': 12,
  'Washing machines': 10,
  'Blinds': 10,
  'Ceiling fans': 10,
  'Door closers': 15,
  'Fire extinguishers': 15,
  'Garbage bins': 10,
  'Light fittings': 15,
  'Microwaves': 10,
  'Smoke detectors': 10,
  'Solar panels': 20,
  'Water pumps': 15,
};

/**
 * Calculate closing adjustable value for Division 40 asset
 */
export function calculateClosingAdjustableValue(
  openingValue: number,
  depreciation: number
): number {
  return Math.max(0, openingValue - depreciation);
}
