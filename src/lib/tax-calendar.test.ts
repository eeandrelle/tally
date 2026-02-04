/**
 * Tax Calendar Tests
 * 
 * Unit tests for the tax calendar engine functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  getCurrentFinancialYear,
  getFinancialYearDates,
  getQuarterForDate,
  getQuarterName,
  generateBASDeadline,
  generateBASDeadlinesForYear,
  generatePAYGDeadline,
  generateTaxReturnDeadline,
  generateAllDeadlinesForYear,
  calculateDeadlineStatus,
  getDaysUntilDeadline,
  getUpcomingDeadlines,
  formatDeadlineDate,
  formatRelativeDeadline,
  validateCustomDeadline,
  type TaxDeadline,
} from './tax-calendar';

describe('Financial Year Helpers', () => {
  it('should get current financial year for date in FY', () => {
    // July 1, 2024 should be FY 2024
    expect(getCurrentFinancialYear(new Date(2024, 6, 1))).toBe(2024);
    // June 30, 2024 should be FY 2023
    expect(getCurrentFinancialYear(new Date(2024, 5, 30))).toBe(2023);
  });

  it('should get financial year dates', () => {
    const dates = getFinancialYearDates(2024);
    expect(dates.startDate.getFullYear()).toBe(2024);
    expect(dates.startDate.getMonth()).toBe(6); // July (0-indexed)
    expect(dates.startDate.getDate()).toBe(1);
    expect(dates.endDate.getFullYear()).toBe(2025);
    expect(dates.endDate.getMonth()).toBe(5); // June (0-indexed)
    expect(dates.endDate.getDate()).toBe(30);
  });
});

describe('Quarter Helpers', () => {
  it('should get quarter for dates', () => {
    expect(getQuarterForDate(new Date(2024, 6, 15))).toBe(1); // July
    expect(getQuarterForDate(new Date(2024, 9, 15))).toBe(2); // October
    expect(getQuarterForDate(new Date(2024, 0, 15))).toBe(3); // January
    expect(getQuarterForDate(new Date(2024, 3, 15))).toBe(4); // April
  });

  it('should get quarter names', () => {
    expect(getQuarterName(1)).toBe('Jul-Sep');
    expect(getQuarterName(2)).toBe('Oct-Dec');
    expect(getQuarterName(3)).toBe('Jan-Mar');
    expect(getQuarterName(4)).toBe('Apr-Jun');
  });
});

describe('Deadline Generation', () => {
  it('should generate BAS deadline for Q1', () => {
    const deadline = generateBASDeadline(1, 2024);
    expect(deadline).not.toBeNull();
    expect(deadline?.type).toBe('BAS');
    expect(deadline?.quarter).toBe(1);
    expect(deadline?.title).toContain('Quarter 1');
    // Due October 28
    expect(deadline?.dueDate.getMonth()).toBe(9); // October
    expect(deadline?.dueDate.getDate()).toBe(28);
  });

  it('should generate BAS deadline for Q2 (handle leap year)', () => {
    const deadline2024 = generateBASDeadline(2, 2023); // FY 2023/24, due Feb 2024 (leap year)
    expect(deadline2024).not.toBeNull();
    expect(deadline2024?.dueDate.getMonth()).toBe(1); // February
    expect(deadline2024?.dueDate.getDate()).toBe(29); // Leap year
    
    const deadline2025 = generateBASDeadline(2, 2024); // FY 2024/25, due Feb 2025 (not leap)
    expect(deadline2025?.dueDate.getDate()).toBe(28);
  });

  it('should generate all BAS deadlines for a year', () => {
    const deadlines = generateBASDeadlinesForYear(2024);
    expect(deadlines).toHaveLength(4);
    expect(deadlines.every(d => d.type === 'BAS')).toBe(true);
  });

  it('should generate PAYG deadline', () => {
    const deadline = generatePAYGDeadline(2024);
    expect(deadline.type).toBe('PAYG');
    expect(deadline.dueDate.getMonth()).toBe(6); // July
    expect(deadline.dueDate.getDate()).toBe(14);
  });

  it('should generate tax return deadline', () => {
    const deadline = generateTaxReturnDeadline(2024);
    expect(deadline.type).toBe('TAX_RETURN');
    expect(deadline.dueDate.getMonth()).toBe(9); // October
    expect(deadline.dueDate.getDate()).toBe(31);
  });

  it('should generate all deadlines for a year', () => {
    const deadlines = generateAllDeadlinesForYear(2024);
    expect(deadlines).toHaveLength(6); // 4 BAS + PAYG + Tax Return
    
    const types = deadlines.map(d => d.type);
    expect(types.filter(t => t === 'BAS')).toHaveLength(4);
    expect(types.filter(t => t === 'PAYG')).toHaveLength(1);
    expect(types.filter(t => t === 'TAX_RETURN')).toHaveLength(1);
  });
});

describe('Status Calculations', () => {
  it('should calculate overdue status', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    
    const status = calculateDeadlineStatus(pastDate);
    expect(status).toBe('overdue');
  });

  it('should calculate due soon status', () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 3);
    
    const status = calculateDeadlineStatus(soonDate);
    expect(status).toBe('due_soon');
  });

  it('should calculate upcoming status', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const status = calculateDeadlineStatus(futureDate);
    expect(status).toBe('upcoming');
  });

  it('should return completed status', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const completedDate = new Date();
    
    const status = calculateDeadlineStatus(pastDate, completedDate);
    expect(status).toBe('completed');
  });
});

describe('Days Until Calculation', () => {
  it('should calculate days until deadline', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    futureDate.setHours(0, 0, 0, 0);
    
    const days = getDaysUntilDeadline(futureDate);
    expect(days).toBe(7);
  });

  it('should calculate negative days for overdue', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    pastDate.setHours(0, 0, 0, 0);
    
    const days = getDaysUntilDeadline(pastDate);
    expect(days).toBe(-5);
  });
});

describe('Upcoming Deadlines', () => {
  it('should get upcoming deadlines sorted by urgency', () => {
    const deadlines: TaxDeadline[] = [
      {
        id: '1',
        type: 'BAS',
        title: 'BAS Q1',
        description: '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        financialYear: 2024,
        status: 'upcoming',
        remindersSent: [],
      },
      {
        id: '2',
        type: 'TAX_RETURN',
        title: 'Tax Return',
        description: '',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        financialYear: 2024,
        status: 'due_soon',
        remindersSent: [],
      },
      {
        id: '3',
        type: 'PAYG',
        title: 'PAYG',
        description: '',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        financialYear: 2024,
        status: 'overdue',
        remindersSent: [],
      },
    ];
    
    const upcoming = getUpcomingDeadlines(deadlines, 10);
    expect(upcoming).toHaveLength(3);
    expect(upcoming[0].urgency).toBe('critical'); // Overdue first
    expect(upcoming[1].urgency).toBe('critical'); // Due in 2 days
  });
});

describe('Formatting', () => {
  it('should format deadline date', () => {
    const date = new Date(2024, 6, 15);
    const formatted = formatDeadlineDate(date);
    expect(formatted).toContain('15');
    expect(formatted).toContain('Jul');
    expect(formatted).toContain('2024');
  });

  it('should format relative deadline', () => {
    expect(formatRelativeDeadline(0, false)).toBe('Due today');
    expect(formatRelativeDeadline(1, false)).toBe('Due tomorrow');
    expect(formatRelativeDeadline(5, false)).toBe('Due in 5 days');
    expect(formatRelativeDeadline(1, true)).toBe('1 day overdue');
    expect(formatRelativeDeadline(3, true)).toBe('3 days overdue');
  });
});

describe('Validation', () => {
  it('should validate custom deadline', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const result = validateCustomDeadline('Test Deadline', futureDate, 2024);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty title', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const result = validateCustomDeadline('', futureDate, 2024);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('should reject invalid financial year', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const result = validateCustomDeadline('Test', futureDate, 1990);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Financial year must be between 2000 and 2100');
  });
});
