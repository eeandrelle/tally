import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkpaperLibrary, WORKPAPER_GROUPS } from '../hooks/useWorkpaperLibrary';

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

describe('useWorkpaperLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should initialize with all D1-D15 workpapers', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    expect(result.current.allWorkpapers).toHaveLength(15);
    expect(result.current.allWorkpapers.map(wp => wp.category.code).sort()).toEqual([
      'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9',
      'D10', 'D11', 'D12', 'D13', 'D14', 'D15'
    ].sort());
  });

  it('should initialize workpapers with default values', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    const d1Workpaper = result.current.workpapers['D1'];
    expect(d1Workpaper.status).toBe('not-started');
    expect(d1Workpaper.totalClaimed).toBe(0);
    expect(d1Workpaper.completionPercentage).toBe(0);
    expect(d1Workpaper.itemsCount).toBe(0);
  });

  it('should update workpaper status', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    act(() => {
      result.current.setWorkpaperStatus('D1', 'in-progress');
    });
    
    expect(result.current.workpapers['D1'].status).toBe('in-progress');
  });

  it('should update claim amount and calculate tax savings', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    act(() => {
      result.current.updateClaimAmount('D1', 1000);
    });
    
    expect(result.current.workpapers['D1'].totalClaimed).toBe(1000);
    expect(result.current.workpapers['D1'].estimatedTaxSavings).toBe(325); // 32.5% of 1000
  });

  it('should update completion percentage and auto-update status', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    act(() => {
      result.current.setCompletionPercentage('D1', 50);
    });
    
    expect(result.current.workpapers['D1'].completionPercentage).toBe(50);
    expect(result.current.workpapers['D1'].status).toBe('in-progress');
    
    act(() => {
      result.current.setCompletionPercentage('D1', 100);
    });
    
    expect(result.current.workpapers['D1'].completionPercentage).toBe(100);
    expect(result.current.workpapers['D1'].status).toBe('complete');
  });

  it('should track recently accessed workpapers', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    act(() => {
      result.current.markAccessed('D1');
    });
    
    const recent = result.current.getRecentlyAccessed();
    expect(recent).toHaveLength(1);
    expect(recent[0].categoryCode).toBe('D1');
    expect(recent[0].lastAccessed).toBeDefined();
  });

  it('should calculate stats correctly', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    act(() => {
      result.current.setWorkpaperStatus('D1', 'complete');
      result.current.setWorkpaperStatus('D2', 'complete');
      result.current.setWorkpaperStatus('D3', 'in-progress');
      result.current.updateClaimAmount('D1', 1000);
      result.current.updateClaimAmount('D2', 2000);
    });
    
    expect(result.current.stats.complete).toBe(2);
    expect(result.current.stats.inProgress).toBe(1);
    expect(result.current.stats.notStarted).toBe(12); // 15 - 2 - 1
    expect(result.current.stats.totalClaimed).toBe(3000);
    expect(result.current.stats.totalEstimatedSavings).toBe(975); // 32.5% of 3000
    expect(result.current.stats.overallProgress).toBe(13); // 2/15 = 13%
  });

  it('should filter workpapers by status', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    act(() => {
      result.current.setWorkpaperStatus('D1', 'complete');
      result.current.setWorkpaperStatus('D2', 'complete');
      result.current.setWorkpaperStatus('D3', 'in-progress');
    });
    
    const complete = result.current.getWorkpapersByStatus('complete');
    expect(complete).toHaveLength(2);
    
    const inProgress = result.current.getWorkpapersByStatus('in-progress');
    expect(inProgress).toHaveLength(1);
  });

  it('should group workpapers correctly', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    expect(result.current.workpapersByGroup['work-related']).toHaveLength(6);
    expect(result.current.workpapersByGroup['investment']).toHaveLength(2);
    expect(result.current.workpapersByGroup['tax-offsets']).toHaveLength(7);
  });

  it('should reset a specific workpaper', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    act(() => {
      result.current.setWorkpaperStatus('D1', 'complete');
      result.current.updateClaimAmount('D1', 1000);
    });
    
    act(() => {
      result.current.resetWorkpaper('D1');
    });
    
    expect(result.current.workpapers['D1'].status).toBe('not-started');
    expect(result.current.workpapers['D1'].totalClaimed).toBe(0);
    expect(result.current.workpapers['D1'].estimatedTaxSavings).toBe(0);
  });

  it('should persist data to localStorage', () => {
    const { result } = renderHook(() => useWorkpaperLibrary({ taxYear: '2024' }));
    
    act(() => {
      result.current.setWorkpaperStatus('D1', 'complete');
      result.current.updateClaimAmount('D1', 1000);
    });
    
    // Verify localStorage setItem was called
    expect(localStorageMock.setItem).toHaveBeenCalled();
    
    // Get the last call to setItem
    const calls = localStorageMock.setItem.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe('tally-workpaper-library-2024');
    
    const parsed = JSON.parse(lastCall[1]);
    expect(parsed.workpapers['D1'].status).toBe('complete');
    expect(parsed.workpapers['D1'].totalClaimed).toBe(1000);
  });
});

describe('WORKPAPER_GROUPS', () => {
  it('should contain correct category codes for work-related group', () => {
    expect(WORKPAPER_GROUPS['work-related']).toEqual(['D1', 'D2', 'D3', 'D4', 'D5', 'D6']);
  });
  
  it('should contain correct category codes for investment group', () => {
    expect(WORKPAPER_GROUPS['investment']).toEqual(['D7', 'D8']);
  });
  
  it('should contain correct category codes for tax-offsets group', () => {
    expect(WORKPAPER_GROUPS['tax-offsets']).toEqual(['D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']);
  });
});
