/**
 * Tax Offset Database Integration
 * 
 * SQLite integration for storing and retrieving tax offset calculations
 */

import Database from 'better-sqlite3';
import type { TaxOffsetRecord, TaxOffsetSummary, CalculateTaxOffsetsInput } from './tax-offsets';
import { calculateAllTaxOffsets, TAX_OFFSET_SCHEMA, getFinancialYear } from './tax-offsets';

let db: Database.Database | null = null;

export function initializeTaxOffsetDatabase(databasePath?: string): Database.Database {
  if (db) return db;
  
  const path = databasePath || './tally.db';
  db = new Database(path);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  
  // Create tables
  db.exec(TAX_OFFSET_SCHEMA);
  
  // Create franking credits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS franking_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tax_year TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      dividend_amount REAL NOT NULL,
      franked_amount REAL NOT NULL,
      franking_credit REAL NOT NULL,
      franking_percentage REAL NOT NULL,
      payment_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_franking_year ON franking_credits(tax_year);
    CREATE INDEX IF NOT EXISTS idx_franking_profile ON franking_credits(profile_id);
  `);
  
  // Create tax profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT UNIQUE NOT NULL,
      tax_year TEXT NOT NULL,
      taxable_income REAL NOT NULL,
      age INTEGER NOT NULL,
      is_resident INTEGER DEFAULT 1,
      has_private_health_insurance INTEGER DEFAULT 0,
      private_health_cover_type TEXT,
      private_health_tier TEXT,
      is_senior_or_pensioner INTEGER DEFAULT 0,
      spouse_age INTEGER,
      has_spouse INTEGER DEFAULT 0,
      spouse_income REAL DEFAULT 0,
      is_sole_parent INTEGER DEFAULT 0,
      phi_premium_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_profiles_year ON tax_profiles(tax_year);
    CREATE INDEX IF NOT EXISTS idx_profiles_profile ON tax_profiles(profile_id);
  `);
  
  return db;
}

export function getTaxOffsetDatabase(): Database.Database {
  if (!db) {
    throw new Error('Tax offset database not initialized. Call initializeTaxOffsetDatabase() first.');
  }
  return db;
}

// ============= TAX PROFILE CRUD =============

export interface TaxProfileInput {
  profileId: string;
  taxYear?: string;
  taxableIncome: number;
  age: number;
  isResident?: boolean;
  hasPrivateHealthInsurance?: boolean;
  privateHealthCoverType?: 'single' | 'couple' | 'family';
  privateHealthTier?: 'base' | 'tier1' | 'tier2' | 'tier3';
  isSeniorOrPensioner?: boolean;
  spouseAge?: number;
  hasSpouse?: boolean;
  spouseIncome?: number;
  isSoleParent?: boolean;
  phiPremiumAmount?: number;
}

export function saveTaxProfile(input: TaxProfileInput): void {
  const database = getTaxOffsetDatabase();
  const taxYear = input.taxYear || getFinancialYear();
  
  const stmt = database.prepare(`
    INSERT INTO tax_profiles (
      profile_id, tax_year, taxable_income, age, is_resident,
      has_private_health_insurance, private_health_cover_type, private_health_tier,
      is_senior_or_pensioner, spouse_age, has_spouse, spouse_income,
      is_sole_parent, phi_premium_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_id) DO UPDATE SET
      tax_year = excluded.tax_year,
      taxable_income = excluded.taxable_income,
      age = excluded.age,
      is_resident = excluded.is_resident,
      has_private_health_insurance = excluded.has_private_health_insurance,
      private_health_cover_type = excluded.private_health_cover_type,
      private_health_tier = excluded.private_health_tier,
      is_senior_or_pensioner = excluded.is_senior_or_pensioner,
      spouse_age = excluded.spouse_age,
      has_spouse = excluded.has_spouse,
      spouse_income = excluded.spouse_income,
      is_sole_parent = excluded.is_sole_parent,
      phi_premium_amount = excluded.phi_premium_amount,
      updated_at = CURRENT_TIMESTAMP
  `);
  
  stmt.run(
    input.profileId,
    taxYear,
    input.taxableIncome,
    input.age,
    input.isResident ? 1 : 0,
    input.hasPrivateHealthInsurance ? 1 : 0,
    input.privateHealthCoverType || null,
    input.privateHealthTier || null,
    input.isSeniorOrPensioner ? 1 : 0,
    input.spouseAge || null,
    input.hasSpouse ? 1 : 0,
    input.spouseIncome || 0,
    input.isSoleParent ? 1 : 0,
    input.phiPremiumAmount || 0
  );
}

export function getTaxProfile(profileId: string): TaxProfileInput | null {
  const database = getTaxOffsetDatabase();
  
  const row = database.prepare(
    'SELECT * FROM tax_profiles WHERE profile_id = ? ORDER BY updated_at DESC LIMIT 1'
  ).get(profileId) as any;
  
  if (!row) return null;
  
  return {
    profileId: row.profile_id,
    taxYear: row.tax_year,
    taxableIncome: row.taxable_income,
    age: row.age,
    isResident: Boolean(row.is_resident),
    hasPrivateHealthInsurance: Boolean(row.has_private_health_insurance),
    privateHealthCoverType: row.private_health_cover_type,
    privateHealthTier: row.private_health_tier,
    isSeniorOrPensioner: Boolean(row.is_senior_or_pensioner),
    spouseAge: row.spouse_age,
    hasSpouse: Boolean(row.has_spouse),
    spouseIncome: row.spouse_income,
    isSoleParent: Boolean(row.is_sole_parent),
    phiPremiumAmount: row.phi_premium_amount
  };
}

// ============= FRANKING CREDITS CRUD =============

export interface FrankingCreditInput {
  profileId: string;
  taxYear?: string;
  companyName: string;
  dividendAmount: number;
  frankedAmount: number;
  frankingCredit: number;
  frankingPercentage: number;
  paymentDate?: string;
}

export function addFrankingCredit(input: FrankingCreditInput): number {
  const database = getTaxOffsetDatabase();
  const taxYear = input.taxYear || getFinancialYear();
  
  const result = database.prepare(`
    INSERT INTO franking_credits (
      tax_year, profile_id, company_name, dividend_amount,
      franked_amount, franking_credit, franking_percentage, payment_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    taxYear,
    input.profileId,
    input.companyName,
    input.dividendAmount,
    input.frankedAmount,
    input.frankingCredit,
    input.frankingPercentage,
    input.paymentDate || null
  );
  
  return Number(result.lastInsertRowid);
}

export function getFrankingCredits(profileId: string, taxYear?: string): any[] {
  const database = getTaxOffsetDatabase();
  const year = taxYear || getFinancialYear();
  
  return database.prepare(`
    SELECT * FROM franking_credits 
    WHERE profile_id = ? AND tax_year = ?
    ORDER BY payment_date DESC
  `).all(profileId, year);
}

export function deleteFrankingCredit(id: number): void {
  const database = getTaxOffsetDatabase();
  database.prepare('DELETE FROM franking_credits WHERE id = ?').run(id);
}

export function getTotalFrankingCredits(profileId: string, taxYear?: string): number {
  const database = getTaxOffsetDatabase();
  const year = taxYear || getFinancialYear();
  
  const result = database.prepare(`
    SELECT SUM(franking_credit) as total FROM franking_credits 
    WHERE profile_id = ? AND tax_year = ?
  `).get(profileId, year) as { total: number | null };
  
  return result.total || 0;
}

// ============= TAX OFFSET CALCULATION STORAGE =============

export function saveTaxOffsetCalculation(
  profileId: string,
  summary: TaxOffsetSummary,
  taxYear?: string
): void {
  const database = getTaxOffsetDatabase();
  const year = taxYear || getFinancialYear();
  
  // Delete existing calculations for this profile/year
  database.prepare(
    'DELETE FROM tax_offsets WHERE profile_id = ? AND tax_year = ?'
  ).run(profileId, year);
  
  // Insert new calculations
  const stmt = database.prepare(`
    INSERT INTO tax_offsets (
      tax_year, profile_id, offset_type, amount, calculation_details
    ) VALUES (?, ?, ?, ?, ?)
  `);
  
  for (const offset of summary.breakdown) {
    if (offset.amount > 0 || offset.offsetType === 'LMITO') {
      stmt.run(
        year,
        profileId,
        offset.offsetType,
        offset.amount,
        offset.calculationDetails
      );
    }
  }
}

export function getTaxOffsetCalculations(profileId: string, taxYear?: string): TaxOffsetRecord[] {
  const database = getTaxOffsetDatabase();
  const year = taxYear || getFinancialYear();
  
  return database.prepare(`
    SELECT * FROM tax_offsets 
    WHERE profile_id = ? AND tax_year = ?
    ORDER BY created_at DESC
  `).all(profileId, year) as TaxOffsetRecord[];
}

// ============= COMPLETE CALCULATION WORKFLOW =============

export function calculateAndSaveTaxOffsets(
  profileInput: TaxProfileInput,
  frankingCredits: any[] = []
): TaxOffsetSummary {
  const database = getTaxOffsetDatabase();
  
  // Save/update profile
  saveTaxProfile(profileInput);
  
  // Build calculation input
  const input: CalculateTaxOffsetsInput = {
    profile: {
      taxableIncome: profileInput.taxableIncome,
      age: profileInput.age,
      isResident: profileInput.isResident ?? true,
      hasPrivateHealthInsurance: profileInput.hasPrivateHealthInsurance ?? false,
      privateHealthCoverType: profileInput.privateHealthCoverType,
      privateHealthTier: profileInput.privateHealthTier,
      isSeniorOrPensioner: profileInput.isSeniorOrPensioner ?? false,
      hasSpouse: profileInput.hasSpouse ?? false,
      spouseAge: profileInput.spouseAge,
      spouseIncome: profileInput.spouseIncome ?? 0,
      isSoleParent: profileInput.isSoleParent ?? false
    },
    frankingCredits: frankingCredits.map(fc => ({
      companyName: fc.company_name || fc.companyName,
      dividendAmount: fc.dividend_amount || fc.dividendAmount,
      frankedAmount: fc.franked_amount || fc.frankedAmount,
      frankingCredit: fc.franking_credit || fc.frankingCredit,
      frankingPercentage: fc.franking_percentage || fc.frankingPercentage,
      paymentDate: fc.payment_date || fc.paymentDate ? new Date(fc.payment_date || fc.paymentDate) : new Date()
    })),
    phiPremiumAmount: profileInput.phiPremiumAmount || 0
  };
  
  // Calculate offsets
  const summary = calculateAllTaxOffsets(input);
  
  // Save calculations
  saveTaxOffsetCalculation(profileInput.profileId, summary, profileInput.taxYear);
  
  return summary;
}

// ============= SUMMARY REPORTS =============

export interface TaxOffsetSummaryReport {
  taxYear: string;
  profileId: string;
  totalLITO: number;
  totalSAPTO: number;
  totalPHIRebate: number;
  totalFrankingCredits: number;
  grandTotal: number;
}

export function getTaxOffsetSummary(profileId: string, taxYear?: string): TaxOffsetSummaryReport {
  const database = getTaxOffsetDatabase();
  const year = taxYear || getFinancialYear();
  
  const offsets = getTaxOffsetCalculations(profileId, year);
  const frankingTotal = getTotalFrankingCredits(profileId, year);
  
  const lito = offsets.find(o => o.offset_type === 'LITO')?.amount || 0;
  const sapto = offsets.find(o => o.offset_type === 'SAPTO')?.amount || 0;
  const phiRebate = offsets.find(o => o.offset_type === 'PHI_Rebate')?.amount || 0;
  
  return {
    taxYear: year,
    profileId,
    totalLITO: lito,
    totalSAPTO: sapto,
    totalPHIRebate: phiRebate,
    totalFrankingCredits: frankingTotal,
    grandTotal: lito + sapto + phiRebate + frankingTotal
  };
}

export function getTaxOffsetsByYear(taxYear: string): TaxOffsetSummaryReport[] {
  const database = getTaxOffsetDatabase();
  
  const profiles = database.prepare(`
    SELECT DISTINCT profile_id FROM tax_offsets WHERE tax_year = ?
  `).all(taxYear) as { profile_id: string }[];
  
  return profiles.map(p => getTaxOffsetSummary(p.profile_id, taxYear));
}

// ============= EXPORT/IMPORT =============

export function exportTaxOffsets(profileId: string, taxYear?: string): object {
  const database = getTaxOffsetDatabase();
  const year = taxYear || getFinancialYear();
  
  const profile = getTaxProfile(profileId);
  const offsets = getTaxOffsetCalculations(profileId, year);
  const frankingCredits = getFrankingCredits(profileId, year);
  const summary = getTaxOffsetSummary(profileId, year);
  
  return {
    taxYear: year,
    profile,
    offsets,
    frankingCredits,
    summary,
    exportedAt: new Date().toISOString()
  };
}

export default {
  initializeTaxOffsetDatabase,
  getTaxOffsetDatabase,
  saveTaxProfile,
  getTaxProfile,
  addFrankingCredit,
  getFrankingCredits,
  deleteFrankingCredit,
  getTotalFrankingCredits,
  saveTaxOffsetCalculation,
  getTaxOffsetCalculations,
  calculateAndSaveTaxOffsets,
  getTaxOffsetSummary,
  getTaxOffsetsByYear,
  exportTaxOffsets
};
