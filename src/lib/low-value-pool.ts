/**
 * D6 Low Value Pool Workpaper Library
 * ATO Category D6 - Low-value pool depreciation
 * 
 * ATO Rules:
 * - Eligibility: Assets costing <$1,000 (or opening pool balance from prior years)
 * - First Year Rate: 18.75% (for assets acquired mid-year)
 * - Subsequent Years: 37.5% per year
 * - Pool Balance: Opening balance + new assets - disposals - decline in value
 * 
 * Reference: https://www.ato.gov.au/individuals/income-and-deductions/deductions-you-can-claim/other-deductions/low-value-pool
 */

// ATO Low Value Pool Rates
export const LOW_VALUE_POOL_FIRST_YEAR_RATE = 0.1875; // 18.75% for first year
export const LOW_VALUE_POOL_SUBSEQUENT_RATE = 0.375; // 37.5% for subsequent years
export const LOW_VALUE_POOL_THRESHOLD = 1000; // Assets must cost less than $1,000

// Asset status in the pool
export type AssetStatus = 'active' | 'disposed' | 'fully_depreciated';

// Disposal type
export type DisposalType = 'sale' | 'scrapped' | 'no_longer_used' | 'lost_stolen';

// Low value pool asset
export interface LowValuePoolAsset {
  id: string;
  description: string;
  cost: number;
  acquisitionDate: string;
  isFirstYear: boolean; // True if acquired in current tax year
  status: AssetStatus;
  openingBalance?: number; // For assets from prior years
  declineInValue?: number;
  closingBalance?: number;
  
  // Disposal information
  disposal?: {
    date: string;
    type: DisposalType;
    salePrice?: number; // Only for 'sale' type
    terminationValue?: number; // For scrapped/lost items
    balancingAdjustment?: number;
  };
}

// Pool summary for a tax year
export interface LowValuePoolSummary {
  taxYear: string;
  openingBalance: number;
  newAssetsCost: number;
  disposalsTerminationValue: number;
  totalDeclineInValue: number;
  closingBalance: number;
  deductibleAmount: number;
}

// Workpaper state
export interface LowValuePoolWorkpaper {
  id: string;
  taxYear: string;
  assets: LowValuePoolAsset[];
  priorYearClosingBalance?: number; // Opening balance carried forward
  summary: LowValuePoolSummary;
  createdAt: string;
  updatedAt: string;
}

// Export data for tax filing
export interface LowValuePoolExport {
  taxYear: string;
  category: 'D6';
  categoryName: 'Low-value pool deduction';
  claimAmount: number;
  poolSummary: LowValuePoolSummary;
  assetCount: number;
  disposedAssetCount: number;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if an asset is eligible for the low-value pool
 * Must cost less than $1,000
 */
export function isEligibleForPool(cost: number): boolean {
  return cost > 0 && cost < LOW_VALUE_POOL_THRESHOLD;
}

/**
 * Calculate decline in value for an asset
 * First year: 18.75% of cost
 * Subsequent years: 37.5% of opening balance
 */
export function calculateAssetDeclineInValue(
  asset: LowValuePoolAsset,
  poolRate: number = LOW_VALUE_POOL_SUBSEQUENT_RATE,
  firstYearRate: number = LOW_VALUE_POOL_FIRST_YEAR_RATE
): number {
  if (asset.status === 'disposed' || asset.status === 'fully_depreciated') {
    return 0;
  }

  // If it's the first year (acquired this tax year), use 18.75%
  if (asset.isFirstYear) {
    return asset.cost * firstYearRate;
  }

  // For subsequent years, use 37.5% of opening balance
  const baseValue = asset.openingBalance ?? asset.cost;
  return baseValue * poolRate;
}

/**
 * Calculate balancing adjustment on disposal
 * Positive = assessable income (sale price > written down value)
 * Negative = deductible (sale price < written down value)
 */
export function calculateBalancingAdjustment(
  writtenDownValue: number,
  terminationValue: number
): number {
  return terminationValue - writtenDownValue;
}

/**
 * Calculate pool summary for the tax year
 */
export function calculatePoolSummary(
  assets: LowValuePoolAsset[],
  priorYearClosingBalance: number = 0,
  taxYear: string = new Date().getFullYear().toString()
): LowValuePoolSummary {
  // Separate active assets from disposals
  const activeAssets = assets.filter(a => a.status !== 'disposed');
  const disposedAssets = assets.filter(a => a.status === 'disposed' && a.disposal);

  // Calculate new assets cost (first year assets)
  const newAssetsCost = activeAssets
    .filter(a => a.isFirstYear)
    .reduce((sum, a) => sum + a.cost, 0);

  // Calculate opening balance
  // Prior year closing + prior year assets carried forward (not fully depreciated)
  const priorYearAssets = activeAssets.filter(a => !a.isFirstYear);
  const openingBalance = priorYearClosingBalance + priorYearAssets.reduce((sum, a) => sum + (a.openingBalance || 0), 0);

  // Calculate disposals termination value
  const disposalsTerminationValue = disposedAssets.reduce((sum, a) => {
    if (!a.disposal) return sum;
    return sum + (a.disposal.terminationValue || a.disposal.salePrice || 0);
  }, 0);

  // Calculate decline in value for each asset
  let totalDeclineInValue = 0;
  
  for (const asset of activeAssets) {
    const decline = calculateAssetDeclineInValue(asset);
    totalDeclineInValue += decline;
  }

  // Calculate closing balance
  // Opening + new assets - disposals termination value - decline in value
  const closingBalance = Math.max(0, openingBalance + newAssetsCost - disposalsTerminationValue - totalDeclineInValue);

  // The deductible amount is the decline in value
  const deductibleAmount = totalDeclineInValue;

  return {
    taxYear,
    openingBalance,
    newAssetsCost,
    disposalsTerminationValue,
    totalDeclineInValue,
    closingBalance,
    deductibleAmount,
  };
}

/**
 * Add a new asset to the pool
 */
export function addAssetToPool(
  workpaper: LowValuePoolWorkpaper,
  asset: Omit<LowValuePoolAsset, 'id' | 'status' | 'declineInValue' | 'closingBalance'>
): LowValuePoolWorkpaper {
  if (!isEligibleForPool(asset.cost)) {
    throw new Error(`Asset cost $${asset.cost} is not eligible for low-value pool. Must be less than $${LOW_VALUE_POOL_THRESHOLD}.`);
  }

  const newAsset: LowValuePoolAsset = {
    ...asset,
    id: generateId(),
    status: 'active',
    declineInValue: undefined,
    closingBalance: undefined,
  };

  const updatedAssets = [...workpaper.assets, newAsset];
  const summary = calculatePoolSummary(
    updatedAssets,
    workpaper.priorYearClosingBalance,
    workpaper.taxYear
  );

  return {
    ...workpaper,
    assets: updatedAssets,
    summary,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Dispose of an asset from the pool
 */
export function disposeAsset(
  workpaper: LowValuePoolWorkpaper,
  assetId: string,
  disposal: {
    date: string;
    type: DisposalType;
    salePrice?: number;
    terminationValue?: number;
  }
): LowValuePoolWorkpaper {
  const asset = workpaper.assets.find(a => a.id === assetId);
  if (!asset) {
    throw new Error(`Asset with id ${assetId} not found`);
  }

  // Calculate written down value
  const writtenDownValue = asset.isFirstYear 
    ? asset.cost - (asset.declineInValue || calculateAssetDeclineInValue(asset))
    : (asset.openingBalance || 0) - (asset.declineInValue || calculateAssetDeclineInValue(asset));

  const terminationValue = disposal.terminationValue ?? disposal.salePrice ?? 0;
  const balancingAdjustment = calculateBalancingAdjustment(writtenDownValue, terminationValue);

  const updatedAsset: LowValuePoolAsset = {
    ...asset,
    status: 'disposed',
    disposal: {
      ...disposal,
      terminationValue,
      balancingAdjustment,
    },
  };

  const updatedAssets = workpaper.assets.map(a => a.id === assetId ? updatedAsset : a);
  const summary = calculatePoolSummary(
    updatedAssets,
    workpaper.priorYearClosingBalance,
    workpaper.taxYear
  );

  return {
    ...workpaper,
    assets: updatedAssets,
    summary,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update asset decline in values and closing balances
 */
export function recalculatePool(workpaper: LowValuePoolWorkpaper): LowValuePoolWorkpaper {
  const updatedAssets = workpaper.assets.map(asset => {
    if (asset.status === 'disposed') return asset;

    const declineInValue = calculateAssetDeclineInValue(asset);
    
    let closingBalance: number;
    if (asset.isFirstYear) {
      closingBalance = asset.cost - declineInValue;
    } else {
      closingBalance = (asset.openingBalance || asset.cost) - declineInValue;
    }

    return {
      ...asset,
      declineInValue,
      closingBalance: Math.max(0, closingBalance),
      status: closingBalance <= 0.01 ? 'fully_depreciated' : asset.status,
    };
  });

  const summary = calculatePoolSummary(
    updatedAssets,
    workpaper.priorYearClosingBalance,
    workpaper.taxYear
  );

  return {
    ...workpaper,
    assets: updatedAssets,
    summary,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a new empty workpaper
 */
export function createEmptyWorkpaper(taxYear: string = getCurrentTaxYear()): LowValuePoolWorkpaper {
  const id = generateId();
  const summary = calculatePoolSummary([], 0, taxYear);
  
  return {
    id,
    taxYear,
    assets: [],
    summary,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Export workpaper for tax filing
 */
export function exportWorkpaper(workpaper: LowValuePoolWorkpaper): LowValuePoolExport {
  const recalculated = recalculatePool(workpaper);
  
  return {
    taxYear: workpaper.taxYear,
    category: 'D6',
    categoryName: 'Low-value pool deduction',
    claimAmount: recalculated.summary.deductibleAmount,
    poolSummary: recalculated.summary,
    assetCount: recalculated.assets.filter(a => a.status !== 'disposed').length,
    disposedAssetCount: recalculated.assets.filter(a => a.status === 'disposed').length,
  };
}

/**
 * Validate the workpaper
 */
export function validateWorkpaper(workpaper: LowValuePoolWorkpaper): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for ineligible assets
  workpaper.assets.forEach(asset => {
    if (!isEligibleForPool(asset.cost)) {
      errors.push(`Asset "${asset.description}" costs $${asset.cost.toFixed(2)}, which exceeds the $${LOW_VALUE_POOL_THRESHOLD} threshold.`);
    }
  });

  // Check for negative values
  workpaper.assets.forEach(asset => {
    if (asset.cost < 0) {
      errors.push(`Asset "${asset.description}" has a negative cost.`);
    }
  });

  // Check for missing disposal values
  workpaper.assets
    .filter(a => a.status === 'disposed' && a.disposal)
    .forEach(asset => {
      if (asset.disposal!.type === 'sale' && !asset.disposal!.salePrice) {
        warnings.push(`Asset "${asset.description}" was sold but no sale price was provided.`);
      }
    });

  // Warn if no assets
  if (workpaper.assets.length === 0) {
    warnings.push('No assets in the pool. Add assets to calculate your deduction.');
  }

  // Warn if closing balance is very small
  if (workpaper.summary.closingBalance > 0 && workpaper.summary.closingBalance < 1) {
    warnings.push(`Closing balance of $${workpaper.summary.closingBalance.toFixed(2)} is very small. Consider writing it off.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get statistics for the workpaper
 */
export function getWorkpaperStats(workpaper: LowValuePoolWorkpaper) {
  const activeAssets = workpaper.assets.filter(a => a.status !== 'disposed');
  const firstYearAssets = activeAssets.filter(a => a.isFirstYear);
  const subsequentYearAssets = activeAssets.filter(a => !a.isFirstYear);
  const disposedAssets = workpaper.assets.filter(a => a.status === 'disposed');
  const fullyDepreciated = workpaper.assets.filter(a => a.status === 'fully_depreciated');

  return {
    totalAssets: workpaper.assets.length,
    activeAssets: activeAssets.length,
    firstYearAssets: firstYearAssets.length,
    subsequentYearAssets: subsequentYearAssets.length,
    disposedAssets: disposedAssets.length,
    fullyDepreciated: fullyDepreciated.length,
    totalCost: activeAssets.reduce((sum, a) => sum + a.cost, 0),
    isComplete: activeAssets.length > 0 || workpaper.summary.openingBalance > 0,
  };
}

// Helper functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentTaxYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  
  // Australian tax year runs July 1 - June 30
  // If we're before July, we're in the previous tax year
  if (month < 6) {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
  return `${year}-${String(year + 1).slice(-2)}`;
}

// ATO Guidance for D6
export const ATO_D6_GUIDANCE = {
  title: 'D6 Low-Value Pool',
  description: 'You can allocate low-cost and low-value assets to a low-value pool and claim a deduction for their decline in value at a set rate.',
  eligibleAssets: [
    'Cost less than $1,000 (low-cost assets)',
    'Already written down to less than $1,000 under the diminishing value method (low-value assets)',
    'Used for work-related or income-producing purposes',
  ],
  ineligibleAssets: [
    'Cost $1,000 or more',
    'Assets you use for personal purposes only',
    'Horticultural plants',
    'Assets for which you have claimed an immediate deduction',
  ],
  rates: {
    firstYear: '18.75% for assets acquired during the year',
    subsequent: '37.5% for assets held at the start of the year',
  },
  recordKeeping: [
    'Keep receipts showing the cost of each asset',
    'Record the date you acquired each asset',
    'Keep records of any disposals (sale receipts, etc.)',
    'Maintain pool balance calculations year to year',
  ],
  reference: 'https://www.ato.gov.au/individuals/income-and-deductions/deductions-you-can-claim/other-deductions/low-value-pool',
};
