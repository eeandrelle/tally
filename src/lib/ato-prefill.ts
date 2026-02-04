/**
 * ATO Pre-fill Export Module
 * 
 * Generates ATO myTax-compatible pre-fill files and data structures.
 * Matches all myTax fields for income, deductions, and offsets.
 */

import { getReceiptsByDateRange, getIncomeByDateRange, getCategories } from "./db";

// ATO myTax field mappings
export interface ATOPrefillData {
  // Personal Information
  personalInfo: {
    taxFileNumber?: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    address: string;
    phone?: string;
    email?: string;
  };

  // Income (Item 1)
  income: {
    // Salary and wages (Item 1)
    salaryWages: {
      total: number;
      employers: Array<{
        abn: string;
        name: string;
        grossPayments: number;
        taxWithheld: number;
        reportableFringeBenefits?: number;
        reportableSuperContributions?: number;
      }>;
    };

    // Allowances (Item 2)
    allowances: {
      total: number;
      items: Array<{
        type: string;
        amount: number;
        description?: string;
      }>;
    };

    // Interest (Item 10)
    interest: {
      total: number;
      accounts: Array<{
        bsb: string;
        accountNumber: string;
        institution: string;
        grossInterest: number;
        taxWithheld: number;
      }>;
    };

    // Dividends (Item 11)
    dividends: {
      total: number;
      frankedAmount: number;
      unfrankedAmount: number;
      frankingCredits: number;
      holdings: Array<{
        companyName: string;
        shareClass?: string;
        frankedAmount: number;
        unfrankedAmount: number;
        frankingCredits: number;
      }>;
    };

    // Other income
    otherIncome: {
      total: number;
      categories: Array<{
        type: string;
        amount: number;
        description?: string;
      }>;
    };
  };

  // Deductions (Item D1-D15)
  deductions: {
    // D1 - Work-related car expenses
    d1_carExpenses: {
      total: number;
      method: 'cents_per_km' | 'logbook' | 'actual_costs';
      kilometres?: number;
      businessUsePercentage?: number;
      items: Array<{
        description: string;
        amount: number;
        vehicleRego?: string;
      }>;
    };

    // D2 - Work-related travel expenses
    d2_travelExpenses: {
      total: number;
      items: Array<{
        description: string;
        amount: number;
        destination?: string;
        purpose?: string;
      }>;
    };

    // D3 - Work-related clothing, laundry and dry-cleaning
    d3_clothingExpenses: {
      total: number;
      items: Array<{
        type: 'compulsory_uniform' | 'occupation_specific' | 'protective' | 'laundry';
        description: string;
        amount: number;
      }>;
    };

    // D4 - Work-related self-education expenses
    d4_selfEducation: {
      total: number;
      items: Array<{
        description: string;
        amount: number;
        courseName?: string;
        provider?: string;
      }>;
    };

    // D5 - Other work-related expenses
    d5_otherWorkExpenses: {
      total: number;
      items: Array<{
        description: string;
        amount: number;
        category?: string;
      }>;
    };

    // D6 - Low-value pool deduction
    d6_lowValuePool: {
      total: number;
      openingBalance: number;
      disposals: number;
      declineInValue: number;
    };

    // D7 - Interest deductions
    d7_interestDeductions: {
      total: number;
      items: Array<{
        description: string;
        amount: number;
        relatedTo?: string;
      }>;
    };

    // D8 - Gifts and donations
    d8_donations: {
      total: number;
      items: Array<{
        recipient: string;
        amount: number;
        deductible?: boolean;
        receiptNumber?: string;
      }>;
    };

    // D9 - Cost of managing tax affairs
    d9_taxAffairs: {
      total: number;
      items: Array<{
        description: string;
        amount: number;
      }>;
    };

    // Total deductions
    total: number;
  };

  // Tax offsets (Item T1-T11)
  offsets: {
    // T1 - Seniors and pensioners
    t1_seniorsPensioners?: number;
    
    // T2 - Australian superannuation income stream
    t2_superIncomeStream?: number;
    
    // T3 - Superannuation contributions on behalf of spouse
    t3_spouseContributions?: number;
    
    // T4 - Zone or overseas forces
    t4_zoneOverseasForces?: number;
    
    // T5 - Medical expenses
    t5_medicalExpenses?: number;
    
    // T6 - Invalid and invalid carer
    t6_invalidCarer?: number;
    
    // T7 - Franking credits
    t7_frankingCredits: number;
    
    // T8 - Baby bonus
    t8_babyBonus?: number;
    
    // T9 - Education tax refund
    t9_educationRefund?: number;
    
    // T10 - Other refundable tax offsets
    t10_otherOffsets?: number;
    
    // T11 - Medicare levy reduction or exemption
    t11_medicareReduction?: number;

    total: number;
  };

  // Metadata
  metadata: {
    taxYear: string;
    generatedAt: string;
    version: string;
    receiptCount: number;
  };
}

// Tax year format: "2024-2025"
export function formatTaxYear(year: number): string {
  return `${year}-${String(year + 1).slice(-2)}`;
}

// Generate empty ATO prefill structure
export function createEmptyATOPrefill(taxYear: number): ATOPrefillData {
  return {
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      address: '',
    },
    income: {
      salaryWages: { total: 0, employers: [] },
      allowances: { total: 0, items: [] },
      interest: { total: 0, accounts: [] },
      dividends: { total: 0, frankedAmount: 0, unfrankedAmount: 0, frankingCredits: 0, holdings: [] },
      otherIncome: { total: 0, categories: [] },
    },
    deductions: {
      d1_carExpenses: { total: 0, method: 'cents_per_km', items: [] },
      d2_travelExpenses: { total: 0, items: [] },
      d3_clothingExpenses: { total: 0, items: [] },
      d4_selfEducation: { total: 0, items: [] },
      d5_otherWorkExpenses: { total: 0, items: [] },
      d6_lowValuePool: { total: 0, openingBalance: 0, disposals: 0, declineInValue: 0 },
      d7_interestDeductions: { total: 0, items: [] },
      d8_donations: { total: 0, items: [] },
      d9_taxAffairs: { total: 0, items: [] },
      total: 0,
    },
    offsets: {
      t7_frankingCredits: 0,
      total: 0,
    },
    metadata: {
      taxYear: formatTaxYear(taxYear),
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      receiptCount: 0,
    },
  };
}

// Map receipt categories to ATO deduction codes
const categoryToATOCode: Record<string, { code: string; item: string }> = {
  'Vehicle Expenses': { code: 'D1', item: 'd1_carExpenses' },
  'Travel Expenses': { code: 'D2', item: 'd2_travelExpenses' },
  'Clothing & Laundry': { code: 'D3', item: 'd3_clothingExpenses' },
  'Self-Education': { code: 'D4', item: 'd4_selfEducation' },
  'Work Equipment': { code: 'D5', item: 'd5_otherWorkExpenses' },
  'Home Office': { code: 'D5', item: 'd5_otherWorkExpenses' },
  'Phone & Internet': { code: 'D5', item: 'd5_otherWorkExpenses' },
  'Union Fees': { code: 'D5', item: 'd5_otherWorkExpenses' },
  'Subscriptions': { code: 'D5', item: 'd5_otherWorkExpenses' },
  'Professional Development': { code: 'D4', item: 'd4_selfEducation' },
  'Tools & Equipment': { code: 'D5', item: 'd5_otherWorkExpenses' },
  'Protective Equipment': { code: 'D3', item: 'd3_clothingExpenses' },
  'Donations': { code: 'D8', item: 'd8_donations' },
  'Tax Agent Fees': { code: 'D9', item: 'd9_taxAffairs' },
  'Accounting Fees': { code: 'D9', item: 'd9_taxAffairs' },
  'Income Protection Insurance': { code: 'D5', item: 'd5_otherWorkExpenses' },
  'Investment Expenses': { code: 'D7', item: 'd7_interestDeductions' },
  'Other': { code: 'D5', item: 'd5_otherWorkExpenses' },
};

// Generate ATO prefill data from receipts and income
export async function generateATOPrefill(
  taxYear: number,
  personalInfo?: Partial<ATOPrefillData['personalInfo']>
): Promise<ATOPrefillData> {
  const startDate = `${taxYear}-07-01`;
  const endDate = `${taxYear + 1}-06-30`;

  const [receipts, incomeEntries, categories] = await Promise.all([
    getReceiptsByDateRange(startDate, endDate),
    getIncomeByDateRange(startDate, endDate),
    getCategories(),
  ]);

  const prefill = createEmptyATOPrefill(taxYear);

  // Add personal info
  if (personalInfo) {
    prefill.personalInfo = { ...prefill.personalInfo, ...personalInfo };
  }

  // Process income
  for (const entry of incomeEntries) {
    switch (entry.type) {
      case 'salary':
        prefill.income.salaryWages.total += entry.amount;
        prefill.income.salaryWages.employers.push({
          abn: entry.sourceAbn || '',
          name: entry.source,
          grossPayments: entry.amount,
          taxWithheld: entry.taxWithheld || 0,
        });
        break;
      case 'interest':
        prefill.income.interest.total += entry.amount;
        prefill.income.interest.accounts.push({
          bsb: entry.bsb || '',
          accountNumber: entry.accountNumber || '',
          institution: entry.source,
          grossInterest: entry.amount,
          taxWithheld: entry.taxWithheld || 0,
        });
        break;
      case 'dividend':
        const frankedAmount = entry.frankedAmount || 0;
        const unfrankedAmount = entry.amount - frankedAmount;
        const frankingCredits = entry.frankingCredits || 0;
        
        prefill.income.dividends.total += entry.amount;
        prefill.income.dividends.frankedAmount += frankedAmount;
        prefill.income.dividends.unfrankedAmount += unfrankedAmount;
        prefill.income.dividends.frankingCredits += frankingCredits;
        prefill.income.dividends.holdings.push({
          companyName: entry.source,
          frankedAmount,
          unfrankedAmount,
          frankingCredits,
        });
        // Also add to offsets
        prefill.offsets.t7_frankingCredits += frankingCredits;
        prefill.offsets.total += frankingCredits;
        break;
      default:
        prefill.income.otherIncome.total += entry.amount;
        prefill.income.otherIncome.categories.push({
          type: entry.type,
          amount: entry.amount,
          description: entry.description,
        });
    }
  }

  // Process receipts/deductions
  for (const receipt of receipts) {
    const mapping = categoryToATOCode[receipt.category];
    if (!mapping) continue;

    const deductionItem = {
      description: receipt.vendor,
      amount: receipt.amount,
    };

    switch (mapping.item) {
      case 'd1_carExpenses':
        prefill.deductions.d1_carExpenses.total += receipt.amount;
        prefill.deductions.d1_carExpenses.items.push(deductionItem);
        break;
      case 'd2_travelExpenses':
        prefill.deductions.d2_travelExpenses.total += receipt.amount;
        prefill.deductions.d2_travelExpenses.items.push(deductionItem);
        break;
      case 'd3_clothingExpenses':
        prefill.deductions.d3_clothingExpenses.total += receipt.amount;
        prefill.deductions.d3_clothingExpenses.items.push({
          ...deductionItem,
          type: 'protective', // Default, can be refined
        });
        break;
      case 'd4_selfEducation':
        prefill.deductions.d4_selfEducation.total += receipt.amount;
        prefill.deductions.d4_selfEducation.items.push(deductionItem);
        break;
      case 'd5_otherWorkExpenses':
        prefill.deductions.d5_otherWorkExpenses.total += receipt.amount;
        prefill.deductions.d5_otherWorkExpenses.items.push(deductionItem);
        break;
      case 'd7_interestDeductions':
        prefill.deductions.d7_interestDeductions.total += receipt.amount;
        prefill.deductions.d7_interestDeductions.items.push(deductionItem);
        break;
      case 'd8_donations':
        prefill.deductions.d8_donations.total += receipt.amount;
        prefill.deductions.d8_donations.items.push({
          recipient: receipt.vendor,
          amount: receipt.amount,
          deductible: true,
        });
        break;
      case 'd9_taxAffairs':
        prefill.deductions.d9_taxAffairs.total += receipt.amount;
        prefill.deductions.d9_taxAffairs.items.push(deductionItem);
        break;
    }
  }

  // Calculate total deductions
  prefill.deductions.total = 
    prefill.deductions.d1_carExpenses.total +
    prefill.deductions.d2_travelExpenses.total +
    prefill.deductions.d3_clothingExpenses.total +
    prefill.deductions.d4_selfEducation.total +
    prefill.deductions.d5_otherWorkExpenses.total +
    prefill.deductions.d6_lowValuePool.total +
    prefill.deductions.d7_interestDeductions.total +
    prefill.deductions.d8_donations.total +
    prefill.deductions.d9_taxAffairs.total;

  // Update metadata
  prefill.metadata.receiptCount = receipts.length;
  prefill.metadata.generatedAt = new Date().toISOString();

  return prefill;
}

// Export to JSON format (for myTax import)
export function exportToJSON(data: ATOPrefillData): string {
  return JSON.stringify(data, null, 2);
}

// Export to CSV format (for accountant review)
export function exportToCSV(data: ATOPrefillData): string {
  const lines: string[] = [];
  
  // Header
  lines.push('ATO Tax Return Summary - ' + data.metadata.taxYear);
  lines.push('Generated: ' + new Date(data.metadata.generatedAt).toLocaleDateString());
  lines.push('');

  // Income section
  lines.push('INCOME');
  lines.push('Type,Source,Amount');
  
  for (const employer of data.income.salaryWages.employers) {
    lines.push(`Salary,${employer.name},${employer.grossPayments.toFixed(2)}`);
  }
  
  for (const account of data.income.interest.accounts) {
    lines.push(`Interest,${account.institution},${account.grossInterest.toFixed(2)}`);
  }
  
  for (const holding of data.income.dividends.holdings) {
    lines.push(`Dividends,${holding.companyName},${(holding.frankedAmount + holding.unfrankedAmount).toFixed(2)}`);
  }
  
  lines.push(`Total Income,,${(
    data.income.salaryWages.total +
    data.income.interest.total +
    data.income.dividends.total +
    data.income.otherIncome.total
  ).toFixed(2)}`);
  lines.push('');

  // Deductions section
  lines.push('DEDUCTIONS');
  lines.push('Code,Category,Description,Amount');

  for (const item of data.deductions.d1_carExpenses.items) {
    lines.push(`D1,Car Expenses,${item.description},${item.amount.toFixed(2)}`);
  }

  for (const item of data.deductions.d2_travelExpenses.items) {
    lines.push(`D2,Travel Expenses,${item.description},${item.amount.toFixed(2)}`);
  }

  for (const item of data.deductions.d3_clothingExpenses.items) {
    lines.push(`D3,Clothing & Laundry,${item.description},${item.amount.toFixed(2)}`);
  }

  for (const item of data.deductions.d4_selfEducation.items) {
    lines.push(`D4,Self-Education,${item.description},${item.amount.toFixed(2)}`);
  }

  for (const item of data.deductions.d5_otherWorkExpenses.items) {
    lines.push(`D5,Other Work Expenses,${item.description},${item.amount.toFixed(2)}`);
  }

  for (const item of data.deductions.d8_donations.items) {
    lines.push(`D8,Donations,${item.recipient},${item.amount.toFixed(2)}`);
  }

  for (const item of data.deductions.d9_taxAffairs.items) {
    lines.push(`D9,Tax Affairs,${item.description},${item.amount.toFixed(2)}`);
  }

  lines.push(`Total Deductions,,,${data.deductions.total.toFixed(2)}`);
  lines.push('');

  // Tax offsets
  if (data.offsets.total > 0) {
    lines.push('TAX OFFSETS');
    lines.push('Code,Description,Amount');
    lines.push(`T7,Franking Credits,${data.offsets.t7_frankingCredits.toFixed(2)}`);
    lines.push(`Total Offsets,,${data.offsets.total.toFixed(2)}`);
    lines.push('');
  }

  // Summary
  const taxableIncome = 
    (data.income.salaryWages.total +
     data.income.interest.total +
     data.income.dividends.total +
     data.income.otherIncome.total) - 
    data.deductions.total;

  lines.push('SUMMARY');
  lines.push('Item,Amount');
  lines.push(`Gross Income,${(data.income.salaryWages.total + data.income.interest.total + data.income.dividends.total + data.income.otherIncome.total).toFixed(2)}`);
  lines.push(`Total Deductions,${data.deductions.total.toFixed(2)}`);
  lines.push(`Taxable Income,${Math.max(0, taxableIncome).toFixed(2)}`);
  lines.push(`Tax Offsets,${data.offsets.total.toFixed(2)}`);

  return lines.join('\n');
}

// Download file helper
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
