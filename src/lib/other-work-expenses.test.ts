import { describe, it, expect, beforeEach } from 'vitest';
import {
  createD5Workpaper,
  calculateD5Summary,
  validateD5Workpaper,
  exportD5Workpaper,
  exportForTaxLodge,
  generateSampleD5Expenses,
  suggestApportionment,
  getExpenseTypeStats,
  D5_EXPENSE_TYPES,
  ATO_GUIDANCE,
  COMMON_WARNINGS,
} from '@/lib/other-work-expenses';
import type { D5Expense, D5Workpaper } from '@/lib/other-work-expenses';

describe('D5 Other Work-Related Expenses - Core Logic', () => {
  describe('createD5Workpaper', () => {
    it('should create a new workpaper with the given tax year', () => {
      const workpaper = createD5Workpaper('2024-25');
      
      expect(workpaper.taxYear).toBe('2024-25');
      expect(workpaper.expenses).toEqual([]);
      expect(workpaper.lastModified).toBeDefined();
    });

    it('should create a workpaper with current timestamp', () => {
      const before = Date.now();
      const workpaper = createD5Workpaper('2024-25');
      const after = Date.now();
      const modifiedTime = new Date(workpaper.lastModified).getTime();
      
      expect(modifiedTime).toBeGreaterThanOrEqual(before);
      expect(modifiedTime).toBeLessThanOrEqual(after);
    });

    it('should initialize optional fields as undefined', () => {
      const workpaper = createD5Workpaper('2024-25');
      
      expect(workpaper.notes).toBeUndefined();
      expect(workpaper.preparerName).toBeUndefined();
      expect(workpaper.clientName).toBeUndefined();
    });
  });

  describe('calculateD5Summary', () => {
    it('should calculate total for empty workpaper as zero', () => {
      const workpaper = createD5Workpaper('2024-25');
      const summary = calculateD5Summary(workpaper);
      
      expect(summary.total).toBe(0);
      expect(summary.count).toBe(0);
      expect(summary.receiptCoverage).toBe(0);
    });

    it('should calculate total with 100% work-related percentage', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile', amount: 100, method: 'actual', workRelatedPercentage: 100 },
          { id: '2', type: 'internet', description: 'Internet', amount: 200, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.total).toBe(300);
      expect(summary.count).toBe(2);
    });

    it('should apply work-related percentage correctly', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile', amount: 1000, method: 'apportioned', workRelatedPercentage: 50 },
          { id: '2', type: 'internet', description: 'Internet', amount: 800, method: 'apportioned', workRelatedPercentage: 25 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      // Phone: $1000 × 50% = $500
      // Internet: $800 × 25% = $200
      expect(summary.total).toBe(700);
    });

    it('should calculate receipt coverage correctly', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile', amount: 100, method: 'actual', workRelatedPercentage: 100, receiptId: 'receipt-1' },
          { id: '2', type: 'internet', description: 'Internet', amount: 200, method: 'actual', workRelatedPercentage: 100 },
          { id: '3', type: 'stationery', description: 'Paper', amount: 50, method: 'actual', workRelatedPercentage: 100, receiptId: 'receipt-2' },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.receiptCoverage).toBe(67); // 2 out of 3 = 67%
    });

    it('should group expenses by type correctly', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile 1', amount: 100, method: 'actual', workRelatedPercentage: 100 },
          { id: '2', type: 'phone', description: 'Mobile 2', amount: 200, method: 'actual', workRelatedPercentage: 100 },
          { id: '3', type: 'internet', description: 'Internet', amount: 300, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.byType.phone.total).toBe(300);
      expect(summary.byType.phone.count).toBe(2);
      expect(summary.byType.internet.total).toBe(300);
      expect(summary.byType.internet.count).toBe(1);
    });

    it('should calculate estimated tax savings at 32.5%', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'union-fees', description: 'Membership', amount: 1000, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      // $1000 × 32.5% = $325
      expect(summary.estimatedTaxSavings).toBe(325);
    });

    it('should flag receipt review for high-value expenses without receipts', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile', amount: 1000, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.requiresReceiptReview).toBe(true);
    });

    it('should not flag receipt review when all high-value expenses have receipts', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile', amount: 1000, method: 'actual', workRelatedPercentage: 100, receiptId: 'receipt-1' },
          { id: '2', type: 'stationery', description: 'Pen', amount: 5, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.requiresReceiptReview).toBe(false);
    });
  });

  describe('validateD5Workpaper', () => {
    it('should return valid for empty workpaper with info message', () => {
      const workpaper = createD5Workpaper('2024-25');
      const validation = validateD5Workpaper(workpaper);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
      expect(validation.info.length).toBeGreaterThan(0);
    });

    it('should warn about high apportionment percentage', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile', amount: 500, method: 'apportioned', workRelatedPercentage: 95 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const validation = validateD5Workpaper(workpaper);
      expect(validation.warnings.some(w => w.includes('95%'))).toBe(true);
    });

    it('should not warn about high apportionment for union fees', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'union-fees', description: 'Membership', amount: 500, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const validation = validateD5Workpaper(workpaper);
      expect(validation.warnings.some(w => w.includes('100%'))).toBe(false);
    });

    it('should warn about low apportionment on significant expense', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile', amount: 500, method: 'apportioned', workRelatedPercentage: 10 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const validation = validateD5Workpaper(workpaper);
      expect(validation.warnings.some(w => w.includes('10%') && w.includes('$500'))).toBe(true);
    });

    it('should warn about missing receipts for high-value expenses', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile', amount: 200, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const validation = validateD5Workpaper(workpaper);
      expect(validation.warnings.some(w => w.includes('No receipt'))).toBe(true);
    });

    it('should warn about tools over $300 needing depreciation', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'tools-equipment', description: 'Power tool', amount: 450, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const validation = validateD5Workpaper(workpaper);
      expect(validation.warnings.some(w => w.includes('$300') || w.includes('depreciated'))).toBe(true);
    });

    it('should warn about briefcase over $300', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'briefcase', description: 'Leather briefcase', amount: 500, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const validation = validateD5Workpaper(workpaper);
      expect(validation.warnings.some(w => w.includes('Briefcase') && w.includes('$300'))).toBe(true);
    });

    it('should warn about possible wrong category for vehicle expenses', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'other', description: 'Fuel for work', amount: 100, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const validation = validateD5Workpaper(workpaper);
      expect(validation.warnings.some(w => w.includes('D1') || w.includes('Car Expenses'))).toBe(true);
    });

    it('should warn about possible wrong category for clothing expenses', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'other', description: 'Work uniform laundry', amount: 50, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const validation = validateD5Workpaper(workpaper);
      expect(validation.warnings.some(w => w.includes('D3') || w.includes('Clothing'))).toBe(true);
    });

    it('should warn about possible wrong category for education expenses', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'other', description: 'Course tuition', amount: 1000, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const validation = validateD5Workpaper(workpaper);
      expect(validation.warnings.some(w => w.includes('D4') || w.includes('Self-Education'))).toBe(true);
    });

    it('should provide info about overtime meals requirements', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'overtime-meals', description: 'Dinner', amount: 30, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const validation = validateD5Workpaper(workpaper);
      expect(validation.warnings.some(w => w.includes('allowance'))).toBe(true);
    });
  });

  describe('exportD5Workpaper', () => {
    it('should export workpaper with all required fields', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile', amount: 100, method: 'actual', workRelatedPercentage: 100, receiptId: 'receipt-1' },
        ],
        lastModified: '2024-06-15T10:00:00Z',
        notes: 'Test notes',
      };
      
      const export_ = exportD5Workpaper(workpaper);
      
      expect(export_).toHaveProperty('category', 'D5');
      expect(export_).toHaveProperty('categoryName', 'Other Work-Related Expenses');
      expect(export_).toHaveProperty('taxYear', '2024-25');
      expect(export_).toHaveProperty('expenses');
      expect(export_).toHaveProperty('summary');
      expect(export_).toHaveProperty('notes', 'Test notes');
    });

    it('should include expense details in export', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { 
            id: '1', 
            type: 'phone', 
            description: 'Mobile', 
            amount: 100, 
            method: 'actual', 
            workRelatedPercentage: 100,
            provider: 'Telstra',
          },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const export_ = exportD5Workpaper(workpaper);
      const expense = (export_ as any).expenses[0];
      
      expect(expense).toHaveProperty('type', 'phone');
      expect(expense).toHaveProperty('typeLabel', 'Phone Expenses');
      expect(expense).toHaveProperty('claimableAmount', 100);
      expect(expense).toHaveProperty('provider', 'Telstra');
    });

    it('should include validation summary in export', () => {
      const workpaper = createD5Workpaper('2024-25');
      const export_ = exportD5Workpaper(workpaper);
      
      expect(export_).toHaveProperty('validation');
      expect((export_ as any).validation).toHaveProperty('valid');
      expect((export_ as any).validation).toHaveProperty('warningCount');
    });

    it('should include export date', () => {
      const before = new Date().toISOString();
      const workpaper = createD5Workpaper('2024-25');
      const export_ = exportD5Workpaper(workpaper);
      
      expect((export_ as any).exportDate).toBeDefined();
    });
  });

  describe('exportForTaxLodge', () => {
    it('should provide tax lodge ready data', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'union-fees', description: 'Membership', amount: 1000, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const lodgment = exportForTaxLodge(workpaper);
      
      expect(lodgment.d5Amount).toBe(1000);
      expect(lodgment.itemCount).toBe(1);
      expect(lodgment.declaration).toContain('$1000');
      expect(lodgment.declaration).toContain('true and correct');
    });
  });

  describe('generateSampleD5Expenses', () => {
    it('should generate sample expenses', () => {
      const expenses = generateSampleD5Expenses('2024-25');
      
      expect(expenses.length).toBeGreaterThan(0);
      expect(expenses[0]).toHaveProperty('id');
      expect(expenses[0]).toHaveProperty('type');
      expect(expenses[0]).toHaveProperty('amount');
    });

    it('should include various expense types', () => {
      const expenses = generateSampleD5Expenses('2024-25');
      const types = expenses.map(e => e.type);
      
      expect(types).toContain('phone');
      expect(types).toContain('internet');
      expect(types).toContain('union-fees');
    });

    it('should set isUnder300 flag for tools under $300', () => {
      const expenses = generateSampleD5Expenses('2024-25');
      const toolsExpense = expenses.find(e => e.type === 'tools-equipment');
      
      if (toolsExpense && toolsExpense.amount <= 300) {
        expect(toolsExpense.isUnder300).toBe(true);
      }
    });
  });

  describe('suggestApportionment', () => {
    it('should return default apportionment when no pattern specified', () => {
      const suggestion = suggestApportionment('phone');
      expect(suggestion).toBe(50); // Default for phone
    });

    it('should return usage-based apportionment', () => {
      expect(suggestApportionment('phone', 'light')).toBe(15);
      expect(suggestApportionment('phone', 'occasional')).toBe(25);
      expect(suggestApportionment('phone', 'regular')).toBe(50);
      expect(suggestApportionment('phone', 'heavy')).toBe(75);
      expect(suggestApportionment('phone', 'exclusive')).toBe(100);
    });

    it('should return 100 for union fees regardless of pattern', () => {
      expect(suggestApportionment('union-fees', 'light')).toBe(100);
      expect(suggestApportionment('union-fees')).toBe(100);
    });
  });

  describe('D5_EXPENSE_TYPES', () => {
    it('should have all required expense types', () => {
      const expectedTypes = [
        'phone', 'internet', 'home-office-running', 'union-fees', 
        'subscriptions', 'publications', 'tools-equipment', 'protective-items',
        'briefcase', 'stationery', 'overtime-meals', 'travel', 'other'
      ];
      
      expectedTypes.forEach(type => {
        expect(D5_EXPENSE_TYPES).toHaveProperty(type);
      });
    });

    it('should have required properties for each type', () => {
      Object.values(D5_EXPENSE_TYPES).forEach(type => {
        expect(type).toHaveProperty('label');
        expect(type).toHaveProperty('description');
        expect(type).toHaveProperty('examples');
        expect(Array.isArray(type.examples)).toBe(true);
      });
    });

    it('should have default apportionment for shared expenses', () => {
      expect(D5_EXPENSE_TYPES['phone'].defaultApportionment).toBe(50);
      expect(D5_EXPENSE_TYPES['internet'].defaultApportionment).toBe(25);
      expect(D5_EXPENSE_TYPES['home-office-running'].defaultApportionment).toBe(10);
    });

    it('should have 100% apportionment for direct expenses', () => {
      expect(D5_EXPENSE_TYPES['union-fees'].defaultApportionment).toBe(100);
      expect(D5_EXPENSE_TYPES['subscriptions'].defaultApportionment).toBe(100);
    });
  });

  describe('ATO_GUIDANCE', () => {
    it('should have guidance for phone expenses', () => {
      expect(ATO_GUIDANCE.phone).toBeDefined();
      expect(ATO_GUIDANCE.phone.title).toBe('Phone Expenses');
      expect(ATO_GUIDANCE.phone.recordKeeping).toBeDefined();
    });

    it('should have guidance for internet expenses', () => {
      expect(ATO_GUIDANCE.internet).toBeDefined();
      expect(ATO_GUIDANCE.internet.title).toBe('Internet Expenses');
    });

    it('should have guidance for union fees', () => {
      expect(ATO_GUIDANCE['union-fees']).toBeDefined();
    });

    it('should have guidance for tools and equipment', () => {
      expect(ATO_GUIDANCE['tools-equipment']).toBeDefined();
    });
  });

  describe('COMMON_WARNINGS', () => {
    it('should generate high apportionment warning', () => {
      const warning = COMMON_WARNINGS.highApportionment(95, 'Phone');
      expect(warning).toContain('95%');
      expect(warning).toContain('Phone');
    });

    it('should generate missing receipt warning', () => {
      const warning = COMMON_WARNINGS.missingReceipt('Internet', 150);
      expect(warning).toContain('Internet');
      expect(warning).toContain('$150');
    });

    it('should generate depreciation required warning', () => {
      const warning = COMMON_WARNINGS.deprecationRequired(500);
      expect(warning).toContain('$500');
      expect(warning).toContain('$300');
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0% work-related percentage', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Personal phone', amount: 100, method: 'actual', workRelatedPercentage: 0 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.total).toBe(0);
    });

    it('should handle very small amounts', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'stationery', description: 'Pen', amount: 0.5, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.total).toBe(0.5);
    });

    it('should handle very large amounts', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'subscriptions', description: 'Enterprise software', amount: 10000, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.total).toBe(10000);
    });

    it('should handle partial work-related percentages', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'internet', description: 'Home internet', amount: 1000, method: 'apportioned', workRelatedPercentage: 33.33 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.total).toBeCloseTo(333.3, 1);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should calculate correctly for a typical office worker', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'phone', description: 'Mobile 12 months', amount: 960, method: 'apportioned', workRelatedPercentage: 40 },
          { id: '2', type: 'internet', description: 'Internet 12 months', amount: 900, method: 'apportioned', workRelatedPercentage: 25 },
          { id: '3', type: 'stationery', description: 'Office supplies', amount: 150, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      // Phone: $960 × 40% = $384
      // Internet: $900 × 25% = $225
      // Stationery: $150 × 100% = $150
      expect(summary.total).toBe(759);
    });

    it('should calculate correctly for a trades person', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'union-fees', description: 'CFMEU membership', amount: 750, method: 'actual', workRelatedPercentage: 100 },
          { id: '2', type: 'protective-items', description: 'Safety gear', amount: 200, method: 'actual', workRelatedPercentage: 100 },
          { id: '3', type: 'tools-equipment', description: 'Hand tools', amount: 250, method: 'actual', workRelatedPercentage: 100, isUnder300: true },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.total).toBe(1200);
      expect(summary.byType['union-fees'].total).toBe(750);
    });

    it('should calculate correctly for a professional with subscriptions', () => {
      const workpaper: D5Workpaper = {
        taxYear: '2024-25',
        expenses: [
          { id: '1', type: 'subscriptions', description: 'Professional software', amount: 1200, method: 'actual', workRelatedPercentage: 100 },
          { id: '2', type: 'publications', description: 'Industry journal', amount: 180, method: 'actual', workRelatedPercentage: 100 },
          { id: '3', type: 'union-fees', description: 'Professional association', amount: 600, method: 'actual', workRelatedPercentage: 100 },
        ],
        lastModified: new Date().toISOString(),
      };
      
      const summary = calculateD5Summary(workpaper);
      expect(summary.total).toBe(1980);
      expect(summary.estimatedTaxSavings).toBe(643.5); // 32.5% of $1980
    });
  });
});
