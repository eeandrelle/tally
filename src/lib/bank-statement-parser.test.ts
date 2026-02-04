/**
 * Bank Statement Parser Tests
 * Comprehensive test suite for bank statement parsing
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  parseDate,
  parseAmount,
  detectTransactionType,
  cleanDescription,
  extractAccountNumber,
  extractStatementPeriod,
  extractBalances,
  parseBankStatement,
  validateStatement,
  calculateStatementStats,
} from './bank-statement-parser';
import { bankConfigs, detectBankFromText } from './bank-parser-configs';
import type { BankName, ParsedStatement } from './bank-statement-types';

describe('Bank Statement Parser', () => {
  describe('parseDate', () => {
    it('should parse DD/MM/YYYY format', () => {
      const result = parseDate('15/01/2024', 'commbank');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(15);
    });

    it('should parse DD/MM/YY format', () => {
      const result = parseDate('15/01/24', 'commbank');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse DD MMM YYYY format', () => {
      const result = parseDate('15 Jan 2024', 'commbank');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('should parse DD MMM format (current year)', () => {
      const result = parseDate('15 Jan', 'commbank');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(new Date().getFullYear());
    });

    it('should parse YYYY-MM-DD format', () => {
      const result = parseDate('2024-01-15', 'commbank');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('should return null for invalid date', () => {
      const result = parseDate('invalid', 'commbank');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseDate('', 'commbank');
      expect(result).toBeNull();
    });
  });

  describe('parseAmount', () => {
    it('should parse positive amount', () => {
      expect(parseAmount('123.45')).toBe(123.45);
    });

    it('should parse negative amount', () => {
      expect(parseAmount('-123.45')).toBe(-123.45);
    });

    it('should parse amount with dollar sign', () => {
      expect(parseAmount('$123.45')).toBe(123.45);
    });

    it('should parse amount with commas', () => {
      expect(parseAmount('1,234.56')).toBe(1234.56);
    });

    it('should parse amount with CR suffix (credit)', () => {
      expect(parseAmount('123.45 CR')).toBe(123.45);
    });

    it('should parse amount with DR suffix (debit)', () => {
      expect(parseAmount('123.45 DR')).toBe(-123.45);
    });

    it('should parse amount in parentheses (negative)', () => {
      expect(parseAmount('(123.45)')).toBe(-123.45);
    });

    it('should return null for invalid amount', () => {
      expect(parseAmount('invalid')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseAmount('')).toBeNull();
    });
  });

  describe('detectTransactionType', () => {
    it('should detect fee', () => {
      expect(detectTransactionType('Account service fee')).toBe('fee');
      expect(detectTransactionType('Transaction fee')).toBe('fee');
    });

    it('should detect interest', () => {
      expect(detectTransactionType('Credit interest')).toBe('interest');
      expect(detectTransactionType('Interest paid')).toBe('interest');
    });

    it('should detect transfer', () => {
      expect(detectTransactionType('Transfer to savings')).toBe('transfer');
      expect(detectTransactionType('TFR between accounts')).toBe('transfer');
    });

    it('should detect direct debit', () => {
      expect(detectTransactionType('Direct debit')).toBe('direct_debit');
      expect(detectTransactionType('Autopay')).toBe('direct_debit');
    });

    it('should detect direct credit', () => {
      expect(detectTransactionType('Direct credit')).toBe('direct_credit');
      expect(detectTransactionType('Salary deposit')).toBe('direct_credit');
    });

    it('should detect ATM', () => {
      expect(detectTransactionType('ATM withdrawal')).toBe('atm');
      expect(detectTransactionType('Cash out')).toBe('atm');
    });

    it('should detect card purchase', () => {
      expect(detectTransactionType('Card purchase')).toBe('card_purchase');
      expect(detectTransactionType('Paywave payment')).toBe('card_purchase');
    });

    it('should detect payment', () => {
      expect(detectTransactionType('BPAY payment')).toBe('payment');
      expect(detectTransactionType('Bill payment')).toBe('payment');
    });

    it('should return unknown for unrecognized description', () => {
      expect(detectTransactionType('Random text')).toBe('unknown');
    });
  });

  describe('cleanDescription', () => {
    it('should normalize whitespace', () => {
      expect(cleanDescription('Multiple   spaces')).toBe('Multiple spaces');
    });

    it('should keep proper nouns in all caps', () => {
      expect(cleanDescription('WOOLWORTHS STORE')).toBe('WOOLWORTHS STORE');
    });

    it('should remove card ending numbers', () => {
      expect(cleanDescription('Purchase 1234 ')).toBe('Purchase');
    });

    it('should trim whitespace', () => {
      expect(cleanDescription('  Description  ')).toBe('Description');
    });
  });

  describe('extractAccountNumber', () => {
    it('should extract CommBank account number', () => {
      const text = 'Account number: 1234 5678 9012 3456';
      expect(extractAccountNumber(text, 'commbank')).toBe('1234567890123456');
    });

    it('should extract NAB account number', () => {
      const text = 'Account number: 123456789';
      expect(extractAccountNumber(text, 'nab')).toBe('123456789');
    });

    it('should return undefined when not found', () => {
      expect(extractAccountNumber('No account here', 'commbank')).toBeUndefined();
    });
  });

  describe('extractStatementPeriod', () => {
    it('should extract period with DD/MM/YYYY format', () => {
      const text = 'Statement period: 01/01/2024 to 31/01/2024';
      const result = extractStatementPeriod(text, 'commbank');
      expect(result).not.toBeNull();
      expect(result?.start).toBe('2024-01-01');
      expect(result?.end).toBe('2024-01-31');
    });

    it('should extract period with DD MMM YYYY format', () => {
      const text = 'Statement period: 01 Jan 2024 to 31 Jan 2024';
      const result = extractStatementPeriod(text, 'commbank');
      expect(result).not.toBeNull();
      expect(result?.start).toBe('2024-01-01');
      expect(result?.end).toBe('2024-01-31');
    });

    it('should return null when not found', () => {
      expect(extractStatementPeriod('No period here', 'commbank')).toBeNull();
    });
  });

  describe('extractBalances', () => {
    it('should extract opening balance', () => {
      const text = 'Opening balance: 1,234.56';
      const result = extractBalances(text);
      expect(result.opening).toBe(1234.56);
    });

    it('should extract closing balance', () => {
      const text = 'Closing balance: 2,345.67';
      const result = extractBalances(text);
      expect(result.closing).toBe(2345.67);
    });

    it('should extract both balances', () => {
      const text = 'Opening balance: 1,000.00\nClosing balance: 2,000.00';
      const result = extractBalances(text);
      expect(result.opening).toBe(1000);
      expect(result.closing).toBe(2000);
    });

    it('should handle negative balances', () => {
      const text = 'Opening balance: -500.00';
      const result = extractBalances(text);
      expect(result.opening).toBe(-500);
    });
  });

  describe('detectBankFromText', () => {
    it('should detect CommBank', () => {
      expect(detectBankFromText('Commonwealth Bank of Australia')).toBe('commbank');
      expect(detectBankFromText('commbank')).toBe('commbank');
    });

    it('should detect NAB', () => {
      expect(detectBankFromText('National Australia Bank')).toBe('nab');
      expect(detectBankFromText('NAB')).toBe('nab');
    });

    it('should detect Westpac', () => {
      expect(detectBankFromText('Westpac')).toBe('westpac');
    });

    it('should detect ANZ', () => {
      expect(detectBankFromText('ANZ')).toBe('anz');
      expect(detectBankFromText('Australia and New Zealand Banking')).toBe('anz');
    });

    it('should detect ING', () => {
      expect(detectBankFromText('ING Bank')).toBe('ing');
    });

    it('should return null for unknown bank', () => {
      expect(detectBankFromText('Unknown Bank')).toBeNull();
    });
  });

  describe('parseBankStatement', () => {
    it('should parse CommBank statement', () => {
      const text = `
        COMMONWEALTH BANK OF AUSTRALIA
        Account number: 1234 5678 9012 3456
        Statement period: 1 Jan 2024 to 31 Jan 2024
        
        15 Jan 2024 WOOLWORTHS STORE -45.67 1,234.56
        20 Jan 2024 SALARY DEPOSIT 2,500.00 3,734.56
        25 Jan 2024 ACCOUNT FEE -5.00 3,729.56
        
        Closing balance: 3,729.56
      `;
      
      const result = parseBankStatement(text, 'test.pdf');
      
      expect(result.success).toBe(true);
      expect(result.statement).toBeDefined();
      expect(result.statement?.bankName).toBe('commbank');
      expect(result.statement?.accountNumber).toBe('1234567890123456');
      expect(result.statement?.transactions).toHaveLength(3);
      expect(result.stats.transactionsParsed).toBe(3);
    });

    it('should parse NAB statement', () => {
      const text = `
        National Australia Bank
        Account number: 123456789
        Statement period: 01/01/2024 to 31/01/2024
        
        Date Description Debit Credit Balance
        15/01/2024 COLES SUPERMARKET 56.78 1,234.56
        20/01/2024 SALARY 2,500.00 3,734.56
        25/01/2024 ACCOUNT FEE 5.00 3,729.56
      `;
      
      const result = parseBankStatement(text, 'test.pdf', 'nab');
      
      expect(result.success).toBe(true);
      expect(result.statement?.bankName).toBe('nab');
    });

    it('should detect transaction types correctly', () => {
      const text = `
        COMMONWEALTH BANK OF AUSTRALIA
        Statement period: 1 Jan 2024 to 31 Jan 2024
        
        15 Jan 2024 WOOLWORTHS STORE -45.67 1,234.56
        20 Jan 2024 SALARY PAYMENT 2,500.00 3,734.56
        25 Jan 2024 ACCOUNT FEE -5.00 3,729.56
        28 Jan 2024 TRANSFER TO SAVINGS -500.00 3,229.56
      `;
      
      const result = parseBankStatement(text, 'test.pdf');
      
      expect(result.success).toBe(true);
      const types = result.statement?.transactions.map(t => t.transactionType);
      expect(types).toContain('card_purchase');
      expect(types).toContain('direct_credit');
      expect(types).toContain('fee');
      expect(types).toContain('transfer');
    });

    it('should handle empty statement', () => {
      const text = 'Commonwealth Bank of Australia\nStatement period: 1 Jan 2024 to 31 Jan 2024';
      const result = parseBankStatement(text, 'empty.pdf');
      
      expect(result.success).toBe(true);
      expect(result.statement?.transactions).toHaveLength(0);
    });

    it('should fail for undetectable bank', () => {
      const text = 'Some random text without bank name';
      const result = parseBankStatement(text, 'unknown.pdf');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BANK_DETECTION_FAILED');
    });

    it('should detect duplicate transactions', () => {
      const text = `
        Commonwealth Bank
        Statement period: 1 Jan 2024 to 31 Jan 2024
        
        15 Jan 2024 WOOLWORTHS -45.67 1,234.56
        15 Jan 2024 WOOLWORTHS -45.67 1,188.89
        20 Jan 2024 SALARY 2,500.00 3,688.89
      `;
      
      const result = parseBankStatement(text, 'test.pdf');
      
      expect(result.success).toBe(true);
      const duplicates = result.statement?.transactions.filter(t => t.isDuplicate);
      expect(duplicates?.length).toBeGreaterThan(0);
    });
  });

  describe('validateStatement', () => {
    it('should validate correct statement', () => {
      const statement: ParsedStatement = {
        bankName: 'commbank',
        accountNumber: '1234',
        statementPeriodStart: '2024-01-01',
        statementPeriodEnd: '2024-01-31',
        transactions: [
          {
            date: '2024-01-15',
            description: 'Test',
            rawDescription: 'Test',
            amount: 100,
            transactionType: 'deposit',
          },
        ],
        currency: 'AUD',
        pageCount: 1,
        filename: 'test.pdf',
        parsedAt: new Date().toISOString(),
      };
      
      const validation = validateStatement(statement);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation for missing bank name', () => {
      const statement = {
        bankName: '' as BankName,
        statementPeriodStart: '2024-01-01',
        statementPeriodEnd: '2024-01-31',
        transactions: [],
        currency: 'AUD',
        pageCount: 1,
        filename: 'test.pdf',
        parsedAt: new Date().toISOString(),
      };
      
      const validation = validateStatement(statement as ParsedStatement);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Bank name is required');
    });

    it('should fail validation for no transactions', () => {
      const statement: ParsedStatement = {
        bankName: 'commbank',
        statementPeriodStart: '2024-01-01',
        statementPeriodEnd: '2024-01-31',
        transactions: [],
        currency: 'AUD',
        pageCount: 1,
        filename: 'test.pdf',
        parsedAt: new Date().toISOString(),
      };
      
      const validation = validateStatement(statement);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No transactions found in statement');
    });

    it('should detect transaction outside period', () => {
      const statement: ParsedStatement = {
        bankName: 'commbank',
        statementPeriodStart: '2024-01-01',
        statementPeriodEnd: '2024-01-31',
        transactions: [
          {
            date: '2024-02-15',
            description: 'Test',
            rawDescription: 'Test',
            amount: 100,
            transactionType: 'deposit',
          },
        ],
        currency: 'AUD',
        pageCount: 1,
        filename: 'test.pdf',
        parsedAt: new Date().toISOString(),
      };
      
      const validation = validateStatement(statement);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('outside statement period'))).toBe(true);
    });
  });

  describe('calculateStatementStats', () => {
    it('should calculate correct totals', () => {
      const statement: ParsedStatement = {
        bankName: 'commbank',
        statementPeriodStart: '2024-01-01',
        statementPeriodEnd: '2024-01-31',
        transactions: [
          { date: '2024-01-15', description: 'Deposit', rawDescription: 'Deposit', amount: 1000, transactionType: 'deposit' },
          { date: '2024-01-16', description: 'Purchase', rawDescription: 'Purchase', amount: -50, transactionType: 'card_purchase' },
          { date: '2024-01-17', description: 'Fee', rawDescription: 'Fee', amount: -5, transactionType: 'fee' },
        ],
        currency: 'AUD',
        pageCount: 1,
        filename: 'test.pdf',
        parsedAt: new Date().toISOString(),
      };
      
      const stats = calculateStatementStats(statement);
      
      expect(stats.transactionCount).toBe(3);
      expect(stats.totalCredits).toBe(1000);
      expect(stats.totalDebits).toBe(55);
      expect(stats.netChange).toBe(945);
    });

    it('should handle empty transactions', () => {
      const statement: ParsedStatement = {
        bankName: 'commbank',
        statementPeriodStart: '2024-01-01',
        statementPeriodEnd: '2024-01-31',
        transactions: [],
        currency: 'AUD',
        pageCount: 1,
        filename: 'test.pdf',
        parsedAt: new Date().toISOString(),
      };
      
      const stats = calculateStatementStats(statement);
      
      expect(stats.transactionCount).toBe(0);
      expect(stats.totalCredits).toBe(0);
      expect(stats.totalDebits).toBe(0);
      expect(stats.averageTransactionAmount).toBe(0);
    });

    it('should count duplicates', () => {
      const statement: ParsedStatement = {
        bankName: 'commbank',
        statementPeriodStart: '2024-01-01',
        statementPeriodEnd: '2024-01-31',
        transactions: [
          { date: '2024-01-15', description: 'Test', rawDescription: 'Test', amount: 100, transactionType: 'deposit' },
          { date: '2024-01-15', description: 'Test', rawDescription: 'Test', amount: 100, transactionType: 'deposit', isDuplicate: true },
        ],
        currency: 'AUD',
        pageCount: 1,
        filename: 'test.pdf',
        parsedAt: new Date().toISOString(),
      };
      
      const stats = calculateStatementStats(statement);
      
      expect(stats.duplicates).toBe(1);
    });
  });

  describe('Bank-specific parsers', () => {
    it('should parse Westpac format', () => {
      const text = `
        Westpac Banking Corporation
        Account number: 123-456789
        Statement period: 01/01/2024 to 31/01/2024
        
        Date Transaction Details Debits Credits Balance
        15/01/2024 COLES -56.78 1,234.56
        20/01/2024 SALARY 2,500.00 3,734.56
      `;
      
      const result = parseBankStatement(text, 'test.pdf', 'westpac');
      expect(result.success).toBe(true);
      expect(result.statement?.bankName).toBe('westpac');
    });

    it('should parse ANZ format', () => {
      const text = `
        Australia and New Zealand Banking Group
        Account number: 1234 5678 9012 3456
        Statement period: 01/01/2024 to 31/01/2024
        
        Date Details Withdrawals Deposits Balance
        15/01/2024 COLES 56.78 1,234.56
        20/01/2024 SALARY 2,500.00 3,734.56
      `;
      
      const result = parseBankStatement(text, 'test.pdf', 'anz');
      expect(result.success).toBe(true);
      expect(result.statement?.bankName).toBe('anz');
    });

    it('should parse ING format', () => {
      const text = `
        ING Bank
        Account number: 1234 5678 9012 3456
        Statement period: 01/01/2024 to 31/01/2024
        
        Date Description Money in Money out Balance
        15/01/2024 COLES 56.78 1,234.56
        20/01/2024 SALARY 2,500.00 3,734.56
      `;
      
      const result = parseBankStatement(text, 'test.pdf', 'ing');
      expect(result.success).toBe(true);
      expect(result.statement?.bankName).toBe('ing');
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed dates gracefully', () => {
      const text = `
        Commonwealth Bank
        Statement period: 1 Jan 2024 to 31 Jan 2024
        
        32/13/2024 INVALID DATE -45.67 1,234.56
        15/01/2024 VALID DATE -50.00 1,184.56
      `;
      
      const result = parseBankStatement(text, 'test.pdf');
      expect(result.success).toBe(true);
      // Should still parse the valid transaction
      expect(result.statement?.transactions.length).toBeGreaterThan(0);
    });

    it('should handle very large amounts', () => {
      const text = `
        Commonwealth Bank
        Statement period: 1 Jan 2024 to 31 Jan 2024
        
        15/01/2024 LARGE DEPOSIT 1,000,000.00 1,000,123.45
      `;
      
      const result = parseBankStatement(text, 'test.pdf');
      expect(result.success).toBe(true);
      expect(result.statement?.transactions[0]?.amount).toBe(1000000);
    });

    it('should handle statements with no identifiable transactions', () => {
      const text = `
        Commonwealth Bank of Australia
        Statement period: 1 Jan 2024 to 31 Jan 2024
        
        This is just a header
        And some footer text
      `;
      
      const result = parseBankStatement(text, 'empty.pdf');
      expect(result.success).toBe(true);
      expect(result.statement?.transactions).toHaveLength(0);
    });

    it('should handle multi-line descriptions', () => {
      const text = `
        Commonwealth Bank
        Statement period: 1 Jan 2024 to 31 Jan 2024
        
        15/01/2024 WOOLWORTHS SUPERMARKET -123.45 1,234.56
        20/01/2024 SALARY FROM EMPLOYER PTY LTD 2,500.00 3,734.56
      `;
      
      const result = parseBankStatement(text, 'test.pdf');
      expect(result.success).toBe(true);
      expect(result.statement?.transactions).toHaveLength(2);
    });
  });
});
