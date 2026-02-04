/**
 * Dividend PDF Parser Tests
 * 
 * Comprehensive test suite for the dividend statement parser.
 * Tests cover all major registry providers and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseDividendStatement,
  parseDividendStatements,
  formatDividend,
  exportToCSV,
  groupByFinancialYear,
  calculateTaxSummary,
  type ParsedDividend,
  type RegistryProvider,
} from './dividend-pdf-parser';

// ============================================================================
// SAMPLE DIVIDEND STATEMENTS
// ============================================================================

const COMPUTERSHARE_SAMPLE = `
COMPUTERSHARE INVESTOR SERVICES PTY LIMITED
Level 3, 60 Carrington Street, Sydney NSW 2000
ABN 48 078 279 277

DIVIDEND ADVICE

Company: COMMONWEALTH BANK OF AUSTRALIA
ASX Code: CBA
ABN: 48 123 123 124

Security Details:
Holder: John Smith
SRN: X0001234567
Shares Held: 500

Dividend Details:
Dividend per Share: $2.15
Franked Amount: $1075.00
Unfranked Amount: $0.00
Franking Credits: $461.36
Franking Percentage: 100%

Payment Details:
Payment Date: 15/03/2024
Record Date: 21/02/2024
Amount Payable: $1075.00

Direct Credit to: Account ending in 1234
`;

const LINK_MARKET_SERVICES_SAMPLE = `
Link Market Services Limited
Level 12, 680 George Street, Sydney NSW 2000

DIVIDEND STATEMENT

Issuer: BHP Group Limited
Security Code: BHP
ABN: 49 004 028 077

Holding Details:
Shareholder: Jane Doe
Number of Shares: 1,250

Distribution Details:
Gross Dividend: $2,875.00
Fully Franked: $2,875.00
Franking Credit: $1,232.14
Unfranked: $0.00

Payment Information:
Date Paid: 28/09/2024
Record Date: 07/09/2024
Payment Method: Direct Credit

Franking Percentage: 100%
`;

const BOARDROOM_SAMPLE = `
Boardroom Pty Limited
Level 12, 225 George Street, Sydney NSW 2000
ABN: 14 003 209 836

DIVIDEND PAYMENT ADVICE

Company Name: Telstra Corporation Limited
ASX: TLS
Australian Company Number: 051 775 556

Registered Holder: Robert Johnson
Holding: 2,000 shares

Dividend Information:
Dividend Amount: $340.00
Franked Dividend: $340.00
Unfranked Dividend: $0.00
Imputation Credits: $145.71

Payment Date: 31/08/2024
Entitlement Date: 24/08/2024
`;

const DIRECT_COMPANY_SAMPLE = `
Wesfarmers Limited
ABN 28 008 984 049

DIVIDEND STATEMENT

Shareholder: Mary Williams
Holding: 800 shares

Final Dividend 2024:
Dividend per Share: $1.03
Total Payment: $824.00
Fully Franked at 30%
Franking Credits: $353.14

Payment Date: 10/04/2024
Record Date: 28/02/2024
`;

const PARTIALLY_FRANKED_SAMPLE = `
COMPUTERSHARE

DIVIDEND ADVICE

Company: XYZ Resources Limited
ASX Code: XYZ

Shareholder: Test User
Shares Held: 1,000

Dividend Details:
Gross Dividend: $500.00
Franked Amount: $250.00
Unfranked Amount: $250.00
Franking Credits: $107.14
Franking Percentage: 50%

Payment Date: 15/06/2024
Record Date: 01/06/2024
`;

const UNFRANKED_SAMPLE = `
Link Market Services

DIVIDEND STATEMENT

Issuer: International Holdings Ltd
Code: IHL

Holder: Test Investor
Units: 5,000

Distribution:
Amount Payable: $750.00
Unfranked Dividend: $750.00
Franked Amount: $0.00
Franking Credits: $0.00

Payment Date: 20/07/2024
`;

const INCOMPLETE_SAMPLE = `
Some Company Limited

Dividend Advice

Shareholder: Unknown
Dividend Amount: $100.00
Payment Date: 15/03/2024
`;

// ============================================================================
// TESTS
// ============================================================================

describe('Dividend PDF Parser', () => {
  describe('Provider Detection', () => {
    it('should detect Computershare provider', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.success).toBe(true);
      expect(result.provider).toBe('computershare');
    });

    it('should detect Link Market Services provider', () => {
      const result = parseDividendStatement(LINK_MARKET_SERVICES_SAMPLE);
      expect(result.success).toBe(true);
      expect(result.provider).toBe('link');
    });

    it('should detect Boardroom provider', () => {
      const result = parseDividendStatement(BOARDROOM_SAMPLE);
      expect(result.success).toBe(true);
      expect(result.provider).toBe('boardroom');
    });

    it('should detect direct company statement', () => {
      const result = parseDividendStatement(DIRECT_COMPANY_SAMPLE);
      expect(result.success).toBe(true);
      expect(result.provider).toBe('direct');
    });
  });

  describe('Company Information Extraction', () => {
    it('should extract company name from Computershare statement', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.success).toBe(true);
      expect(result.dividend!.companyName).toBe('COMMONWEALTH BANK OF AUSTRALIA');
    });

    it('should extract ASX code', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.dividend!.asxCode).toBe('CBA');
    });

    it('should extract ABN when present', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.dividend!.companyAbn).toBe('48123123124');
    });

    it('should extract ACN when present', () => {
      const result = parseDividendStatement(BOARDROOM_SAMPLE);
      expect(result.dividend!.companyAcn).toBe('051775556');
    });
  });

  describe('Dividend Amount Extraction', () => {
    it('should extract gross dividend amount', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.dividend!.dividendAmount).toBe(1075.00);
    });

    it('should extract franked amount', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.dividend!.frankedAmount).toBe(1075.00);
    });

    it('should extract unfranked amount', () => {
      const result = parseDividendStatement(PARTIALLY_FRANKED_SAMPLE);
      expect(result.dividend!.unfrankedAmount).toBe(250.00);
    });

    it('should extract franking credits', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.dividend!.frankingCredits).toBe(461.36);
    });

    it('should handle unfranked dividends', () => {
      const result = parseDividendStatement(UNFRANKED_SAMPLE);
      expect(result.dividend!.dividendAmount).toBe(750.00);
      expect(result.dividend!.frankedAmount).toBe(0);
      expect(result.dividend!.unfrankedAmount).toBe(750.00);
      expect(result.dividend!.frankingCredits).toBe(0);
      expect(result.dividend!.frankingPercentage).toBe(0);
    });

    it('should handle partially franked dividends', () => {
      const result = parseDividendStatement(PARTIALLY_FRANKED_SAMPLE);
      expect(result.dividend!.frankedAmount).toBe(250.00);
      expect(result.dividend!.unfrankedAmount).toBe(250.00);
      expect(result.dividend!.frankingPercentage).toBe(50);
    });

    it('should calculate franking credits when not explicitly stated', () => {
      const sample = `
        Computershare
        Company: Test Ltd
        Dividend: $700.00
        Fully Franked: $700.00
        Payment Date: 15/03/2024
      `;
      const result = parseDividendStatement(sample);
      expect(result.dividend!.frankingCredits).toBe(300.00); // 700 * 30/70
      expect(result.warnings).toContain('Franking credits calculated from franked amount');
    });
  });

  describe('Share Details Extraction', () => {
    it('should extract shares held', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.dividend!.sharesHeld).toBe(500);
    });

    it('should handle shares with comma separators', () => {
      const result = parseDividendStatement(LINK_MARKET_SERVICES_SAMPLE);
      expect(result.dividend!.sharesHeld).toBe(1250);
    });

    it('should extract dividend per share', () => {
      const result = parseDividendStatement(DIRECT_COMPANY_SAMPLE);
      expect(result.dividend!.dividendPerShare).toBe(1.03);
    });

    it('should calculate gross dividend from DPS and shares', () => {
      const sample = `
        Computershare
        Company: Test Co
        Dividend per Share: $1.50
        Shares Held: 1000
        Payment Date: 15/03/2024
      `;
      const result = parseDividendStatement(sample);
      expect(result.dividend!.dividendAmount).toBe(1500.00);
      expect(result.dividend!.dividendPerShare).toBe(1.50);
      expect(result.warnings).toContain('Gross dividend calculated from DPS and shares held');
    });
  });

  describe('Date Extraction', () => {
    it('should extract payment date in DD/MM/YYYY format', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.dividend!.paymentDate).toBe('2024-03-15');
    });

    it('should extract record date', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.dividend!.recordDate).toBe('2024-02-21');
    });

    it('should use payment date as fallback for record date', () => {
      const sample = `
        Computershare
        Company: Test Co
        Dividend: $100.00
        Payment Date: 15/03/2024
      `;
      const result = parseDividendStatement(sample);
      expect(result.dividend!.recordDate).toBe('2024-03-15');
    });

    it('should calculate financial year correctly for pre-June dates', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE); // March 15
      expect(result.dividend!.financialYear).toBe('2023-2024');
    });

    it('should calculate financial year correctly for post-June dates', () => {
      const sample = `
        Computershare
        Company: Test Co
        Dividend: $100.00
        Payment Date: 15/09/2024
      `;
      const result = parseDividendStatement(sample);
      expect(result.dividend!.financialYear).toBe('2024-2025');
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign high confidence for complete data', () => {
      const result = parseDividendStatement(COMPUTERSHARE_SAMPLE);
      expect(result.dividend!.confidence).toBeGreaterThan(0.8);
    });

    it('should assign lower confidence for incomplete data', () => {
      const result = parseDividendStatement(INCOMPLETE_SAMPLE);
      // Should have lower confidence due to missing fields
      expect(result.dividend!.confidence).toBeLessThan(0.8);
    });
  });

  describe('Error Handling', () => {
    it('should fail gracefully when dividend amount is missing', () => {
      const sample = `
        Computershare
        Company: Test Co
        Payment Date: 15/03/2024
      `;
      const result = parseDividendStatement(sample);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Could not extract dividend amount');
    });

    it('should handle missing payment date with fallback', () => {
      const sample = `
        Computershare
        Company: Test Co
        Dividend: $100.00
      `;
      const result = parseDividendStatement(sample);
      // Now succeeds with fallback date
      expect(result.success).toBe(true);
      expect(result.dividend).toBeDefined();
      expect(result.warnings.some(w => w.includes('payment date'))).toBe(true);
    });

    it('should report warnings for ABN validation failures', () => {
      const sample = `
        Computershare
        Company: Test Co
        ABN: 12345678901
        Dividend: $100.00
        Payment Date: 15/03/2024
      `;
      const result = parseDividendStatement(sample);
      expect(result.warnings.some(w => w.includes('ABN'))).toBe(true);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple statements', () => {
      const statements = [
        COMPUTERSHARE_SAMPLE,
        LINK_MARKET_SERVICES_SAMPLE,
        BOARDROOM_SAMPLE,
      ];
      
      const result = parseDividendStatements(statements);
      
      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.dividends).toHaveLength(3);
    });

    it('should calculate totals correctly', () => {
      const statements = [COMPUTERSHARE_SAMPLE, UNFRANKED_SAMPLE];
      const result = parseDividendStatements(statements);
      
      expect(result.totalDividendAmount).toBe(1825.00); // 1075 + 750
      expect(result.totalFrankingCredits).toBe(461.36); // 461.36 + 0
    });

    it('should handle mixed success/failure', () => {
      const incompleteStatement = `
        Some Company
        Dividend Advice
        Shareholder: Unknown
        // Missing required fields
      `;
      const statements = [
        COMPUTERSHARE_SAMPLE,
        incompleteStatement, // Missing dividend amount
      ];
      
      const result = parseDividendStatements(statements);
      
      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('Utility Functions', () => {
    const mockDividend: ParsedDividend = {
      companyName: 'Test Company',
      asxCode: 'TST',
      dividendAmount: 1000.00,
      frankedAmount: 1000.00,
      unfrankedAmount: 0,
      frankingCredits: 428.57,
      frankingPercentage: 100,
      sharesHeld: 500,
      dividendPerShare: 2.00,
      paymentDate: '2024-03-15',
      recordDate: '2024-02-28',
      financialYear: '2023-2024',
      provider: 'computershare' as RegistryProvider,
      confidence: 0.95,
      rawText: 'test',
      extractionErrors: [],
    };

    describe('formatDividend', () => {
      it('should format dividend for display', () => {
        const formatted = formatDividend(mockDividend);
        expect(formatted).toContain('Test Company');
        expect(formatted).toContain('ASX: TST');
        expect(formatted).toContain('$1000.00');
        expect(formatted).toContain('100%');
        expect(formatted).toContain('$428.57');
      });
    });

    describe('exportToCSV', () => {
      it('should export to CSV format', () => {
        const csv = exportToCSV([mockDividend]);
        expect(csv).toContain('Company Name,ASX Code,Payment Date');
        expect(csv).toContain('Test Company,TST,2024-03-15');
        expect(csv).toContain('1000.00');
      });
    });

    describe('groupByFinancialYear', () => {
      it('should group dividends by financial year', () => {
        const dividends: ParsedDividend[] = [
          { ...mockDividend, financialYear: '2023-2024' },
          { ...mockDividend, financialYear: '2023-2024' },
          { ...mockDividend, financialYear: '2024-2025' },
        ];
        
        const grouped = groupByFinancialYear(dividends);
        
        expect(Object.keys(grouped)).toHaveLength(2);
        expect(grouped['2023-2024']).toHaveLength(2);
        expect(grouped['2024-2025']).toHaveLength(1);
      });
    });

    describe('calculateTaxSummary', () => {
      it('should calculate tax summary correctly', () => {
        const dividends: ParsedDividend[] = [
          { ...mockDividend, financialYear: '2023-2024', dividendAmount: 1000, frankingCredits: 428.57 },
          { ...mockDividend, financialYear: '2023-2024', dividendAmount: 500, frankingCredits: 214.29 },
        ];
        
        const summary = calculateTaxSummary(dividends);
        
        expect(summary).toHaveLength(1);
        expect(summary[0].totalDividend).toBe(1500);
        expect(summary[0].totalFrankingCredits).toBeCloseTo(642.86, 1);
        expect(summary[0].grossIncome).toBeCloseTo(2142.86, 1);
        expect(summary[0].count).toBe(2);
      });
    });
  });

  describe('Real-World Edge Cases', () => {
    it('should handle statements with different date formats', () => {
      const sample = `
        Computershare
        Company: Test Co
        Dividend: $100.00
        Payment Date: March 15, 2024
      `;
      const result = parseDividendStatement(sample);
      expect(result.dividend!.paymentDate).toBe('2024-03-15');
    });

    it('should handle statements with 2-digit years', () => {
      const sample = `
        Computershare
        Company: Test Co
        Dividend: $100.00
        Payment Date: 15/03/24
      `;
      const result = parseDividendStatement(sample);
      expect(result.dividend!.paymentDate).toBe('2024-03-15');
    });

    it('should handle large numbers with commas', () => {
      const sample = `
        Computershare
        Company: Test Co
        Dividend: $1,234,567.89
        Shares Held: 1,000,000
        Payment Date: 15/03/2024
      `;
      const result = parseDividendStatement(sample);
      expect(result.dividend!.dividendAmount).toBe(1234567.89);
      expect(result.dividend!.sharesHeld).toBe(1000000);
    });

    it('should handle cents-per-share in whole cents', () => {
      const sample = `
        Computershare
        Company: Test Co
        Dividend per Share: 215 cents
        Shares Held: 1000
        Payment Date: 15/03/2024
      `;
      const result = parseDividendStatement(sample);
      expect(result.dividend!.dividendPerShare).toBe(2.15);
      expect(result.dividend!.dividendAmount).toBe(2150);
    });
  });
});
