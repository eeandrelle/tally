import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useCategorizationSuggestions,
  useSuggestion,
  useSuggestionStats,
  type UseCategorizationSuggestionsOptions,
} from './useCategorizationSuggestions';
import type { CategorizationSuggestion, ReceiptForSuggestion, UserProfile } from '@/lib/categorization-suggestions';

// Mock the categorization-suggestions module
vi.mock('@/lib/categorization-suggestions', () => ({
  generateSuggestions: vi.fn((receipts, profile) => {
    // Return mock suggestions based on input
    if (receipts.length === 0) return [];
    
    return [
      {
        id: 'sugg-1',
        receiptId: receipts[0].id,
        currentCategory: 'D5',
        suggestedCategory: 'D6',
        suggestionType: 'd5_to_d6',
        title: 'Test Suggestion',
        description: 'Test description',
        reason: 'Test reason',
        currentTaxBenefit: 30,
        suggestedTaxBenefit: 45,
        taxImpact: 15,
        amount: receipts[0].amount,
        itemDescription: receipts[0].vendor,
        confidence: 'high',
        priority: 'high',
        status: 'pending',
        createdAt: new Date(),
        ruleId: 'RULE-D5-D6',
      },
    ];
  }),
  filterSuggestions: vi.fn((suggestions, filter) => {
    return suggestions.filter((s: CategorizationSuggestion) => {
      if (filter.status && s.status !== filter.status) return false;
      if (filter.type && s.suggestionType !== filter.type) return false;
      if (filter.priority && s.priority !== filter.priority) return false;
      return true;
    });
  }),
  calculateSuggestionAnalytics: vi.fn((suggestions) => ({
    totalSuggestions: suggestions.length,
    pendingCount: suggestions.filter((s: CategorizationSuggestion) => s.status === 'pending').length,
    acceptedCount: suggestions.filter((s: CategorizationSuggestion) => s.status === 'accepted').length,
    rejectedCount: suggestions.filter((s: CategorizationSuggestion) => s.status === 'rejected').length,
    ignoredCount: suggestions.filter((s: CategorizationSuggestion) => s.status === 'ignored').length,
    totalTaxImpact: suggestions.reduce((sum: number, s: CategorizationSuggestion) => sum + s.taxImpact, 0),
    acceptedTaxImpact: suggestions
      .filter((s: CategorizationSuggestion) => s.status === 'accepted')
      .reduce((sum: number, s: CategorizationSuggestion) => sum + Math.max(0, s.taxImpact), 0),
    byType: {},
    byPriority: {},
    highConfidenceRate: 50,
  })),
  applySuggestion: vi.fn((suggestion) => ({
    category: suggestion.suggestedCategory,
    notes: `Re-categorized based on suggestion ${suggestion.id}: ${suggestion.reason}`,
  })),
  exportSuggestionsReport: vi.fn(() => 'Mock Report'),
  TAX_THRESHOLDS: {
    LOW_VALUE_POOL: 1000,
    IMMEDIATE_DEDUCTION: 300,
    DEPRECIATION_POOL: 1000,
    HOME_OFFICE_HOURS_CAP: 1000,
  },
}));

describe('useCategorizationSuggestions', () => {
  const mockProfile: UserProfile = {
    taxableIncome: 75000,
    occupation: 'office-worker',
    age: 35,
    hasVehicle: false,
    workArrangement: 'hybrid',
    hasInvestments: false,
    investmentTypes: [],
    isStudying: false,
    hasHomeOffice: true,
    employmentType: 'full-time',
    yearsWithAccountant: 0,
  };

  const mockReceipts: ReceiptForSuggestion[] = [
    {
      id: 1,
      vendor: 'Apple',
      amount: 800,
      category: 'Equipment',
      atoCategoryCode: 'D5',
      date: '2024-01-15',
      description: 'iPad',
    },
    {
      id: 2,
      vendor: 'Office Works',
      amount: 250,
      category: 'Supplies',
      atoCategoryCode: 'D5',
      date: '2024-01-16',
      description: 'Stationery',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasOpportunities).toBe(false);
  });

  it('should generate suggestions', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions[0].status).toBe('pending');
    expect(result.current.lastGeneratedAt).toBeInstanceOf(Date);
    expect(result.current.hasOpportunities).toBe(true);
  });

  it('should accept a suggestion', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    const suggestionId = result.current.suggestions[0].id;

    act(() => {
      result.current.acceptSuggestion(suggestionId);
    });

    expect(result.current.suggestions[0].status).toBe('accepted');
    expect(result.current.suggestions[0].reviewedAt).toBeInstanceOf(Date);
  });

  it('should reject a suggestion', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    const suggestionId = result.current.suggestions[0].id;

    act(() => {
      result.current.rejectSuggestion(suggestionId);
    });

    expect(result.current.suggestions[0].status).toBe('rejected');
  });

  it('should ignore a suggestion', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    const suggestionId = result.current.suggestions[0].id;

    act(() => {
      result.current.ignoreSuggestion(suggestionId);
    });

    expect(result.current.suggestions[0].status).toBe('ignored');
  });

  it('should reset a suggestion to pending', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    const suggestionId = result.current.suggestions[0].id;

    act(() => {
      result.current.acceptSuggestion(suggestionId);
    });

    expect(result.current.suggestions[0].status).toBe('accepted');

    act(() => {
      result.current.resetSuggestion(suggestionId);
    });

    expect(result.current.suggestions[0].status).toBe('pending');
    expect(result.current.suggestions[0].reviewedAt).toBeUndefined();
  });

  it('should accept all pending suggestions', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    act(() => {
      result.current.acceptAll();
    });

    expect(result.current.suggestions.every(s => s.status === 'accepted')).toBe(true);
  });

  it('should reject all pending suggestions', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    act(() => {
      result.current.rejectAll();
    });

    expect(result.current.suggestions.every(s => s.status === 'rejected')).toBe(true);
  });

  it('should clear all suggestions', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    expect(result.current.suggestions).toHaveLength(1);

    act(() => {
      result.current.clearSuggestions();
    });

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.lastGeneratedAt).toBeNull();
  });

  it('should filter suggestions', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    act(() => {
      result.current.setFilter({ status: 'pending' });
    });

    expect(result.current.filteredSuggestions).toHaveLength(1);
    expect(result.current.activeFilter).toEqual({ status: 'pending' });
  });

  it('should clear filters', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    act(() => {
      result.current.setFilter({ status: 'pending' });
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.activeFilter).toEqual({});
  });

  it('should calculate pending suggestions correctly', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    expect(result.current.pendingSuggestions).toHaveLength(1);
    expect(result.current.acceptedSuggestions).toHaveLength(0);

    act(() => {
      result.current.acceptSuggestion(result.current.suggestions[0].id);
    });

    expect(result.current.pendingSuggestions).toHaveLength(0);
    expect(result.current.acceptedSuggestions).toHaveLength(1);
  });

  it('should calculate savings correctly', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    // Initial state
    expect(result.current.totalPotentialSavings).toBeGreaterThan(0);
    expect(result.current.acceptedSavings).toBe(0);
    expect(result.current.pendingSavings).toBeGreaterThan(0);

    // After accepting
    act(() => {
      result.current.acceptSuggestion(result.current.suggestions[0].id);
    });

    expect(result.current.acceptedSavings).toBeGreaterThan(0);
    expect(result.current.pendingSavings).toBe(0);
  });

  it('should group suggestions by type', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    expect(result.current.byType.d5_to_d6).toHaveLength(1);
  });

  it('should get pending changes', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    act(() => {
      result.current.acceptSuggestion(result.current.suggestions[0].id);
    });

    const changes = result.current.getPendingChanges();
    
    expect(changes).toHaveLength(1);
    expect(changes[0]).toHaveProperty('receiptId');
    expect(changes[0]).toHaveProperty('newCategory');
    expect(changes[0]).toHaveProperty('notes');
  });

  it('should export report', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    const report = result.current.exportReport();
    expect(report).toBe('Mock Report');
  });

  it('should get learning data', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    act(() => {
      result.current.acceptSuggestion(result.current.suggestions[0].id);
    });

    const learningData = result.current.getLearningData();
    
    expect(learningData.acceptedPatterns).toHaveLength(1);
    expect(learningData.rejectedPatterns).toHaveLength(0);
  });
});

describe('useSuggestion', () => {
  const mockSuggestion: CategorizationSuggestion = {
    id: 'sugg-1',
    receiptId: 1,
    currentCategory: 'D5',
    suggestedCategory: 'D6',
    suggestionType: 'd5_to_d6',
    title: 'Test',
    description: 'Test',
    reason: 'Test',
    currentTaxBenefit: 30,
    suggestedTaxBenefit: 45,
    taxImpact: 15,
    amount: 800,
    itemDescription: 'Test',
    confidence: 'high',
    priority: 'high',
    status: 'pending',
    createdAt: new Date(),
    ruleId: 'RULE-D5-D6',
  };

  it('should return correct status flags for pending', () => {
    const { result } = renderHook(() => useSuggestion(mockSuggestion));

    expect(result.current.status).toBe('pending');
    expect(result.current.isPending).toBe(true);
    expect(result.current.isAccepted).toBe(false);
    expect(result.current.isRejected).toBe(false);
    expect(result.current.isIgnored).toBe(false);
  });

  it('should detect positive tax impact', () => {
    const { result } = renderHook(() => useSuggestion(mockSuggestion));

    expect(result.current.taxImpactPositive).toBe(true);
    expect(result.current.taxImpactNegative).toBe(false);
    expect(result.current.taxImpactAmount).toBe(15);
  });

  it('should handle null suggestion', () => {
    const { result } = renderHook(() => useSuggestion(null));

    expect(result.current.status).toBe('pending');
    expect(result.current.taxImpactAmount).toBe(0);
  });

  it('should update when suggestion prop changes', () => {
    const { result, rerender } = renderHook(
      ({ suggestion }) => useSuggestion(suggestion),
      { initialProps: { suggestion: mockSuggestion } }
    );

    expect(result.current.status).toBe('pending');

    const acceptedSuggestion = { ...mockSuggestion, status: 'accepted' as const };
    rerender({ suggestion: acceptedSuggestion });

    expect(result.current.status).toBe('accepted');
    expect(result.current.isAccepted).toBe(true);
  });
});

describe('useSuggestionStats', () => {
  const mockSuggestions: CategorizationSuggestion[] = [
    {
      id: 'sugg-1',
      receiptId: 1,
      currentCategory: 'D5',
      suggestedCategory: 'D6',
      suggestionType: 'd5_to_d6',
      title: 'Test',
      description: 'Test',
      reason: 'Test',
      currentTaxBenefit: 30,
      suggestedTaxBenefit: 45,
      taxImpact: 15,
      amount: 800,
      itemDescription: 'Test',
      confidence: 'high',
      priority: 'high',
      status: 'pending',
      createdAt: new Date(),
      ruleId: 'RULE-D5-D6',
    },
    {
      id: 'sugg-2',
      receiptId: 2,
      currentCategory: 'D5',
      suggestedCategory: 'D3',
      suggestionType: 'wrong_category',
      title: 'Test 2',
      description: 'Test 2',
      reason: 'Test 2',
      currentTaxBenefit: 20,
      suggestedTaxBenefit: 20,
      taxImpact: 25,
      amount: 100,
      itemDescription: 'Test 2',
      confidence: 'medium',
      priority: 'medium',
      status: 'accepted',
      createdAt: new Date(),
      ruleId: 'RULE-WRONG-CAT',
    },
    {
      id: 'sugg-3',
      receiptId: 3,
      currentCategory: 'D6',
      suggestedCategory: 'D5',
      suggestionType: 'depreciation_to_immediate',
      title: 'Test 3',
      description: 'Test 3',
      reason: 'Test 3',
      currentTaxBenefit: 10,
      suggestedTaxBenefit: 75,
      taxImpact: 65,
      amount: 250,
      itemDescription: 'Test 3',
      confidence: 'high',
      priority: 'critical',
      status: 'rejected',
      createdAt: new Date(),
      ruleId: 'RULE-DEP-IMM',
    },
  ];

  it('should calculate correct counts', () => {
    const { result } = renderHook(() => useSuggestionStats(mockSuggestions));

    expect(result.current.total).toBe(3);
    expect(result.current.pending).toBe(1);
    expect(result.current.accepted).toBe(1);
    expect(result.current.rejected).toBe(1);
    expect(result.current.ignored).toBe(0);
  });

  it('should calculate percentages', () => {
    const { result } = renderHook(() => useSuggestionStats(mockSuggestions));

    expect(result.current.pendingPercentage).toBeCloseTo(33.33, 1);
    expect(result.current.acceptedPercentage).toBeCloseTo(33.33, 1);
    expect(result.current.processedPercentage).toBeCloseTo(66.67, 1);
  });

  it('should calculate savings', () => {
    const { result } = renderHook(() => useSuggestionStats(mockSuggestions));

    expect(result.current.totalSavings).toBe(105); // 15 + 25 + 65
    expect(result.current.averageSavings).toBe(35); // 105 / 3
  });

  it('should calculate high confidence rate', () => {
    const { result } = renderHook(() => useSuggestionStats(mockSuggestions));

    expect(result.current.highConfidenceCount).toBe(2);
    expect(result.current.highConfidencePercentage).toBeCloseTo(66.67, 1);
  });

  it('should handle empty suggestions', () => {
    const { result } = renderHook(() => useSuggestionStats([]));

    expect(result.current.total).toBe(0);
    expect(result.current.totalSavings).toBe(0);
    expect(result.current.averageSavings).toBe(0);
    expect(result.current.highConfidencePercentage).toBe(0);
  });
});

// Integration test
describe('Integration - Hook with mock data', () => {
  it('should complete full workflow', async () => {
    const { result } = renderHook(() => useCategorizationSuggestions());

    const mockProfile: UserProfile = {
      taxableIncome: 75000,
      occupation: 'office-worker',
      age: 35,
      hasVehicle: false,
      workArrangement: 'hybrid',
      hasInvestments: false,
      investmentTypes: [],
      isStudying: false,
      hasHomeOffice: true,
      employmentType: 'full-time',
      yearsWithAccountant: 0,
    };

    const mockReceipts: ReceiptForSuggestion[] = [
      { id: 1, vendor: 'Apple', amount: 800, category: 'D5', atoCategoryCode: 'D5', date: '2024-01-15', description: 'iPad' },
    ];

    // Generate suggestions
    await act(async () => {
      await result.current.generateAsync(mockReceipts, mockProfile);
    });

    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.analytics.totalSuggestions).toBe(1);

    // Accept the suggestion
    act(() => {
      result.current.acceptSuggestion(result.current.suggestions[0].id);
    });

    expect(result.current.acceptedSuggestions).toHaveLength(1);
    expect(result.current.analytics.acceptedCount).toBe(1);

    // Get pending changes
    const changes = result.current.getPendingChanges();
    expect(changes).toHaveLength(1);
    expect(changes[0].receiptId).toBe(1);
    expect(changes[0].newCategory).toBe('D6');

    // Export report
    const report = result.current.exportReport();
    expect(typeof report).toBe('string');

    // Clear everything
    act(() => {
      result.current.clearSuggestions();
    });

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.hasOpportunities).toBe(false);
  });
});