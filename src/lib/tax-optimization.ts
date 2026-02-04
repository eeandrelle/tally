/**
 * Tax Optimization Engine v2.0 - Expanded Rule Set
 * 
 * Enhanced rule engine with:
 * - 20 total detection rules (8 original + 12 new)
 * - Heuristic scoring for pattern confidence
 * - Year-over-year comparison logic
 * - Rule priority/relevance ranking
 * 
 * Tax Year: 2024-2025
 */

// ============= TYPES =============

export interface UserProfile {
  taxableIncome: number;
  occupation: string;
  age: number;
  hasVehicle: boolean;
  workArrangement: 'office' | 'hybrid' | 'remote' | 'mixed';
  hasInvestments: boolean;
  investmentTypes: ('shares' | 'property' | 'crypto' | 'bonds' | 'other')[];
  isStudying: boolean;
  studyField?: string;
  hasHomeOffice: boolean;
  employmentType: 'full-time' | 'part-time' | 'casual' | 'contractor' | 'self-employed';
  yearsWithAccountant: number;
  industry?: string;
  yearsInCurrentRole?: number;
  previousYearDeductions?: number;
  state?: 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
}

export interface ExpenseRecord {
  id: string;
  category: string;
  subcategory?: string;
  amount: number;
  date: Date;
  description: string;
  hasReceipt: boolean;
  tags?: string[];
  isRecurring?: boolean;
}

export interface ExpenseHistory {
  taxYear: number;
  expenses: ExpenseRecord[];
  totalDeductions: number;
  lastUpdated: Date;
}

export interface YearOverYearComparison {
  taxYear: number;
  totalDeductions: number;
  categoryTotals: Record<string, number>;
  expenseCount: number;
  hasData: boolean;
}

export interface HeuristicScore {
  baseScore: number;
  evidenceBonus: number;
  patternStrength: number;
  historicalConsistency: number;
  industryRelevance: number;
  finalScore: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface OptimizationOpportunity {
  id: string;
  type: 'missing_deduction' | 'better_method' | 'timing' | 'categorization' | 'pattern_gap' | 'yoy_anomaly' | 'industry_specific';
  category: string;
  title: string;
  description: string;
  estimatedSavings: number;
  confidence: 'high' | 'medium' | 'low';
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionItems: string[];
  taxImpact: string;
  aTOReference?: string;
  heuristicScore?: HeuristicScore;
  relevanceScore?: number;
  yoyComparison?: YearOverYearComparison;
}

export interface PatternMatch {
  pattern: string;
  detected: boolean;
  evidence: string[];
  confidence: number;
  heuristicScore: HeuristicScore;
}

export interface OptimizationResult {
  opportunities: OptimizationOpportunity[];
  totalPotentialSavings: number;
  patternsDetected: PatternMatch[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    averageConfidence: number;
    yoyAnomaliesDetected: number;
  };
  yoyComparisons: YearOverYearComparison[];
  rankedRules: RankedRule[];
}

export interface DetectionRule {
  id: string;
  name: string;
  category: string;
  check: (profile: UserProfile, history: ExpenseHistory, allHistory?: ExpenseHistory[], context?: RuleContext) => OptimizationOpportunity | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  relevanceScore?: (profile: UserProfile, history: ExpenseHistory) => number;
  industryRelevance?: string[];
}

export interface RuleContext {
  yoyComparisons?: YearOverYearComparison[];
  industryAverages?: Record<string, number>;
  occupationBenchmarks?: Record<string, number[]>;
}

export interface RankedRule {
  ruleId: string;
  ruleName: string;
  relevanceScore: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  triggered: boolean;
  estimatedImpact: number;
}

// ============= CONSTANTS =============

const WFH_CATEGORIES = ['D5', 'work-from-home', 'home-office', 'utilities-work'];
const VEHICLE_CATEGORIES = ['D1', 'car-expenses', 'vehicle', 'motor-vehicle', 'transport-work'];
const DIVIDEND_CATEGORIES = ['dividend', 'investment-income', 'shares', 'D7'];
const EDUCATION_CATEGORIES = ['D4', 'self-education', 'course-fees', 'study', 'training'];
const DEPRECIATION_CATEGORIES = ['D6', 'low-value-pool', 'depreciation', 'asset-write-off'];
const TRAVEL_CATEGORIES = ['D2', 'travel', 'accommodation', 'flights', 'transport'];
const PROFESSIONAL_CATEGORIES = ['D3', 'professional', 'subscriptions', 'memberships', 'licenses'];
const HEALTH_CATEGORIES = ['medical', 'health', 'insurance-health', 'D10'];
const CLOTHING_CATEGORIES = ['D3', 'uniform', 'protective', 'laundry'];

// 2024-2025 Tax brackets
const TAX_BRACKETS = [
  { limit: 18200, rate: 0 },
  { limit: 45000, rate: 0.16 },
  { limit: 135000, rate: 0.30 },
  { limit: 190000, rate: 0.37 },
  { limit: Infinity, rate: 0.45 }
];

// Industry benchmarks (% of income typically deducted)
const INDUSTRY_BENCHMARKS: Record<string, number> = {
  'construction': 0.08,
  'healthcare': 0.05,
  'education': 0.04,
  'finance': 0.06,
  'it': 0.07,
  'legal': 0.06,
  'hospitality': 0.04,
  'retail': 0.03,
  'transport': 0.09,
  'mining': 0.10,
  'professional': 0.06,
  'other': 0.05
};

// Occupation-specific deduction categories
const OCCUPATION_DEDUCTIONS: Record<string, string[]> = {
  'tradesperson': ['tools', 'vehicle', 'protective-clothing', 'laundry'],
  'teacher': ['self-education', 'stationery', 'travel', 'home-office'],
  'nurse': ['uniform', 'education', 'travel', 'professional'],
  'office-worker': ['home-office', 'stationery', 'professional'],
  'sales': ['vehicle', 'travel', 'entertainment', 'phone'],
  'it': ['home-office', 'equipment', 'self-education', 'subscriptions'],
  'driver': ['vehicle', 'meals', 'travel', 'phone'],
  'chef': ['knives', 'uniform', 'travel'],
  'lawyer': ['professional', 'self-education', 'home-office'],
  'accountant': ['professional', 'self-education', 'software']
};

// ============= HEURISTIC SCORING =============

/**
 * Calculate heuristic confidence score for a detection
 */
export function calculateHeuristicScore(
  profile: UserProfile,
  history: ExpenseHistory,
  evidence: string[],
  baseConfidence: number,
  ruleId: string
): HeuristicScore {
  let evidenceBonus = Math.min(evidence.length * 0.1, 0.3);
  
  // Pattern strength based on expense count and consistency
  const expenseCount = history.expenses.length;
  const patternStrength = Math.min(expenseCount / 50, 1.0) * 0.3;
  
  // Historical consistency
  let historicalConsistency = 0;
  if (profile.previousYearDeductions && profile.previousYearDeductions > 0) {
    const currentRatio = history.totalDeductions / profile.taxableIncome;
    const previousRatio = profile.previousYearDeductions / (profile.taxableIncome * 0.95); // Assume 5% income growth
    const ratioDiff = Math.abs(currentRatio - previousRatio);
    historicalConsistency = Math.max(0, 0.2 - ratioDiff);
  }
  
  // Industry relevance
  let industryRelevance = 0.1;
  if (profile.industry && INDUSTRY_BENCHMARKS[profile.industry.toLowerCase()]) {
    const benchmark = INDUSTRY_BENCHMARKS[profile.industry.toLowerCase()];
    const actualRatio = history.totalDeductions / profile.taxableIncome;
    if (actualRatio < benchmark * 0.5) {
      industryRelevance = 0.3; // Significantly below benchmark
    } else if (actualRatio < benchmark) {
      industryRelevance = 0.2;
    }
  }
  
  const finalScore = Math.min(baseConfidence + evidenceBonus + patternStrength + historicalConsistency + industryRelevance, 1.0);
  
  let confidenceLevel: 'high' | 'medium' | 'low';
  if (finalScore >= 0.75) confidenceLevel = 'high';
  else if (finalScore >= 0.5) confidenceLevel = 'medium';
  else confidenceLevel = 'low';
  
  return {
    baseScore: baseConfidence,
    evidenceBonus,
    patternStrength,
    historicalConsistency,
    industryRelevance,
    finalScore,
    confidenceLevel
  };
}

// ============= YEAR-OVER-YEAR COMPARISON =============

/**
 * Build year-over-year comparison data
 */
export function buildYoYComparisons(allHistory: ExpenseHistory[]): YearOverYearComparison[] {
  if (!allHistory || allHistory.length === 0) return [];
  
  const sorted = [...allHistory].sort((a, b) => b.taxYear - a.taxYear);
  
  return sorted.map(history => {
    const categoryTotals: Record<string, number> = {};
    for (const expense of history.expenses) {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    }
    
    return {
      taxYear: history.taxYear,
      totalDeductions: history.totalDeductions,
      categoryTotals,
      expenseCount: history.expenses.length,
      hasData: true
    };
  });
}

/**
 * Detect year-over-year anomalies
 */
export function detectYoYAnomalies(
  currentHistory: ExpenseHistory,
  comparisons: YearOverYearComparison[]
): { category: string; current: number; previous: number; change: number; severity: 'high' | 'medium' | 'low' }[] {
  const anomalies = [];
  const previousYear = comparisons.find(c => c.taxYear === currentHistory.taxYear - 1);
  
  if (!previousYear || !previousYear.hasData) return anomalies;
  
  const currentCategories = new Set(currentHistory.expenses.map(e => e.category));
  const previousCategories = new Set(Object.keys(previousYear.categoryTotals));
  
  // Check for missing categories from previous year
  for (const category of previousCategories) {
    const previousAmount = previousYear.categoryTotals[category] || 0;
    const currentAmount = currentCategories.has(category) 
      ? currentHistory.expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0)
      : 0;
    
    if (previousAmount > 500 && currentAmount < previousAmount * 0.3) {
      const change = previousAmount > 0 ? (currentAmount - previousAmount) / previousAmount : -1;
      const severity = change < -0.7 ? 'high' : change < -0.5 ? 'medium' : 'low';
      anomalies.push({ category, current: currentAmount, previous: previousAmount, change, severity });
    }
  }
  
  return anomalies;
}

// ============= UTILITY FUNCTIONS =============

export function getMarginalTaxRate(income: number): number {
  for (const bracket of TAX_BRACKETS) {
    if (income <= bracket.limit) return bracket.rate;
  }
  return 0.45;
}

export function calculateTaxSavings(deductionAmount: number, taxableIncome: number): number {
  const marginalRate = getMarginalTaxRate(taxableIncome);
  return Math.round(deductionAmount * marginalRate * 100) / 100;
}

function hasExpensesInCategories(history: ExpenseHistory, categories: string[]): boolean {
  return history.expenses.some(e => 
    categories.some(cat => 
      e.category.toLowerCase().includes(cat.toLowerCase()) ||
      (e.subcategory && e.subcategory.toLowerCase().includes(cat.toLowerCase()))
    )
  );
}

function getCategoryTotal(history: ExpenseHistory, categories: string[]): number {
  return history.expenses
    .filter(e => 
      categories.some(cat => 
        e.category.toLowerCase().includes(cat.toLowerCase()) ||
        (e.subcategory && e.subcategory.toLowerCase().includes(cat.toLowerCase()))
      )
    )
    .reduce((sum, e) => sum + e.amount, 0);
}

function countExpensesInCategories(history: ExpenseHistory, categories: string[]): number {
  return history.expenses.filter(e => 
    categories.some(cat => 
      e.category.toLowerCase().includes(cat.toLowerCase()) ||
      (e.subcategory && e.subcategory.toLowerCase().includes(cat.toLowerCase()))
    )
  ).length;
}

function getMonthlyDistribution(history: ExpenseHistory): Record<number, number> {
  const distribution: Record<number, number> = {};
  for (const expense of history.expenses) {
    const month = expense.date.getMonth();
    distribution[month] = (distribution[month] || 0) + expense.amount;
  }
  return distribution;
}

function getExpenseByKeyword(history: ExpenseHistory, keywords: string[]): ExpenseRecord[] {
  return history.expenses.filter(e => 
    keywords.some(kw => 
      e.description.toLowerCase().includes(kw.toLowerCase()) ||
      e.category.toLowerCase().includes(kw.toLowerCase())
    )
  );
}

function getQuarterlyPattern(history: ExpenseHistory): Record<number, number> {
  const quarterly: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const expense of history.expenses) {
    const quarter = Math.floor(expense.date.getMonth() / 3);
    quarterly[quarter] += expense.amount;
  }
  return quarterly;
}

// ============= ORIGINAL 8 DETECTION RULES =============

const wfhMissingRule: DetectionRule = {
  id: 'WFH-001',
  name: 'Missing Work From Home Deductions',
  category: 'work-from-home',
  priority: 'critical',
  relevanceScore: (profile) => profile.workArrangement === 'remote' ? 1.0 : profile.workArrangement === 'hybrid' ? 0.7 : 0.1,
  check: (profile, history, _allHistory, context) => {
    const hasWFH = profile.workArrangement === 'remote' || profile.workArrangement === 'hybrid';
    const hasWFHExpenses = hasExpensesInCategories(history, WFH_CATEGORIES);
    
    if (hasWFH && !hasWFHExpenses) {
      const estimatedWFH = profile.workArrangement === 'remote' ? 1500 : 800;
      const savings = calculateTaxSavings(estimatedWFH, profile.taxableIncome);
      const evidence = [`Work arrangement: ${profile.workArrangement}`, 'No WFH expenses detected'];
      
      // Check YoY for previous WFH claims
      if (context?.yoyComparisons) {
        const prevYear = context.yoyComparisons.find(y => y.taxYear === history.taxYear - 1);
        if (prevYear && prevYear.categoryTotals['D5'] > 0) {
          evidence.push(`Previous year WFH deductions: $${prevYear.categoryTotals['D5']}`);
        }
      }
      
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.8, 'WFH-001');
      
      return {
        id: 'WFH-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'work-from-home',
        title: 'Missing Work From Home Deductions',
        description: `You work ${profile.workArrangement} but have no WFH deductions claimed. Remote workers typically claim $1,000-$3,000 in home office expenses.`,
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'critical',
        actionItems: [
          'Gather utility bills (electricity, gas, internet)',
          'Calculate home office space percentage',
          'Choose method: Fixed rate ($0.67/hour) or Actual cost',
          'Consider depreciation on office furniture/equipment'
        ],
        taxImpact: `Potential deduction: $${estimatedWFH.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'TR 93/30, PCG 2023/1',
        heuristicScore
      };
    }
    return null;
  }
};

const vehicleLogbookGapRule: DetectionRule = {
  id: 'VEH-001',
  name: 'Vehicle Logbook Gap',
  category: 'vehicle-expenses',
  priority: 'high',
  relevanceScore: (profile) => profile.hasVehicle ? 0.9 : 0.2,
  check: (profile, history) => {
    const hasVehicleExpenses = hasExpensesInCategories(history, VEHICLE_CATEGORIES);
    const vehicleTotal = getCategoryTotal(history, VEHICLE_CATEGORIES);
    const expenseCount = countExpensesInCategories(history, VEHICLE_CATEGORIES);
    
    if (vehicleTotal > 2000 && expenseCount < 5) {
      const potentialAdditional = vehicleTotal * 0.3;
      const savings = calculateTaxSavings(potentialAdditional, profile.taxableIncome);
      const evidence = [`Vehicle expenses: $${vehicleTotal}`, `Entry count: ${expenseCount}`];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.6, 'VEH-001');
      
      return {
        id: 'VEH-001-' + Date.now(),
        type: 'better_method',
        category: 'vehicle-expenses',
        title: 'Vehicle Logbook Method Opportunity',
        description: `You have $${vehicleTotal.toLocaleString()} in vehicle expenses but limited documentation. A 12-week logbook could significantly increase your claim.`,
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'high',
        actionItems: [
          'Start 12-week continuous logbook immediately',
          'Record all trips: date, purpose, kilometers',
          'Track all vehicle expenses (fuel, rego, insurance, maintenance)',
          'Compare cents-per-km vs logbook method at EOFY'
        ],
        taxImpact: `Potential additional deduction: $${potentialAdditional.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'IT 2346, Logbook Method',
        heuristicScore
      };
    }
    return null;
  }
};

const dividendPatternGapRule: DetectionRule = {
  id: 'DIV-001',
  name: 'Missing Dividend Statements',
  category: 'investment-income',
  priority: 'high',
  relevanceScore: (profile) => profile.hasInvestments && profile.investmentTypes.includes('shares') ? 1.0 : 0.1,
  check: (profile, history, allHistory) => {
    if (!profile.hasInvestments || !profile.investmentTypes.includes('shares')) return null;
    
    const hasDividendExpenses = hasExpensesInCategories(history, DIVIDEND_CATEGORIES);
    const monthlyDist = getMonthlyDistribution(history);
    const typicalDividendMonths = [1, 2, 4, 5, 7, 8, 10, 11];
    const hasDividendMonths = typicalDividendMonths.some(m => monthlyDist[m] > 0);
    
    if (!hasDividendExpenses && !hasDividendMonths) {
      const estimatedDividendIncome = profile.taxableIncome * 0.05;
      const estimatedFranking = estimatedDividendIncome * 0.30;
      const savings = estimatedFranking;
      const evidence = ['Share investments declared', 'No dividend income recorded', 'Missing typical dividend months'];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.6, 'DIV-001');
      
      return {
        id: 'DIV-001-' + Date.now(),
        type: 'pattern_gap',
        category: 'investment-income',
        title: 'Missing Dividend Statements',
        description: 'You have share investments but no dividend income recorded. Most ASX companies pay dividends twice yearly.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'high',
        actionItems: [
          'Check Computershare and Link Market Services accounts',
          'Review bank statements for dividend deposits',
          'Request duplicate statements if needed',
          'Don\'t forget franking credits - they reduce your tax'
        ],
        taxImpact: `Estimated franking credits: $${savings.toLocaleString()} → Direct tax reduction`,
        aTOReference: 'DIVIDEND: Item 11',
        heuristicScore
      };
    }
    return null;
  }
};

const selfEducationOpportunityRule: DetectionRule = {
  id: 'EDU-001',
  name: 'Self-Education Opportunity',
  category: 'self-education',
  priority: 'medium',
  relevanceScore: (profile) => profile.isStudying ? 1.0 : 
    ['accounting', 'law', 'medical', 'engineering', 'it', 'teaching', 'finance'].some(f => 
      profile.occupation?.toLowerCase().includes(f)) ? 0.7 : 0.2,
  check: (profile, history) => {
    const hasEducationExpenses = hasExpensesInCategories(history, EDUCATION_CATEGORIES);
    const educationIntensiveFields = ['accounting', 'law', 'medical', 'engineering', 'it', 'teaching', 'finance'];
    const fieldMatches = profile.occupation && educationIntensiveFields.some(f => 
      profile.occupation.toLowerCase().includes(f)
    );
    
    if ((profile.isStudying || fieldMatches) && !hasEducationExpenses) {
      const estimatedEducation = profile.isStudying ? 2000 : 1000;
      const savings = calculateTaxSavings(estimatedEducation, profile.taxableIncome);
      const evidence = profile.isStudying ? ['Currently studying'] : [`Occupation: ${profile.occupation}`];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.6, 'EDU-001');
      
      return {
        id: 'EDU-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'self-education',
        title: 'Self-Education Deduction Opportunity',
        description: profile.isStudying 
          ? `You're currently studying but have no education expenses claimed. Course fees, textbooks, and travel to campus may be deductible.`
          : `Your occupation (${profile.occupation}) typically requires ongoing professional development.`,
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'medium',
        actionItems: [
          'Gather course fee receipts and invoices',
          'Collect textbook and material receipts',
          'Track travel costs to educational activities',
          'Check if course relates to current employment'
        ],
        taxImpact: `Potential deduction: $${estimatedEducation.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'TR 98/9, D4 Self-education',
        heuristicScore
      };
    }
    return null;
  }
};

const depreciationOverlookedRule: DetectionRule = {
  id: 'DEP-001',
  name: 'Depreciation Opportunities',
  category: 'depreciation',
  priority: 'medium',
  check: (profile, history) => {
    const hasDepreciation = hasExpensesInCategories(history, DEPRECIATION_CATEGORIES);
    const largePurchases = history.expenses.filter(e => 
      e.amount > 300 && 
      !DEPRECIATION_CATEGORIES.some(cat => e.category.toLowerCase().includes(cat.toLowerCase()))
    );
    
    if (largePurchases.length > 0 && !hasDepreciation) {
      const totalLargePurchases = largePurchases.reduce((sum, e) => sum + e.amount, 0);
      const estimatedDepreciation = totalLargePurchases * 0.20;
      const savings = calculateTaxSavings(estimatedDepreciation, profile.taxableIncome);
      const evidence = [`${largePurchases.length} purchases over $300`];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.5, 'DEP-001');
      
      return {
        id: 'DEP-001-' + Date.now(),
        type: 'categorization',
        category: 'depreciation',
        title: 'Asset Depreciation Opportunity',
        description: `You have ${largePurchases.length} purchases over $300 that might be depreciable assets.`,
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'medium',
        actionItems: [
          'Review purchases over $300 for work-related assets',
          'Identify items with multi-year use',
          'Consider low-value pool for assets <$1,000',
          'Use simplified depreciation rules if eligible'
        ],
        taxImpact: `Estimated annual depreciation: $${estimatedDepreciation.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'D6 Low-value pool, TR 2017/2',
        heuristicScore
      };
    }
    return null;
  }
};

const internetPhoneGapRule: DetectionRule = {
  id: 'UTIL-001',
  name: 'Missing Internet/Phone Deductions',
  category: 'work-from-home',
  priority: 'medium',
  relevanceScore: (profile) => profile.workArrangement === 'remote' ? 0.9 : profile.workArrangement === 'hybrid' ? 0.7 : 0.3,
  check: (profile, history) => {
    const hasWFH = profile.workArrangement === 'remote' || profile.workArrangement === 'hybrid';
    const hasInternetPhone = history.expenses.some(e => 
      e.description.toLowerCase().includes('internet') ||
      e.description.toLowerCase().includes('phone') ||
      e.description.toLowerCase().includes('mobile') ||
      e.category.toLowerCase().includes('utilities')
    );
    
    if (hasWFH && !hasInternetPhone) {
      const estimatedUtility = 600;
      const savings = calculateTaxSavings(estimatedUtility, profile.taxableIncome);
      const evidence = ['Work from home confirmed', 'No internet/phone expenses'];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.8, 'UTIL-001');
      
      return {
        id: 'UTIL-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'work-from-home',
        title: 'Missing Internet & Phone Deductions',
        description: 'You work from home but have no internet or phone expenses claimed. Work-related portion is deductible.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'medium',
        actionItems: [
          'Gather 12 months of internet bills',
          'Collect phone bills and identify work calls',
          'Calculate work-use percentage (typically 20-50%)',
          'Keep a 4-week representative diary'
        ],
        taxImpact: `Potential deduction: $${estimatedUtility.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'PCG 2023/1, D5 Other work-related',
        heuristicScore
      };
    }
    return null;
  }
};

const timingOptimizationRule: DetectionRule = {
  id: 'TIME-001',
  name: 'EOFY Purchase Timing',
  category: 'timing',
  priority: 'low',
  check: (profile, history) => {
    const now = new Date();
    const isJune = now.getMonth() === 5;
    if (!isJune && now.getMonth() !== 4) return null;
    
    const hasWorkExpenses = history.expenses.some(e => 
      e.category.startsWith('D') || e.category.toLowerCase().includes('work')
    );
    
    if (hasWorkExpenses) {
      const potentialDeduction = 500;
      const savings = calculateTaxSavings(potentialDeduction, profile.taxableIncome);
      const evidence = ['Work expenses detected', 'EOFY timing'];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.4, 'TIME-001');
      
      return {
        id: 'TIME-001-' + Date.now(),
        type: 'timing',
        category: 'timing',
        title: 'EOFY Purchase Timing Opportunity',
        description: 'Consider bringing forward work-related purchases to before June 30.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'low',
        actionItems: [
          'Identify needed work equipment or supplies',
          'Make purchases before June 30',
          'Keep all receipts',
          'Consider instant asset write-off if eligible'
        ],
        taxImpact: `Immediate deduction: $${potentialDeduction.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'Timing of deductions',
        heuristicScore
      };
    }
    return null;
  }
};

const donationsMissingRule: DetectionRule = {
  id: 'DON-001',
  name: 'Charitable Donations',
  category: 'donations',
  priority: 'low',
  relevanceScore: (profile) => profile.taxableIncome > 100000 ? 0.6 : 0.3,
  check: (profile, history) => {
    const hasDonations = history.expenses.some(e => 
      e.category.toLowerCase().includes('donation') ||
      e.category.toLowerCase().includes('charity') ||
      e.category === 'D8'
    );
    
    if (!hasDonations && profile.taxableIncome > 100000) {
      const estimatedDonations = 500;
      const savings = calculateTaxSavings(estimatedDonations, profile.taxableIncome);
      const evidence = ['High income bracket', 'No donations recorded'];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.3, 'DON-001');
      
      return {
        id: 'DON-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'donations',
        title: 'Charitable Donation Records',
        description: 'You may have charitable donations that qualify for tax deductions.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'low',
        actionItems: [
          'Review bank statements for charitable payments',
          'Gather receipts from DGR-registered charities',
          'Check workplace giving programs',
          'Consider bunching donations for greater impact'
        ],
        taxImpact: `Potential deduction: $${estimatedDonations.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'D8 Gifts and donations',
        heuristicScore
      };
    }
    return null;
  }
};

// ============= 12 NEW DETECTION RULES =============

/**
 * Rule 9: Missing travel deductions for occupations requiring travel
 */
const travelDeductionGapRule: DetectionRule = {
  id: 'TRAV-001',
  name: 'Missing Travel Deductions',
  category: 'travel',
  priority: 'high',
  industryRelevance: ['sales', 'consulting', 'trades', 'healthcare', 'education'],
  relevanceScore: (profile) => {
    const travelIntensive = ['sales', 'consultant', 'tradesperson', 'nurse', 'teacher'];
    return travelIntensive.some(t => profile.occupation?.toLowerCase().includes(t)) ? 0.9 : 0.3;
  },
  check: (profile, history, _allHistory, context) => {
    const hasTravelExpenses = hasExpensesInCategories(history, TRAVEL_CATEGORIES);
    const travelIntensiveOccupations = ['sales', 'consultant', 'representative', 'tradesperson', 'nurse', 'carer'];
    const isTravelIntensive = travelIntensiveOccupations.some(t => 
      profile.occupation?.toLowerCase().includes(t)
    );
    
    if (isTravelIntensive && !hasTravelExpenses) {
      const estimatedTravel = 1500;
      const savings = calculateTaxSavings(estimatedTravel, profile.taxableIncome);
      const evidence = [`Occupation: ${profile.occupation}`, 'No travel expenses recorded'];
      
      // Check YoY
      if (context?.yoyComparisons) {
        const prevYear = context.yoyComparisons.find(y => y.taxYear === history.taxYear - 1);
        if (prevYear && (prevYear.categoryTotals['D2'] > 0 || prevYear.categoryTotals['travel'] > 0)) {
          evidence.push(`Previous year travel: $${prevYear.categoryTotals['D2'] || prevYear.categoryTotals['travel']}`);
        }
      }
      
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.75, 'TRAV-001');
      
      return {
        id: 'TRAV-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'travel',
        title: 'Missing Work-Related Travel Deductions',
        description: `Your occupation (${profile.occupation}) typically involves significant travel. No travel expenses have been recorded.`,
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'high',
        actionItems: [
          'Review calendar for work trips and client visits',
          'Gather receipts for accommodation, flights, fuel',
          'Calculate vehicle expenses using logbook or cents/km',
          'Check for overnight travel allowances'
        ],
        taxImpact: `Potential deduction: $${estimatedTravel.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'D2 Work-related travel',
        heuristicScore
      };
    }
    return null;
  }
};

/**
 * Rule 10: Missing professional subscriptions/memberships
 */
const professionalSubscriptionsRule: DetectionRule = {
  id: 'PROF-001',
  name: 'Missing Professional Subscriptions',
  category: 'professional',
  priority: 'medium',
  relevanceScore: (profile) => {
    const profOccupations = ['accountant', 'lawyer', 'engineer', 'architect', 'medical', 'teacher'];
    return profOccupations.some(o => profile.occupation?.toLowerCase().includes(o)) ? 0.85 : 0.3;
  },
  check: (profile, history) => {
    const hasProfessionalExpenses = hasExpensesInCategories(history, PROFESSIONAL_CATEGORIES);
    const professionalOccupations = ['accountant', 'lawyer', 'engineer', 'architect', 'medical', 'nurse', 'teacher'];
    const isProfessional = professionalOccupations.some(o => 
      profile.occupation?.toLowerCase().includes(o)
    );
    
    if (isProfessional && !hasProfessionalExpenses) {
      const estimatedSubscriptions = 400;
      const savings = calculateTaxSavings(estimatedSubscriptions, profile.taxableIncome);
      const evidence = [`Professional occupation: ${profile.occupation}`, 'No subscriptions/memberships recorded'];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.7, 'PROF-001');
      
      return {
        id: 'PROF-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'professional',
        title: 'Missing Professional Subscriptions',
        description: 'Professionals typically have deductible subscriptions, memberships, and licenses.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'medium',
        actionItems: [
          'Check professional body membership fees',
          'Review industry magazine/journal subscriptions',
          'Gather professional license renewal receipts',
          'Check union or association fees'
        ],
        taxImpact: `Potential deduction: $${estimatedSubscriptions.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'D3 Professional subscriptions',
        heuristicScore
      };
    }
    return null;
  }
};

/**
 * Rule 11: Year-over-year deduction drop anomaly
 */
const yoyDeductionDropRule: DetectionRule = {
  id: 'YOY-001',
  name: 'Year-over-Year Deduction Drop',
  category: 'yoy-anomaly',
  priority: 'high',
  check: (profile, history, allHistory) => {
    if (!allHistory || allHistory.length < 2) return null;
    
    const comparisons = buildYoYComparisons(allHistory);
    const anomalies = detectYoYAnomalies(history, comparisons);
    
    if (anomalies.length > 0) {
      const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
      if (highSeverityAnomalies.length > 0) {
        const totalDrop = highSeverityAnomalies.reduce((sum, a) => sum + a.previous, 0);
        const savings = calculateTaxSavings(totalDrop * 0.5, profile.taxableIncome);
        const evidence = highSeverityAnomalies.map(a => `${a.category}: dropped ${Math.round(a.change * 100)}%`);
        const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.8, 'YOY-001');
        
        return {
          id: 'YOY-001-' + Date.now(),
          type: 'yoy_anomaly',
          category: 'yoy-anomaly',
          title: 'Significant Deduction Drop Detected',
          description: `Your deductions in ${highSeverityAnomalies.length} categories dropped significantly compared to last year. You may be missing expenses.`,
          estimatedSavings: savings,
          confidence: heuristicScore.confidenceLevel,
          priority: 'high',
          actionItems: [
            'Review previous year deductions for comparison',
            'Check if any regular expenses were missed',
            'Verify all receipts were captured',
            'Consider if work circumstances changed'
          ],
          taxImpact: `Potential missing deductions: $${(totalDrop * 0.5).toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
          aTOReference: 'Record keeping requirements',
          heuristicScore,
          yoyComparison: comparisons[1]
        };
      }
    }
    return null;
  }
};

/**
 * Rule 12: Uniform and protective clothing gap
 */
const uniformClothingGapRule: DetectionRule = {
  id: 'UNI-001',
  name: 'Missing Uniform Deductions',
  category: 'clothing',
  priority: 'medium',
  industryRelevance: ['healthcare', 'hospitality', 'construction', 'retail', 'manufacturing'],
  relevanceScore: (profile) => {
    const uniformOccupations = ['nurse', 'chef', 'tradesperson', 'retail', 'police', 'security'];
    return uniformOccupations.some(o => profile.occupation?.toLowerCase().includes(o)) ? 0.9 : 0.2;
  },
  check: (profile, history) => {
    const hasClothingExpenses = hasExpensesInCategories(history, CLOTHING_CATEGORIES);
    const uniformOccupations = ['nurse', 'chef', 'cook', 'tradesperson', 'electrician', 'plumber', 'retail', 'police', 'security'];
    const needsUniform = uniformOccupations.some(o => 
      profile.occupation?.toLowerCase().includes(o)
    );
    
    if (needsUniform && !hasClothingExpenses) {
      const estimatedClothing = 350;
      const savings = calculateTaxSavings(estimatedClothing, profile.taxableIncome);
      const evidence = [`Occupation requires uniform: ${profile.occupation}`, 'No clothing expenses recorded'];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.75, 'UNI-001');
      
      return {
        id: 'UNI-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'clothing',
        title: 'Missing Uniform & Protective Clothing',
        description: 'Your occupation typically requires deductible uniform or protective clothing.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'medium',
        actionItems: [
          'Gather receipts for compulsory uniform purchases',
          'Include protective clothing and safety equipment',
          'Track laundry expenses (up to $150 without receipts)',
          'Check occupation-specific clothing requirements'
        ],
        taxImpact: `Potential deduction: $${estimatedClothing.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'D3 Uniforms and protective clothing',
        heuristicScore
      };
    }
    return null;
  }
};

/**
 * Rule 13: Low total deductions relative to income benchmark
 */
const lowDeductionBenchmarkRule: DetectionRule = {
  id: 'BENCH-001',
  name: 'Below Industry Deduction Benchmark',
  category: 'benchmark',
  priority: 'medium',
  check: (profile, history) => {
    if (!profile.industry) return null;
    
    const benchmark = INDUSTRY_BENCHMARKS[profile.industry.toLowerCase()] || 0.05;
    const actualRatio = history.totalDeductions / profile.taxableIncome;
    const expectedDeductions = profile.taxableIncome * benchmark;
    
    if (actualRatio < benchmark * 0.5 && expectedDeductions > 1000) {
      const missingDeductions = expectedDeductions - history.totalDeductions;
      const savings = calculateTaxSavings(missingDeductions * 0.5, profile.taxableIncome);
      const evidence = [`Industry: ${profile.industry}`, `Current ratio: ${(actualRatio * 100).toFixed(1)}%`, `Benchmark: ${(benchmark * 100).toFixed(1)}%`];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.6, 'BENCH-001');
      
      return {
        id: 'BENCH-001-' + Date.now(),
        type: 'pattern_gap',
        category: 'benchmark',
        title: 'Deductions Below Industry Average',
        description: `Your deductions are significantly below the typical range for ${profile.industry} workers. You may be missing claimable expenses.`,
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'medium',
        actionItems: [
          `Research typical deductions for ${profile.industry} workers`,
          'Review all work-related expenses thoroughly',
          'Check for commonly missed deductions in your field',
          'Consider a consultation with a tax professional'
        ],
        taxImpact: `Potential additional deductions: $${(missingDeductions * 0.5).toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'Record keeping and reasonable claims',
        heuristicScore
      };
    }
    return null;
  }
};

/**
 * Rule 14: Missing meal expenses for overtime/travel
 */
const mealExpenseGapRule: DetectionRule = {
  id: 'MEAL-001',
  name: 'Missing Meal Expense Deductions',
  category: 'meals',
  priority: 'low',
  relevanceScore: (profile) => profile.employmentType === 'shift-worker' || profile.workArrangement === 'mixed' ? 0.7 : 0.3,
  check: (profile, history) => {
    const hasMealExpenses = history.expenses.some(e => 
      e.description.toLowerCase().includes('meal') ||
      e.description.toLowerCase().includes('lunch') ||
      e.description.toLowerCase().includes('dinner') ||
      e.category.toLowerCase().includes('meal')
    );
    
    const shiftWorkOccupations = ['nurse', 'doctor', 'paramedic', 'police', 'security', 'hospitality', 'chef'];
    const isShiftWorker = shiftWorkOccupations.some(o => 
      profile.occupation?.toLowerCase().includes(o)
    );
    
    if (isShiftWorker && !hasMealExpenses) {
      const estimatedMeals = 300;
      const savings = calculateTaxSavings(estimatedMeals, profile.taxableIncome);
      const evidence = ['Shift worker occupation', 'No meal expenses recorded'];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.5, 'MEAL-001');
      
      return {
        id: 'MEAL-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'meals',
        title: 'Missing Meal Expense Deductions',
        description: 'Shift workers may claim meal expenses during overtime or when working away from usual workplace.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'low',
        actionItems: [
          'Review timesheets for overtime hours',
          'Check if you received overtime meal allowances',
          'Gather receipts for meals during extended shifts',
          'Verify meal break policies at your workplace'
        ],
        taxImpact: `Potential deduction: $${estimatedMeals.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'Meal expenses and allowances',
        heuristicScore
      };
    }
    return null;
  }
};

/**
 * Rule 15: Capital works deduction opportunity (property investors)
 */
const capitalWorksDeductionRule: DetectionRule = {
  id: 'PROP-001',
  name: 'Capital Works Deduction Opportunity',
  category: 'property',
  priority: 'high',
  relevanceScore: (profile) => profile.investmentTypes?.includes('property') ? 1.0 : 0.1,
  check: (profile, history) => {
    if (!profile.investmentTypes?.includes('property')) return null;
    
    const hasPropertyExpenses = history.expenses.some(e => 
      e.category.toLowerCase().includes('property') ||
      e.category.toLowerCase().includes('rental') ||
      e.description.toLowerCase().includes('investment property')
    );
    
    const hasCapitalWorks = history.expenses.some(e => 
      e.category.toLowerCase().includes('capital-works') ||
      e.description.toLowerCase().includes('depreciation schedule') ||
      e.description.toLowerCase().includes('division 43')
    );
    
    if (hasPropertyExpenses && !hasCapitalWorks) {
      const estimatedCapitalWorks = 2500;
      const savings = calculateTaxSavings(estimatedCapitalWorks, profile.taxableIncome);
      const evidence = ['Property investment detected', 'No capital works deductions'];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.7, 'PROP-001');
      
      return {
        id: 'PROP-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'property',
        title: 'Missing Capital Works Deductions',
        description: 'Investment property owners can claim capital works deductions (building depreciation) at 2.5% per year for 40 years.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'high',
        actionItems: [
          'Order a tax depreciation schedule from a quantity surveyor',
          'Gather property purchase documents and construction costs',
          'Claim Division 43 capital works deductions',
          'Consider Division 40 plant and equipment depreciation'
        ],
        taxImpact: `Potential deduction: $${estimatedCapitalWorks.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'Division 43 Capital works deductions',
        heuristicScore
      };
    }
    return null;
  }
};

/**
 * Rule 16: Missing home office equipment depreciation
 */
const homeOfficeEquipmentRule: DetectionRule = {
  id: 'WFH-002',
  name: 'Home Office Equipment Depreciation',
  category: 'work-from-home',
  priority: 'medium',
  relevanceScore: (profile) => profile.workArrangement === 'remote' ? 0.85 : profile.workArrangement === 'hybrid' ? 0.6 : 0.2,
  check: (profile, history) => {
    const hasWFH = profile.workArrangement === 'remote' || profile.workArrangement === 'hybrid';
    const hasWFHExpenses = hasExpensesInCategories(history, WFH_CATEGORIES);
    
    const equipmentPurchases = history.expenses.filter(e => 
      e.amount > 300 && (
        e.description.toLowerCase().includes('laptop') ||
        e.description.toLowerCase().includes('monitor') ||
        e.description.toLowerCase().includes('desk') ||
        e.description.toLowerCase().includes('chair') ||
        e.description.toLowerCase().includes('printer')
      )
    );
    
    if (hasWFH && hasWFHExpenses && equipmentPurchases.length > 0) {
      const totalEquipment = equipmentPurchases.reduce((sum, e) => sum + e.amount, 0);
      const estimatedDepreciation = totalEquipment * 0.15; // 15% annual depreciation
      const savings = calculateTaxSavings(estimatedDepreciation, profile.taxableIncome);
      const evidence = equipmentPurchases.map(e => `${e.description}: $${e.amount}`);
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.65, 'WFH-002');
      
      return {
        id: 'WFH-002-' + Date.now(),
        type: 'categorization',
        category: 'work-from-home',
        title: 'Home Office Equipment Depreciation',
        description: `You have ${equipmentPurchases.length} work-related equipment purchases that should be depreciated over their useful life.`,
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'medium',
        actionItems: [
          'Identify work-use percentage for each item',
          'Set up depreciation schedule for equipment',
          'Consider instant asset write-off if under threshold',
          'Keep purchase receipts and usage records'
        ],
        taxImpact: `Annual depreciation claim: $${estimatedDepreciation.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'PCG 2023/1, Depreciation of home office equipment',
        heuristicScore
      };
    }
    return null;
  }
};

/**
 * Rule 17: Quarterly expense pattern gaps
 */
const quarterlyPatternGapRule: DetectionRule = {
  id: 'PATT-001',
  name: 'Quarterly Expense Pattern Gap',
  category: 'pattern_gap',
  priority: 'medium',
  check: (profile, history) => {
    const quarterly = getQuarterlyPattern(history);
    const quarters = Object.values(quarterly);
    const avgQuarterly = quarters.reduce((sum, q) => sum + q, 0) / 4;
    
    // Check if any quarter has less than 10% of average (suggesting missing data)
    const gaps = quarters.filter(q => q < avgQuarterly * 0.1);
    
    if (gaps.length > 0 && avgQuarterly > 500) {
      const estimatedMissing = avgQuarterly * gaps.length * 0.5;
      const savings = calculateTaxSavings(estimatedMissing, profile.taxableIncome);
      const evidence = [`Average quarterly: $${avgQuarterly.toFixed(0)}`, `${gaps.length} quarters below 10% of average`];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.55, 'PATT-001');
      
      return {
        id: 'PATT-001-' + Date.now(),
        type: 'pattern_gap',
        category: 'pattern_gap',
        title: 'Quarterly Expense Pattern Gap',
        description: `Your expenses show unusual gaps in ${gaps.length} quarter(s). You may have unrecorded deductions.`,
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'medium',
        actionItems: [
          'Review credit card and bank statements for the quiet quarters',
          'Check for missing recurring expenses',
          'Verify all receipts were captured',
          'Consider using expense tracking apps'
        ],
        taxImpact: `Potential missing deductions: $${estimatedMissing.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'Record keeping requirements',
        heuristicScore
      };
    }
    return null;
  }
};

/**
 * Rule 18: Missing income protection insurance
 */
const incomeProtectionRule: DetectionRule = {
  id: 'INS-001',
  name: 'Income Protection Insurance Deduction',
  category: 'insurance',
  priority: 'medium',
  check: (profile, history) => {
    const hasInsurance = history.expenses.some(e => 
      e.description.toLowerCase().includes('income protection') ||
      e.description.toLowerCase().includes('disability insurance') ||
      (e.description.toLowerCase().includes('insurance') && 
       e.description.toLowerCase().includes('income'))
    );
    
    // Higher priority for higher income earners and self-employed
    const shouldConsider = profile.taxableIncome > 80000 || 
      profile.employmentType === 'self-employed' ||
      profile.employmentType === 'contractor';
    
    if (shouldConsider && !hasInsurance) {
      const estimatedPremium = 1500;
      const savings = calculateTaxSavings(estimatedPremium, profile.taxableIncome);
      const evidence = [`Income: $${profile.taxableIncome.toLocaleString()}`, `Employment: ${profile.employmentType}`];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.5, 'INS-001');
      
      return {
        id: 'INS-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'insurance',
        title: 'Income Protection Insurance',
        description: 'Premiums for income protection insurance are tax deductible. This is especially valuable for high earners and self-employed.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'medium',
        actionItems: [
          'Check if you have income protection insurance',
          'Review superannuation for insurance coverage',
          'Gather premium payment statements',
          'Note: Life insurance is NOT deductible, only income protection'
        ],
        taxImpact: `Potential deduction: $${estimatedPremium.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'Income protection insurance premiums',
        heuristicScore
      };
    }
    return null;
  }
};

/**
 * Rule 19: Missing crypto transaction records
 */
const cryptoRecordsRule: DetectionRule = {
  id: 'CRYPTO-001',
  name: 'Cryptocurrency Record Gap',
  category: 'investment-income',
  priority: 'high',
  relevanceScore: (profile) => profile.investmentTypes?.includes('crypto') ? 1.0 : 0.1,
  check: (profile, history) => {
    if (!profile.investmentTypes?.includes('crypto')) return null;
    
    const hasCryptoExpenses = history.expenses.some(e => 
      e.description.toLowerCase().includes('crypto') ||
      e.description.toLowerCase().includes('bitcoin') ||
      e.description.toLowerCase().includes('exchange') ||
      e.category.toLowerCase().includes('crypto')
    );
    
    if (!hasCryptoExpenses) {
      const estimatedFees = 500;
      const savings = calculateTaxSavings(estimatedFees, profile.taxableIncome);
      const evidence = ['Cryptocurrency investments declared', 'No transaction fees or expenses recorded'];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.7, 'CRYPTO-001');
      
      return {
        id: 'CRYPTO-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'investment-income',
        title: 'Missing Cryptocurrency Transaction Records',
        description: 'Crypto investors can claim transaction fees, exchange fees, and costs related to managing investments.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'high',
        actionItems: [
          'Export transaction history from all exchanges',
          'Calculate total trading fees paid',
          'Record costs of wallets, hardware devices, software',
          'Track fees for transferring between wallets'
        ],
        taxImpact: `Potential deduction: $${estimatedFees.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'Crypto asset taxation',
        heuristicScore
      };
    }
    return null;
  }
};

/**
 * Rule 20: Tool and equipment deduction for tradespersons
 */
const toolsEquipmentRule: DetectionRule = {
  id: 'TOOLS-001',
  name: 'Tools and Equipment Deduction',
  category: 'tools',
  priority: 'high',
  industryRelevance: ['construction', 'manufacturing', 'automotive', 'electrical', 'plumbing'],
  relevanceScore: (profile) => {
    const tradeOccupations = ['electrician', 'plumber', 'carpenter', 'mechanic', 'builder', 'tradesperson'];
    return tradeOccupations.some(o => profile.occupation?.toLowerCase().includes(o)) ? 1.0 : 0.2;
  },
  check: (profile, history) => {
    const tradeOccupations = ['electrician', 'plumber', 'carpenter', 'mechanic', 'builder', 'welder', 'painter'];
    const isTradesperson = tradeOccupations.some(o => 
      profile.occupation?.toLowerCase().includes(o)
    );
    
    const hasToolExpenses = history.expenses.some(e => 
      e.description.toLowerCase().includes('tool') ||
      e.description.toLowerCase().includes('equipment') ||
      e.category.toLowerCase().includes('tools')
    );
    
    if (isTradesperson && !hasToolExpenses) {
      const estimatedTools = 1200;
      const savings = calculateTaxSavings(estimatedTools, profile.taxableIncome);
      const evidence = [`Tradesperson: ${profile.occupation}`, 'No tool expenses recorded'];
      const heuristicScore = calculateHeuristicScore(profile, history, evidence, 0.85, 'TOOLS-001');
      
      return {
        id: 'TOOLS-001-' + Date.now(),
        type: 'missing_deduction',
        category: 'tools',
        title: 'Missing Tools and Equipment Deductions',
        description: 'Tradespersons typically have significant tool and equipment expenses. These are fully deductible if work-related.',
        estimatedSavings: savings,
        confidence: heuristicScore.confidenceLevel,
        priority: 'high',
        actionItems: [
          'Gather receipts for all tool purchases',
          'Include safety equipment and protective gear',
          'Track tool repairs and maintenance',
          'Consider tool insurance premiums'
        ],
        taxImpact: `Potential deduction: $${estimatedTools.toLocaleString()} → Tax savings: $${savings.toLocaleString()}`,
        aTOReference: 'Tools and equipment deductions',
        heuristicScore
      };
    }
    return null;
  }
};

// ============= ALL 20 RULES =============

export const allDetectionRules: DetectionRule[] = [
  // Original 8 rules
  wfhMissingRule,
  vehicleLogbookGapRule,
  dividendPatternGapRule,
  selfEducationOpportunityRule,
  depreciationOverlookedRule,
  internetPhoneGapRule,
  timingOptimizationRule,
  donationsMissingRule,
  // 12 new rules
  travelDeductionGapRule,
  professionalSubscriptionsRule,
  yoyDeductionDropRule,
  uniformClothingGapRule,
  lowDeductionBenchmarkRule,
  mealExpenseGapRule,
  capitalWorksDeductionRule,
  homeOfficeEquipmentRule,
  quarterlyPatternGapRule,
  incomeProtectionRule,
  cryptoRecordsRule,
  toolsEquipmentRule
];

// ============= RULE RANKING =============

/**
 * Calculate relevance score for each rule based on user profile
 */
export function calculateRuleRankings(
  profile: UserProfile,
  history: ExpenseHistory
): RankedRule[] {
  return allDetectionRules.map(rule => {
    let relevanceScore = 0;
    
    // Base relevance from rule's relevanceScore function
    if (rule.relevanceScore) {
      relevanceScore += rule.relevanceScore(profile, history) * 40;
    } else {
      relevanceScore += 20; // Default baseline
    }
    
    // Industry relevance bonus
    if (rule.industryRelevance && profile.industry) {
      if (rule.industryRelevance.includes(profile.industry.toLowerCase())) {
        relevanceScore += 25;
      }
    }
    
    // Priority bonus
    const priorityBonus = { critical: 20, high: 15, medium: 10, low: 5 };
    relevanceScore += priorityBonus[rule.priority];
    
    // Historical data bonus (if we have previous years)
    if (profile.previousYearDeductions && profile.previousYearDeductions > 0) {
      relevanceScore += 5;
    }
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      relevanceScore: Math.min(relevanceScore, 100),
      priority: rule.priority,
      triggered: false, // Will be set after running
      estimatedImpact: 0
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ============= MAIN ENGINE =============

/**
 * Run the enhanced tax optimization engine
 */
export function runOptimizationEngine(
  profile: UserProfile,
  history: ExpenseHistory,
  allHistory?: ExpenseHistory[]
): OptimizationResult {
  const opportunities: OptimizationOpportunity[] = [];
  const patternsDetected: PatternMatch[] = [];
  
  // Build YoY comparisons
  const yoyComparisons = buildYoYComparisons(allHistory || []);
  
  // Build rule context
  const context: RuleContext = {
    yoyComparisons,
    industryAverages: INDUSTRY_BENCHMARKS
  };
  
  // Calculate rule rankings
  const rankedRules = calculateRuleRankings(profile, history);
  
  // Run all detection rules
  for (const rule of allDetectionRules) {
    try {
      const opportunity = rule.check(profile, history, allHistory, context);
      if (opportunity) {
        opportunities.push(opportunity);
        patternsDetected.push({
          pattern: rule.name,
          detected: true,
          evidence: [opportunity.description],
          confidence: opportunity.heuristicScore?.finalScore || 0.5,
          heuristicScore: opportunity.heuristicScore || calculateHeuristicScore(profile, history, [], 0.5, rule.id)
        });
        
        // Update ranked rules
        const rankedRule = rankedRules.find(r => r.ruleId === rule.id);
        if (rankedRule) {
          rankedRule.triggered = true;
          rankedRule.estimatedImpact = opportunity.estimatedSavings;
        }
      }
    } catch (error) {
      console.error(`Error running rule ${rule.id}:`, error);
    }
  }
  
  // Sort by priority, then relevance score
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  opportunities.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (b.relevanceScore || 0) - (a.relevanceScore || 0);
  });
  
  // Calculate summary
  const totalPotentialSavings = opportunities.reduce((sum, o) => sum + o.estimatedSavings, 0);
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};
  
  for (const opp of opportunities) {
    byCategory[opp.category] = (byCategory[opp.category] || 0) + 1;
    byType[opp.type] = (byType[opp.type] || 0) + 1;
  }
  
  const avgConfidence = patternsDetected.length > 0
    ? patternsDetected.reduce((sum, p) => sum + p.confidence, 0) / patternsDetected.length
    : 0;
  
  const yoyAnomaliesDetected = opportunities.filter(o => o.type === 'yoy_anomaly').length;
  
  return {
    opportunities,
    totalPotentialSavings,
    patternsDetected,
    summary: {
      criticalCount: opportunities.filter(o => o.priority === 'critical').length,
      highCount: opportunities.filter(o => o.priority === 'high').length,
      mediumCount: opportunities.filter(o => o.priority === 'medium').length,
      lowCount: opportunities.filter(o => o.priority === 'low').length,
      byCategory,
      byType,
      averageConfidence: avgConfidence,
      yoyAnomaliesDetected
    },
    yoyComparisons,
    rankedRules
  };
}

// ============= UTILITY EXPORTS =============

export function checkOpportunityType(
  type: OptimizationOpportunity['type'],
  profile: UserProfile,
  history: ExpenseHistory,
  allHistory?: ExpenseHistory[]
): OptimizationOpportunity[] {
  const result = runOptimizationEngine(profile, history, allHistory);
  return result.opportunities.filter(o => o.type === type);
}

export function getTopOpportunities(
  profile: UserProfile,
  history: ExpenseHistory,
  allHistory?: ExpenseHistory[],
  limit: number = 5
): OptimizationOpportunity[] {
  const result = runOptimizationEngine(profile, history, allHistory);
  return result.opportunities.slice(0, limit);
}

export function exportOpportunitiesForAccountant(result: OptimizationResult): string {
  let report = 'TAX OPTIMIZATION OPPORTUNITIES REPORT\n';
  report += '='.repeat(60) + '\n\n';
  report += `Total Potential Tax Savings: $${result.totalPotentialSavings.toLocaleString()}\n`;
  report += `Opportunities Found: ${result.opportunities.length}\n`;
  report += `Average Confidence: ${(result.summary.averageConfidence * 100).toFixed(1)}%\n`;
  report += `YoY Anomalies Detected: ${result.summary.yoyAnomaliesDetected}\n\n`;
  
  report += 'RULE RELEVANCE RANKINGS:\n';
  report += '-'.repeat(60) + '\n';
  for (const rule of result.rankedRules.slice(0, 10)) {
    const status = rule.triggered ? '✓ TRIGGERED' : '○ Not triggered';
    report += `${rule.ruleName} (Relevance: ${rule.relevanceScore.toFixed(0)}%) - ${status}\n`;
  }
  report += '\n';
  
  report += 'DETECTED OPPORTUNITIES:\n';
  report += '-'.repeat(60) + '\n\n';
  
  for (const opp of result.opportunities) {
    report += `[${opp.priority.toUpperCase()}] ${opp.title}\n`;
    report += `Category: ${opp.category} | Type: ${opp.type}\n`;
    report += `Estimated Savings: $${opp.estimatedSavings.toLocaleString()}\n`;
    report += `Confidence: ${opp.confidence}`;
    if (opp.heuristicScore) {
      report += ` (Heuristic Score: ${(opp.heuristicScore.finalScore * 100).toFixed(1)}%)`;
    }
    report += '\n';
    if (opp.relevanceScore) {
      report += `Relevance Score: ${opp.relevanceScore.toFixed(1)}\n`;
    }
    report += `Description: ${opp.description}\n`;
    report += `ATO Reference: ${opp.aTOReference || 'N/A'}\n`;
    report += `Action Items:\n`;
    for (const action of opp.actionItems) {
      report += `  - ${action}\n`;
    }
    report += '\n';
  }
  
  return report;
}

export function generateYoYReport(comparisons: YearOverYearComparison[]): string {
  let report = 'YEAR-OVER-YEAR COMPARISON REPORT\n';
  report += '='.repeat(50) + '\n\n';
  
  for (const comp of comparisons) {
    report += `Tax Year ${comp.taxYear}:\n`;
    report += `  Total Deductions: $${comp.totalDeductions.toLocaleString()}\n`;
    report += `  Expense Count: ${comp.expenseCount}\n`;
    report += `  Categories: ${Object.keys(comp.categoryTotals).length}\n\n`;
  }
  
  return report;
}
