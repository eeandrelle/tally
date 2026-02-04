/**
 * Franking Credits Hooks Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFrankingCredits, useFrankingCalculator, useTaxImpact } from './useFrankingCredits';
import { useDividendEntry, useDividendEntryForm } from './useDividendEntry';

// Mock the database module
vi.mock('../lib/db-franking-credits', () => ({
  getDividendEntriesByTaxYear: vi.fn(),
  getAnnualFrankingSummary: vi.fn(),
  getAvailableTaxYears: vi.fn(),
  exportDividendEntriesToCSV: vi.fn(),
  exportDividendEntriesToJSON: vi.fn(),
  createDividendEntry: vi.fn(),
  updateDividendEntry: vi.fn(),
  deleteDividendEntry: vi.fn(),
  deleteDividendEntries: vi.fn(),
  getDividendEntry: vi.fn(),
  initFrankingCreditDatabase: vi.fn(),
}));

import * as dbModule from '../lib/db-franking-credits';

describe('useFrankingCalculator', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFrankingCalculator());
    
    expect(result.current.dividendAmount).toBe(0);
    expect(result.current.frankingPercentage).toBe(100);
    expect(result.current.isValid).toBe(true);
  });

  it('should initialize with provided values', () => {
    const { result } = renderHook(() => 
      useFrankingCalculator({ initialDividend: 1000, initialPercentage: 50 })
    );
    
    expect(result.current.dividendAmount).toBe(1000);
    expect(result.current.frankingPercentage).toBe(50);
  });

  it('should update dividend amount', () => {
    const { result } = renderHook(() => useFrankingCalculator());
    
    act(() => {
      result.current.setDividendAmount(500);
    });
    
    expect(result.current.dividendAmount).toBe(500);
  });

  it('should update franking percentage', () => {
    const { result } = renderHook(() => useFrankingCalculator());
    
    act(() => {
      result.current.setFrankingPercentage(75);
    });
    
    expect(result.current.frankingPercentage).toBe(75);
  });

  it('should calculate franking credit correctly', () => {
    const { result } = renderHook(() => 
      useFrankingCalculator({ initialDividend: 700, initialPercentage: 100 })
    );
    
    // $700 dividend, 100% franked = $300 credit
    expect(result.current.calculation.frankingCredit).toBe(300);
    expect(result.current.calculation.grossedUpDividend).toBe(1000);
  });

  it('should calculate partially franked dividend correctly', () => {
    const { result } = renderHook(() => 
      useFrankingCalculator({ initialDividend: 700, initialPercentage: 50 })
    );
    
    // $700 dividend, 50% franked = $350 franked, $150 credit
    expect(result.current.calculation.frankedAmount).toBe(350);
    expect(result.current.calculation.frankingCredit).toBe(150);
  });

  it('should reset to initial values', () => {
    const { result } = renderHook(() => 
      useFrankingCalculator({ initialDividend: 1000, initialPercentage: 50 })
    );
    
    act(() => {
      result.current.setDividendAmount(500);
      result.current.setFrankingPercentage(25);
    });
    
    expect(result.current.dividendAmount).toBe(500);
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.dividendAmount).toBe(1000);
    expect(result.current.frankingPercentage).toBe(50);
  });

  it('should return invalid for negative dividend', () => {
    const { result } = renderHook(() => useFrankingCalculator());
    
    act(() => {
      result.current.setDividendAmount(-100);
    });
    
    expect(result.current.isValid).toBe(false);
  });

  it('should return invalid for percentage > 100', () => {
    const { result } = renderHook(() => useFrankingCalculator());
    
    act(() => {
      result.current.setFrankingPercentage(150);
    });
    
    expect(result.current.isValid).toBe(false);
  });

  it('should calculate tax impacts at all rates', () => {
    const { result } = renderHook(() => 
      useFrankingCalculator({ initialDividend: 700, initialPercentage: 100 })
    );
    
    // Should have tax impacts for multiple rates
    expect(result.current.taxImpacts.length).toBeGreaterThan(0);
    
    // Check 30% rate impact (break-even point for fully franked)
    const thirtyPercentImpact = result.current.taxImpacts.find(
      i => i.marginalRate === 0.30
    );
    expect(thirtyPercentImpact).toBeDefined();
  });
});

describe('useTaxImpact', () => {
  it('should calculate tax impact at specific income', () => {
    const { result } = renderHook(() => 
      useTaxImpact({
        grossedUpDividend: 1000,
        frankingCredit: 300,
        taxableIncome: 75000,
      })
    );
    
    // $75k income = 30% marginal rate
    expect(result.current.marginalRate).toBe(0.30);
    expect(result.current.taxImpact?.netTaxPosition).toBe(0); // Break even at 30%
  });

  it('should determine refundable status correctly', () => {
    const { result } = renderHook(() => 
      useTaxImpact({
        grossedUpDividend: 1000,
        frankingCredit: 300,
        taxableIncome: 15000, // 0% bracket
      })
    );
    
    expect(result.current.isRefundable).toBe(true);
    expect(result.current.refundAmount).toBe(300);
  });

  it('should determine tax payable correctly', () => {
    const { result } = renderHook(() => 
      useTaxImpact({
        grossedUpDividend: 1000,
        frankingCredit: 300,
        taxableIncome: 200000, // 45% bracket
      })
    );
    
    expect(result.current.isRefundable).toBe(false);
    expect(result.current.taxPayableAmount).toBe(150); // 45% of 1000 - 300
  });

  it('should return null taxImpact when no income provided', () => {
    const { result } = renderHook(() => 
      useTaxImpact({
        grossedUpDividend: 1000,
        frankingCredit: 300,
      })
    );
    
    expect(result.current.taxImpact).toBeNull();
  });

  it('should provide all tax impacts', () => {
    const { result } = renderHook(() => 
      useTaxImpact({
        grossedUpDividend: 1000,
        frankingCredit: 300,
      })
    );
    
    expect(result.current.allTaxImpacts.length).toBeGreaterThan(0);
  });
});

describe('useDividendEntryForm', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useDividendEntryForm());
    
    expect(result.current.values.companyName).toBe('');
    expect(result.current.values.dividendAmount).toBe('');
    expect(result.current.values.frankingPercentage).toBe('100');
    expect(result.current.values.dateReceived).toBeDefined();
    expect(result.current.values.notes).toBe('');
  });

  it('should initialize with provided values', () => {
    const { result } = renderHook(() => 
      useDividendEntryForm({
        initialValues: {
          companyName: 'Test Co',
          dividendAmount: '1000',
          frankingPercentage: '50',
        },
      })
    );
    
    expect(result.current.values.companyName).toBe('Test Co');
    expect(result.current.values.dividendAmount).toBe('1000');
    expect(result.current.values.frankingPercentage).toBe('50');
  });

  it('should update company name', () => {
    const { result } = renderHook(() => useDividendEntryForm());
    
    act(() => {
      result.current.setCompanyName('New Company');
    });
    
    expect(result.current.values.companyName).toBe('New Company');
  });

  it('should validate required fields', () => {
    const { result } = renderHook(() => useDividendEntryForm());
    
    // Clear the default date to trigger validation error
    act(() => {
      result.current.setDateReceived('');
    });
    
    let isValid: boolean = true;
    act(() => {
      isValid = result.current.validate();
    });
    
    expect(isValid).toBe(false);
    expect(result.current.errors.companyName).toBeDefined();
    expect(result.current.errors.dividendAmount).toBeDefined();
    expect(result.current.errors.dateReceived).toBeDefined();
  });

  it('should validate dividend amount is non-negative', () => {
    const { result } = renderHook(() => useDividendEntryForm());
    
    act(() => {
      result.current.setDividendAmount('-100');
    });
    
    act(() => {
      result.current.validate();
    });
    
    expect(result.current.errors.dividendAmount).toBeDefined();
  });

  it('should validate franking percentage range', () => {
    const { result } = renderHook(() => useDividendEntryForm());
    
    act(() => {
      result.current.setFrankingPercentage('150');
    });
    
    act(() => {
      result.current.validate();
    });
    
    expect(result.current.errors.frankingPercentage).toBeDefined();
  });

  it('should parse dividend amount correctly', () => {
    const { result } = renderHook(() => useDividendEntryForm({
      initialValues: { dividendAmount: '1000.50' },
    }));
    
    expect(result.current.parsedDividendAmount).toBe(1000.50);
  });

  it('should parse franking percentage correctly', () => {
    const { result } = renderHook(() => useDividendEntryForm({
      initialValues: { frankingPercentage: '75.5' },
    }));
    
    expect(result.current.parsedFrankingPercentage).toBe(75.5);
  });

  it('should reset to initial values', () => {
    const { result } = renderHook(() => 
      useDividendEntryForm({
        initialValues: { companyName: 'Test Co' },
      })
    );
    
    act(() => {
      result.current.setCompanyName('New Name');
    });
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.values.companyName).toBe('Test Co');
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useDividendEntryForm());
    
    act(() => {
      result.current.validate();
    });
    
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
    
    act(() => {
      result.current.clearErrors();
    });
    
    expect(Object.keys(result.current.errors).length).toBe(0);
  });
});

describe('useFrankingCredits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    vi.mocked(dbModule.getDividendEntriesByTaxYear).mockResolvedValue([]);
    vi.mocked(dbModule.getAvailableTaxYears).mockResolvedValue([]);
    
    const { result } = renderHook(() => useFrankingCredits({ autoLoad: false }));
    
    expect(result.current.entries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should calculate totals from entries', () => {
    const mockEntries = [
      {
        id: 1,
        companyName: 'Co A',
        dividendAmount: 1000,
        frankingPercentage: 100,
        frankingCredit: 428.57,
        grossedUpDividend: 1428.57,
        dateReceived: '2024-08-15',
        taxYear: '2024-2025',
      },
      {
        id: 2,
        companyName: 'Co B',
        dividendAmount: 500,
        frankingPercentage: 50,
        frankingCredit: 107.14,
        grossedUpDividend: 607.14,
        dateReceived: '2024-09-15',
        taxYear: '2024-2025',
      },
    ];
    
    vi.mocked(dbModule.getDividendEntriesByTaxYear).mockResolvedValue(mockEntries);
    vi.mocked(dbModule.getAvailableTaxYears).mockResolvedValue(['2024-2025']);
    
    const { result } = renderHook(() => useFrankingCredits({ autoLoad: true }));
    
    // Wait for async operations
    waitFor(() => {
      expect(result.current.entryCount).toBe(2);
      expect(result.current.totalDividends).toBe(1500);
      expect(result.current.totalFrankingCredits).toBeCloseTo(535.71, 2);
    });
  });
});
