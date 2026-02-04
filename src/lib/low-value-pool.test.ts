/**
 * D6 Low Value Pool Workpaper Tests
 * ATO Category D6 - Low-value pool depreciation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LOW_VALUE_POOL_FIRST_YEAR_RATE,
  LOW_VALUE_POOL_SUBSEQUENT_RATE,
  LOW_VALUE_POOL_THRESHOLD,
  isEligibleForPool,
  calculateAssetDeclineInValue,
  calculateBalancingAdjustment,
  calculatePoolSummary,
  addAssetToPool,
  disposeAsset,
  recalculatePool,
  createEmptyWorkpaper,
  exportWorkpaper,
  validateWorkpaper,
  getWorkpaperStats,
  ATO_D6_GUIDANCE,
  type LowValuePoolAsset,
  type LowValuePoolWorkpaper,
} from './low-value-pool';

describe('Low Value Pool Constants', () => {
  it('should have correct first year rate of 18.75%', () => {
    expect(LOW_VALUE_POOL_FIRST_YEAR_RATE).toBe(0.1875);
  });

  it('should have correct subsequent year rate of 37.5%', () => {
    expect(LOW_VALUE_POOL_SUBSEQUENT_RATE).toBe(0.375);
  });

  it('should have correct threshold of $1,000', () => {
    expect(LOW_VALUE_POOL_THRESHOLD).toBe(1000);
  });
});

describe('isEligibleForPool', () => {
  it('should return true for assets under $1,000', () => {
    expect(isEligibleForPool(999)).toBe(true);
    expect(isEligibleForPool(500)).toBe(true);
    expect(isEligibleForPool(1)).toBe(true);
    expect(isEligibleForPool(999.99)).toBe(true);
  });

  it('should return false for assets costing $1,000 or more', () => {
    expect(isEligibleForPool(1000)).toBe(false);
    expect(isEligibleForPool(1500)).toBe(false);
    expect(isEligibleForPool(5000)).toBe(false);
  });

  it('should return false for zero or negative costs', () => {
    expect(isEligibleForPool(0)).toBe(false);
    expect(isEligibleForPool(-100)).toBe(false);
    expect(isEligibleForPool(-999)).toBe(false);
  });
});

describe('calculateAssetDeclineInValue', () => {
  it('should calculate first year depreciation at 18.75% of cost', () => {
    const asset: LowValuePoolAsset = {
      id: '1',
      description: 'Office Chair',
      cost: 800,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
      status: 'active',
    };

    const decline = calculateAssetDeclineInValue(asset);
    expect(decline).toBe(800 * 0.1875); // $150
  });

  it('should calculate subsequent year depreciation at 37.5% of opening balance', () => {
    const asset: LowValuePoolAsset = {
      id: '1',
      description: 'Office Chair',
      cost: 800,
      acquisitionDate: '2023-01-15',
      isFirstYear: false,
      openingBalance: 650,
      status: 'active',
    };

    const decline = calculateAssetDeclineInValue(asset);
    expect(decline).toBe(650 * 0.375); // $243.75
  });

  it('should use cost as fallback when opening balance is not provided', () => {
    const asset: LowValuePoolAsset = {
      id: '1',
      description: 'Office Chair',
      cost: 800,
      acquisitionDate: '2023-01-15',
      isFirstYear: false,
      status: 'active',
    };

    const decline = calculateAssetDeclineInValue(asset);
    expect(decline).toBe(800 * 0.375); // $300
  });

  it('should return 0 for disposed assets', () => {
    const asset: LowValuePoolAsset = {
      id: '1',
      description: 'Office Chair',
      cost: 800,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
      status: 'disposed',
      disposal: {
        date: '2024-06-01',
        type: 'sale',
        salePrice: 500,
      },
    };

    const decline = calculateAssetDeclineInValue(asset);
    expect(decline).toBe(0);
  });

  it('should return 0 for fully depreciated assets', () => {
    const asset: LowValuePoolAsset = {
      id: '1',
      description: 'Office Chair',
      cost: 800,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
      status: 'fully_depreciated',
    };

    const decline = calculateAssetDeclineInValue(asset);
    expect(decline).toBe(0);
  });
});

describe('calculateBalancingAdjustment', () => {
  it('should calculate positive adjustment when sale price exceeds written down value', () => {
    const adjustment = calculateBalancingAdjustment(500, 600);
    expect(adjustment).toBe(100); // Assessable income
  });

  it('should calculate negative adjustment when sale price is less than written down value', () => {
    const adjustment = calculateBalancingAdjustment(500, 300);
    expect(adjustment).toBe(-200); // Additional deduction
  });

  it('should return zero when sale price equals written down value', () => {
    const adjustment = calculateBalancingAdjustment(500, 500);
    expect(adjustment).toBe(0);
  });

  it('should handle zero values correctly', () => {
    expect(calculateBalancingAdjustment(0, 0)).toBe(0);
    expect(calculateBalancingAdjustment(0, 100)).toBe(100);
    expect(calculateBalancingAdjustment(100, 0)).toBe(-100);
  });
});

describe('calculatePoolSummary', () => {
  it('should calculate summary for empty pool', () => {
    const summary = calculatePoolSummary([], 0, '2023-24');
    
    expect(summary.taxYear).toBe('2023-24');
    expect(summary.openingBalance).toBe(0);
    expect(summary.newAssetsCost).toBe(0);
    expect(summary.disposalsTerminationValue).toBe(0);
    expect(summary.totalDeclineInValue).toBe(0);
    expect(summary.closingBalance).toBe(0);
    expect(summary.deductibleAmount).toBe(0);
  });

  it('should calculate summary with opening balance only', () => {
    const summary = calculatePoolSummary([], 5000, '2023-24');
    
    expect(summary.openingBalance).toBe(5000);
    expect(summary.totalDeclineInValue).toBe(0); // No assets to depreciate
    expect(summary.closingBalance).toBe(5000);
  });

  it('should calculate summary with first year assets', () => {
    const assets: LowValuePoolAsset[] = [
      {
        id: '1',
        description: 'Printer',
        cost: 600,
        acquisitionDate: '2024-01-15',
        isFirstYear: true,
        status: 'active',
        declineInValue: 112.5, // 600 * 0.1875
      },
      {
        id: '2',
        description: 'Desk Lamp',
        cost: 450,
        acquisitionDate: '2024-02-20',
        isFirstYear: true,
        status: 'active',
        declineInValue: 84.375, // 450 * 0.1875
      },
    ];

    const summary = calculatePoolSummary(assets, 0, '2023-24');
    
    expect(summary.newAssetsCost).toBe(1050);
    expect(summary.totalDeclineInValue).toBe(196.875);
    expect(summary.closingBalance).toBe(853.125);
    expect(summary.deductibleAmount).toBe(196.875);
  });

  it('should calculate summary with mixed first and subsequent year assets', () => {
    const assets: LowValuePoolAsset[] = [
      {
        id: '1',
        description: 'New Printer',
        cost: 600,
        acquisitionDate: '2024-01-15',
        isFirstYear: true,
        status: 'active',
        declineInValue: 112.5,
      },
      {
        id: '2',
        description: 'Old Chair',
        cost: 800,
        acquisitionDate: '2023-01-15',
        isFirstYear: false,
        openingBalance: 650,
        status: 'active',
        declineInValue: 243.75, // 650 * 0.375
      },
    ];

    const summary = calculatePoolSummary(assets, 0, '2023-24');
    
    expect(summary.openingBalance).toBe(650);
    expect(summary.newAssetsCost).toBe(600);
    expect(summary.totalDeclineInValue).toBe(356.25);
    expect(summary.closingBalance).toBe(893.75);
  });

  it('should handle disposals correctly', () => {
    const assets: LowValuePoolAsset[] = [
      {
        id: '1',
        description: 'Sold Printer',
        cost: 600,
        acquisitionDate: '2023-01-15',
        isFirstYear: false,
        openingBalance: 400,
        status: 'disposed',
        declineInValue: 0,
        disposal: {
          date: '2024-03-01',
          type: 'sale',
          salePrice: 350,
          terminationValue: 350,
        },
      },
      {
        id: '2',
        description: 'Active Chair',
        cost: 800,
        acquisitionDate: '2024-01-15',
        isFirstYear: true,
        status: 'active',
        declineInValue: 150,
      },
    ];

    const summary = calculatePoolSummary(assets, 0, '2023-24');
    
    expect(summary.newAssetsCost).toBe(800);
    expect(summary.disposalsTerminationValue).toBe(350);
    expect(summary.totalDeclineInValue).toBe(150);
    expect(summary.closingBalance).toBe(300); // 800 - 350 - 150
  });

  it('should never return negative closing balance', () => {
    const assets: LowValuePoolAsset[] = [
      {
        id: '1',
        description: 'Cheap Item',
        cost: 100,
        acquisitionDate: '2024-01-15',
        isFirstYear: true,
        status: 'active',
        declineInValue: 18.75,
      },
    ];

    // High disposal value that would make balance negative
    const assetWithDisposal: LowValuePoolAsset = {
      ...assets[0],
      status: 'disposed',
      declineInValue: 0,
      disposal: {
        date: '2024-03-01',
        type: 'sale',
        salePrice: 500,
        terminationValue: 500,
      },
    };

    const summary = calculatePoolSummary([assetWithDisposal], 0, '2023-24');
    expect(summary.closingBalance).toBe(0); // Should be clamped to 0
  });
});

describe('addAssetToPool', () => {
  let workpaper: LowValuePoolWorkpaper;

  beforeEach(() => {
    workpaper = createEmptyWorkpaper('2023-24');
  });

  it('should add eligible asset to pool', () => {
    const updated = addAssetToPool(workpaper, {
      description: 'Office Chair',
      cost: 800,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    expect(updated.assets).toHaveLength(1);
    expect(updated.assets[0].description).toBe('Office Chair');
    expect(updated.assets[0].cost).toBe(800);
    expect(updated.assets[0].status).toBe('active');
  });

  it('should generate unique id for new asset', () => {
    const updated1 = addAssetToPool(workpaper, {
      description: 'Chair 1',
      cost: 500,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    const updated2 = addAssetToPool(updated1, {
      description: 'Chair 2',
      cost: 600,
      acquisitionDate: '2024-01-20',
      isFirstYear: true,
    });

    expect(updated2.assets).toHaveLength(2);
    expect(updated2.assets[0].id).not.toBe(updated2.assets[1].id);
  });

  it('should throw error for ineligible asset', () => {
    expect(() => {
      addAssetToPool(workpaper, {
        description: 'Expensive Item',
        cost: 1500,
        acquisitionDate: '2024-01-15',
        isFirstYear: true,
      });
    }).toThrow('not eligible');
  });

  it('should recalculate summary after adding asset', () => {
    const updated = addAssetToPool(workpaper, {
      description: 'Office Chair',
      cost: 800,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    expect(updated.summary.newAssetsCost).toBe(800);
    expect(updated.summary.totalDeclineInValue).toBeGreaterThan(0);
  });

  it('should update timestamp after adding asset', () => {
    const before = Date.now();
    const updated = addAssetToPool(workpaper, {
      description: 'Office Chair',
      cost: 800,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });
    const after = Date.now();

    const updatedTime = new Date(updated.updatedAt).getTime();
    expect(updatedTime).toBeGreaterThanOrEqual(before);
    expect(updatedTime).toBeLessThanOrEqual(after);
  });
});

describe('disposeAsset', () => {
  let workpaper: LowValuePoolWorkpaper;

  beforeEach(() => {
    workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Office Chair',
      cost: 800,
      acquisitionDate: '2023-01-15',
      isFirstYear: false,
      openingBalance: 650,
    });
  });

  it('should mark asset as disposed', () => {
    const assetId = workpaper.assets[0].id;
    const updated = disposeAsset(workpaper, assetId, {
      date: '2024-03-01',
      type: 'sale',
      salePrice: 400,
    });

    expect(updated.assets[0].status).toBe('disposed');
    expect(updated.assets[0].disposal).toBeDefined();
  });

  it('should calculate balancing adjustment for sale', () => {
    const assetId = workpaper.assets[0].id;
    const updated = disposeAsset(workpaper, assetId, {
      date: '2024-03-01',
      type: 'sale',
      salePrice: 400,
    });

    // Written down value: 650 - (650 * 0.375) = 406.25
    // Sale price: 400
    // Adjustment: 400 - 406.25 = -6.25
    expect(updated.assets[0].disposal?.balancingAdjustment).toBeCloseTo(-6.25, 2);
  });

  it('should handle scrapped assets with termination value', () => {
    const assetId = workpaper.assets[0].id;
    const updated = disposeAsset(workpaper, assetId, {
      date: '2024-03-01',
      type: 'scrapped',
      terminationValue: 50,
    });

    expect(updated.assets[0].disposal?.type).toBe('scrapped');
    expect(updated.assets[0].disposal?.terminationValue).toBe(50);
  });

  it('should throw error for non-existent asset', () => {
    expect(() => {
      disposeAsset(workpaper, 'non-existent-id', {
        date: '2024-03-01',
        type: 'sale',
        salePrice: 400,
      });
    }).toThrow('not found');
  });
});

describe('recalculatePool', () => {
  it('should calculate decline in value for all active assets', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Printer',
      cost: 600,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    const recalculated = recalculatePool(workpaper);

    expect(recalculated.assets[0].declineInValue).toBe(112.5); // 600 * 0.1875
    expect(recalculated.assets[0].closingBalance).toBe(487.5); // 600 - 112.5
  });

  it('should mark fully depreciated assets', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Cheap Item',
      cost: 10,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    // Simulate many years of depreciation
    const asset = workpaper.assets[0];
    asset.openingBalance = 0.005; // Very small balance
    asset.isFirstYear = false;

    const recalculated = recalculatePool(workpaper);

    expect(recalculated.assets[0].status).toBe('fully_depreciated');
  });

  it('should not modify disposed assets', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Printer',
      cost: 600,
      acquisitionDate: '2023-01-15',
      isFirstYear: false,
      openingBalance: 400,
    });

    const assetId = workpaper.assets[0].id;
    workpaper = disposeAsset(workpaper, assetId, {
      date: '2024-03-01',
      type: 'sale',
      salePrice: 300,
    });

    const recalculated = recalculatePool(workpaper);

    expect(recalculated.assets[0].status).toBe('disposed');
    expect(recalculated.assets[0].declineInValue).toBeUndefined();
  });
});

describe('createEmptyWorkpaper', () => {
  it('should create workpaper with given tax year', () => {
    const workpaper = createEmptyWorkpaper('2023-24');
    
    expect(workpaper.taxYear).toBe('2023-24');
    expect(workpaper.assets).toEqual([]);
    expect(workpaper.priorYearClosingBalance).toBeUndefined();
  });

  it('should generate unique id', () => {
    const wp1 = createEmptyWorkpaper('2023-24');
    const wp2 = createEmptyWorkpaper('2023-24');
    
    expect(wp1.id).not.toBe(wp2.id);
    expect(wp1.id).toBeDefined();
  });

  it('should set creation timestamps', () => {
    const before = Date.now();
    const workpaper = createEmptyWorkpaper('2023-24');
    const after = Date.now();
    
    const createdTime = new Date(workpaper.createdAt).getTime();
    expect(createdTime).toBeGreaterThanOrEqual(before);
    expect(createdTime).toBeLessThanOrEqual(after);
    expect(workpaper.updatedAt).toBe(workpaper.createdAt);
  });

  it('should initialize summary with zeros', () => {
    const workpaper = createEmptyWorkpaper('2023-24');
    
    expect(workpaper.summary.openingBalance).toBe(0);
    expect(workpaper.summary.newAssetsCost).toBe(0);
    expect(workpaper.summary.totalDeclineInValue).toBe(0);
    expect(workpaper.summary.deductibleAmount).toBe(0);
  });
});

describe('exportWorkpaper', () => {
  it('should export with correct category', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Printer',
      cost: 600,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    const exported = exportWorkpaper(workpaper);

    expect(exported.category).toBe('D6');
    expect(exported.categoryName).toBe('Low-value pool deduction');
    expect(exported.taxYear).toBe('2023-24');
  });

  it('should include correct claim amount', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Printer',
      cost: 600,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    const exported = exportWorkpaper(workpaper);

    expect(exported.claimAmount).toBe(112.5); // 600 * 0.1875
  });

  it('should count assets correctly', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Printer',
      cost: 600,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });
    workpaper = addAssetToPool(workpaper, {
      description: 'Chair',
      cost: 500,
      acquisitionDate: '2024-02-15',
      isFirstYear: true,
    });

    const assetId = workpaper.assets[0].id;
    workpaper = disposeAsset(workpaper, assetId, {
      date: '2024-03-01',
      type: 'sale',
      salePrice: 300,
    });

    const exported = exportWorkpaper(workpaper);

    expect(exported.assetCount).toBe(1); // 1 active
    expect(exported.disposedAssetCount).toBe(1); // 1 disposed
  });
});

describe('validateWorkpaper', () => {
  it('should return valid for empty workpaper', () => {
    const workpaper = createEmptyWorkpaper('2023-24');
    const validation = validateWorkpaper(workpaper);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('should detect ineligible assets', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper.assets.push({
      id: '1',
      description: 'Expensive Item',
      cost: 1500,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
      status: 'active',
    });

    const validation = validateWorkpaper(workpaper);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0]).toContain('exceeds');
  });

  it('should detect negative costs', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper.assets.push({
      id: '1',
      description: 'Invalid Item',
      cost: -100,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
      status: 'active',
    });

    const validation = validateWorkpaper(workpaper);

    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(e => e.includes('negative'))).toBe(true);
  });

  it('should warn about empty pool', () => {
    const workpaper = createEmptyWorkpaper('2023-24');
    const validation = validateWorkpaper(workpaper);

    expect(validation.warnings.some(w => w.includes('No assets'))).toBe(true);
  });

  it('should warn about small closing balance', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper.summary.closingBalance = 0.5;

    const validation = validateWorkpaper(workpaper);

    expect(validation.warnings.some(w => w.includes('small'))).toBe(true);
  });

  it('should warn about missing sale price', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper.assets.push({
      id: '1',
      description: 'Sold Item',
      cost: 500,
      acquisitionDate: '2023-01-15',
      isFirstYear: false,
      openingBalance: 300,
      status: 'disposed',
      disposal: {
        date: '2024-03-01',
        type: 'sale',
        // No salePrice
      },
    });

    const validation = validateWorkpaper(workpaper);

    expect(validation.warnings.some(w => w.includes('sale price'))).toBe(true);
  });
});

describe('getWorkpaperStats', () => {
  it('should return zero stats for empty workpaper', () => {
    const workpaper = createEmptyWorkpaper('2023-24');
    const stats = getWorkpaperStats(workpaper);

    expect(stats.totalAssets).toBe(0);
    expect(stats.activeAssets).toBe(0);
    expect(stats.firstYearAssets).toBe(0);
    expect(stats.totalCost).toBe(0);
    expect(stats.isComplete).toBe(false);
  });

  it('should count first and subsequent year assets', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'New Printer',
      cost: 600,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });
    workpaper = addAssetToPool(workpaper, {
      description: 'Old Chair',
      cost: 500,
      acquisitionDate: '2023-01-15',
      isFirstYear: false,
      openingBalance: 300,
    });

    const stats = getWorkpaperStats(workpaper);

    expect(stats.totalAssets).toBe(2);
    expect(stats.activeAssets).toBe(2);
    expect(stats.firstYearAssets).toBe(1);
    expect(stats.subsequentYearAssets).toBe(1);
    expect(stats.totalCost).toBe(1100);
  });

  it('should count disposed assets separately', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Printer',
      cost: 600,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });
    workpaper = addAssetToPool(workpaper, {
      description: 'Chair',
      cost: 500,
      acquisitionDate: '2024-02-15',
      isFirstYear: true,
    });

    const assetId = workpaper.assets[0].id;
    workpaper = disposeAsset(workpaper, assetId, {
      date: '2024-03-01',
      type: 'sale',
      salePrice: 300,
    });

    const stats = getWorkpaperStats(workpaper);

    expect(stats.totalAssets).toBe(2);
    expect(stats.activeAssets).toBe(1);
    expect(stats.disposedAssets).toBe(1);
    expect(stats.totalCost).toBe(500); // Only active assets
  });

  it('should mark complete when there are assets', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Printer',
      cost: 600,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    const stats = getWorkpaperStats(workpaper);

    expect(stats.isComplete).toBe(true);
  });

  it('should mark complete with opening balance only', () => {
    const workpaper = createEmptyWorkpaper('2023-24');
    workpaper.summary.openingBalance = 5000;

    const stats = getWorkpaperStats(workpaper);

    expect(stats.isComplete).toBe(true);
  });
});

describe('ATO_D6_GUIDANCE', () => {
  it('should contain required guidance fields', () => {
    expect(ATO_D6_GUIDANCE.title).toBe('D6 Low-Value Pool');
    expect(ATO_D6_GUIDANCE.description).toBeDefined();
    expect(ATO_D6_GUIDANCE.eligibleAssets).toBeInstanceOf(Array);
    expect(ATO_D6_GUIDANCE.ineligibleAssets).toBeInstanceOf(Array);
    expect(ATO_D6_GUIDANCE.recordKeeping).toBeInstanceOf(Array);
    expect(ATO_D6_GUIDANCE.reference).toContain('ato.gov.au');
  });

  it('should list common eligible assets', () => {
    const eligible = ATO_D6_GUIDANCE.eligibleAssets.join(' ').toLowerCase();
    expect(eligible).toContain('low-cost');
    expect(eligible).toContain('$1,000');
  });

  it('should list common ineligible assets', () => {
    const ineligible = ATO_D6_GUIDANCE.ineligibleAssets.join(' ').toLowerCase();
    expect(ineligible).toContain('personal');
  });

  it('should specify depreciation rates', () => {
    expect(ATO_D6_GUIDANCE.rates.firstYear).toContain('18.75%');
    expect(ATO_D6_GUIDANCE.rates.subsequent).toContain('37.5%');
  });
});

// Edge cases and complex scenarios
describe('Edge Cases', () => {
  it('should handle multiple disposals in same year', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    
    // Add 3 assets
    workpaper = addAssetToPool(workpaper, {
      description: 'Printer 1',
      cost: 600,
      acquisitionDate: '2023-01-15',
      isFirstYear: false,
      openingBalance: 400,
    });
    workpaper = addAssetToPool(workpaper, {
      description: 'Printer 2',
      cost: 700,
      acquisitionDate: '2023-01-15',
      isFirstYear: false,
      openingBalance: 500,
    });
    workpaper = addAssetToPool(workpaper, {
      description: 'Printer 3',
      cost: 800,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    // Dispose of 2
    workpaper = disposeAsset(workpaper, workpaper.assets[0].id, {
      date: '2024-03-01',
      type: 'sale',
      salePrice: 300,
    });
    workpaper = disposeAsset(workpaper, workpaper.assets[1].id, {
      date: '2024-04-01',
      type: 'sale',
      salePrice: 400,
    });

    const summary = calculatePoolSummary(workpaper.assets, 0, '2023-24');
    expect(summary.disposalsTerminationValue).toBe(700);
    const activeAssets = workpaper.assets.filter(a => a.status !== 'disposed').length;
    expect(activeAssets).toBe(1); // 1 active
  });

  it('should handle assets with zero cost (edge case)', () => {
    const workpaper = createEmptyWorkpaper('2023-24');
    
    // This should throw an error as 0 is not eligible
    expect(() => {
      addAssetToPool(workpaper, {
        description: 'Free Item',
        cost: 0,
        acquisitionDate: '2024-01-15',
        isFirstYear: true,
      });
    }).toThrow();
  });

  it('should handle very small asset values', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Tiny Item',
      cost: 1,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    const summary = calculatePoolSummary(workpaper.assets, 0, '2023-24');
    expect(summary.totalDeclineInValue).toBe(0.1875); // 1 * 0.1875
    expect(summary.closingBalance).toBe(0.8125);
  });

  it('should handle assets just under threshold', () => {
    let workpaper = createEmptyWorkpaper('2023-24');
    workpaper = addAssetToPool(workpaper, {
      description: 'Almost at threshold',
      cost: 999.99,
      acquisitionDate: '2024-01-15',
      isFirstYear: true,
    });

    expect(workpaper.assets).toHaveLength(1);
    expect(workpaper.assets[0].cost).toBe(999.99);
  });
});
