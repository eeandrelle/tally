import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateTaxableIncomeReduction,
  calculateSelfEducationDeduction,
  calculateDeclineInValue,
  generateD4WorkpaperSummary,
  createEmptySelfEducationData,
  EDUCATION_EXPENSE_TYPES,
  COURSE_TYPES,
  STUDY_MODES,
  ATO_GUIDANCE,
} from '@/lib/self-education-expenses';
import type {
  EducationExpense,
  Course,
  DepreciatingAsset,
  SelfEducationData,
} from '@/lib/self-education-expenses';

describe('Self-Education Expenses - Core Logic', () => {
  describe('calculateTaxableIncomeReduction', () => {
    it('should return $250 when expenses exceed $250', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Tuition', amount: 500, date: '2024-01-01', workRelatedPercentage: 100 },
      ];
      expect(calculateTaxableIncomeReduction(expenses)).toBe(250);
    });

    it('should return the total amount when expenses are less than $250', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'textbooks', description: 'Books', amount: 150, date: '2024-01-01', workRelatedPercentage: 100 },
      ];
      expect(calculateTaxableIncomeReduction(expenses)).toBe(150);
    });

    it('should exclude travel expenses from the reduction calculation', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Tuition', amount: 100, date: '2024-01-01', workRelatedPercentage: 100 },
        { id: '2', type: 'travel', description: 'Bus fare', amount: 200, date: '2024-01-01', workRelatedPercentage: 100 },
      ];
      // Only course_fees ($100) counts toward the $250 reduction
      expect(calculateTaxableIncomeReduction(expenses)).toBe(100);
    });

    it('should exclude other expenses from the reduction calculation', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Tuition', amount: 100, date: '2024-01-01', workRelatedPercentage: 100 },
        { id: '2', type: 'other', description: 'Accommodation', amount: 500, date: '2024-01-01', workRelatedPercentage: 100 },
      ];
      // Only course_fees ($100) counts toward the $250 reduction
      expect(calculateTaxableIncomeReduction(expenses)).toBe(100);
    });

    it('should apply work-related percentage to reduction calculation', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Tuition', amount: 500, date: '2024-01-01', workRelatedPercentage: 50 },
      ];
      // $500 * 50% = $250 work-related amount
      expect(calculateTaxableIncomeReduction(expenses)).toBe(250);
    });

    it('should return 0 for empty expenses array', () => {
      expect(calculateTaxableIncomeReduction([])).toBe(0);
    });
  });

  describe('calculateDeclineInValue', () => {
    it('should calculate prime cost method correctly', () => {
      // Prime cost: (Cost / Effective life) × Business use %
      // ($1000 / 4 years) × 100% = $250
      const result = calculateDeclineInValue(1000, 100, 4, 'prime_cost');
      expect(result).toBe(250);
    });

    it('should calculate diminishing value method correctly', () => {
      // Diminishing value: (Opening value × 2 / Effective life) × Business use %
      // ($1000 × 2 / 4 years) × 100% = $500
      const result = calculateDeclineInValue(1000, 100, 4, 'diminishing_value');
      expect(result).toBe(500);
    });

    it('should apply business use percentage correctly', () => {
      // ($1000 / 4 years) × 80% = $200
      const result = calculateDeclineInValue(1000, 80, 4, 'prime_cost');
      expect(result).toBe(200);
    });

    it('should use opening balance when provided', () => {
      // With opening balance of $800: ($800 / 4 years) × 100% = $200
      const result = calculateDeclineInValue(1000, 100, 4, 'prime_cost', 800);
      expect(result).toBe(200);
    });

    it('should handle 2-year effective life (phones, tablets)', () => {
      // ($600 / 2 years) × 100% = $300
      const result = calculateDeclineInValue(600, 100, 2, 'prime_cost');
      expect(result).toBe(300);
    });

    it('should handle 3-year effective life (laptops)', () => {
      // ($1500 / 3 years) × 100% = $500
      const result = calculateDeclineInValue(1500, 100, 3, 'prime_cost');
      expect(result).toBe(500);
    });
  });

  describe('calculateSelfEducationDeduction', () => {
    it('should calculate total deduction correctly with $250 reduction', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Tuition', amount: 1000, date: '2024-01-01', workRelatedPercentage: 100 },
      ];
      const assets: DepreciatingAsset[] = [];
      const reduction = 250;
      
      // $1000 - $250 = $750
      expect(calculateSelfEducationDeduction(expenses, assets, reduction)).toBe(750);
    });

    it('should include depreciation in total deduction', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Tuition', amount: 500, date: '2024-01-01', workRelatedPercentage: 100 },
      ];
      const assets: DepreciatingAsset[] = [
        { id: '1', name: 'Laptop', cost: 1200, purchaseDate: '2024-01-01', effectiveLifeYears: 3, businessUsePercentage: 100, method: 'prime_cost', declineInValue: 400 },
      ];
      const reduction = 250;
      
      // ($500 + $400) - $250 = $650
      expect(calculateSelfEducationDeduction(expenses, assets, reduction)).toBe(650);
    });

    it('should apply work-related percentage to expenses', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Tuition', amount: 1000, date: '2024-01-01', workRelatedPercentage: 80 },
      ];
      const assets: DepreciatingAsset[] = [];
      const reduction = 250;
      
      // ($1000 × 80%) - $250 = $550
      expect(calculateSelfEducationDeduction(expenses, assets, reduction)).toBe(550);
    });

    it('should apply private use apportionment for stationery', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'stationery', description: 'Notebooks', amount: 100, date: '2024-01-01', workRelatedPercentage: 100, isApportioned: true, privateUsePercentage: 20 },
      ];
      const assets: DepreciatingAsset[] = [];
      const reduction = 100; // Only $80 is work-related (after apportionment)
      
      // $100 × 80% = $80 (after private use reduction)
      expect(calculateSelfEducationDeduction(expenses, assets, reduction)).toBe(0);
    });

    it('should not go below zero when reduction exceeds expenses', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Tuition', amount: 100, date: '2024-01-01', workRelatedPercentage: 100 },
      ];
      const assets: DepreciatingAsset[] = [];
      const reduction = 250;
      
      // $100 - $250 = -$150, but should return 0
      expect(calculateSelfEducationDeduction(expenses, assets, reduction)).toBe(0);
    });

    it('should handle empty expenses and assets', () => {
      expect(calculateSelfEducationDeduction([], [], 250)).toBe(0);
      expect(calculateSelfEducationDeduction([], [], 0)).toBe(0);
    });
  });

  describe('generateD4WorkpaperSummary', () => {
    it('should generate correct summary for empty data', () => {
      const data = createEmptySelfEducationData(2024);
      const summary = generateD4WorkpaperSummary(data);
      
      expect(summary.courseCount).toBe(0);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.totalDepreciation).toBe(0);
      expect(summary.taxableIncomeReduction).toBe(250); // Default value
      expect(summary.deductibleAmount).toBe(0);
      expect(Object.keys(summary.expensesByType)).toHaveLength(0);
    });

    it('should calculate total expenses correctly', () => {
      const data: SelfEducationData = {
        taxYear: 2024,
        courses: [],
        expenses: [
          { id: '1', type: 'course_fees', description: 'Tuition', amount: 1000, date: '2024-01-01', workRelatedPercentage: 100 },
          { id: '2', type: 'textbooks', description: 'Books', amount: 200, date: '2024-01-01', workRelatedPercentage: 100 },
        ],
        depreciatingAssets: [],
        taxableIncomeReduction: 250,
        totalDeductible: 950,
      };
      
      const summary = generateD4WorkpaperSummary(data);
      expect(summary.totalExpenses).toBe(1200);
      expect(summary.courseCount).toBe(0);
    });

    it('should calculate total depreciation correctly', () => {
      const data: SelfEducationData = {
        taxYear: 2024,
        courses: [],
        expenses: [],
        depreciatingAssets: [
          { id: '1', name: 'Laptop', cost: 1200, purchaseDate: '2024-01-01', effectiveLifeYears: 3, businessUsePercentage: 100, method: 'prime_cost', declineInValue: 400 },
          { id: '2', name: 'Tablet', cost: 600, purchaseDate: '2024-01-01', effectiveLifeYears: 2, businessUsePercentage: 100, method: 'prime_cost', declineInValue: 300 },
        ],
        taxableIncomeReduction: 0,
        totalDeductible: 700,
      };
      
      const summary = generateD4WorkpaperSummary(data);
      expect(summary.totalDepreciation).toBe(700);
    });

    it('should group expenses by type', () => {
      const data: SelfEducationData = {
        taxYear: 2024,
        courses: [],
        expenses: [
          { id: '1', type: 'course_fees', description: 'Semester 1', amount: 500, date: '2024-01-01', workRelatedPercentage: 100 },
          { id: '2', type: 'course_fees', description: 'Semester 2', amount: 500, date: '2024-06-01', workRelatedPercentage: 100 },
          { id: '3', type: 'textbooks', description: 'Books', amount: 200, date: '2024-01-01', workRelatedPercentage: 100 },
        ],
        depreciatingAssets: [],
        taxableIncomeReduction: 250,
        totalDeductible: 950,
      };
      
      const summary = generateD4WorkpaperSummary(data);
      expect(summary.expensesByType.course_fees).toBe(1000);
      expect(summary.expensesByType.textbooks).toBe(200);
    });

    it('should count courses correctly', () => {
      const data: SelfEducationData = {
        taxYear: 2024,
        courses: [
          { id: '1', name: 'MBA', provider: 'University', courseType: 'tertiary_degree', studyMode: 'part_time', startDate: '2024-01-01', isWorkRelated: true, leadsToQualification: true, maintainsImprovesSkills: true, resultsInIncomeIncrease: true },
          { id: '2', name: 'Certification', provider: 'Institute', courseType: 'professional', studyMode: 'online', startDate: '2024-03-01', isWorkRelated: true, leadsToQualification: true, maintainsImprovesSkills: true, resultsInIncomeIncrease: false },
        ],
        expenses: [],
        depreciatingAssets: [],
        taxableIncomeReduction: 250,
        totalDeductible: 0,
      };
      
      const summary = generateD4WorkpaperSummary(data);
      expect(summary.courseCount).toBe(2);
    });
  });

  describe('createEmptySelfEducationData', () => {
    it('should create empty data structure with correct tax year', () => {
      const data = createEmptySelfEducationData(2024);
      
      expect(data.taxYear).toBe(2024);
      expect(data.courses).toEqual([]);
      expect(data.expenses).toEqual([]);
      expect(data.depreciatingAssets).toEqual([]);
      expect(data.taxableIncomeReduction).toBe(250);
      expect(data.totalDeductible).toBe(0);
    });

    it('should use default tax year when not provided', () => {
      const data = createEmptySelfEducationData();
      
      expect(data.taxYear).toBe(2024);
    });
  });

  describe('Expense Type Constants', () => {
    it('should have all required expense types', () => {
      const expectedTypes = ['course_fees', 'textbooks', 'stationery', 'travel', 'equipment', 'depreciation', 'internet', 'other'];
      const actualTypes = EDUCATION_EXPENSE_TYPES.map(t => t.value);
      
      expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
      expect(actualTypes).toHaveLength(expectedTypes.length);
    });

    it('each expense type should have required properties', () => {
      EDUCATION_EXPENSE_TYPES.forEach(type => {
        expect(type).toHaveProperty('value');
        expect(type).toHaveProperty('label');
        expect(type).toHaveProperty('description');
        expect(type).toHaveProperty('requiresApportionment');
        expect(typeof type.requiresApportionment).toBe('boolean');
      });
    });

    it('stationery should require apportionment', () => {
      const stationery = EDUCATION_EXPENSE_TYPES.find(t => t.value === 'stationery');
      expect(stationery?.requiresApportionment).toBe(true);
    });

    it('course_fees should not require apportionment', () => {
      const courseFees = EDUCATION_EXPENSE_TYPES.find(t => t.value === 'course_fees');
      expect(courseFees?.requiresApportionment).toBe(false);
    });
  });

  describe('Course Type Constants', () => {
    it('should have all required course types', () => {
      const expectedTypes = ['tertiary_degree', 'tertiary_diploma', 'vocational', 'professional', 'short_course', 'seminar', 'conference', 'other'];
      const actualTypes = COURSE_TYPES.map(t => t.value);
      
      expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
    });

    it('each course type should have required properties', () => {
      COURSE_TYPES.forEach(type => {
        expect(type).toHaveProperty('value');
        expect(type).toHaveProperty('label');
        expect(type).toHaveProperty('description');
      });
    });
  });

  describe('Study Mode Constants', () => {
    it('should have all required study modes', () => {
      const expectedModes = ['full_time', 'part_time', 'online', 'mixed'];
      const actualModes = STUDY_MODES.map(m => m.value);
      
      expect(actualModes).toEqual(expect.arrayContaining(expectedModes));
    });
  });

  describe('ATO Guidance', () => {
    it('should have required guidance properties', () => {
      expect(ATO_GUIDANCE).toHaveProperty('title');
      expect(ATO_GUIDANCE).toHaveProperty('description');
      expect(ATO_GUIDANCE).toHaveProperty('eligibleIf');
      expect(ATO_GUIDANCE).toHaveProperty('notEligibleIf');
      expect(ATO_GUIDANCE).toHaveProperty('recordKeeping');
      expect(ATO_GUIDANCE).toHaveProperty('reference');
    });

    it('should have eligibility criteria', () => {
      expect(ATO_GUIDANCE.eligibleIf.length).toBeGreaterThan(0);
      expect(ATO_GUIDANCE.notEligibleIf.length).toBeGreaterThan(0);
    });

    it('should have valid ATO reference URL', () => {
      expect(ATO_GUIDANCE.reference).toContain('ato.gov.au');
      expect(ATO_GUIDANCE.reference.toLowerCase()).toContain('self-education');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small expense amounts', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'stationery', description: 'Pen', amount: 0.5, date: '2024-01-01', workRelatedPercentage: 100 },
      ];
      expect(calculateTaxableIncomeReduction(expenses)).toBe(0.5);
    });

    it('should handle very large expense amounts', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Executive MBA', amount: 100000, date: '2024-01-01', workRelatedPercentage: 100 },
      ];
      expect(calculateTaxableIncomeReduction(expenses)).toBe(250);
    });

    it('should handle 0% work-related percentage', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Personal interest', amount: 1000, date: '2024-01-01', workRelatedPercentage: 0 },
      ];
      expect(calculateTaxableIncomeReduction(expenses)).toBe(0);
    });

    it('should handle partial work-related percentage', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Course', amount: 1000, date: '2024-01-01', workRelatedPercentage: 75 },
      ];
      // $1000 * 75% = $750
      expect(calculateTaxableIncomeReduction(expenses)).toBe(250);
    });

    it('should handle mixed expense types correctly', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Tuition', amount: 300, date: '2024-01-01', workRelatedPercentage: 100 },
        { id: '2', type: 'travel', description: 'Bus', amount: 200, date: '2024-01-01', workRelatedPercentage: 100 },
        { id: '3', type: 'textbooks', description: 'Books', amount: 100, date: '2024-01-01', workRelatedPercentage: 100 },
        { id: '4', type: 'other', description: 'Accommodation', amount: 500, date: '2024-01-01', workRelatedPercentage: 100 },
      ];
      // Only course_fees ($300) + textbooks ($100) = $400 counts toward reduction
      expect(calculateTaxableIncomeReduction(expenses)).toBe(250);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should calculate correctly for a typical university student', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'Semester 1 HECS', amount: 4500, date: '2024-03-01', workRelatedPercentage: 100 },
        { id: '2', type: 'textbooks', description: 'Course materials', amount: 350, date: '2024-03-01', workRelatedPercentage: 100 },
        { id: '3', type: 'stationery', description: 'Notebooks, pens', amount: 80, date: '2024-03-01', workRelatedPercentage: 100, isApportioned: true, privateUsePercentage: 10 },
        { id: '4', type: 'travel', description: 'Public transport', amount: 600, date: '2024-03-01', workRelatedPercentage: 100 },
      ];
      
      const reduction = calculateTaxableIncomeReduction(expenses);
      expect(reduction).toBe(250);
      
      const deduction = calculateSelfEducationDeduction(expenses, [], reduction);
      // Course fees: $4500
      // Textbooks: $350
      // Stationery: $80 × 90% = $72
      // Travel: $600
      // Total: $5522 - $250 = $5272
      expect(deduction).toBe(5272);
    });

    it('should calculate correctly for professional development', () => {
      const expenses: EducationExpense[] = [
        { id: '1', type: 'course_fees', description: 'CPA Certification', amount: 2500, date: '2024-06-01', workRelatedPercentage: 100 },
        { id: '2', type: 'travel', description: 'Flights to conference', amount: 800, date: '2024-06-01', workRelatedPercentage: 100 },
        { id: '3', type: 'other', description: 'Conference accommodation', amount: 600, date: '2024-06-01', workRelatedPercentage: 100 },
      ];
      
      const assets: DepreciatingAsset[] = [
        { id: '1', name: 'Study Laptop', cost: 2000, purchaseDate: '2024-01-01', effectiveLifeYears: 3, businessUsePercentage: 80, method: 'prime_cost', declineInValue: 533.33 },
      ];
      
      const reduction = calculateTaxableIncomeReduction(expenses);
      expect(reduction).toBe(250);
      
      const deduction = calculateSelfEducationDeduction(expenses, assets, reduction);
      // Course fees: $2500
      // Travel: $800
      // Accommodation: $600
      // Depreciation: $533.33
      // Total: $4433.33 - $250 = $4183.33
      expect(deduction).toBeCloseTo(4183.33, 1);
    });
  });
});
