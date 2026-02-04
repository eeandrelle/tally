/**
 * Bank Statement Hooks Tests
 * Simple validation tests for hooks exports
 */

import { describe, it, expect } from 'vitest';

// Simple import tests to ensure hooks are properly exported
describe('Bank Statement Hooks Exports', () => {
  it('should export useBankStatementParser', async () => {
    const { useBankStatementParser } = await import('../hooks/useBankStatementParser');
    expect(useBankStatementParser).toBeDefined();
    expect(typeof useBankStatementParser).toBe('function');
  });

  it('should export useStatementUpload', async () => {
    const { useStatementUpload } = await import('../hooks/useStatementUpload');
    expect(useStatementUpload).toBeDefined();
    expect(typeof useStatementUpload).toBe('function');
  });

  it('should export useStatementTransactions', async () => {
    const { useStatementTransactions } = await import('../hooks/useStatementTransactions');
    expect(useStatementTransactions).toBeDefined();
    expect(typeof useStatementTransactions).toBe('function');
  });
});

describe('Bank Statement Components Exports', () => {
  it('should export BankSelector', async () => {
    const { BankSelector } = await import('../components/bank-statements/BankSelector');
    expect(BankSelector).toBeDefined();
    expect(typeof BankSelector).toBe('function');
  });

  it('should export BankStatementUpload', async () => {
    const { BankStatementUpload } = await import('../components/bank-statements/BankStatementUpload');
    expect(BankStatementUpload).toBeDefined();
    expect(typeof BankStatementUpload).toBe('function');
  });

  it('should export StatementParserProgress', async () => {
    const { StatementParserProgress } = await import('../components/bank-statements/StatementParserProgress');
    expect(StatementParserProgress).toBeDefined();
    expect(typeof StatementParserProgress).toBe('function');
  });

  it('should export StatementSummary', async () => {
    const { StatementSummary } = await import('../components/bank-statements/StatementSummary');
    expect(StatementSummary).toBeDefined();
    expect(typeof StatementSummary).toBe('function');
  });

  it('should export StatementTransactionList', async () => {
    const { StatementTransactionList } = await import('../components/bank-statements/StatementTransactionList');
    expect(StatementTransactionList).toBeDefined();
    expect(typeof StatementTransactionList).toBe('function');
  });
});

describe('Bank Statement Library Exports', () => {
  it('should export parser functions', async () => {
    const parser = await import('../lib/bank-statement-parser');
    expect(parser.parseBankStatement).toBeDefined();
    expect(parser.parseDate).toBeDefined();
    expect(parser.parseAmount).toBeDefined();
    expect(parser.detectTransactionType).toBeDefined();
  });

  it('should export PDF parser functions', async () => {
    const pdfParser = await import('../lib/bank-pdf-parser');
    expect(pdfParser.parsePDFBankStatement).toBeDefined();
    expect(pdfParser.detectBankFromPDF).toBeDefined();
    expect(pdfParser.validatePDFBankStatement).toBeDefined();
  });

  it('should export database functions', async () => {
    const db = await import('../lib/db-bank-statements');
    expect(db.createBankStatement).toBeDefined();
    expect(db.getBankStatementById).toBeDefined();
    expect(db.createStatementTransaction).toBeDefined();
  });

  it('should export config functions', async () => {
    const configs = await import('../lib/bank-parser-configs');
    expect(configs.getSupportedBanks).toBeDefined();
    expect(configs.detectBankFromText).toBeDefined();
    expect(configs.getBankConfig).toBeDefined();
  });
});
