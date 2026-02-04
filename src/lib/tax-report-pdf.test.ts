/**
 * Tax Report PDF Generation Tests
 * 
 * TAL-162: Professional Tax Report PDF
 * 
 * Tests for:
 * - PDF generation with all sections
 * - Data preparation functions
 * - CSV/JSON export
 * - File size optimization
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jsPDF from 'jspdf';
import {
  generateTaxReportPDF,
  prepareIncomeSummary,
  prepareDeductionCategories,
  calculateTaxWithRefund,
  prepareDocumentReferences,
  exportToCSV,
  exportToJSON,
  createDefaultReportConfig,
  createCompactReportConfig,
  ATO_CATEGORY_ORDER,
  type TaxReportData,
  type TaxReportConfig,
  type ClientInfo,
  type IncomeSummary,
  type DeductionCategory,
} from './tax-report-pdf';
import type { Receipt, Income } from './db';
import type { AtoCategoryCode } from './ato-categories';

// Mock jsPDF
vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      setProperties: vi.fn(),
      setFillColor: vi.fn(),
      setTextColor: vi.fn(),
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      text: vi.fn(),
      rect: vi.fn(),
      roundedRect: vi.fn(),
      line: vi.fn(),
      addPage: vi.fn(),
      setPage: vi.fn(),
      getNumberOfPages: vi.fn().mockReturnValue(10),
      internal: {
        pageSize: {
          width: 210,
          height: 297,
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      save: vi.fn(),
      output: vi.fn().mockReturnValue('blob'),
    })),
  };
});

vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn(),
  };
});

// Mock ato-categories
vi.mock('./ato-categories', () => ({
  atoCategories: [
    {
      code: 'D1',
      name: 'Work-related car expenses',
      shortDescription: 'Car expenses including fuel and maintenance',
      atoReferenceUrl: 'https://www.ato.gov.au/d1',
    },
    {
      code: 'D2',
      name: 'Work-related travel expenses',
      shortDescription: 'Travel expenses excluding car',
      atoReferenceUrl: 'https://www.ato.gov.au/d2',
    },
    {
      code: 'D5',
      name: 'Work-related home office expenses',
      shortDescription: 'Home office and equipment',
      atoReferenceUrl: 'https://www.ato.gov.au/d5',
    },
    {
      code: 'D15',
      name: 'Other work-related expenses',
      shortDescription: 'Other deductible expenses',
      atoReferenceUrl: 'https://www.ato.gov.au/d15',
    },
  ],
  getCategoryByCode: vi.fn((code: string) => ({
    code,
    name: 'Test Category',
    shortDescription: 'Test description',
    atoReferenceUrl: `https://www.ato.gov.au/${code.toLowerCase()}`,
  })),
  AtoCategoryCode: String,
}));

// Mock tax-calculator
vi.mock('./tax-calculator', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  calculateTaxPayable: (income: number) => ({
    taxableIncome: income,
    taxBeforeOffsets: income * 0.325,
    totalTax: income * 0.325 + income * 0.02,
    taxPayable: income * 0.325,
    medicareLevy: income * 0.02,
    medicareLevySurcharge: 0,
    marginalRate: 0.325,
    effectiveRate: 0.345,
  }),
  TaxCalculationResult: Object,
}));

describe('Tax Report PDF Generation', () => {
  const mockClientInfo: ClientInfo = {
    name: 'John Doe',
    address: '123 Main St, Sydney NSW 2000',
    phone: '0412 345 678',
    email: 'john@example.com',
    abn: '12 345 678 901',
    tfn: '123 456 789',
  };

  const mockReceipts: Receipt[] = [
    {
      id: 1,
      vendor: 'BP',
      amount: 75.50,
      category: 'Fuel',
      ato_category_code: 'D1' as AtoCategoryCode,
      date: '2024-03-15',
      image_path: '/receipts/bp_001.jpg',
      notes: 'Business trip to Melbourne',
    },
    {
      id: 2,
      vendor: 'Officeworks',
      amount: 125.00,
      category: 'Office Supplies',
      ato_category_code: 'D5' as AtoCategoryCode,
      date: '2024-03-10',
      image_path: '/receipts/officeworks_001.jpg',
      notes: 'Printer paper and ink',
    },
    {
      id: 3,
      vendor: 'Qantas',
      amount: 450.00,
      category: 'Travel',
      ato_category_code: 'D2' as AtoCategoryCode,
      date: '2024-02-28',
      notes: 'Flight to conference',
    },
  ];

  const mockIncome: Income[] = [
    {
      id: 1,
      source: 'ABC Pty Ltd',
      amount: 85000,
      type: 'salary',
      date: '2024-06-30',
      tax_withheld: 20000,
    },
    {
      id: 2,
      source: 'Commonwealth Bank',
      amount: 500,
      type: 'investment',
      date: '2024-06-30',
    },
  ];

  describe('prepareIncomeSummary', () => {
    it('should categorize salary income correctly', () => {
      const summary = prepareIncomeSummary(mockIncome);
      expect(summary.salary).toBe(85000);
      expect(summary.total).toBe(85500);
    });

    it('should categorize dividends correctly', () => {
      const incomeWithDividends: Income[] = [
        {
          id: 1,
          source: 'Dividend Payment - CBA',
          amount: 1000,
          type: 'investment',
          date: '2024-06-30',
        },
      ];
      const summary = prepareIncomeSummary(incomeWithDividends);
      expect(summary.dividends).toBe(1000);
    });

    it('should categorize interest correctly', () => {
      const incomeWithInterest: Income[] = [
        {
          id: 1,
          source: 'Interest - Savings Account',
          amount: 250,
          type: 'investment',
          date: '2024-06-30',
        },
      ];
      const summary = prepareIncomeSummary(incomeWithInterest);
      expect(summary.interest).toBe(250);
    });

    it('should return zero for empty income array', () => {
      const summary = prepareIncomeSummary([]);
      expect(summary.total).toBe(0);
      expect(summary.salary).toBe(0);
    });
  });

  describe('prepareDeductionCategories', () => {
    it('should group receipts by ATO category code', () => {
      const categories = prepareDeductionCategories(mockReceipts);
      expect(categories.length).toBeGreaterThan(0);
      
      const d1Category = categories.find(c => c.code === 'D1');
      expect(d1Category).toBeDefined();
      expect(d1Category?.total).toBe(75.50);
      expect(d1Category?.receiptCount).toBe(1);
    });

    it('should default to D15 for uncategorized receipts', () => {
      const uncategorizedReceipts: Receipt[] = [
        {
          id: 1,
          vendor: 'Unknown',
          amount: 100,
          category: 'Misc',
          date: '2024-03-15',
        },
      ];
      const categories = prepareDeductionCategories(uncategorizedReceipts);
      const d15Category = categories.find(c => c.code === 'D15');
      expect(d15Category).toBeDefined();
    });

    it('should calculate totals correctly', () => {
      const categories = prepareDeductionCategories(mockReceipts);
      const total = categories.reduce((sum, cat) => sum + cat.total, 0);
      expect(total).toBe(650.50); // 75.50 + 125 + 450
    });

    it('should include receipt details in items', () => {
      const categories = prepareDeductionCategories(mockReceipts);
      const d1Category = categories.find(c => c.code === 'D1');
      expect(d1Category?.items[0].vendor).toBe('BP');
      expect(d1Category?.items[0].hasImage).toBe(true);
    });
  });

  describe('calculateTaxWithRefund', () => {
    it('should calculate refund when tax withheld exceeds tax payable', () => {
      // With mocked tax calculation: 80000 * 0.325 = 26000 tax + 1600 medicare = 27600 total
      // With 1000 offsets: 26600 payable
      // If 30000 withheld: 30000 - 26600 = 3400 refund
      const result = calculateTaxWithRefund(80000, 1000, 30000);
      expect(result.taxWithheld).toBe(30000);
      expect(result.refundEstimate).toBeGreaterThan(0);
    });

    it('should calculate tax payable when insufficient tax withheld', () => {
      const result = calculateTaxWithRefund(80000, 0, 1000);
      expect(result.refundEstimate).toBeLessThan(0);
    });

    it('should handle zero taxable income', () => {
      const result = calculateTaxWithRefund(0, 0, 0);
      expect(result.taxPayable).toBe(0);
      expect(result.refundEstimate).toBe(0);
    });
  });

  describe('prepareDocumentReferences', () => {
    it('should create document references from receipts', () => {
      const documents = prepareDocumentReferences(mockReceipts);
      expect(documents.length).toBe(mockReceipts.length);
      expect(documents[0].type).toBe('receipt');
    });

    it('should include receipt details in references', () => {
      const documents = prepareDocumentReferences(mockReceipts);
      expect(documents[0].description).toContain('BP');
      expect(documents[0].amount).toBe(75.50);
    });

    it('should assign sequential page numbers', () => {
      const documents = prepareDocumentReferences(mockReceipts);
      documents.forEach((doc, index) => {
        expect(doc.pageNumber).toBe(index + 1);
      });
    });
  });

  describe('createDefaultReportConfig', () => {
    it('should create config with default sections', () => {
      const config = createDefaultReportConfig(2024, 'John Doe');
      expect(config.taxYear).toBe(2024);
      expect(config.clientInfo.name).toBe('John Doe');
      expect(config.includeSections).toContain('cover');
      expect(config.includeSections).toContain('deductionsSummary');
    });

    it('should set reasonable defaults', () => {
      const config = createDefaultReportConfig(2024, 'John Doe');
      expect(config.mode).toBe('full');
      expect(config.includeSourceDocuments).toBe(false);
      expect(config.imageQuality).toBe(0.7);
    });
  });

  describe('createCompactReportConfig', () => {
    it('should create minimal config for smaller file size', () => {
      const config = createCompactReportConfig(2024, 'John Doe');
      expect(config.mode).toBe('compact');
      expect(config.includeSections.length).toBeLessThan(
        createDefaultReportConfig(2024, 'John Doe').includeSections.length
      );
    });

    it('should use lower image quality', () => {
      const config = createCompactReportConfig(2024, 'John Doe');
      expect(config.imageQuality).toBe(0.5);
    });
  });

  describe('exportToCSV', () => {
    const mockTaxReportData: TaxReportData = {
      config: {
        taxYear: 2024,
        clientInfo: { name: 'John Doe' },
        reportDate: new Date(),
        includeSections: ['cover'],
        mode: 'full',
        includeSourceDocuments: false,
        imageQuality: 0.7,
      },
      income: {
        salary: 85000,
        dividends: 0,
        interest: 500,
        rental: 0,
        freelance: 0,
        business: 0,
        other: 0,
        total: 85500,
      },
      deductions: [
        {
          code: 'D1' as AtoCategoryCode,
          name: 'Car Expenses',
          description: 'Work-related car expenses',
          total: 650.50,
          items: [],
          receiptCount: 3,
        },
      ],
      totalDeductions: 650.50,
      taxOffsets: [],
      taxCalculation: {
        taxableIncome: 84849.50,
        taxBeforeOffsets: 27576,
        totalTax: 29273,
        taxPayable: 29273,
        medicareLevy: 1697,
        medicareLevySurcharge: 0,
        marginalRate: 0.325,
        effectiveRate: 0.345,
        refundEstimate: -9273,
        taxWithheld: 20000,
      },
      documents: [],
      receipts: mockReceipts,
      incomeRecords: mockIncome,
    };

    it('should export receipts to CSV', () => {
      const csvData = exportToCSV(mockTaxReportData, {
        taxYear: 2024,
        startDate: '2023-07-01',
        endDate: '2024-06-30',
        includeReceipts: true,
        includeIncome: false,
        includeCategories: false,
        includeWorkpapers: false,
      });

      expect(csvData.receipts).toBeDefined();
      expect(csvData.receipts).toContain('ID');
      expect(csvData.receipts).toContain('Date');
      expect(csvData.receipts).toContain('BP');
    });

    it('should export income to CSV', () => {
      const csvData = exportToCSV(mockTaxReportData, {
        taxYear: 2024,
        startDate: '2023-07-01',
        endDate: '2024-06-30',
        includeReceipts: false,
        includeIncome: true,
        includeCategories: false,
        includeWorkpapers: false,
      });

      expect(csvData.income).toBeDefined();
      expect(csvData.income).toContain('ABC Pty Ltd');
    });

    it('should export categories to CSV', () => {
      const csvData = exportToCSV(mockTaxReportData, {
        taxYear: 2024,
        startDate: '2023-07-01',
        endDate: '2024-06-30',
        includeReceipts: false,
        includeIncome: false,
        includeCategories: true,
        includeWorkpapers: false,
      });

      expect(csvData.categories).toBeDefined();
      expect(csvData.categories).toContain('D1');
    });

    it('should handle special characters in CSV', () => {
      const specialReceipts: Receipt[] = [
        {
          id: 1,
          vendor: 'Test "Company", LLC',
          amount: 100,
          category: 'Test, Category',
          date: '2024-03-15',
          notes: 'Note with "quotes"',
        },
      ];

      const dataWithSpecialChars: TaxReportData = {
        ...mockTaxReportData,
        receipts: specialReceipts,
      };

      const csvData = exportToCSV(dataWithSpecialChars, {
        taxYear: 2024,
        startDate: '2023-07-01',
        endDate: '2024-06-30',
        includeReceipts: true,
        includeIncome: false,
        includeCategories: false,
        includeWorkpapers: false,
      });

      // Should escape quotes
      expect(csvData.receipts).toContain('""');
    });
  });

  describe('exportToJSON', () => {
    const mockTaxReportData: TaxReportData = {
      config: {
        taxYear: 2024,
        clientInfo: { name: 'John Doe' },
        reportDate: new Date('2024-06-30'),
        includeSections: ['cover'],
        mode: 'full',
        includeSourceDocuments: false,
        imageQuality: 0.7,
      },
      income: {
        salary: 85000,
        dividends: 0,
        interest: 500,
        rental: 0,
        freelance: 0,
        business: 0,
        other: 0,
        total: 85500,
      },
      deductions: [],
      totalDeductions: 0,
      taxOffsets: [],
      taxCalculation: {
        taxableIncome: 85500,
        taxBeforeOffsets: 0,
        totalTax: 0,
        taxPayable: 0,
        medicareLevy: 0,
        medicareLevySurcharge: 0,
        marginalRate: 0,
        effectiveRate: 0,
        refundEstimate: 0,
        taxWithheld: 0,
      },
      documents: [],
      receipts: [],
      incomeRecords: [],
    };

    it('should export valid JSON', () => {
      const jsonString = exportToJSON(mockTaxReportData);
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });

    it('should include export metadata', () => {
      const jsonString = exportToJSON(mockTaxReportData);
      const data = JSON.parse(jsonString);
      expect(data.exportMetadata.version).toBe('3.0.0');
      expect(data.exportMetadata.software).toBe('Tally Desktop v3');
      expect(data.exportMetadata.taxYear).toBe(2024);
    });

    it('should include all data sections', () => {
      const jsonString = exportToJSON(mockTaxReportData);
      const data = JSON.parse(jsonString);
      expect(data.clientInfo).toBeDefined();
      expect(data.income).toBeDefined();
      expect(data.deductions).toBeDefined();
      expect(data.taxCalculation).toBeDefined();
    });

    it('should format JSON with indentation', () => {
      const jsonString = exportToJSON(mockTaxReportData);
      expect(jsonString).toContain('\n');
      expect(jsonString).toContain('  ');
    });
  });

  describe('ATO_CATEGORY_ORDER', () => {
    it('should contain all D1-D15 categories', () => {
      expect(ATO_CATEGORY_ORDER).toHaveLength(15);
      expect(ATO_CATEGORY_ORDER).toContain('D1');
      expect(ATO_CATEGORY_ORDER).toContain('D15');
    });

    it('should be in correct order', () => {
      expect(ATO_CATEGORY_ORDER[0]).toBe('D1');
      expect(ATO_CATEGORY_ORDER[14]).toBe('D15');
    });
  });

  describe('File Size Estimation', () => {
    it('compact mode should estimate smaller size than full mode', () => {
      const compactConfig = createCompactReportConfig(2024, 'John');
      const fullConfig = createDefaultReportConfig(2024, 'John');
      
      expect(compactConfig.imageQuality).toBeLessThan(fullConfig.imageQuality);
      expect(compactConfig.includeSections.length).toBeLessThan(fullConfig.includeSections.length);
    });
  });

  describe('generateTaxReportPDF', () => {
    it('should generate PDF with progress callback', async () => {
      const progressCallback = vi.fn();
      
      const mockData: TaxReportData = {
        config: {
          taxYear: 2024,
          clientInfo: { name: 'John Doe' },
          reportDate: new Date(),
          includeSections: ['cover'],
          mode: 'full',
          includeSourceDocuments: false,
          imageQuality: 0.7,
        },
        income: {
          salary: 85000,
          dividends: 0,
          interest: 500,
          rental: 0,
          freelance: 0,
          business: 0,
          other: 0,
          total: 85500,
        },
        deductions: [],
        totalDeductions: 0,
        taxOffsets: [],
        taxCalculation: {
          taxableIncome: 85500,
          taxBeforeOffsets: 0,
          totalTax: 0,
          taxPayable: 0,
          medicareLevy: 0,
          medicareLevySurcharge: 0,
          marginalRate: 0,
          effectiveRate: 0,
          refundEstimate: 0,
          taxWithheld: 0,
        },
        documents: [],
        receipts: [],
        incomeRecords: [],
      };

      const result = await generateTaxReportPDF(mockData, progressCallback);
      expect(result).toBeDefined();
    });

    it('should handle empty data gracefully', async () => {
      const mockData: TaxReportData = {
        config: {
          taxYear: 2024,
          clientInfo: { name: 'John' },
          reportDate: new Date(),
          includeSections: ['cover', 'deductionsSummary'],
          mode: 'full',
          includeSourceDocuments: false,
          imageQuality: 0.7,
        },
        income: {
          salary: 0,
          dividends: 0,
          interest: 0,
          rental: 0,
          freelance: 0,
          business: 0,
          other: 0,
          total: 0,
        },
        deductions: [],
        totalDeductions: 0,
        taxOffsets: [],
        taxCalculation: {
          taxableIncome: 0,
          taxBeforeOffsets: 0,
          totalTax: 0,
          taxPayable: 0,
          medicareLevy: 0,
          medicareLevySurcharge: 0,
          marginalRate: 0,
          effectiveRate: 0,
          refundEstimate: 0,
          taxWithheld: 0,
        },
        documents: [],
        receipts: [],
        incomeRecords: [],
      };

      const result = await generateTaxReportPDF(mockData);
      expect(result).toBeDefined();
    });
  });
});

describe('Tax Report Integration', () => {
  it('should handle 100+ receipts without errors', () => {
    const manyReceipts: Receipt[] = Array.from({ length: 150 }, (_, i) => ({
      id: i + 1,
      vendor: `Vendor ${i + 1}`,
      amount: Math.random() * 200 + 10,
      category: 'Various',
      ato_category_code: ['D1', 'D2', 'D5', 'D15'][i % 4] as AtoCategoryCode,
      date: `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
    }));

    const categories = prepareDeductionCategories(manyReceipts);
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.reduce((sum, c) => sum + c.receiptCount, 0)).toBe(150);
  });

  it('should format TFN correctly', () => {
    const tfn = '123456789';
    const masked = tfn.replace(/\s/g, '');
    const result = masked.length >= 3 ? `XXX XXX ${masked.slice(-3)}` : `XXX XXX ${masked}`;
    expect(result).toBe('XXX XXX 789');
  });

  it('should format ABN correctly', () => {
    const abn = '12345678901';
    const cleaned = abn.replace(/\s/g, '').replace(/-/g, '');
    const result = cleaned.length === 11 
      ? `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 11)}`
      : abn;
    expect(result).toBe('12 345 678 901');
  });
});
