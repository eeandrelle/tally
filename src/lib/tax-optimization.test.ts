/**
 * Tax Optimization Engine v2.0 Tests
 * 
 * Comprehensive test suite for the expanded Tax Optimization Engine.
 * Tests all 20 detection rules, heuristic scoring, YoY comparison, and rule ranking.
 */

import { describe, it, expect } from 'vitest';
import {
  runOptimizationEngine,
  getMarginalTaxRate,
  calculateTaxSavings,
  calculateHeuristicScore,
  buildYoYComparisons,
  detectYoYAnomalies,
  checkOpportunityType,
  getTopOpportunities,
  exportOpportunitiesForAccountant,
  generateYoYReport,
  calculateRuleRankings,
  allDetectionRules,
  type UserProfile,
  type ExpenseHistory,
  type ExpenseRecord
} from './tax-optimization';

// ============= TEST DATA =============

const createProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  taxableIncome: 75000,
  occupation: 'Software Engineer',
  age: 35,
  hasVehicle: true,
  workArrangement: 'hybrid',
  hasInvestments: true,
  investmentTypes: ['shares'],
  isStudying: false,
  hasHomeOffice: true,
  employmentType: 'full-time',
  yearsWithAccountant: 2,
  ...overrides
});

const createExpenseHistory = (expenses: ExpenseRecord[] = [], taxYear: number = 2025): ExpenseHistory => ({
  taxYear,
  expenses,
  totalDeductions: expenses.reduce((sum, e) => sum + e.amount, 0),
  lastUpdated: new Date()
});

const createExpense = (overrides: Partial<ExpenseRecord> = {}): ExpenseRecord => ({
  id: 'exp-' + Date.now() + Math.random(),
  category: 'D5',
  amount: 100,
  date: new Date('2025-03-15'),
  description: 'Test expense',
  hasReceipt: true,
  ...overrides
});

// ============= UNIT TESTS: TAX CALCULATIONS =============

describe('Tax Rate Calculations', () => {
  describe('getMarginalTaxRate', () => {
    it('should return 0% for income up to $18,200', () => {
      expect(getMarginalTaxRate(0)).toBe(0);
      expect(getMarginalTaxRate(18200)).toBe(0);
      expect(getMarginalTaxRate(10000)).toBe(0);
    });

    it('should return 16% for income between $18,201 and $45,000', () => {
      expect(getMarginalTaxRate(18201)).toBe(0.16);
      expect(getMarginalTaxRate(30000)).toBe(0.16);
      expect(getMarginalTaxRate(45000)).toBe(0.16);
    });

    it('should return 30% for income between $45,001 and $135,000', () => {
      expect(getMarginalTaxRate(45001)).toBe(0.30);
      expect(getMarginalTaxRate(75000)).toBe(0.30);
      expect(getMarginalTaxRate(135000)).toBe(0.30);
    });

    it('should return 37% for income between $135,001 and $190,000', () => {
      expect(getMarginalTaxRate(135001)).toBe(0.37);
      expect(getMarginalTaxRate(150000)).toBe(0.37);
      expect(getMarginalTaxRate(190000)).toBe(0.37);
    });

    it('should return 45% for income over $190,000', () => {
      expect(getMarginalTaxRate(190001)).toBe(0.45);
      expect(getMarginalTaxRate(250000)).toBe(0.45);
    });
  });

  describe('calculateTaxSavings', () => {
    it('should calculate correct savings at 30% marginal rate', () => {
      expect(calculateTaxSavings(1000, 75000)).toBe(300);
    });

    it('should calculate correct savings at 16% marginal rate', () => {
      expect(calculateTaxSavings(1000, 30000)).toBe(160);
    });

    it('should calculate correct savings at 45% marginal rate', () => {
      expect(calculateTaxSavings(1000, 200000)).toBe(450);
    });

    it('should return 0 for zero deduction', () => {
      expect(calculateTaxSavings(0, 75000)).toBe(0);
    });
  });
});

// ============= UNIT TESTS: HEURISTIC SCORING =============

describe('Heuristic Scoring', () => {
  describe('calculateHeuristicScore', () => {
    it('should calculate high confidence with strong evidence', () => {
      const profile = createProfile({ workArrangement: 'remote' });
      const history = createExpenseHistory([]);
      const evidence = ['Work arrangement: remote', 'No WFH expenses detected', 'Previous year had WFH deductions'];
      
      const score = calculateHeuristicScore(profile, history, evidence, 0.8, 'TEST-001');
      
      expect(score.finalScore).toBeGreaterThan(0.7);
      expect(score.confidenceLevel).toBe('high');
      expect(score.evidenceBonus).toBeGreaterThan(0);
    });

    it('should calculate medium confidence with moderate evidence', () => {
      const profile = createProfile();
      const history = createExpenseHistory([]);
      const evidence = ['Some indicator'];
      
      const score = calculateHeuristicScore(profile, history, evidence, 0.5, 'TEST-001');
      
      expect(score.confidenceLevel).toBe('medium');
    });

    it('should calculate low confidence with weak evidence', () => {
      const profile = createProfile();
      const history = createExpenseHistory([]);
      
      const score = calculateHeuristicScore(profile, history, [], 0.3, 'TEST-001');
      
      expect(score.confidenceLevel).toBe('low');
    });

    it('should include industry relevance for matching industries', () => {
      const profile = createProfile({ industry: 'construction' });
      const history = createExpenseHistory([]);
      
      const score = calculateHeuristicScore(profile, history, ['Test evidence'], 0.5, 'TEST-001');
      
      expect(score.industryRelevance).toBeGreaterThan(0.1);
    });

    it('should cap final score at 1.0', () => {
      const profile = createProfile({ workArrangement: 'remote', industry: 'construction' });
      const history = createExpenseHistory([
        createExpense(), createExpense(), createExpense(), createExpense(), createExpense()
      ]);
      const evidence = ['E1', 'E2', 'E3', 'E4'];
      
      const score = calculateHeuristicScore(profile, history, evidence, 0.9, 'TEST-001');
      
      expect(score.finalScore).toBeLessThanOrEqual(1.0);
    });
  });
});

// ============= UNIT TESTS: YEAR-OVER-YEAR COMPARISON =============

describe('Year-over-Year Comparison', () => {
  describe('buildYoYComparisons', () => {
    it('should build comparisons from multiple years', () => {
      const histories = [
        createExpenseHistory([createExpense({ amount: 1000 })], 2025),
        createExpenseHistory([createExpense({ amount: 800 })], 2024),
        createExpenseHistory([createExpense({ amount: 600 })], 2023)
      ];
      
      const comparisons = buildYoYComparisons(histories);
      
      expect(comparisons).toHaveLength(3);
      expect(comparisons[0].taxYear).toBe(2025);
      expect(comparisons[1].taxYear).toBe(2024);
    });

    it('should return empty array for no history', () => {
      const comparisons = buildYoYComparisons([]);
      expect(comparisons).toHaveLength(0);
    });

    it('should calculate category totals correctly', () => {
      const histories = [
        createExpenseHistory([
          createExpense({ category: 'D5', amount: 500 }),
          createExpense({ category: 'D5', amount: 300 }),
          createExpense({ category: 'D1', amount: 200 })
        ], 2025)
      ];
      
      const comparisons = buildYoYComparisons(histories);
      
      expect(comparisons[0].categoryTotals['D5']).toBe(800);
      expect(comparisons[0].categoryTotals['D1']).toBe(200);
    });
  });

  describe('detectYoYAnomalies', () => {
    it('should detect significant category drops', () => {
      const currentHistory = createExpenseHistory([], 2025);
      const comparisons = [
        createExpenseHistory([createExpense({ category: 'D5', amount: 2000 })], 2025),
        createExpenseHistory([createExpense({ category: 'D5', amount: 2000 })], 2024)
      ];
      const comparisonData = buildYoYComparisons(comparisons);
      
      const anomalies = detectYoYAnomalies(currentHistory, comparisonData);
      
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].category).toBe('D5');
      expect(anomalies[0].change).toBeLessThan(-0.5);
    });

    it('should return empty array for no previous data', () => {
      const currentHistory = createExpenseHistory([], 2025);
      const anomalies = detectYoYAnomalies(currentHistory, []);
      expect(anomalies).toHaveLength(0);
    });
  });
});

// ============= UNIT TESTS: RULE RANKING =============

describe('Rule Ranking', () => {
  describe('calculateRuleRankings', () => {
    it('should rank rules by relevance for remote workers', () => {
      const profile = createProfile({ workArrangement: 'remote' });
      const history = createExpenseHistory([]);
      
      const rankings = calculateRuleRankings(profile, history);
      
      // WFH rules should have high relevance
      const wfhRules = rankings.filter(r => r.ruleId.startsWith('WFH'));
      expect(wfhRules[0]?.relevanceScore).toBeGreaterThan(50);
    });

    it('should rank rules by relevance for tradespersons', () => {
      const profile = createProfile({ occupation: 'Electrician' });
      const history = createExpenseHistory([]);
      
      const rankings = calculateRuleRankings(profile, history);
      
      // Tools rule should have high relevance (relevanceScore + priority bonus)
      const toolsRule = rankings.find(r => r.ruleId === 'TOOLS-001');
      expect(toolsRule?.relevanceScore).toBeGreaterThan(50); // Base relevance (40*1.0) + priority bonus (15) = 55
    });

    it('should return 20 ranked rules', () => {
      const profile = createProfile();
      const history = createExpenseHistory([]);
      
      const rankings = calculateRuleRankings(profile, history);
      
      expect(rankings).toHaveLength(20);
    });

    it('should sort by relevance score descending', () => {
      const profile = createProfile();
      const history = createExpenseHistory([]);
      
      const rankings = calculateRuleRankings(profile, history);
      
      for (let i = 0; i < rankings.length - 1; i++) {
        expect(rankings[i].relevanceScore).toBeGreaterThanOrEqual(rankings[i + 1].relevanceScore);
      }
    });
  });
});

// ============= UNIT TESTS: ORIGINAL 8 RULES =============

describe('Original 8 Detection Rules', () => {
  describe('WFH Missing Rule (WFH-001)', () => {
    it('should detect missing WFH for remote workers', () => {
      const profile = createProfile({ workArrangement: 'remote' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const wfhOpportunity = result.opportunities.find(o => o.id.startsWith('WFH-001'));
      expect(wfhOpportunity).toBeDefined();
      expect(wfhOpportunity?.priority).toBe('critical');
      expect(wfhOpportunity?.heuristicScore).toBeDefined();
    });

    it('should not flag WFH for office-only workers', () => {
      const profile = createProfile({ workArrangement: 'office' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const wfhOpportunity = result.opportunities.find(o => o.id.startsWith('WFH-001'));
      expect(wfhOpportunity).toBeUndefined();
    });
  });

  describe('Vehicle Logbook Gap Rule (VEH-001)', () => {
    it('should detect vehicle logbook gap', () => {
      const profile = createProfile();
      const history = createExpenseHistory([
        createExpense({ category: 'D1', amount: 3000, description: 'Car expenses annual' })
      ]);
      
      const result = runOptimizationEngine(profile, history);
      
      const vehicleOpportunity = result.opportunities.find(o => o.id.startsWith('VEH-001'));
      expect(vehicleOpportunity).toBeDefined();
    });
  });

  describe('Dividend Pattern Gap Rule (DIV-001)', () => {
    it('should detect missing dividend statements', () => {
      const profile = createProfile({ 
        hasInvestments: true, 
        investmentTypes: ['shares'] 
      });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const dividendOpportunity = result.opportunities.find(o => o.id.startsWith('DIV-001'));
      expect(dividendOpportunity).toBeDefined();
    });
  });

  describe('Self-Education Rule (EDU-001)', () => {
    it('should detect missing education expenses for students', () => {
      const profile = createProfile({ isStudying: true, studyField: 'Accounting' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const educationOpportunity = result.opportunities.find(o => o.id.startsWith('EDU-001'));
      expect(educationOpportunity).toBeDefined();
    });
  });

  describe('Depreciation Rule (DEP-001)', () => {
    it('should detect potential depreciation opportunities', () => {
      const profile = createProfile();
      const history = createExpenseHistory([
        createExpense({ category: 'D5', amount: 1500, description: 'Laptop computer' })
      ]);
      
      const result = runOptimizationEngine(profile, history);
      
      const depreciationOpportunity = result.opportunities.find(o => o.id.startsWith('DEP-001'));
      expect(depreciationOpportunity).toBeDefined();
    });
  });

  describe('Internet/Phone Gap Rule (UTIL-001)', () => {
    it('should detect missing internet/phone for WFH', () => {
      const profile = createProfile({ workArrangement: 'hybrid' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const utilityOpportunity = result.opportunities.find(o => o.id.startsWith('UTIL-001'));
      expect(utilityOpportunity).toBeDefined();
    });
  });

  describe('Timing Rule (TIME-001)', () => {
    it('should return null outside of EOFY period', () => {
      const profile = createProfile();
      const history = createExpenseHistory([
        createExpense({ category: 'D5', amount: 100 })
      ]);
      
      const result = runOptimizationEngine(profile, history);
      
      // Time rule only triggers in May/June
      const timingOpportunity = result.opportunities.find(o => o.id.startsWith('TIME-001'));
      expect(timingOpportunity).toBeUndefined();
    });
  });

  describe('Donations Rule (DON-001)', () => {
    it('should suggest donations for high income earners', () => {
      const profile = createProfile({ taxableIncome: 120000 });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const donationsOpportunity = result.opportunities.find(o => o.id.startsWith('DON-001'));
      expect(donationsOpportunity).toBeDefined();
    });
  });
});

// ============= UNIT TESTS: 12 NEW RULES =============

describe('12 New Detection Rules', () => {
  describe('Travel Deduction Gap Rule (TRAV-001)', () => {
    it('should detect missing travel for sales roles', () => {
      const profile = createProfile({ occupation: 'Sales Representative' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const travelOpportunity = result.opportunities.find(o => o.id.startsWith('TRAV-001'));
      expect(travelOpportunity).toBeDefined();
      expect(travelOpportunity?.priority).toBe('high');
    });

    it('should detect missing travel for consultants', () => {
      const profile = createProfile({ occupation: 'Consultant' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const travelOpportunity = result.opportunities.find(o => o.id.startsWith('TRAV-001'));
      expect(travelOpportunity).toBeDefined();
    });

    it('should not flag for office workers with no travel', () => {
      const profile = createProfile({ occupation: 'Software Developer', workArrangement: 'office' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const travelOpportunity = result.opportunities.find(o => o.id.startsWith('TRAV-001'));
      expect(travelOpportunity).toBeUndefined();
    });
  });

  describe('Professional Subscriptions Rule (PROF-001)', () => {
    it('should detect missing subscriptions for accountants', () => {
      const profile = createProfile({ occupation: 'Accountant' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const profOpportunity = result.opportunities.find(o => o.id.startsWith('PROF-001'));
      expect(profOpportunity).toBeDefined();
    });

    it('should detect missing subscriptions for lawyers', () => {
      const profile = createProfile({ occupation: 'Lawyer' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const profOpportunity = result.opportunities.find(o => o.id.startsWith('PROF-001'));
      expect(profOpportunity).toBeDefined();
    });
  });

  describe('Year-over-Year Drop Rule (YOY-001)', () => {
    it('should detect YoY deduction drops', () => {
      const profile = createProfile();
      const currentHistory = createExpenseHistory([], 2025);
      const allHistory = [
        currentHistory,
        createExpenseHistory([createExpense({ category: 'D5', amount: 2000 })], 2024)
      ];
      
      const result = runOptimizationEngine(profile, currentHistory, allHistory);
      
      const yoyOpportunity = result.opportunities.find(o => o.id.startsWith('YOY-001'));
      expect(yoyOpportunity).toBeDefined();
      expect(yoyOpportunity?.type).toBe('yoy_anomaly');
    });

    it('should include YoY comparison data', () => {
      const profile = createProfile();
      const currentHistory = createExpenseHistory([], 2025);
      const allHistory = [
        currentHistory,
        createExpenseHistory([createExpense({ category: 'D5', amount: 2000 })], 2024)
      ];
      
      const result = runOptimizationEngine(profile, currentHistory, allHistory);
      
      expect(result.yoyComparisons.length).toBeGreaterThan(0);
    });
  });

  describe('Uniform/Clothing Gap Rule (UNI-001)', () => {
    it('should detect missing uniform for nurses', () => {
      const profile = createProfile({ occupation: 'Nurse' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const uniformOpportunity = result.opportunities.find(o => o.id.startsWith('UNI-001'));
      expect(uniformOpportunity).toBeDefined();
    });

    it('should detect missing uniform for chefs', () => {
      const profile = createProfile({ occupation: 'Chef' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const uniformOpportunity = result.opportunities.find(o => o.id.startsWith('UNI-001'));
      expect(uniformOpportunity).toBeDefined();
    });
  });

  describe('Industry Benchmark Rule (BENCH-001)', () => {
    it('should flag below-benchmark deductions', () => {
      const profile = createProfile({ 
        industry: 'construction',
        taxableIncome: 80000 
      });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const benchmarkOpportunity = result.opportunities.find(o => o.id.startsWith('BENCH-001'));
      expect(benchmarkOpportunity).toBeDefined();
    });
  });

  describe('Meal Expense Gap Rule (MEAL-001)', () => {
    it('should suggest meal deductions for shift workers', () => {
      const profile = createProfile({ occupation: 'Nurse' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const mealOpportunity = result.opportunities.find(o => o.id.startsWith('MEAL-001'));
      expect(mealOpportunity).toBeDefined();
    });
  });

  describe('Capital Works Rule (PROP-001)', () => {
    it('should detect missing capital works for property investors', () => {
      const profile = createProfile({ 
        investmentTypes: ['property', 'shares'] 
      });
      const history = createExpenseHistory([
        createExpense({ category: 'rental', amount: 5000, description: 'Property maintenance' })
      ]);
      
      const result = runOptimizationEngine(profile, history);
      
      const capitalWorksOpportunity = result.opportunities.find(o => o.id.startsWith('PROP-001'));
      expect(capitalWorksOpportunity).toBeDefined();
      expect(capitalWorksOpportunity?.priority).toBe('high');
    });
  });

  describe('Home Office Equipment Rule (WFH-002)', () => {
    it('should detect equipment depreciation opportunities', () => {
      const profile = createProfile({ workArrangement: 'remote' });
      const history = createExpenseHistory([
        createExpense({ category: 'D5', amount: 500, description: 'Home office setup' }),
        createExpense({ category: 'D5', amount: 1500, description: 'Laptop computer' }),
        createExpense({ category: 'D5', amount: 600, description: 'Office chair' })
      ]);
      
      const result = runOptimizationEngine(profile, history);
      
      const equipmentOpportunity = result.opportunities.find(o => o.id.startsWith('WFH-002'));
      expect(equipmentOpportunity).toBeDefined();
    });
  });

  describe('Quarterly Pattern Gap Rule (PATT-001)', () => {
    it('should detect quarterly expense gaps', () => {
      const profile = createProfile();
      // Create expenses only in Q1
      const expenses = [
        createExpense({ date: new Date('2025-01-15'), amount: 1000 }),
        createExpense({ date: new Date('2025-02-15'), amount: 1000 }),
        createExpense({ date: new Date('2025-03-15'), amount: 1000 })
      ];
      const history = createExpenseHistory(expenses);
      
      const result = runOptimizationEngine(profile, history);
      
      const patternOpportunity = result.opportunities.find(o => o.id.startsWith('PATT-001'));
      expect(patternOpportunity).toBeDefined();
    });
  });

  describe('Income Protection Rule (INS-001)', () => {
    it('should suggest income protection for high earners', () => {
      const profile = createProfile({ taxableIncome: 100000 });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const insuranceOpportunity = result.opportunities.find(o => o.id.startsWith('INS-001'));
      expect(insuranceOpportunity).toBeDefined();
    });

    it('should suggest income protection for self-employed', () => {
      const profile = createProfile({ 
        employmentType: 'self-employed',
        taxableIncome: 60000 
      });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const insuranceOpportunity = result.opportunities.find(o => o.id.startsWith('INS-001'));
      expect(insuranceOpportunity).toBeDefined();
    });
  });

  describe('Crypto Records Rule (CRYPTO-001)', () => {
    it('should detect missing crypto records', () => {
      const profile = createProfile({ 
        investmentTypes: ['crypto', 'shares'] 
      });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const cryptoOpportunity = result.opportunities.find(o => o.id.startsWith('CRYPTO-001'));
      expect(cryptoOpportunity).toBeDefined();
      expect(cryptoOpportunity?.priority).toBe('high');
    });
  });

  describe('Tools Equipment Rule (TOOLS-001)', () => {
    it('should detect missing tools for electricians', () => {
      const profile = createProfile({ occupation: 'Electrician' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const toolsOpportunity = result.opportunities.find(o => o.id.startsWith('TOOLS-001'));
      expect(toolsOpportunity).toBeDefined();
      expect(toolsOpportunity?.priority).toBe('high');
    });

    it('should detect missing tools for mechanics', () => {
      const profile = createProfile({ occupation: 'Mechanic' });
      const history = createExpenseHistory([]);
      
      const result = runOptimizationEngine(profile, history);
      
      const toolsOpportunity = result.opportunities.find(o => o.id.startsWith('TOOLS-001'));
      expect(toolsOpportunity).toBeDefined();
    });
  });
});

// ============= INTEGRATION TESTS =============

describe('Optimization Engine Integration', () => {
  it('should run all 20 rules', () => {
    const profile = createProfile({ 
      workArrangement: 'remote', 
      occupation: 'Electrician',
      investmentTypes: ['property', 'crypto']
    });
    const history = createExpenseHistory([]);
    
    const result = runOptimizationEngine(profile, history);
    
    expect(result.opportunities.length).toBeGreaterThanOrEqual(5); // At least 5 opportunities for this profile
    expect(result.rankedRules).toHaveLength(20);
    expect(result.summary.averageConfidence).toBeGreaterThan(0);
  });

  it('should include heuristic scores in opportunities', () => {
    const profile = createProfile({ workArrangement: 'remote' });
    const history = createExpenseHistory([]);
    
    const result = runOptimizationEngine(profile, history);
    
    const opportunityWithScore = result.opportunities.find(o => o.heuristicScore !== undefined);
    expect(opportunityWithScore).toBeDefined();
  });

  it('should calculate accurate summary statistics', () => {
    const profile = createProfile({ workArrangement: 'remote' });
    const history = createExpenseHistory([]);
    
    const result = runOptimizationEngine(profile, history);
    
    const calculatedTotal = result.opportunities.reduce((sum, o) => sum + o.estimatedSavings, 0);
    expect(result.totalPotentialSavings).toBe(calculatedTotal);
    
    const totalByPriority = result.summary.criticalCount + 
                           result.summary.highCount + 
                           result.summary.mediumCount + 
                           result.summary.lowCount;
    expect(totalByPriority).toBe(result.opportunities.length);
  });

  it('should sort opportunities by priority', () => {
    const profile = createProfile({ 
      workArrangement: 'remote',
      occupation: 'Electrician'
    });
    const history = createExpenseHistory([]);
    
    const result = runOptimizationEngine(profile, history);
    
    const priorities = result.opportunities.map(o => o.priority);
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    for (let i = 0; i < priorities.length - 1; i++) {
      expect(priorityOrder[priorities[i]]).toBeLessThanOrEqual(priorityOrder[priorities[i + 1]]);
    }
  });

  it('should handle multiple years of history', () => {
    const profile = createProfile({ workArrangement: 'remote' });
    const allHistory = [
      createExpenseHistory([], 2025),
      createExpenseHistory([createExpense({ category: 'D5', amount: 2000 })], 2024),
      createExpenseHistory([createExpense({ category: 'D5', amount: 1800 })], 2023)
    ];
    
    const result = runOptimizationEngine(profile, allHistory[0], allHistory);
    
    expect(result.yoyComparisons.length).toBeGreaterThan(0);
  });
});

// ============= HELPER FUNCTION TESTS =============

describe('Helper Functions', () => {
  describe('checkOpportunityType', () => {
    it('should filter by type', () => {
      const profile = createProfile({ workArrangement: 'remote' });
      const history = createExpenseHistory([]);
      
      const missingDeductions = checkOpportunityType('missing_deduction', profile, history);
      expect(missingDeductions.every(o => o.type === 'missing_deduction')).toBe(true);
    });
  });

  describe('getTopOpportunities', () => {
    it('should return limited results', () => {
      const profile = createProfile({ workArrangement: 'remote', occupation: 'Electrician' });
      const history = createExpenseHistory([]);
      
      const top3 = getTopOpportunities(profile, history, undefined, 3);
      expect(top3.length).toBeLessThanOrEqual(3);
    });
  });

  describe('exportOpportunitiesForAccountant', () => {
    it('should generate comprehensive report', () => {
      const profile = createProfile({ workArrangement: 'remote' });
      const history = createExpenseHistory([]);
      const result = runOptimizationEngine(profile, history);
      
      const report = exportOpportunitiesForAccountant(result);
      
      expect(report).toContain('TAX OPTIMIZATION OPPORTUNITIES REPORT');
      expect(report).toContain('Average Confidence');
      expect(report).toContain('RULE RELEVANCE RANKINGS');
    });
  });

  describe('generateYoYReport', () => {
    it('should generate YoY comparison report', () => {
      const comparisons = [
        createExpenseHistory([createExpense({ amount: 1000 })], 2025),
        createExpenseHistory([createExpense({ amount: 800 })], 2024)
      ];
      const comparisonData = buildYoYComparisons(comparisons);
      
      const report = generateYoYReport(comparisonData);
      
      expect(report).toContain('YEAR-OVER-YEAR COMPARISON REPORT');
      expect(report).toContain('2025');
      expect(report).toContain('2024');
    });
  });
});

// ============= EDGE CASES =============

describe('Edge Cases', () => {
  it('should handle empty profile fields gracefully', () => {
    const profile: UserProfile = {
      taxableIncome: 50000,
      occupation: '',
      age: 30,
      hasVehicle: false,
      workArrangement: 'office',
      hasInvestments: false,
      investmentTypes: [],
      isStudying: false,
      hasHomeOffice: false,
      employmentType: 'full-time',
      yearsWithAccountant: 0
    };
    const history = createExpenseHistory([]);
    
    expect(() => runOptimizationEngine(profile, history)).not.toThrow();
  });

  it('should handle very large number of expenses', () => {
    const profile = createProfile();
    const expenses: ExpenseRecord[] = [];
    for (let i = 0; i < 1000; i++) {
      expenses.push(createExpense({ id: `exp-${i}`, amount: Math.random() * 1000 }));
    }
    const history = createExpenseHistory(expenses);
    
    expect(() => runOptimizationEngine(profile, history)).not.toThrow();
  });

  it('should handle zero taxable income', () => {
    const profile = createProfile({ taxableIncome: 0, workArrangement: 'remote' });
    const history = createExpenseHistory([]);
    
    const result = runOptimizationEngine(profile, history);
    
    expect(result.totalPotentialSavings).toBe(0);
  });
});

// ============= REAL-WORLD SCENARIOS =============

describe('Real-World Scenarios', () => {
  it('scenario: remote software developer', () => {
    const profile = createProfile({
      occupation: 'Software Developer',
      taxableIncome: 95000,
      workArrangement: 'remote',
      hasInvestments: false
    });
    const history = createExpenseHistory([]);
    
    const result = runOptimizationEngine(profile, history);
    
    expect(result.opportunities.some(o => o.category === 'work-from-home')).toBe(true);
    expect(result.totalPotentialSavings).toBeGreaterThan(0);
  });

  it('scenario: electrician with no deductions', () => {
    const profile = createProfile({
      occupation: 'Electrician',
      taxableIncome: 75000,
      hasVehicle: true,
      workArrangement: 'mixed'
    });
    const history = createExpenseHistory([]);
    
    const result = runOptimizationEngine(profile, history);
    
    // Should detect tools, vehicle, uniform opportunities
    expect(result.opportunities.some(o => o.id.startsWith('TOOLS-001'))).toBe(true);
    expect(result.opportunities.some(o => o.id.startsWith('UNI-001'))).toBe(true);
  });

  it('scenario: property investor with crypto', () => {
    const profile = createProfile({
      occupation: 'Accountant',
      taxableIncome: 120000,
      hasInvestments: true,
      investmentTypes: ['property', 'crypto', 'shares']
    });
    const history = createExpenseHistory([
      createExpense({ category: 'rental', amount: 3000, description: 'Property expenses' })
    ]);
    
    const result = runOptimizationEngine(profile, history);
    
    expect(result.opportunities.some(o => o.id.startsWith('PROP-001'))).toBe(true);
    expect(result.opportunities.some(o => o.id.startsWith('CRYPTO-001'))).toBe(true);
    expect(result.opportunities.some(o => o.id.startsWith('PROF-001'))).toBe(true);
  });

  it('scenario: well-organized taxpayer', () => {
    const profile = createProfile({ workArrangement: 'office' });
    const history = createExpenseHistory([
      createExpense({ category: 'D5', amount: 1200, description: 'Home office' }),
      createExpense({ category: 'D1', amount: 2000, description: 'Car fuel' }),
      createExpense({ category: 'D1', amount: 1500, description: 'Car rego' }),
      createExpense({ category: 'D1', amount: 1000, description: 'Car insurance' }),
      createExpense({ category: 'utilities', amount: 800, description: 'Internet' }),
      createExpense({ category: 'D6', amount: 500, description: 'Low value pool' })
    ]);
    
    const result = runOptimizationEngine(profile, history);
    
    // Should have fewer opportunities since well organized
    expect(result.opportunities.length).toBeLessThanOrEqual(3);
  });
});

// ============= REGISTRY TESTS =============

describe('Detection Rules Registry', () => {
  it('should have exactly 20 rules', () => {
    expect(allDetectionRules.length).toBe(20);
  });

  it('should have unique rule IDs', () => {
    const ids = allDetectionRules.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have all required fields for each rule', () => {
    for (const rule of allDetectionRules) {
      expect(rule.id).toBeDefined();
      expect(rule.name).toBeDefined();
      expect(rule.category).toBeDefined();
      expect(rule.check).toBeDefined();
      expect(rule.priority).toBeDefined();
      expect(['critical', 'high', 'medium', 'low']).toContain(rule.priority);
    }
  });

  it('should have correct rule ID prefixes', () => {
    const expectedPrefixes = [
      'WFH-001', 'VEH-001', 'DIV-001', 'EDU-001', 'DEP-001', 'UTIL-001', 'TIME-001', 'DON-001',
      'TRAV-001', 'PROF-001', 'YOY-001', 'UNI-001', 'BENCH-001', 'MEAL-001', 'PROP-001',
      'WFH-002', 'PATT-001', 'INS-001', 'CRYPTO-001', 'TOOLS-001'
    ];
    
    const actualIds = allDetectionRules.map(r => r.id);
    for (const prefix of expectedPrefixes) {
      expect(actualIds).toContain(prefix);
    }
  });
});
