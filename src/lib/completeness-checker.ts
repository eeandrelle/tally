/**
 * Tax Year Completeness Checker
 * 
 * Comprehensive pre-lodgment review system that checks if the user's tax return
 * is complete before filing. Provides detailed checklist of income sources,
 * deduction categories, missing documents, and optimization opportunities.
 * 
 * @module completeness-checker
 */

import type { OptimizationOpportunity } from './tax-optimization';
import type { IncomeCategoryCode } from './income-categories';
import type { AtoCategoryCode } from './ato-categories';

// ============= TYPES =============

export type ChecklistStatus = 'complete' | 'missing' | 'partial' | 'not_applicable';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: ChecklistStatus;
  required: boolean;
  category: string;
  subcategory?: string;
  actionNeeded?: string;
  actionLink?: string;
  estimatedAmount?: number;
  claimedAmount?: number;
  potentialAmount?: number;
  receiptsAttached: number;
  receiptsRequired: number;
  icon?: string;
  helpText?: string;
  atoReference?: string;
}

export interface IncomeSourceCheck extends ChecklistItem {
  incomeCode: IncomeCategoryCode;
  prefillAvailable: boolean;
  prefillStatus?: 'available' | 'not_available' | 'imported' | 'pending';
  documentTypes: string[];
}

export interface DeductionCategoryCheck extends ChecklistItem {
  deductionCode: AtoCategoryCode;
  hasWorkpaper: boolean;
  workpaperComplete: boolean;
  typicalRange: { min: number; max: number };
  industryAverage?: number;
}

export interface MissingDocument {
  id: string;
  documentType: string;
  description: string;
  expectedSource: string;
  priority: 'high' | 'medium' | 'low';
  patternBased: boolean;
  detectionReason: string;
  dueDate?: string;
  icon: string;
}

export interface OptimizationSuggestion {
  id: string;
  opportunityId: string;
  title: string;
  description: string;
  estimatedTaxSavings: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  actionText: string;
  actionLink?: string;
  implemented: boolean;
}

export interface CompletenessScore {
  overall: number; // 0-100
  incomeScore: number;
  deductionsScore: number;
  documentsScore: number;
  optimizationScore: number;
  colorStatus: 'red' | 'amber' | 'green';
  missingItemsCount: number;
  requiredItemsCount: number;
  completedItemsCount: number;
}

export interface TaxEstimate {
  taxableIncome: number;
  totalDeductions: number;
  taxPayable: number;
  taxWithheld: number;
  estimatedRefund: number;
  estimatedTaxOwing: number;
  medicareLevy: number;
  medicareLevySurcharge?: number;
  offsets: { name: string; amount: number }[];
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
  atoReviewLikelihood: string;
  recommendations: string[];
}

export interface CompletenessReport {
  taxYear: number;
  generatedAt: Date;
  score: CompletenessScore;
  incomeChecks: IncomeSourceCheck[];
  deductionChecks: DeductionCategoryCheck[];
  missingDocuments: MissingDocument[];
  optimizationSuggestions: OptimizationSuggestion[];
  taxEstimate: TaxEstimate;
  riskAssessment: RiskAssessment;
  estimatedCompletionTime: number; // minutes
  exportData: {
    checklistData: string;
    summaryData: string;
  };
}

export interface UserTaxProfile {
  taxYear: number;
  taxableIncome: number;
  occupation: string;
  employmentType: 'full-time' | 'part-time' | 'casual' | 'contractor' | 'self-employed';
  hasInvestments: boolean;
  investmentTypes: ('shares' | 'property' | 'crypto' | 'bonds' | 'other')[];
  hasRentalProperty: boolean;
  workArrangement: 'office' | 'hybrid' | 'remote' | 'mixed';
  hasVehicle: boolean;
  isStudying: boolean;
  industry?: string;
  state: 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
  age: number;
  hasPrivateHealthInsurance: boolean;
  previousYearLodged: boolean;
}

// ============= CONSTANTS =============

const TAX_BRACKETS_2024_25 = [
  { limit: 18200, rate: 0, base: 0 },
  { limit: 45000, rate: 0.16, base: 0 },
  { limit: 135000, rate: 0.30, base: 4288 },
  { limit: 190000, rate: 0.37, base: 31288 },
  { limit: Infinity, rate: 0.45, base: 51638 }
];

const MEDICARE_LEVY_RATE = 0.02;

// Income sources that should be checked
const INCOME_SOURCES: { code: IncomeCategoryCode; name: string; required: boolean; documentTypes: string[] }[] = [
  { code: 'SALARY', name: 'Salary/Wages', required: true, documentTypes: ['PAYG Payment Summary', 'Income Statement (myGov)'] },
  { code: 'DIVIDENDS', name: 'Dividends', required: false, documentTypes: ['Dividend Statements', 'Computershare Statements', 'Link Market Services'] },
  { code: 'INTEREST', name: 'Interest Income', required: false, documentTypes: ['Bank Interest Summaries', 'Term Deposit Statements'] },
  { code: 'RENTAL', name: 'Rental Income', required: false, documentTypes: ['Property Manager Statements', 'Lease Agreements'] },
  { code: 'CAPITAL_GAINS', name: 'Capital Gains', required: false, documentTypes: ['Contract Notes', 'Settlement Statements', 'Broker Statements'] },
  { code: 'FREELANCE', name: 'Freelance/Business Income', required: false, documentTypes: ['Invoices', 'Payment Summaries', 'Business Statements'] },
  { code: 'TRUST_DISTRIBUTIONS', name: 'Trust Distributions', required: false, documentTypes: ['Trust Distribution Statements', 'AMIT Statements'] },
  { code: 'FOREIGN_INCOME', name: 'Foreign Income', required: false, documentTypes: ['Foreign Income Statements', 'Foreign Tax Documents'] },
  { code: 'GOVERNMENT_PAYMENTS', name: 'Government Payments', required: false, documentTypes: ['Centrelink Payment Summaries', 'myGov Statements'] },
  { code: 'SUPER_PENSION', name: 'Superannuation Pension', required: false, documentTypes: ['Super Fund Payment Summaries'] },
  { code: 'SUPER_LUMPSUM', name: 'Superannuation Lump Sum', required: false, documentTypes: ['Super Fund Benefit Statements'] },
  { code: 'EMPLOYMENT_TERMINATION', name: 'Employment Termination', required: false, documentTypes: ['ETP Payment Summary', 'Redundancy Letter'] },
  { code: 'ROYALTIES', name: 'Royalties', required: false, documentTypes: ['Royalty Statements', 'License Agreements'] },
  { code: 'OTHER', name: 'Other Income', required: false, documentTypes: ['Documentation'] }
];

// Deduction categories D1-D15
const DEDUCTION_CATEGORIES: { code: AtoCategoryCode; name: string; required: boolean; typicalRange: { min: number; max: number } }[] = [
  { code: 'D1', name: 'Car Expenses', required: false, typicalRange: { min: 500, max: 5000 } },
  { code: 'D2', name: 'Travel Expenses', required: false, typicalRange: { min: 200, max: 3000 } },
  { code: 'D3', name: 'Clothing & Laundry', required: false, typicalRange: { min: 100, max: 800 } },
  { code: 'D4', name: 'Self-Education', required: false, typicalRange: { min: 500, max: 3000 } },
  { code: 'D5', name: 'Other Work Expenses', required: false, typicalRange: { min: 200, max: 2000 } },
  { code: 'D6', name: 'Low Value Pool', required: false, typicalRange: { min: 0, max: 1500 } },
  { code: 'D7', name: 'Investment Deductions', required: false, typicalRange: { min: 100, max: 2000 } },
  { code: 'D8', name: 'Gifts & Donations', required: false, typicalRange: { min: 50, max: 1000 } },
  { code: 'D9', name: 'Cost of Managing Tax', required: false, typicalRange: { min: 100, max: 500 } },
  { code: 'D10', name: 'Personal Super Contributions', required: false, typicalRange: { min: 1000, max: 30000 } },
  { code: 'D11', name: 'Foreign Tax Offset', required: false, typicalRange: { min: 0, max: 5000 } },
  { code: 'D12', name: 'NRAS Offset', required: false, typicalRange: { min: 0, max: 10000 } },
  { code: 'D13', name: 'ESVCLP Offset', required: false, typicalRange: { min: 0, max: 200000 } },
  { code: 'D14', name: 'Early Stage Investor Offset', required: false, typicalRange: { min: 0, max: 200000 } },
  { code: 'D15', name: 'Exploration Credit Offset', required: false, typicalRange: { min: 0, max: 50000 } }
];

// ============= SCORING FUNCTIONS =============

/**
 * Calculate overall completeness score
 */
export function calculateCompletenessScore(
  incomeChecks: IncomeSourceCheck[],
  deductionChecks: DeductionCategoryCheck[],
  missingDocuments: MissingDocument[],
  optimizationSuggestions: OptimizationSuggestion[]
): CompletenessScore {
  // Income score (25% of total)
  const requiredIncome = incomeChecks.filter(i => i.required);
  const incomeScore = requiredIncome.length > 0 
    ? (requiredIncome.filter(i => i.status === 'complete').length / requiredIncome.length) * 100
    : 100;

  // Deductions score (25% of total)
  const deductionScore = deductionChecks.length > 0
    ? (deductionChecks.filter(d => d.status === 'complete' || d.status === 'not_applicable').length / deductionChecks.length) * 100
    : 100;

  // Documents score (25% of total)
  const totalReceipts = incomeChecks.reduce((sum, i) => sum + i.receiptsRequired, 0) +
    deductionChecks.reduce((sum, d) => sum + d.receiptsRequired, 0);
  const attachedReceipts = incomeChecks.reduce((sum, i) => sum + i.receiptsAttached, 0) +
    deductionChecks.reduce((sum, d) => sum + d.receiptsAttached, 0);
  const documentsScore = totalReceipts > 0 ? (attachedReceipts / totalReceipts) * 100 : 100;

  // Optimization score (25% of total)
  const optimizationScore = optimizationSuggestions.length > 0
    ? (optimizationSuggestions.filter(o => o.implemented).length / optimizationSuggestions.length) * 100
    : 100;

  // Weighted overall score
  const overall = Math.round(
    (incomeScore * 0.25) + 
    (deductionScore * 0.25) + 
    (documentsScore * 0.25) + 
    (optimizationScore * 0.25)
  );

  // Color status
  let colorStatus: 'red' | 'amber' | 'green';
  if (overall < 50) colorStatus = 'red';
  else if (overall < 80) colorStatus = 'amber';
  else colorStatus = 'green';

  // Count missing items
  const missingItemsCount = incomeChecks.filter(i => i.status === 'missing' || i.status === 'partial').length +
    deductionChecks.filter(d => d.status === 'missing' || d.status === 'partial').length +
    missingDocuments.length;

  const requiredItemsCount = incomeChecks.filter(i => i.required).length +
    deductionChecks.filter(d => d.required).length;

  const completedItemsCount = incomeChecks.filter(i => i.status === 'complete').length +
    deductionChecks.filter(d => d.status === 'complete').length;

  return {
    overall,
    incomeScore: Math.round(incomeScore),
    deductionsScore: Math.round(deductionScore),
    documentsScore: Math.round(documentsScore),
    optimizationScore: Math.round(optimizationScore),
    colorStatus,
    missingItemsCount,
    requiredItemsCount,
    completedItemsCount
  };
}

/**
 * Calculate tax estimate based on current data
 */
export function calculateTaxEstimate(
  taxableIncome: number,
  totalDeductions: number,
  taxWithheld: number,
  offsets: { name: string; amount: number }[] = [],
  hasPrivateHealthInsurance: boolean = false,
  _age: number = 35
): TaxEstimate {
  const deductionsTotal = totalDeductions;
  const netTaxableIncome = Math.max(0, taxableIncome - deductionsTotal);

  // Calculate tax payable
  let taxPayable = 0;
  for (const bracket of TAX_BRACKETS_2024_25) {
    if (netTaxableIncome <= bracket.limit) {
      taxPayable = bracket.base + (netTaxableIncome - (bracket.limit === Infinity ? TAX_BRACKETS_2024_25[TAX_BRACKETS_2024_25.length - 2].limit : 0)) * bracket.rate;
      break;
    }
  }

  // Medicare levy
  const medicareLevy = netTaxableIncome * MEDICARE_LEVY_RATE;

  // Medicare levy surcharge (simplified - assumes no surcharge for insured)
  let medicareLevySurcharge = 0;
  if (!hasPrivateHealthInsurance && netTaxableIncome > 93000) {
    medicareLevySurcharge = netTaxableIncome * 0.01; // 1% for simplicity
  }

  // Total offsets
  const totalOffsets = offsets.reduce((sum, o) => sum + o.amount, 0);

  // Final calculation
  const totalTax = taxPayable + medicareLevy + medicareLevySurcharge - totalOffsets;
  const estimatedRefund = Math.max(0, taxWithheld - totalTax);
  const estimatedTaxOwing = Math.max(0, totalTax - taxWithheld);

  return {
    taxableIncome,
    totalDeductions: deductionsTotal,
    taxPayable,
    taxWithheld,
    estimatedRefund,
    estimatedTaxOwing,
    medicareLevy,
    medicareLevySurcharge: medicareLevySurcharge > 0 ? medicareLevySurcharge : undefined,
    offsets
  };
}

/**
 * Assess risk level for ATO review
 */
export function assessRisk(
  profile: UserTaxProfile,
  incomeChecks: IncomeSourceCheck[],
  deductionChecks: DeductionCategoryCheck[],
  missingDocuments: MissingDocument[],
  _optimizationSuggestions: OptimizationSuggestion[]
): RiskAssessment {
  const factors: { factor: string; impact: 'positive' | 'negative' | 'neutral'; description: string }[] = [];
  let riskScore = 50; // Base score

  // Income factors
  if (profile.taxableIncome > 180000) {
    factors.push({ factor: 'High Income', impact: 'negative', description: 'Income over $180k has higher scrutiny' });
    riskScore += 10;
  }

  // Check for significant missing income
  const missingIncome = incomeChecks.filter(i => i.required && i.status === 'missing');
  if (missingIncome.length > 0) {
    factors.push({ factor: 'Missing Income', impact: 'negative', description: `${missingIncome.length} required income sources not reported` });
    riskScore += 15;
  }

  // Deduction factors
  const totalDeductions = deductionChecks.reduce((sum, d) => sum + (d.claimedAmount || 0), 0);
  const deductionRatio = profile.taxableIncome > 0 ? totalDeductions / profile.taxableIncome : 0;
  
  if (deductionRatio > 0.15) {
    factors.push({ factor: 'High Deduction Ratio', impact: 'negative', description: `Deductions are ${(deductionRatio * 100).toFixed(1)}% of income` });
    riskScore += 10;
  }

  // Work-from-home deductions without proper documentation
  const wfhCheck = deductionChecks.find(d => d.deductionCode === 'D5');
  if (wfhCheck && wfhCheck.claimedAmount && wfhCheck.claimedAmount > 1000 && wfhCheck.receiptsAttached < 3) {
    factors.push({ factor: 'Limited WFH Documentation', impact: 'negative', description: 'High WFH claim with limited receipts' });
    riskScore += 10;
  }

  // Missing documents
  if (missingDocuments.length > 3) {
    factors.push({ factor: 'Missing Documents', impact: 'negative', description: `${missingDocuments.length} documents not provided` });
    riskScore += 10;
  }

  // Complex investments
  if (profile.hasInvestments && profile.investmentTypes.includes('crypto')) {
    factors.push({ factor: 'Crypto Investments', impact: 'neutral', description: 'Cryptocurrency requires accurate record keeping' });
    riskScore += 5;
  }

  // Rental property
  if (profile.hasRentalProperty) {
    factors.push({ factor: 'Rental Property', impact: 'neutral', description: 'Rental properties are commonly reviewed' });
    riskScore += 5;
  }

  // Positive factors
  if (profile.previousYearLodged) {
    factors.push({ factor: 'Previous Lodgment', impact: 'positive', description: 'Previous tax return lodged on time' });
    riskScore -= 10;
  }

  if (deductionRatio < 0.05) {
    factors.push({ factor: 'Conservative Claims', impact: 'positive', description: 'Deduction ratio is conservative' });
    riskScore -= 5;
  }

  // Determine level
  let level: RiskLevel;
  if (riskScore >= 70) level = 'high';
  else if (riskScore >= 40) level = 'medium';
  else level = 'low';

  // ATO review likelihood
  let atoReviewLikelihood: string;
  if (level === 'high') atoReviewLikelihood = 'Elevated - Review documentation carefully';
  else if (level === 'medium') atoReviewLikelihood = 'Standard - Normal review probability';
  else atoReviewLikelihood = 'Low - Unlikely to be reviewed';

  // Recommendations
  const recommendations: string[] = [];
  if (missingDocuments.length > 0) {
    recommendations.push('Upload all missing documents before lodging');
  }
  if (deductionRatio > 0.15) {
    recommendations.push('Ensure high deduction claims are well documented');
  }
  if (missingIncome.length > 0) {
    recommendations.push('Verify all income sources are reported');
  }
  if (recommendations.length === 0) {
    recommendations.push('Your return appears ready for lodgment');
  }

  return {
    level,
    score: Math.max(0, Math.min(100, riskScore)),
    factors,
    atoReviewLikelihood,
    recommendations
  };
}

// ============= CHECKLIST GENERATION =============

/**
 * Generate income source checks based on user profile
 */
export function generateIncomeChecks(
  _profile: UserTaxProfile,
  existingData: Partial<Record<IncomeCategoryCode, { amount: number; documents: number }>>
): IncomeSourceCheck[] {
  return INCOME_SOURCES.map(source => {
    const data = existingData[source.code];
    const hasAmount = data && data.amount > 0;
    const hasDocuments = data && data.documents > 0;
    
    let status: ChecklistStatus;
    if (!source.required && !hasAmount) {
      status = 'not_applicable';
    } else if (hasAmount && hasDocuments) {
      status = 'complete';
    } else if (hasAmount && !hasDocuments) {
      status = 'partial';
    } else {
      status = 'missing';
    }

    return {
      id: `income-${source.code}`,
      title: source.name,
      description: `Check ${source.name.toLowerCase()} documentation`,
      status,
      required: source.required,
      category: 'Income',
      incomeCode: source.code,
      prefillAvailable: ['SALARY', 'DIVIDENDS', 'INTEREST', 'TRUST_DISTRIBUTIONS', 'GOVERNMENT_PAYMENTS'].includes(source.code),
      prefillStatus: hasAmount ? 'imported' : undefined,
      documentTypes: source.documentTypes,
      receiptsAttached: data?.documents || 0,
      receiptsRequired: source.required ? 1 : 0,
      claimedAmount: data?.amount || 0,
      actionNeeded: status === 'missing' ? 'Add income details' : status === 'partial' ? 'Upload supporting documents' : undefined,
      actionLink: '/income',
      icon: getIncomeIcon(source.code),
      helpText: `You need ${source.documentTypes.join(', ')} for ${source.name}`,
      atoReference: getAtoReferenceForIncome(source.code)
    };
  });
}

/**
 * Generate deduction category checks
 */
export function generateDeductionChecks(
  profile: UserTaxProfile,
  existingData: Partial<Record<AtoCategoryCode, { amount: number; workpaperComplete: boolean; receipts: number }>>
): DeductionCategoryCheck[] {
  return DEDUCTION_CATEGORIES.map(cat => {
    const data = existingData[cat.code];
    const hasAmount = data && data.amount > 0;
    const hasWorkpaper = data?.workpaperComplete || false;
    
    let status: ChecklistStatus;
    if (!hasAmount) {
      status = 'not_applicable';
    } else if (hasWorkpaper && (data?.receipts || 0) > 0) {
      status = 'complete';
    } else if (hasAmount && !hasWorkpaper) {
      status = 'partial';
    } else {
      status = 'missing';
    }

    // Adjust required based on profile
    let required = cat.required;
    if (cat.code === 'D1' && profile.hasVehicle) required = true;
    if (cat.code === 'D4' && profile.isStudying) required = true;

    return {
      id: `deduction-${cat.code}`,
      title: `${cat.code}: ${cat.name}`,
      description: `Check ${cat.name.toLowerCase()} deductions`,
      status,
      required,
      category: 'Deductions',
      deductionCode: cat.code,
      hasWorkpaper: hasWorkpaper,
      workpaperComplete: hasWorkpaper,
      typicalRange: cat.typicalRange,
      claimedAmount: data?.amount || 0,
      receiptsAttached: data?.receipts || 0,
      receiptsRequired: hasAmount ? Math.min(3, Math.ceil((data?.amount || 0) / 500)) : 0,
      actionNeeded: status === 'partial' ? 'Complete workpaper' : undefined,
      actionLink: `/deductions/${cat.code.toLowerCase()}`,
      icon: getDeductionIcon(cat.code),
      helpText: `Typical range: $${cat.typicalRange.min}-$${cat.typicalRange.max}`,
      atoReference: `https://www.ato.gov.au/individuals-and-families/deductions-you-can-claim/${cat.code.toLowerCase()}`
    };
  });
}

/**
 * Detect missing documents based on patterns
 */
export function detectMissingDocuments(
  profile: UserTaxProfile,
  existingIncome: Partial<Record<IncomeCategoryCode, { amount: number; documents: number; lastYearAmount?: number }>>,
  existingDeductions: Partial<Record<AtoCategoryCode, { amount: number; receipts: number }>>
): MissingDocument[] {
  const missing: MissingDocument[] = [];

  // Pattern: Expected dividends from previous year
  if (existingIncome.DIVIDENDS?.lastYearAmount && existingIncome.DIVIDENDS.lastYearAmount > 0 && !existingIncome.DIVIDENDS.amount) {
    missing.push({
      id: 'missing-dividends',
      documentType: 'Dividend Statements',
      description: 'Expected dividend income based on previous year',
      expectedSource: 'Computershare, Link Market Services',
      priority: 'high',
      patternBased: true,
      detectionReason: `Last year you reported $${existingIncome.DIVIDENDS.lastYearAmount.toLocaleString()} in dividends`,
      icon: 'trending-up'
    });
  }

  // Pattern: Expected interest if had savings last year
  if (existingIncome.INTEREST?.lastYearAmount && existingIncome.INTEREST.lastYearAmount > 100 && !existingIncome.INTEREST.amount) {
    missing.push({
      id: 'missing-interest',
      documentType: 'Bank Interest Summaries',
      description: 'Expected interest income based on previous year',
      expectedSource: 'Your banks',
      priority: 'medium',
      patternBased: true,
      detectionReason: `Last year you earned $${existingIncome.INTEREST.lastYearAmount.toLocaleString()} in interest`,
      icon: 'landmark'
    });
  }

  // Pattern: Vehicle expenses but no logbook
  if (existingDeductions.D1 && existingDeductions.D1.amount > 2000 && existingDeductions.D1.receipts < 2) {
    missing.push({
      id: 'missing-logbook',
      documentType: 'Vehicle Logbook',
      description: 'Logbook required for vehicle expense claims over $2,000',
      expectedSource: 'Your records',
      priority: 'high',
      patternBased: true,
      detectionReason: 'Vehicle expenses over $2,000 require logbook documentation',
      icon: 'car'
    });
  }

  // Pattern: Work from home but limited documentation
  if (profile.workArrangement === 'remote' || profile.workArrangement === 'hybrid') {
    const wfhReceipts = existingDeductions.D5?.receipts || 0;
    if (wfhReceipts < 3) {
      missing.push({
        id: 'missing-wfh',
        documentType: 'WFH Expense Records',
        description: 'Work from home expense documentation',
        expectedSource: 'Utility bills, internet receipts',
        priority: 'medium',
        patternBased: true,
        detectionReason: 'You work from home but have limited WFH documentation',
        icon: 'home'
      });
    }
  }

  // Pattern: Rental property but no statements
  if (profile.hasRentalProperty && !existingIncome.RENTAL?.amount) {
    missing.push({
      id: 'missing-rental',
      documentType: 'Rental Property Statements',
      description: 'Rental income and expense documentation',
      expectedSource: 'Property manager',
      priority: 'high',
      patternBased: false,
      detectionReason: 'Rental property owner needs to report rental income',
      icon: 'building'
    });
  }

  // Pattern: Crypto but no records
  if (profile.investmentTypes.includes('crypto')) {
    missing.push({
      id: 'missing-crypto',
      documentType: 'Cryptocurrency Transaction Records',
      description: 'All crypto buy/sell/trade transactions',
      expectedSource: 'Exchanges, wallets',
      priority: 'high',
      patternBased: false,
      detectionReason: 'Crypto investments require complete transaction history',
      icon: 'bitcoin'
    });
  }

  return missing;
}

/**
 * Generate optimization suggestions from opportunities
 */
export function generateOptimizationSuggestions(
  opportunities: OptimizationOpportunity[]
): OptimizationSuggestion[] {
  return opportunities.map(opp => ({
    id: `opt-${opp.id}`,
    opportunityId: opp.id,
    title: opp.title,
    description: opp.description,
    estimatedTaxSavings: opp.estimatedSavings,
    priority: opp.priority,
    category: opp.category,
    actionText: opp.actionItems[0] || 'Review opportunity',
    actionLink: `/optimization/${opp.id}`,
    implemented: false
  }));
}

// ============= EXPORT FUNCTIONS =============

/**
 * Generate exportable checklist data
 */
export function generateChecklistExport(report: CompletenessReport): string {
  const lines: string[] = [
    `TAX RETURN COMPLETENESS CHECKLIST - FY ${report.taxYear}`,
    `Generated: ${report.generatedAt.toLocaleString()}`,
    '',
    `OVERALL SCORE: ${report.score.overall}% (${report.score.colorStatus.toUpperCase()})`,
    `Missing Items: ${report.score.missingItemsCount}`,
    '',
    '=== INCOME SOURCES ===',
    ...report.incomeChecks.map(i => 
      `[${i.status.toUpperCase()}] ${i.title} - $${(i.claimedAmount || 0).toLocaleString()} ${i.receiptsAttached > 0 ? `(${i.receiptsAttached} docs)` : ''}`
    ),
    '',
    '=== DEDUCTION CATEGORIES ===',
    ...report.deductionChecks.map(d => 
      `[${d.status.toUpperCase()}] ${d.title} - $${(d.claimedAmount || 0).toLocaleString()}`
    ),
    '',
    '=== MISSING DOCUMENTS ===',
    ...report.missingDocuments.map(m => 
      `[${m.priority.toUpperCase()}] ${m.documentType}: ${m.description}`
    ),
    '',
    '=== TAX ESTIMATE ===',
    `Taxable Income: $${report.taxEstimate.taxableIncome.toLocaleString()}`,
    `Total Deductions: $${report.taxEstimate.totalDeductions.toLocaleString()}`,
    `Tax Payable: $${report.taxEstimate.taxPayable.toLocaleString()}`,
    `Medicare Levy: $${report.taxEstimate.medicareLevy.toLocaleString()}`,
    `Estimated Refund: $${report.taxEstimate.estimatedRefund.toLocaleString()}`,
    '',
    '=== RISK ASSESSMENT ===',
    `Risk Level: ${report.riskAssessment.level.toUpperCase()}`,
    `ATO Review Likelihood: ${report.riskAssessment.atoReviewLikelihood}`,
    '',
    'Recommendations:',
    ...report.riskAssessment.recommendations.map(r => `- ${r}`)
  ];

  return lines.join('\n');
}

/**
 * Generate summary for accountant review
 */
export function generateAccountantSummary(report: CompletenessReport): string {
  return `
TAX RETURN SUMMARY - FY ${report.taxYear}
Client Review Ready: ${report.score.overall >= 80 ? 'YES' : 'NO'}

KEY METRICS:
- Completeness Score: ${report.score.overall}%
- Taxable Income: $${report.taxEstimate.taxableIncome.toLocaleString()}
- Total Deductions: $${report.taxEstimate.totalDeductions.toLocaleString()}
- Estimated Refund: $${report.taxEstimate.estimatedRefund.toLocaleString()}

AREAS REQUIRING ATTENTION:
${report.score.missingItemsCount > 0 
  ? report.missingDocuments.map(m => `- ${m.documentType} (${m.priority})`).join('\n')
  : '- None - all critical items complete'}

OPTIMIZATION OPPORTUNITIES:
${report.optimizationSuggestions
  .filter(o => !o.implemented)
  .slice(0, 5)
  .map(o => `- ${o.title}: $${o.estimatedTaxSavings.toLocaleString()} savings`)
  .join('\n')}

RISK LEVEL: ${report.riskAssessment.level.toUpperCase()}
${report.riskAssessment.recommendations.map(r => `- ${r}`).join('\n')}
  `.trim();
}

// ============= HELPER FUNCTIONS =============

function getIncomeIcon(code: IncomeCategoryCode): string {
  const iconMap: Record<string, string> = {
    SALARY: 'briefcase',
    DIVIDENDS: 'trending-up',
    INTEREST: 'landmark',
    RENTAL: 'building',
    CAPITAL_GAINS: 'line-chart',
    FREELANCE: 'user',
    TRUST_DISTRIBUTIONS: 'users',
    FOREIGN_INCOME: 'globe',
    GOVERNMENT_PAYMENTS: 'heart',
    SUPER_PENSION: 'wallet',
    SUPER_LUMPSUM: 'wallet',
    EMPLOYMENT_TERMINATION: 'file-text',
    ROYALTIES: 'pen-tool',
    OTHER: 'help-circle'
  };
  return iconMap[code] || 'help-circle';
}

function getDeductionIcon(code: AtoCategoryCode): string {
  const iconMap: Record<string, string> = {
    D1: 'car',
    D2: 'plane',
    D3: 'shirt',
    D4: 'book-open',
    D5: 'home',
    D6: 'package',
    D7: 'trending-up',
    D8: 'heart',
    D9: 'file-text',
    D10: 'wallet',
    D11: 'globe',
    D12: 'building',
    D13: 'briefcase',
    D14: 'rocket',
    D15: 'mountain'
  };
  return iconMap[code] || 'receipt';
}

function getAtoReferenceForIncome(code: IncomeCategoryCode): string {
  const refs: Record<string, string> = {
    SALARY: 'https://www.ato.gov.au/individuals/income-deductions-offsets-and-records/income-you-must-declare/salary-and-wages',
    DIVIDENDS: 'https://www.ato.gov.au/individuals/income-deductions-offsets-and-records/income-you-must-declare/dividends',
    INTEREST: 'https://www.ato.gov.au/individuals/income-deductions-offsets-and-records/income-you-must-declare/interest',
    RENTAL: 'https://www.ato.gov.au/individuals/income-deductions-offsets-and-records/income-you-must-declare/rental-income',
    CAPITAL_GAINS: 'https://www.ato.gov.au/individuals/income-deductions-offsets-and-records/income-you-must-declare/capital-gains'
  };
  return refs[code] || '';
}

// ============= MAIN GENERATION FUNCTION =============

export interface CompletenessCheckerOptions {
  profile: UserTaxProfile;
  incomeData: Partial<Record<IncomeCategoryCode, { amount: number; documents: number; lastYearAmount?: number }>>;
  deductionData: Partial<Record<AtoCategoryCode, { amount: number; workpaperComplete: boolean; receipts: number }>>;
  opportunities: OptimizationOpportunity[];
  taxWithheld: number;
  offsets?: { name: string; amount: number }[];
}

/**
 * Generate complete completeness report
 */
export function generateCompletenessReport(options: CompletenessCheckerOptions): CompletenessReport {
  const { profile, incomeData, deductionData, opportunities, taxWithheld, offsets = [] } = options;

  // Generate all checks
  const incomeChecks = generateIncomeChecks(profile, incomeData);
  const deductionChecks = generateDeductionChecks(profile, deductionData);
  const missingDocuments = detectMissingDocuments(profile, incomeData, deductionData);
  const optimizationSuggestions = generateOptimizationSuggestions(opportunities);

  // Calculate score
  const score = calculateCompletenessScore(incomeChecks, deductionChecks, missingDocuments, optimizationSuggestions);

  // Calculate tax estimate
  const totalDeductions = Object.values(deductionData).reduce((sum, d) => sum + (d?.amount || 0), 0);
  const taxEstimate = calculateTaxEstimate(
    profile.taxableIncome,
    totalDeductions,
    taxWithheld,
    offsets,
    profile.hasPrivateHealthInsurance,
    profile.age
  );

  // Assess risk
  const riskAssessment = assessRisk(profile, incomeChecks, deductionChecks, missingDocuments, optimizationSuggestions);

  // Estimate completion time
  const incompleteItems = incomeChecks.filter(i => i.status !== 'complete' && i.status !== 'not_applicable').length +
    deductionChecks.filter(d => d.status !== 'complete' && d.status !== 'not_applicable').length +
    missingDocuments.length;
  const estimatedCompletionTime = incompleteItems * 5; // 5 minutes per item estimate

  // Build report
  const report: CompletenessReport = {
    taxYear: profile.taxYear,
    generatedAt: new Date(),
    score,
    incomeChecks,
    deductionChecks,
    missingDocuments,
    optimizationSuggestions,
    taxEstimate,
    riskAssessment,
    estimatedCompletionTime,
    exportData: {
      checklistData: '',
      summaryData: ''
    }
  };

  // Generate exports
  report.exportData.checklistData = generateChecklistExport(report);
  report.exportData.summaryData = generateAccountantSummary(report);

  return report;
}

export default {
  generateCompletenessReport,
  calculateCompletenessScore,
  calculateTaxEstimate,
  assessRisk,
  generateIncomeChecks,
  generateDeductionChecks,
  detectMissingDocuments,
  generateOptimizationSuggestions,
  generateChecklistExport,
  generateAccountantSummary
};