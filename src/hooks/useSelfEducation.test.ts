import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelfEducation } from '@/hooks/useSelfEducation';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useSelfEducation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should initialize with empty data', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data.taxYear).toBe(2024);
    expect(result.current.data.courses).toEqual([]);
    expect(result.current.data.expenses).toEqual([]);
    expect(result.current.data.depreciatingAssets).toEqual([]);
  });

  it('should add a course', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addCourse({
        name: 'MBA',
        provider: 'University of Sydney',
        courseType: 'tertiary_degree',
        studyMode: 'part_time',
        startDate: '2024-03-01',
        isWorkRelated: true,
        leadsToQualification: true,
        maintainsImprovesSkills: true,
        resultsInIncomeIncrease: true,
      });
    });
    
    expect(result.current.data.courses).toHaveLength(1);
    expect(result.current.data.courses[0].name).toBe('MBA');
    expect(result.current.data.courses[0].provider).toBe('University of Sydney');
  });

  it('should update a course', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addCourse({
        name: 'MBA',
        provider: 'University of Sydney',
        courseType: 'tertiary_degree',
        studyMode: 'part_time',
        startDate: '2024-03-01',
        isWorkRelated: true,
        leadsToQualification: true,
        maintainsImprovesSkills: true,
        resultsInIncomeIncrease: true,
      });
    });
    
    const courseId = result.current.data.courses[0].id;
    
    act(() => {
      result.current.updateCourse(courseId, { name: 'Executive MBA' });
    });
    
    expect(result.current.data.courses[0].name).toBe('Executive MBA');
    expect(result.current.data.courses[0].provider).toBe('University of Sydney'); // unchanged
  });

  it('should remove a course', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addCourse({
        name: 'MBA',
        provider: 'University of Sydney',
        courseType: 'tertiary_degree',
        studyMode: 'part_time',
        startDate: '2024-03-01',
        isWorkRelated: true,
        leadsToQualification: true,
        maintainsImprovesSkills: true,
        resultsInIncomeIncrease: true,
      });
    });
    
    const courseId = result.current.data.courses[0].id;
    
    act(() => {
      result.current.removeCourse(courseId);
    });
    
    expect(result.current.data.courses).toHaveLength(0);
  });

  it('should add an expense', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addExpense({
        type: 'course_fees',
        description: 'Semester 1 Tuition',
        amount: 4500,
        date: '2024-03-01',
        workRelatedPercentage: 100,
      });
    });
    
    expect(result.current.data.expenses).toHaveLength(1);
    expect(result.current.data.expenses[0].description).toBe('Semester 1 Tuition');
    expect(result.current.data.expenses[0].amount).toBe(4500);
  });

  it('should calculate totals when adding an expense', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addExpense({
        type: 'course_fees',
        description: 'Tuition',
        amount: 500,
        date: '2024-03-01',
        workRelatedPercentage: 100,
      });
    });
    
    expect(result.current.data.taxableIncomeReduction).toBe(250);
    expect(result.current.data.totalDeductible).toBe(250);
  });

  it('should update an expense', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addExpense({
        type: 'course_fees',
        description: 'Tuition',
        amount: 500,
        date: '2024-03-01',
        workRelatedPercentage: 100,
      });
    });
    
    const expenseId = result.current.data.expenses[0].id;
    
    act(() => {
      result.current.updateExpense(expenseId, { amount: 600 });
    });
    
    expect(result.current.data.expenses[0].amount).toBe(600);
  });

  it('should remove an expense', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addExpense({
        type: 'course_fees',
        description: 'Tuition',
        amount: 500,
        date: '2024-03-01',
        workRelatedPercentage: 100,
      });
    });
    
    const expenseId = result.current.data.expenses[0].id;
    
    act(() => {
      result.current.removeExpense(expenseId);
    });
    
    expect(result.current.data.expenses).toHaveLength(0);
  });

  it('should add a depreciating asset', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addAsset({
        name: 'Study Laptop',
        cost: 2000,
        purchaseDate: '2024-01-01',
        effectiveLifeYears: 3,
        businessUsePercentage: 100,
        method: 'prime_cost',
      });
    });
    
    expect(result.current.data.depreciatingAssets).toHaveLength(1);
    expect(result.current.data.depreciatingAssets[0].name).toBe('Study Laptop');
    expect(result.current.data.depreciatingAssets[0].cost).toBe(2000);
  });

  it('should update an asset', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addAsset({
        name: 'Study Laptop',
        cost: 2000,
        purchaseDate: '2024-01-01',
        effectiveLifeYears: 3,
        businessUsePercentage: 100,
        method: 'prime_cost',
      });
    });
    
    const assetId = result.current.data.depreciatingAssets[0].id;
    
    act(() => {
      result.current.updateAsset(assetId, { businessUsePercentage: 80 });
    });
    
    expect(result.current.data.depreciatingAssets[0].businessUsePercentage).toBe(80);
  });

  it('should remove an asset', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addAsset({
        name: 'Study Laptop',
        cost: 2000,
        purchaseDate: '2024-01-01',
        effectiveLifeYears: 3,
        businessUsePercentage: 100,
        method: 'prime_cost',
      });
    });
    
    const assetId = result.current.data.depreciatingAssets[0].id;
    
    act(() => {
      result.current.removeAsset(assetId);
    });
    
    expect(result.current.data.depreciatingAssets).toHaveLength(0);
  });

  it('should calculate depreciation correctly', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addAsset({
        name: 'Study Laptop',
        cost: 1200,
        purchaseDate: '2024-01-01',
        effectiveLifeYears: 3,
        businessUsePercentage: 100,
        method: 'prime_cost',
      });
    });
    
    const assetId = result.current.data.depreciatingAssets[0].id;
    
    act(() => {
      result.current.calculateAssetDepreciation(assetId);
    });
    
    // Prime cost: $1200 / 3 years = $400
    expect(result.current.data.depreciatingAssets[0].declineInValue).toBe(400);
    expect(result.current.data.depreciatingAssets[0].closingBalance).toBe(800);
  });

  it('should calculate diminishing value depreciation correctly', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addAsset({
        name: 'Study Laptop',
        cost: 1200,
        purchaseDate: '2024-01-01',
        effectiveLifeYears: 3,
        businessUsePercentage: 100,
        method: 'diminishing_value',
      });
    });
    
    const assetId = result.current.data.depreciatingAssets[0].id;
    
    act(() => {
      result.current.calculateAssetDepreciation(assetId);
    });
    
    // Diminishing value: ($1200 × 2 / 3) = $800
    expect(result.current.data.depreciatingAssets[0].declineInValue).toBe(800);
    expect(result.current.data.depreciatingAssets[0].closingBalance).toBe(400);
  });

  it('should export data to JSON', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addCourse({
        name: 'MBA',
        provider: 'University of Sydney',
        courseType: 'tertiary_degree',
        studyMode: 'part_time',
        startDate: '2024-03-01',
        isWorkRelated: true,
        leadsToQualification: true,
        maintainsImprovesSkills: true,
        resultsInIncomeIncrease: true,
      });
    });
    
    const json = result.current.exportToJson();
    const parsed = JSON.parse(json);
    
    expect(parsed.taxYear).toBe(2024);
    expect(parsed.courses).toHaveLength(1);
    expect(parsed.courses[0].name).toBe('MBA');
  });

  it('should import data from JSON', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    const importData = {
      taxYear: 2024,
      courses: [
        {
          id: 'imported-1',
          name: 'Imported Course',
          provider: 'Test University',
          courseType: 'professional',
          studyMode: 'online',
          startDate: '2024-01-01',
          isWorkRelated: true,
          leadsToQualification: true,
          maintainsImprovesSkills: true,
          resultsInIncomeIncrease: false,
        },
      ],
      expenses: [],
      depreciatingAssets: [],
      taxableIncomeReduction: 250,
      totalDeductible: 0,
    };
    
    act(() => {
      result.current.importFromJson(JSON.stringify(importData));
    });
    
    expect(result.current.data.courses).toHaveLength(1);
    expect(result.current.data.courses[0].name).toBe('Imported Course');
  });

  it('should reset all data', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addCourse({
        name: 'MBA',
        provider: 'University of Sydney',
        courseType: 'tertiary_degree',
        studyMode: 'part_time',
        startDate: '2024-03-01',
        isWorkRelated: true,
        leadsToQualification: true,
        maintainsImprovesSkills: true,
        resultsInIncomeIncrease: true,
      });
      result.current.addExpense({
        type: 'course_fees',
        description: 'Tuition',
        amount: 500,
        date: '2024-03-01',
        workRelatedPercentage: 100,
      });
    });
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.data.courses).toHaveLength(0);
    expect(result.current.data.expenses).toHaveLength(0);
    expect(result.current.data.depreciatingAssets).toHaveLength(0);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('tally_self_education_workpaper');
  });

  it('should load data from localStorage on mount', () => {
    const storedData = {
      taxYear: 2024,
      courses: [
        {
          id: 'stored-1',
          name: 'Stored Course',
          provider: 'Stored University',
          courseType: 'tertiary_degree',
          studyMode: 'full_time',
          startDate: '2024-01-01',
          isWorkRelated: true,
          leadsToQualification: true,
          maintainsImprovesSkills: true,
          resultsInIncomeIncrease: true,
        },
      ],
      expenses: [],
      depreciatingAssets: [],
      taxableIncomeReduction: 250,
      totalDeductible: 0,
    };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
    
    const { result } = renderHook(() => useSelfEducation(2024));
    
    expect(result.current.data.courses).toHaveLength(1);
    expect(result.current.data.courses[0].name).toBe('Stored Course');
  });

  it('should save data to localStorage when data changes', async () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addCourse({
        name: 'MBA',
        provider: 'University of Sydney',
        courseType: 'tertiary_degree',
        studyMode: 'part_time',
        startDate: '2024-03-01',
        isWorkRelated: true,
        leadsToQualification: true,
        maintainsImprovesSkills: true,
        resultsInIncomeIncrease: true,
      });
    });
    
    // Wait for useEffect to run
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(localStorageMock.setItem).toHaveBeenCalled();
    // Find the call with our data (might be multiple calls due to initial render)
    const courseCalls = localStorageMock.setItem.mock.calls.filter(
      (call: [string, string]) => {
        try {
          const data = JSON.parse(call[1]);
          return data.courses && data.courses.length > 0;
        } catch {
          return false;
        }
      }
    );
    expect(courseCalls.length).toBeGreaterThan(0);
    const savedData = JSON.parse(courseCalls[courseCalls.length - 1][1]);
    expect(savedData.courses).toHaveLength(1);
    expect(savedData.courses[0].name).toBe('MBA');
  });

  it('should not load data from localStorage if tax year differs', () => {
    const storedData = {
      taxYear: 2023,
      courses: [{ id: 'old', name: 'Old Course', provider: 'Old Uni', courseType: 'tertiary_degree', studyMode: 'full_time', startDate: '2023-01-01', isWorkRelated: true, leadsToQualification: true, maintainsImprovesSkills: true, resultsInIncomeIncrease: true }],
      expenses: [],
      depreciatingAssets: [],
      taxableIncomeReduction: 250,
      totalDeductible: 0,
    };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
    
    const { result } = renderHook(() => useSelfEducation(2024));
    
    expect(result.current.data.courses).toHaveLength(0);
  });

  it('should handle import with invalid JSON gracefully', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    act(() => {
      result.current.importFromJson('invalid json');
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useSelfEducation(2024));
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data.courses).toEqual([]);
    
    consoleSpy.mockRestore();
  });

  it('should recalculate totals when requested', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addExpense({
        type: 'course_fees',
        description: 'Tuition',
        amount: 1000,
        date: '2024-03-01',
        workRelatedPercentage: 100,
      });
    });
    
    const initialDeductible = result.current.data.totalDeductible;
    
    act(() => {
      result.current.recalculateTotals();
    });
    
    expect(result.current.data.totalDeductible).toBe(initialDeductible);
  });

  it('should generate unique IDs for courses', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addCourse({
        name: 'Course 1',
        provider: 'Uni 1',
        courseType: 'tertiary_degree',
        studyMode: 'part_time',
        startDate: '2024-01-01',
        isWorkRelated: true,
        leadsToQualification: true,
        maintainsImprovesSkills: true,
        resultsInIncomeIncrease: true,
      });
      result.current.addCourse({
        name: 'Course 2',
        provider: 'Uni 2',
        courseType: 'professional',
        studyMode: 'online',
        startDate: '2024-02-01',
        isWorkRelated: true,
        leadsToQualification: true,
        maintainsImprovesSkills: true,
        resultsInIncomeIncrease: false,
      });
    });
    
    expect(result.current.data.courses[0].id).not.toBe(result.current.data.courses[1].id);
  });

  it('should generate unique IDs for expenses', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addExpense({
        type: 'course_fees',
        description: 'Expense 1',
        amount: 100,
        date: '2024-01-01',
        workRelatedPercentage: 100,
      });
      result.current.addExpense({
        type: 'textbooks',
        description: 'Expense 2',
        amount: 200,
        date: '2024-02-01',
        workRelatedPercentage: 100,
      });
    });
    
    expect(result.current.data.expenses[0].id).not.toBe(result.current.data.expenses[1].id);
  });

  it('should generate unique IDs for assets', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    act(() => {
      result.current.addAsset({
        name: 'Laptop 1',
        cost: 1000,
        purchaseDate: '2024-01-01',
        effectiveLifeYears: 3,
        businessUsePercentage: 100,
        method: 'prime_cost',
      });
      result.current.addAsset({
        name: 'Laptop 2',
        cost: 2000,
        purchaseDate: '2024-02-01',
        effectiveLifeYears: 3,
        businessUsePercentage: 100,
        method: 'prime_cost',
      });
    });
    
    expect(result.current.data.depreciatingAssets[0].id).not.toBe(result.current.data.depreciatingAssets[1].id);
  });

  it('should handle complex scenario with multiple courses, expenses, and assets', () => {
    const { result } = renderHook(() => useSelfEducation(2024));
    
    // Add courses
    act(() => {
      result.current.addCourse({
        name: 'MBA',
        provider: 'University',
        courseType: 'tertiary_degree',
        studyMode: 'part_time',
        startDate: '2024-03-01',
        isWorkRelated: true,
        leadsToQualification: true,
        maintainsImprovesSkills: true,
        resultsInIncomeIncrease: true,
      });
    });
    
    // Add expenses
    act(() => {
      result.current.addExpense({
        type: 'course_fees',
        description: 'Tuition',
        amount: 5000,
        date: '2024-03-01',
        workRelatedPercentage: 100,
      });
      result.current.addExpense({
        type: 'textbooks',
        description: 'Books',
        amount: 500,
        date: '2024-03-01',
        workRelatedPercentage: 100,
      });
      result.current.addExpense({
        type: 'travel',
        description: 'Transport',
        amount: 800,
        date: '2024-03-01',
        workRelatedPercentage: 100,
      });
    });
    
    // Add assets
    act(() => {
      result.current.addAsset({
        name: 'Study Laptop',
        cost: 2000,
        purchaseDate: '2024-01-01',
        effectiveLifeYears: 3,
        businessUsePercentage: 80,
        method: 'prime_cost',
      });
    });
    
    // Calculate depreciation
    const assetId = result.current.data.depreciatingAssets[0].id;
    act(() => {
      result.current.calculateAssetDepreciation(assetId);
    });
    
    // Verify totals
    expect(result.current.data.courses).toHaveLength(1);
    expect(result.current.data.expenses).toHaveLength(3);
    expect(result.current.data.depreciatingAssets).toHaveLength(1);
    expect(result.current.data.depreciatingAssets[0].declineInValue).toBeCloseTo(533.33, 1);
    
    // Total deduction: ($5000 + $500 + $800 + $533.33) - $250 = $6583.33
    expect(result.current.data.totalDeductible).toBeCloseTo(6583.33, 1);
  });
});
