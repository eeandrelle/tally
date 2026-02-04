/**
 * useTaxCalculator Hook Tests
 * 
 * Test suite for the useTaxCalculator hook.
 * Tests state management, actions, and computed values.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaxCalculator } from './useTaxCalculator';
import type { DeductionItem } from '@/lib/tax-calculator';

describe('useTaxCalculator', () => {
  describe('Initial State', () => {
    it('should initialize with default income', () => {
      const { result } = renderHook(() => useTaxCalculator());
      expect(result.current.currentScenario.taxableIncome).toBe(75000);
    });

    it('should initialize with custom income', () => {
      const { result } = renderHook(() => useTaxCalculator(100000));
      expect(result.current.currentScenario.taxableIncome).toBe(100000);
    });

    it('should have empty deductions initially', () => {
      const { result } = renderHook(() => useTaxCalculator());
      expect(result.current.currentScenario.deductions).toHaveLength(0);
      expect(result.current.totalDeductions).toBe(0);
    });

    it('should have correct default settings', () => {
      const { result } = renderHook(() => useTaxCalculator());
      expect(result.current.currentScenario.medicareLevy).toBe(true);
      expect(result.current.currentScenario.privateHospitalCover).toBe(false);
      expect(result.current.currentScenario.taxOffsets).toBe(0);
    });

    it('should have empty saved scenarios initially', () => {
      const { result } = renderHook(() => useTaxCalculator());
      expect(result.current.savedScenarios).toHaveLength(0);
    });
  });

  describe('Computed Values', () => {
    it('should calculate taxable income correctly', () => {
      const { result } = renderHook(() => useTaxCalculator(100000));
      
      act(() => {
        result.current.addDeduction({
          description: 'Test',
          amount: 10000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      expect(result.current.totalDeductions).toBe(10000);
      expect(result.current.taxableIncome).toBe(90000);
    });

    it('should calculate marginal rate correctly', () => {
      const { result } = renderHook(() => useTaxCalculator(75000));
      expect(result.current.marginalRate).toBe(0.30);
    });

    it('should calculate tax result correctly', () => {
      const { result } = renderHook(() => useTaxCalculator(75000));
      expect(result.current.taxResult.taxPayable).toBeGreaterThan(0);
      expect(result.current.taxResult.marginalRate).toBe(0.30);
    });

    it('should calculate effective rate correctly', () => {
      const { result } = renderHook(() => useTaxCalculator(75000));
      expect(result.current.effectiveRate).toBeGreaterThan(0);
      expect(result.current.effectiveRate).toBeLessThan(1);
    });

    it('should provide bracket data', () => {
      const { result } = renderHook(() => useTaxCalculator(75000));
      expect(result.current.bracketData.length).toBeGreaterThan(0);
    });

    it('should calculate remaining in bracket', () => {
      const { result } = renderHook(() => useTaxCalculator(75000));
      expect(result.current.remainingInBracket.remaining).toBe(60000);
      expect(result.current.remainingInBracket.nextBracketRate).toBe(0.37);
    });
  });

  describe('Scenario Actions', () => {
    it('should set scenario name', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setScenarioName('My Tax Plan');
      });

      expect(result.current.currentScenario.name).toBe('My Tax Plan');
    });

    it('should set taxable income', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setTaxableIncome(120000);
      });

      expect(result.current.currentScenario.taxableIncome).toBe(120000);
    });

    it('should not allow negative income', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setTaxableIncome(-5000);
      });

      expect(result.current.currentScenario.taxableIncome).toBe(0);
    });

    it('should toggle Medicare levy', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setMedicareLevy(false);
      });

      expect(result.current.currentScenario.medicareLevy).toBe(false);
    });

    it('should toggle private hospital cover', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setPrivateHospitalCover(true);
      });

      expect(result.current.currentScenario.privateHospitalCover).toBe(true);
    });

    it('should set tax offsets', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setTaxOffsets(1000);
      });

      expect(result.current.currentScenario.taxOffsets).toBe(1000);
    });

    it('should not allow negative tax offsets', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setTaxOffsets(-500);
      });

      expect(result.current.currentScenario.taxOffsets).toBe(0);
    });

    it('should reset scenario', () => {
      const { result } = renderHook(() => useTaxCalculator(100000));
      
      act(() => {
        result.current.setScenarioName('Custom');
        result.current.addDeduction({
          description: 'Test',
          amount: 5000,
          category: 'work-from-home',
          method: 'immediate',
        });
        result.current.resetScenario();
      });

      expect(result.current.currentScenario.name).toBe('Current Scenario');
      expect(result.current.currentScenario.deductions).toHaveLength(0);
      expect(result.current.currentScenario.taxableIncome).toBe(75000);
    });
  });

  describe('Deduction Actions', () => {
    it('should add valid deduction', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      let addResult: { success: boolean; errors: string[] } = { success: false, errors: [] };
      
      act(() => {
        addResult = result.current.addDeduction({
          description: 'Home Office',
          amount: 1500,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      expect(addResult.success).toBe(true);
      expect(result.current.currentScenario.deductions).toHaveLength(1);
      expect(result.current.totalDeductions).toBe(1500);
    });

    it('should reject invalid deduction', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      let addResult: { success: boolean; errors: string[] } = { success: true, errors: [] };
      
      act(() => {
        addResult = result.current.addDeduction({
          description: '',
          amount: 0,
          category: 'other',
          method: 'immediate',
        });
      });

      expect(addResult.success).toBe(false);
      expect(addResult.errors.length).toBeGreaterThan(0);
    });

    it('should update deduction', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.addDeduction({
          description: 'Original',
          amount: 1000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      const deductionId = result.current.currentScenario.deductions[0]?.id;
      expect(deductionId).toBeTruthy();

      act(() => {
        result.current.updateDeduction(deductionId, { description: 'Updated', amount: 2000 });
      });

      expect(result.current.currentScenario.deductions[0].description).toBe('Updated');
      expect(result.current.currentScenario.deductions[0].amount).toBe(2000);
    });

    it('should remove deduction', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.addDeduction({
          description: 'Test',
          amount: 1000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      expect(result.current.currentScenario.deductions).toHaveLength(1);
      const deductionId = result.current.currentScenario.deductions[0].id;

      act(() => {
        result.current.removeDeduction(deductionId);
      });

      expect(result.current.currentScenario.deductions).toHaveLength(0);
    });

    it('should select deduction', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.addDeduction({
          description: 'Test',
          amount: 1000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      const deductionId = result.current.currentScenario.deductions[0].id;

      act(() => {
        result.current.selectDeduction(deductionId);
      });

      expect(result.current.selectedDeductionId).toBe(deductionId);
    });

    it('should change deduction method', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.addDeduction({
          description: 'Asset',
          amount: 5000,
          category: 'other',
          method: 'immediate',
          depreciationYears: 5,
        });
      });

      expect(result.current.currentScenario.deductions).toHaveLength(1);
      expect(result.current.totalDeductions).toBe(5000);
      const deductionId = result.current.currentScenario.deductions[0].id;

      act(() => {
        result.current.setDeductionMethod(deductionId, 'depreciation');
      });

      expect(result.current.currentScenario.deductions[0].method).toBe('depreciation');
      expect(result.current.totalDeductions).toBe(0); // Depreciation not counted in totalDeductions
    });

    it('should only count immediate deductions in total', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.addDeduction({
          description: 'Immediate',
          amount: 3000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      expect(result.current.currentScenario.deductions).toHaveLength(1);
      expect(result.current.totalDeductions).toBe(3000);

      act(() => {
        result.current.addDeduction({
          description: 'Depreciating',
          amount: 5000,
          category: 'other',
          method: 'depreciation',
          depreciationYears: 5,
          depreciationRate: 0.2,
        });
      });

      expect(result.current.currentScenario.deductions).toHaveLength(2);
      expect(result.current.totalDeductions).toBe(3000);
    });
  });

  describe('Saved Scenarios', () => {
    it('should save current scenario', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setScenarioName('My Plan');
      });

      act(() => {
        result.current.addDeduction({
          description: 'Test',
          amount: 2000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      act(() => {
        result.current.saveCurrentScenario();
      });

      expect(result.current.savedScenarios).toHaveLength(1);
      expect(result.current.savedScenarios[0].name).toBe('My Plan');
      expect(result.current.savedScenarios[0].deductions).toHaveLength(1);
    });

    it('should update existing scenario', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.saveCurrentScenario();
      });

      expect(result.current.savedScenarios).toHaveLength(1);
      const originalId = result.current.savedScenarios[0].id;

      act(() => {
        result.current.setScenarioName('Updated Name');
      });

      act(() => {
        result.current.saveCurrentScenario();
      });

      expect(result.current.savedScenarios).toHaveLength(1);
      expect(result.current.savedScenarios[0].name).toBe('Updated Name');
      expect(result.current.savedScenarios[0].id).toBe(originalId);
    });

    it('should load scenario', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setTaxableIncome(100000);
      });

      act(() => {
        result.current.addDeduction({
          description: 'Test',
          amount: 5000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      act(() => {
        result.current.saveCurrentScenario();
      });

      expect(result.current.savedScenarios).toHaveLength(1);
      const scenarioId = result.current.savedScenarios[0].id;

      act(() => {
        result.current.setTaxableIncome(50000);
      });

      act(() => {
        result.current.loadScenario(scenarioId);
      });

      expect(result.current.currentScenario.taxableIncome).toBe(100000);
      expect(result.current.currentScenario.deductions).toHaveLength(1);
    });

    it('should delete scenario', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.saveCurrentScenario();
      });

      expect(result.current.savedScenarios).toHaveLength(1);
      const scenarioId = result.current.savedScenarios[0].id;

      act(() => {
        result.current.deleteScenario(scenarioId);
      });

      expect(result.current.savedScenarios).toHaveLength(0);
    });

    it('should duplicate scenario', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setScenarioName('Original');
      });

      act(() => {
        result.current.saveCurrentScenario();
      });

      expect(result.current.savedScenarios).toHaveLength(1);
      const scenarioId = result.current.savedScenarios[0].id;

      act(() => {
        result.current.duplicateScenario(scenarioId);
      });

      expect(result.current.savedScenarios).toHaveLength(2);
      expect(result.current.savedScenarios[1].name).toContain('Copy');
    });
  });

  describe('Comparisons', () => {
    it('should compare with baseline', () => {
      const { result } = renderHook(() => useTaxCalculator(100000));
      
      act(() => {
        result.current.addDeduction({
          description: 'Test',
          amount: 10000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      expect(result.current.totalDeductions).toBe(10000);

      act(() => {
        result.current.compareWithBaseline();
      });

      expect(result.current.comparison).not.toBeNull();
      expect(result.current.comparison?.savingsBreakdown.totalSavings).toBeGreaterThan(0);
    });

    it('should compare two saved scenarios', () => {
      const { result } = renderHook(() => useTaxCalculator(100000));
      
      // Save scenario A
      act(() => {
        result.current.setScenarioName('Scenario A');
      });

      act(() => {
        result.current.saveCurrentScenario();
      });

      expect(result.current.savedScenarios).toHaveLength(1);
      const scenarioAId = result.current.savedScenarios[0].id;

      // Reset and create scenario B
      act(() => {
        result.current.resetScenario();
      });

      act(() => {
        result.current.setScenarioName('Scenario B');
      });

      act(() => {
        result.current.addDeduction({
          description: 'Extra',
          amount: 5000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      act(() => {
        result.current.saveCurrentScenario();
      });

      expect(result.current.savedScenarios).toHaveLength(2);
      const scenarioBId = result.current.savedScenarios[1].id;

      act(() => {
        result.current.compareTwoScenarios(scenarioAId, scenarioBId);
      });

      expect(result.current.comparison).not.toBeNull();
    });

    it('should clear comparison', () => {
      const { result } = renderHook(() => useTaxCalculator(100000));
      
      act(() => {
        result.current.addDeduction({
          description: 'Test',
          amount: 5000,
          category: 'work-from-home',
          method: 'immediate',
        });
        result.current.compareWithBaseline();
        result.current.clearComparison();
      });

      expect(result.current.comparison).toBeNull();
    });

    it('should compare methods', () => {
      const { result } = renderHook(() => useTaxCalculator(100000));
      
      act(() => {
        result.current.compareMethods(10000, 'Equipment', 5);
      });

      expect(result.current.methodComparison).not.toBeNull();
      expect(result.current.methodComparison?.immediate.totalDeduction).toBe(10000);
    });

    it('should clear method comparison', () => {
      const { result } = renderHook(() => useTaxCalculator(100000));
      
      act(() => {
        result.current.compareMethods(10000, 'Equipment', 5);
        result.current.clearMethodComparison();
      });

      expect(result.current.methodComparison).toBeNull();
    });
  });

  describe('Utility Functions', () => {
    it('should calculate impact correctly', () => {
      const { result } = renderHook(() => useTaxCalculator(75000));
      
      const impact = result.current.calculateImpact(5000);
      
      expect(impact.newTaxableIncome).toBe(70000);
      expect(impact.taxSavings).toBeGreaterThan(0);
    });

    it('should get savings for deduction', () => {
      const { result } = renderHook(() => useTaxCalculator(75000));
      
      const savings = result.current.getSavingsForDeduction(5000);
      
      expect(savings.totalSavings).toBeGreaterThan(0);
    });

    it('should format currency', () => {
      const { result } = renderHook(() => useTaxCalculator());
      expect(result.current.formatCurrency(1000)).toBe('$1,000');
    });

    it('should format percent', () => {
      const { result } = renderHook(() => useTaxCalculator());
      expect(result.current.formatPercent(0.30)).toBe('30.0%');
    });
  });

  describe('UI State', () => {
    it('should set active tab', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setActiveTab('brackets');
      });

      expect(result.current.activeTab).toBe('brackets');
    });

    it('should set show add deduction', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.setShowAddDeduction(true);
      });

      expect(result.current.showAddDeduction).toBe(true);
    });
  });

  describe('Export', () => {
    it('should export to CSV', () => {
      const { result } = renderHook(() => useTaxCalculator(75000));
      
      act(() => {
        result.current.addDeduction({
          description: 'Test',
          amount: 5000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      const csv = result.current.exportToCSV();
      
      expect(csv).toContain('Tax Scenario Comparison');
      expect(csv).toContain('75000');
      expect(csv).toContain('5000');
    });
  });

  describe('Edge Cases', () => {
    it('should handle loading non-existent scenario', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.loadScenario('non-existent-id');
      });

      // Should not throw, scenario should remain unchanged
      expect(result.current.currentScenario).toBeTruthy();
    });

    it('should handle comparing non-existent scenarios', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      let comparison = null;
      act(() => {
        comparison = result.current.compareTwoScenarios('non-existent-1', 'non-existent-2');
      });

      expect(comparison).toBeNull();
    });

    it('should handle removing non-existent deduction', () => {
      const { result } = renderHook(() => useTaxCalculator());
      
      act(() => {
        result.current.removeDeduction('non-existent-id');
      });

      // Should not throw
      expect(result.current.currentScenario.deductions).toHaveLength(0);
    });

    it('should handle zero income correctly', () => {
      const { result } = renderHook(() => useTaxCalculator(0));
      
      act(() => {
        result.current.addDeduction({
          description: 'Test',
          amount: 1000,
          category: 'work-from-home',
          method: 'immediate',
        });
      });

      expect(result.current.taxResult.totalTax).toBe(0);
    });
  });
});
