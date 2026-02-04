/**
 * Categorization Suggestion Engine v1.0
 * 
 * Smart re-categorization suggestions that help users optimize tax deductions.
 * Analyzes existing expenses and suggests better categorizations based on
 * ATO rules and tax optimization strategies.
 * 
 * Tax Year: 2024-2025
 */

import type { AtoCategoryCode } from "./ato-categories";
import { getMarginalTaxRate, calculateTaxSavings, type UserProfile } from "./tax-optimization";

// ============= TYPES =============

export type SuggestionStatus = "pending" | "accepted" | "rejected" | "ignored";
export type SuggestionType = 
  | "d5_to_d6"           // Move from D5 to D6 (depreciation to low-value pool)
  | "immediate_to_depreciation" // Better to depreciate than immediate claim
  | "depreciation_to_immediate" // Can claim immediately (under $300)
  | "home_office_method" // Better home office calculation method
  | "vehicle_method"     // Better vehicle expense method
  | "missing_depreciation" // Asset not being depreciated
  | "wrong_category"     // Better category available
  | "split_expense";     // Expense should be split across categories

export interface CategorizationSuggestion {
  id: string;
  receiptId: number;
  currentCategory: AtoCategoryCode | string;
  suggestedCategory: AtoCategoryCode | string;
  suggestionType: SuggestionType;
  title: string;
  description: string;
  reason: string;
  
  // Tax impact
  currentTaxBenefit: number;
  suggestedTaxBenefit: number;
  taxImpact: number; // Positive = better
  
  // Financial details
  amount: number;
  itemDescription: string;
  
  // Confidence & priority
  confidence: "high" | "medium" | "low";
  priority: "critical" | "high" | "medium" | "low";
  
  // Status tracking
  status: SuggestionStatus;
  createdAt: Date;
  reviewedAt?: Date;
  
  // ATO references
  atoReference?: string;
  ruleId: string;
  
  // Additional context
  metadata?: {
    depreciationRate?: number;
    assetLifeYears?: number;
    thresholdAmount?: number;
    originalCategoryName?: string;
    suggestedCategoryName?: string;
  };
}

export interface SuggestionFilter {
  status?: SuggestionStatus;
  type?: SuggestionType;
  priority?: "critical" | "high" | "medium" | "low";
  category?: string;
}

export interface SuggestionAnalytics {
  totalSuggestions: number;
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  ignoredCount: number;
  totalTaxImpact: number;
  acceptedTaxImpact: number;
  byType: Record<SuggestionType, number>;
  byPriority: Record<string, number>;
  highConfidenceRate: number;
}

export interface SuggestionRule {
  id: string;
  name: string;
  type: SuggestionType;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  check: (receipt: ReceiptForSuggestion, profile: UserProfile) => CategorizationSuggestion | null;
}

export interface ReceiptForSuggestion {
  id: number;
  vendor: string;
  amount: number;
  category: string;
  atoCategoryCode?: AtoCategoryCode | null;
  date: string;
  description?: string;
  notes?: string;
}

// ============= CONSTANTS =============

// 2024-2025 Thresholds
export const TAX_THRESHOLDS = {
  LOW_VALUE_POOL: 1000,        // Assets under $1,000 can go to low-value pool
  IMMEDIATE_DEDUCTION: 300,    // Assets $300 or less can be immediately deducted
  DEPRECIATION_POOL: 1000,     // Pool threshold
  HOME_OFFICE_HOURS_CAP: 1000, // Hours cap for fixed rate method
};

// Depreciation rates by category
export const DEPRECIATION_RATES: Record<string, number> = {
  D5: 0.20,  // Other work-related: 20% straight line
  D6: 0.375, // Low-value pool: 37.5% (18.75% first year)
  COMPUTER: 0.30,      // 3 years
  FURNITURE: 0.20,     // 5 years  
  ELECTRONICS: 0.25,   // 4 years
  TOOLS: 0.25,         // 4 years
  VEHICLE: 0.25,       // 4 years
};

// Keywords that indicate asset types
export const ASSET_KEYWORDS = {
  laptop: { category: "D5", rate: 0.30, life: 3, isAsset: true },
  computer: { category: "D5", rate: 0.30, life: 3, isAsset: true },
  monitor: { category: "D5", rate: 0.30, life: 3, isAsset: true },
  desk: { category: "D5", rate: 0.20, life: 5, isAsset: true },
  chair: { category: "D5", rate: 0.20, life: 5, isAsset: true },
  furniture: { category: "D5", rate: 0.20, life: 5, isAsset: true },
  printer: { category: "D5", rate: 0.25, life: 4, isAsset: true },
  phone: { category: "D5", rate: 0.25, life: 4, isAsset: true },
  tablet: { category: "D5", rate: 0.30, life: 3, isAsset: true },
  tools: { category: "D5", rate: 0.25, life: 4, isAsset: true },
  equipment: { category: "D5", rate: 0.25, life: 4, isAsset: true },
  camera: { category: "D5", rate: 0.25, life: 4, isAsset: true },
  software: { category: "D5", rate: 0.30, life: 3, isAsset: true },
};

// Category mapping for better categorization
export const BETTER_CATEGORIES: Record<string, { code: AtoCategoryCode; reason: string }[]> = {
  "D1": [{ code: "D2", reason: "If this is travel accommodation/flights, D2 is more specific" }],
  "D5": [
    { code: "D6", reason: "Assets under $1,000 may benefit from low-value pool depreciation" },
    { code: "D3", reason: "If this is protective clothing or uniform, D3 is correct" },
    { code: "D4", reason: "If this is education-related, D4 is more appropriate" },
  ],
};

// ============= UTILITY FUNCTIONS =============

/**
 * Generate unique suggestion ID
 */
export function generateSuggestionId(): string {
  return `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an item description indicates a depreciable asset
 */
export function isDepreciableAsset(description: string, amount: number): {
  isAsset: boolean;
  assetType?: string;
  suggestedRate?: number;
  lifeYears?: number;
} {
  const lowerDesc = description.toLowerCase();
  
  for (const [keyword, config] of Object.entries(ASSET_KEYWORDS)) {
    if (lowerDesc.includes(keyword)) {
      // Items under $300 can be immediately deducted, not depreciated
      if (amount <= TAX_THRESHOLDS.IMMEDIATE_DEDUCTION) {
        return { isAsset: false };
      }
      return {
        isAsset: true,
        assetType: keyword,
        suggestedRate: config.rate,
        lifeYears: config.life,
      };
    }
  }
  
  // Check if amount suggests it's an asset (over $300)
  if (amount > TAX_THRESHOLDS.IMMEDIATE_DEDUCTION) {
    return { isAsset: true, suggestedRate: 0.20, lifeYears: 5 };
  }
  
  return { isAsset: false };
}

/**
 * Calculate first year depreciation for an asset
 */
export function calculateFirstYearDepreciation(
  amount: number,
  rate: number,
  isFirstYear: boolean = true
): number {
  if (isFirstYear) {
    // First year in low-value pool is 18.75%
    return amount * 0.1875;
  }
  return amount * rate;
}

/**
 * Calculate tax benefit of a categorization
 */
export function calculateCategoryTaxBenefit(
  amount: number,
  category: AtoCategoryCode | string,
  taxableIncome: number,
  isAsset: boolean = false,
  assetRate?: number
): number {
  const marginalRate = getMarginalTaxRate(taxableIncome);
  
  if (isAsset && category === "D6") {
    // Low-value pool: 18.75% first year depreciation
    const depreciation = amount * 0.1875;
    return depreciation * marginalRate;
  }
  
  if (isAsset && category === "D5") {
    // D5 with depreciation
    const rate = assetRate || 0.20;
    const depreciation = amount * rate;
    return depreciation * marginalRate;
  }
  
  // Immediate deduction
  return amount * marginalRate;
}

/**
 * Compare tax benefits between two categorizations
 */
export function compareTaxBenefits(
  amount: number,
  currentCategory: AtoCategoryCode | string,
  suggestedCategory: AtoCategoryCode | string,
  taxableIncome: number,
  isAsset: boolean = false,
  assetRate?: number
): {
  currentBenefit: number;
  suggestedBenefit: number;
  difference: number;
  percentageImprovement: number;
} {
  const currentBenefit = calculateCategoryTaxBenefit(
    amount,
    currentCategory,
    taxableIncome,
    isAsset && currentCategory === "D6",
    assetRate
  );
  
  const suggestedBenefit = calculateCategoryTaxBenefit(
    amount,
    suggestedCategory,
    taxableIncome,
    isAsset && suggestedCategory === "D6",
    assetRate
  );
  
  const difference = suggestedBenefit - currentBenefit;
  const percentageImprovement = currentBenefit > 0 
    ? (difference / currentBenefit) * 100 
    : (suggestedBenefit > 0 ? 100 : 0);
  
  return {
    currentBenefit,
    suggestedBenefit,
    difference,
    percentageImprovement,
  };
}

// ============= SUGGESTION RULES =============

/**
 * Rule 1: D5 → D6 (Low Value Pool)
 * Suggest moving assets under $1,000 from D5 to D6 for better depreciation
 */
const d5ToD6Rule: SuggestionRule = {
  id: "RULE-D5-D6",
  name: "D5 to D6 Low Value Pool",
  type: "d5_to_d6",
  description: "Assets under $1,000 may benefit from low-value pool depreciation",
  priority: "high",
  check: (receipt, profile) => {
    // Only applies to D5 categorization
    if (receipt.atoCategoryCode !== "D5") return null;
    
    // Must be under $1,000 for low-value pool
    if (receipt.amount >= TAX_THRESHOLDS.LOW_VALUE_POOL) return null;
    
    // Must be over $300 (otherwise immediate deduction is better)
    if (receipt.amount <= TAX_THRESHOLDS.IMMEDIATE_DEDUCTION) return null;
    
    // Check if it looks like an asset
    const assetCheck = isDepreciableAsset(receipt.vendor + " " + (receipt.description || ""), receipt.amount);
    if (!assetCheck.isAsset) return null;
    
    const comparison = compareTaxBenefits(
      receipt.amount,
      "D5",
      "D6",
      profile.taxableIncome,
      true,
      assetCheck.suggestedRate
    );
    
    // Only suggest if there's a meaningful improvement
    if (comparison.difference <= 0) return null;
    
    return {
      id: generateSuggestionId(),
      receiptId: receipt.id,
      currentCategory: "D5",
      suggestedCategory: "D6",
      suggestionType: "d5_to_d6",
      title: "Move to Low-Value Pool for Better Depreciation",
      description: `This ${assetCheck.assetType || "asset"} ($${receipt.amount.toFixed(2)}) qualifies for the low-value pool (D6) which provides 37.5% depreciation (18.75% in first year).`,
      reason: `Assets under $1,000 can be pooled for accelerated depreciation. Current D5 depreciation (${((assetCheck.suggestedRate || 0.20) * 100).toFixed(0)}%) vs D6 pool (37.5%).`,
      currentTaxBenefit: comparison.currentBenefit,
      suggestedTaxBenefit: comparison.suggestedBenefit,
      taxImpact: comparison.difference,
      amount: receipt.amount,
      itemDescription: receipt.vendor,
      confidence: comparison.percentageImprovement > 50 ? "high" : "medium",
      priority: comparison.difference > 100 ? "high" : "medium",
      status: "pending",
      createdAt: new Date(),
      atoReference: "ATO Low-Value Pool Rules - D6",
      ruleId: "RULE-D5-D6",
      metadata: {
        depreciationRate: assetCheck.suggestedRate,
        assetLifeYears: assetCheck.lifeYears,
        thresholdAmount: TAX_THRESHOLDS.LOW_VALUE_POOL,
        originalCategoryName: "Other Work-Related Expenses (D5)",
        suggestedCategoryName: "Low-Value Pool (D6)",
      },
    };
  },
};

/**
 * Rule 2: Immediate to Depreciation
 * For assets over $1,000, suggest proper depreciation instead of immediate claim
 */
const immediateToDepreciationRule: SuggestionRule = {
  id: "RULE-IMM-DEP",
  name: "Immediate to Depreciation",
  type: "immediate_to_depreciation",
  description: "Large assets should be depreciated over time",
  priority: "critical",
  check: (receipt, profile) => {
    // Only for larger assets
    if (receipt.amount < TAX_THRESHOLDS.LOW_VALUE_POOL) return null;
    
    // Check if it's currently categorized as immediate deduction (D5 without depreciation)
    if (receipt.atoCategoryCode && receipt.atoCategoryCode !== "D5") return null;
    
    // Check if it looks like an asset
    const assetCheck = isDepreciableAsset(receipt.vendor + " " + (receipt.description || ""), receipt.amount);
    if (!assetCheck.isAsset) return null;
    
    const comparison = compareTaxBenefits(
      receipt.amount,
      "D5",
      "D6",
      profile.taxableIncome,
      true,
      assetCheck.suggestedRate
    );
    
    // For large assets, depreciation is often better spread over years
    const firstYearDepreciation = receipt.amount * (assetCheck.suggestedRate || 0.20);
    
    return {
      id: generateSuggestionId(),
      receiptId: receipt.id,
      currentCategory: receipt.atoCategoryCode || "D5",
      suggestedCategory: "D6",
      suggestionType: "immediate_to_depreciation",
      title: "Set Up Depreciation for Large Asset",
      description: `This ${assetCheck.assetType || "asset"} costs $${receipt.amount.toFixed(2)} and should be depreciated over ${assetCheck.lifeYears || 5} years rather than claimed immediately.`,
      reason: `Assets over $${TAX_THRESHOLDS.LOW_VALUE_POOL} must be depreciated. First year claim: $${firstYearDepreciation.toFixed(2)} at ${((assetCheck.suggestedRate || 0.20) * 100).toFixed(0)}% depreciation rate.`,
      currentTaxBenefit: receipt.amount * getMarginalTaxRate(profile.taxableIncome),
      suggestedTaxBenefit: firstYearDepreciation * getMarginalTaxRate(profile.taxableIncome),
      taxImpact: -((receipt.amount - firstYearDepreciation) * getMarginalTaxRate(profile.taxableIncome)),
      amount: receipt.amount,
      itemDescription: receipt.vendor,
      confidence: "high",
      priority: "critical",
      status: "pending",
      createdAt: new Date(),
      atoReference: "ATO Depreciation Rules - TR 2017/2",
      ruleId: "RULE-IMM-DEP",
      metadata: {
        depreciationRate: assetCheck.suggestedRate,
        assetLifeYears: assetCheck.lifeYears,
        thresholdAmount: TAX_THRESHOLDS.LOW_VALUE_POOL,
      },
    };
  },
};

/**
 * Rule 3: Depreciation to Immediate
 * Assets under $300 can be immediately deducted - better than depreciating
 */
const depreciationToImmediateRule: SuggestionRule = {
  id: "RULE-DEP-IMM",
  name: "Depreciation to Immediate",
  type: "depreciation_to_immediate",
  description: "Small assets under $300 can be immediately deducted",
  priority: "high",
  check: (receipt, profile) => {
    // Only for small assets
    if (receipt.amount > TAX_THRESHOLDS.IMMEDIATE_DEDUCTION) return null;
    
    // Check if currently in D6 (pool) - this would be wrong
    if (receipt.atoCategoryCode !== "D6") return null;
    
    // Check if it looks like an asset
    const assetCheck = isDepreciableAsset(receipt.vendor + " " + (receipt.description || ""), receipt.amount);
    
    const immediateBenefit = receipt.amount * getMarginalTaxRate(profile.taxableIncome);
    const poolBenefit = receipt.amount * 0.1875 * getMarginalTaxRate(profile.taxableIncome);
    const difference = immediateBenefit - poolBenefit;
    
    return {
      id: generateSuggestionId(),
      receiptId: receipt.id,
      currentCategory: "D6",
      suggestedCategory: "D5",
      suggestionType: "depreciation_to_immediate",
      title: "Claim Immediately Instead of Pooling",
      description: `This $${receipt.amount.toFixed(2)} ${assetCheck.assetType || "item"} is under $300 and can be immediately deducted in full.`,
      reason: `Assets $${TAX_THRESHOLDS.IMMEDIATE_DEDUCTION} or less qualify for immediate deduction. Get the full tax benefit this year instead of spreading it over multiple years.`,
      currentTaxBenefit: poolBenefit,
      suggestedTaxBenefit: immediateBenefit,
      taxImpact: difference,
      amount: receipt.amount,
      itemDescription: receipt.vendor,
      confidence: "high",
      priority: "high",
      status: "pending",
      createdAt: new Date(),
      atoReference: "ATO Immediate Deduction Rules - $300 threshold",
      ruleId: "RULE-DEP-IMM",
      metadata: {
        thresholdAmount: TAX_THRESHOLDS.IMMEDIATE_DEDUCTION,
        originalCategoryName: "Low-Value Pool (D6)",
        suggestedCategoryName: "Other Work-Related (D5) - Immediate",
      },
    };
  },
};

/**
 * Rule 4: Wrong Category
 * Suggest better category based on item description
 */
const wrongCategoryRule: SuggestionRule = {
  id: "RULE-WRONG-CAT",
  name: "Better Category Available",
  type: "wrong_category",
  description: "A more appropriate ATO category exists",
  priority: "medium",
  check: (receipt, profile) => {
    const lowerDesc = (receipt.vendor + " " + (receipt.description || "")).toLowerCase();
    
    // Define keyword mappings to better categories
    const categoryMappings: { keywords: string[]; category: AtoCategoryCode; reason: string }[] = [
      { 
        keywords: ["uniform", "shirt", "pants", "apron", "chef", "scrubs"], 
        category: "D3", 
        reason: "Work-related clothing should be categorized under D3" 
      },
      { 
        keywords: ["course", "training", "certificate", "diploma", "degree", "study"], 
        category: "D4", 
        reason: "Education expenses belong in D4 Self-Education" 
      },
      { 
        keywords: ["flight", "hotel", "accommodation", "travel", "airbnb"], 
        category: "D2", 
        reason: "Travel expenses should be in D2 Work-Related Travel" 
      },
      { 
        keywords: ["charity", "donation", "gift"], 
        category: "D8", 
        reason: "Donations belong in D8 Gifts and Donations" 
      },
    ];
    
    for (const mapping of categoryMappings) {
      if (mapping.keywords.some(kw => lowerDesc.includes(kw))) {
        // Check if already in the right category
        if (receipt.atoCategoryCode === mapping.category) return null;
        
        const comparison = compareTaxBenefits(
          receipt.amount,
          receipt.atoCategoryCode || "D5",
          mapping.category,
          profile.taxableIncome
        );
        
        return {
          id: generateSuggestionId(),
          receiptId: receipt.id,
          currentCategory: receipt.atoCategoryCode || "Uncategorized",
          suggestedCategory: mapping.category,
          suggestionType: "wrong_category",
          title: `Better Category: ${mapping.category}`,
          description: `Based on the description "${receipt.vendor}", this expense appears to be ${getCategoryDescription(mapping.category)}.`,
          reason: mapping.reason,
          currentTaxBenefit: comparison.currentBenefit,
          suggestedTaxBenefit: comparison.suggestedBenefit,
          taxImpact: comparison.difference,
          amount: receipt.amount,
          itemDescription: receipt.vendor,
          confidence: "medium",
          priority: "medium",
          status: "pending",
          createdAt: new Date(),
          atoReference: `ATO Category ${mapping.category}`,
          ruleId: "RULE-WRONG-CAT",
          metadata: {
            originalCategoryName: receipt.atoCategoryCode || "Uncategorized",
            suggestedCategoryName: getCategoryDescription(mapping.category),
          },
        };
      }
    }
    
    return null;
  },
};

/**
 * Rule 5: Missing Depreciation
 * Suggest setting up depreciation for assets that aren't being depreciated
 */
const missingDepreciationRule: SuggestionRule = {
  id: "RULE-MISS-DEP",
  name: "Missing Depreciation Setup",
  type: "missing_depreciation",
  description: "Asset appears to not have depreciation configured",
  priority: "high",
  check: (receipt, profile) => {
    // Only for assets over $300
    if (receipt.amount <= TAX_THRESHOLDS.IMMEDIATE_DEDUCTION) return null;
    
    // Check if it's an asset
    const assetCheck = isDepreciableAsset(receipt.vendor + " " + (receipt.description || ""), receipt.amount);
    if (!assetCheck.isAsset) return null;
    
    // If already in D6, depreciation is handled
    if (receipt.atoCategoryCode === "D6") return null;
    
    // If in D5 and over $1,000, should depreciate
    if (receipt.atoCategoryCode === "D5" && receipt.amount >= TAX_THRESHOLDS.LOW_VALUE_POOL) {
      const firstYearDep = receipt.amount * (assetCheck.suggestedRate || 0.20);
      
      return {
        id: generateSuggestionId(),
        receiptId: receipt.id,
        currentCategory: "D5",
        suggestedCategory: "D6",
        suggestionType: "missing_depreciation",
        title: "Set Up Depreciation for This Asset",
        description: `This $${receipt.amount.toFixed(2)} ${assetCheck.assetType || "asset"} should be depreciated over ${assetCheck.lifeYears || 5} years.`,
        reason: `Assets over $${TAX_THRESHOLDS.LOW_VALUE_POOL} must be depreciated. You'll claim $${firstYearDep.toFixed(2)} this year and continue claiming in future years.`,
        currentTaxBenefit: 0,
        suggestedTaxBenefit: firstYearDep * getMarginalTaxRate(profile.taxableIncome),
        taxImpact: firstYearDep * getMarginalTaxRate(profile.taxableIncome),
        amount: receipt.amount,
        itemDescription: receipt.vendor,
        confidence: "high",
        priority: "high",
        status: "pending",
        createdAt: new Date(),
        atoReference: "ATO Depreciation Rules",
        ruleId: "RULE-MISS-DEP",
        metadata: {
          depreciationRate: assetCheck.suggestedRate,
          assetLifeYears: assetCheck.lifeYears,
        },
      };
    }
    
    return null;
  },
};

// ============= ALL RULES =============

export const allSuggestionRules: SuggestionRule[] = [
  d5ToD6Rule,
  immediateToDepreciationRule,
  depreciationToImmediateRule,
  wrongCategoryRule,
  missingDepreciationRule,
];

// ============= HELPER FUNCTIONS =============

function getCategoryDescription(code: AtoCategoryCode): string {
  const descriptions: Record<AtoCategoryCode, string> = {
    D1: "Work-related Car Expenses",
    D2: "Work-related Travel Expenses",
    D3: "Work-related Clothing, Laundry and Dry-Cleaning",
    D4: "Work-related Self-Education Expenses",
    D5: "Other Work-related Expenses",
    D6: "Low-Value Pool Deduction",
    D7: "Interest, Dividend and Investment Income Deductions",
    D8: "Gifts and Donations",
    D9: "Cost of Managing Tax Affairs",
    D10: "Personal Superannuation Contributions",
    D11: "Dividend Tax Offsets",
    D12: "National Rental Affordability Scheme",
    D13: "Early Stage Venture Capital",
    D14: "Early Stage Investor",
    D15: "Exploration Credit Tax Offset",
  };
  return descriptions[code] || code;
}

// ============= MAIN ENGINE =============

/**
 * Analyze receipts and generate categorization suggestions
 */
export function generateSuggestions(
  receipts: ReceiptForSuggestion[],
  profile: UserProfile
): CategorizationSuggestion[] {
  const suggestions: CategorizationSuggestion[] = [];
  
  for (const receipt of receipts) {
    for (const rule of allSuggestionRules) {
      try {
        const suggestion = rule.check(receipt, profile);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      } catch (error) {
        console.error(`Error running rule ${rule.id} for receipt ${receipt.id}:`, error);
      }
    }
  }
  
  // Sort by priority and tax impact
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.taxImpact - a.taxImpact;
  });
  
  return suggestions;
}

/**
 * Filter suggestions based on criteria
 */
export function filterSuggestions(
  suggestions: CategorizationSuggestion[],
  filter: SuggestionFilter
): CategorizationSuggestion[] {
  return suggestions.filter(s => {
    if (filter.status && s.status !== filter.status) return false;
    if (filter.type && s.suggestionType !== filter.type) return false;
    if (filter.priority && s.priority !== filter.priority) return false;
    if (filter.category && s.suggestedCategory !== filter.category) return false;
    return true;
  });
}

/**
 * Calculate analytics for suggestions
 */
export function calculateSuggestionAnalytics(
  suggestions: CategorizationSuggestion[]
): SuggestionAnalytics {
  const total = suggestions.length;
  const pending = suggestions.filter(s => s.status === "pending").length;
  const accepted = suggestions.filter(s => s.status === "accepted").length;
  const rejected = suggestions.filter(s => s.status === "rejected").length;
  const ignored = suggestions.filter(s => s.status === "ignored").length;
  
  const totalTaxImpact = suggestions.reduce((sum, s) => sum + s.taxImpact, 0);
  const acceptedTaxImpact = suggestions
    .filter(s => s.status === "accepted")
    .reduce((sum, s) => sum + s.taxImpact, 0);
  
  const byType: Record<SuggestionType, number> = {
    d5_to_d6: 0,
    immediate_to_depreciation: 0,
    depreciation_to_immediate: 0,
    home_office_method: 0,
    vehicle_method: 0,
    missing_depreciation: 0,
    wrong_category: 0,
    split_expense: 0,
  };
  
  const byPriority: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  for (const s of suggestions) {
    byType[s.suggestionType] = (byType[s.suggestionType] || 0) + 1;
    byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
  }
  
  const highConfidenceCount = suggestions.filter(s => s.confidence === "high").length;
  
  return {
    totalSuggestions: total,
    pendingCount: pending,
    acceptedCount: accepted,
    rejectedCount: rejected,
    ignoredCount: ignored,
    totalTaxImpact,
    acceptedTaxImpact,
    byType,
    byPriority,
    highConfidenceRate: total > 0 ? (highConfidenceCount / total) * 100 : 0,
  };
}

/**
 * Apply a suggestion to get the new category
 */
export function applySuggestion(
  suggestion: CategorizationSuggestion
): { category: AtoCategoryCode | string; notes: string } {
  return {
    category: suggestion.suggestedCategory,
    notes: `Re-categorized based on suggestion ${suggestion.id}: ${suggestion.reason}`,
  };
}

/**
 * Export suggestions report
 */
export function exportSuggestionsReport(suggestions: CategorizationSuggestion[]): string {
  let report = "CATEGORIZATION SUGGESTIONS REPORT\n";
  report += "=".repeat(60) + "\n\n";
  
  const analytics = calculateSuggestionAnalytics(suggestions);
  
  report += `Total Suggestions: ${analytics.totalSuggestions}\n`;
  report += `Pending: ${analytics.pendingCount} | Accepted: ${analytics.acceptedCount} | Rejected: ${analytics.rejectedCount} | Ignored: ${analytics.ignoredCount}\n`;
  report += `Total Tax Impact: $${analytics.totalTaxImpact.toFixed(2)}\n`;
  report += `Accepted Tax Savings: $${analytics.acceptedTaxImpact.toFixed(2)}\n\n`;
  
  report += "SUGGESTIONS:\n";
  report += "-".repeat(60) + "\n\n";
  
  for (const s of suggestions) {
    report += `[${s.priority.toUpperCase()}] ${s.title}\n`;
    report += `Receipt: ${s.itemDescription} ($${s.amount.toFixed(2)})\n`;
    report += `Change: ${s.currentCategory} → ${s.suggestedCategory}\n`;
    report += `Tax Impact: $${s.taxImpact.toFixed(2)}\n`;
    report += `Status: ${s.status}\n`;
    report += `Reason: ${s.reason}\n\n`;
  }
  
  return report;
}

export default {
  generateSuggestions,
  filterSuggestions,
  calculateSuggestionAnalytics,
  applySuggestion,
  exportSuggestionsReport,
  allSuggestionRules,
  TAX_THRESHOLDS,
};