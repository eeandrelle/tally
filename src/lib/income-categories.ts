/**
 * Income Category Database - Complete Australian Income Types
 * 
 * This module provides comprehensive income categories with metadata
 * including ATO workpaper associations, tax treatment, and record keeping.
 * 
 * Based on Australian Taxation Office Individual Tax Return Guide
 * FY 2024-2025
 */

export type IncomeCategoryCode = 
  | "SALARY" 
  | "WAGES" 
  | "ALLOWANCES"
  | "DIVIDENDS"
  | "INTEREST"
  | "RENTAL"
  | "CAPITAL_GAINS"
  | "FREELANCE"
  | "BUSINESS"
  | "TRUST_DISTRIBUTIONS"
  | "PARTNERSHIP"
  | "FOREIGN_INCOME"
  | "GOVERNMENT_PAYMENTS"
  | "SUPER_PENSION"
  | "SUPER_LUMPSUM"
  | "EMPLOYMENT_TERMINATION"
  | "ROYALTIES"
  | "OTHER";

export type IncomeFrequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "annually" | "irregular";
export type TaxTreatment = "taxable" | "tax_free" | "concessional" | "deferred" | "exempt";
export type IncomeSource = "australia" | "foreign" | "both";

export interface IncomeSubcategory {
  code: string;
  name: string;
  description: string;
  atoItemCode?: string; // e.g., "24M" for salary
  taxTreatment: TaxTreatment;
  commonSources: string[];
}

export interface IncomeCategory {
  code: IncomeCategoryCode;
  name: string;
  shortDescription: string;
  fullDescription: string;
  atoLabel: string; // Label as shown on tax return
  atoItemCodes?: string[]; // ATO item numbers
  workpaperAssociation?: string; // Associated workpaper ID
  subcategories: IncomeSubcategory[];
  taxTreatment: TaxTreatment;
  source: IncomeSource;
  frequency: IncomeFrequency[];
  recordKeeping: {
    description: string;
    requiredDocuments: string[];
    retentionPeriod: string;
  };
  prefillAvailable: boolean; // Whether ATO pre-fills this data
  commonMistakes: string[];
  tips: string[];
  atoReference: string;
  priority: "high" | "medium" | "low";
  estimatedReportingPercentage: number; // % of taxpayers who report this
}

/**
 * Complete Income Categories Database
 */
export const incomeCategories: IncomeCategory[] = [
  // SALARY - Salary and Wages
  {
    code: "SALARY",
    name: "Salary and Wages",
    shortDescription: "Employment income from PAYG employers",
    fullDescription: `Income received from employment including regular salary, wages, commissions, bonuses, and loadings. This is your primary employment income reported on PAYG payment summaries or income statements.`,
    atoLabel: "Salary or wages",
    atoItemCodes: ["24M", "24N"],
    workpaperAssociation: "income-salary",
    subcategories: [
      {
        code: "SALARY_BASIC",
        name: "Base Salary/Wages",
        description: "Regular ongoing employment income",
        atoItemCode: "24M",
        taxTreatment: "taxable",
        commonSources: ["PAYG payment summary", "Income statement", "Employer portal"]
      },
      {
        code: "SALARY_BONUS",
        name: "Bonuses",
        description: "Performance bonuses, sign-on bonuses, retention bonuses",
        atoItemCode: "24N",
        taxTreatment: "taxable",
        commonSources: ["PAYG payment summary - allowances", "Employment contract"]
      },
      {
        code: "SALARY_COMMISSION",
        name: "Commissions",
        description: "Sales commissions and performance-based payments",
        atoItemCode: "24N",
        taxTreatment: "taxable",
        commonSources: ["PAYG payment summary", "Commission statements"]
      },
      {
        code: "SALARY_OVERTIME",
        name: "Overtime",
        description: "Overtime payments and penalty rates",
        atoItemCode: "24N",
        taxTreatment: "taxable",
        commonSources: ["PAYG payment summary", "Payslips"]
      },
      {
        code: "SALARY_LOADING",
        name: "Loadings",
        description: "Shift loadings, casual loadings, danger pay",
        atoItemCode: "24N",
        taxTreatment: "taxable",
        commonSources: ["PAYG payment summary", "Payslips"]
      }
    ],
    taxTreatment: "taxable",
    source: "australia",
    frequency: ["weekly", "fortnightly", "monthly"],
    recordKeeping: {
      description: "Keep PAYG payment summaries or income statements for each employer",
      requiredDocuments: ["PAYG payment summary", "Income statement (via myGov)", "Final payslip", "Employment contract"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: true,
    commonMistakes: [
      "Not reporting all employers if you changed jobs during the year",
      "Double-counting income if both payment summary and income statement are provided",
      "Not including reportable fringe benefits from payment summary",
      "Forgetting to include salary sacrifice amounts"
    ],
    tips: [
      "Check myGov pre-fill for all employers before lodging",
      "Verify the final payslip June YTD matches payment summary",
      "Include reportable super contributions shown on payment summary",
      "Reportable fringe benefits are separate - don't add to gross"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/salary-and-wages",
    priority: "high",
    estimatedReportingPercentage: 95
  },

  // ALLOWANCES - Allowances and Reimbursements
  {
    code: "ALLOWANCES",
    name: "Allowances",
    shortDescription: "Work-related allowances from employer",
    fullDescription: `Allowances paid by your employer for specific work-related expenses. Some allowances are taxable income while others may need to be declared but are not taxable. Check your payment summary for the breakdown.`,
    atoLabel: "Allowances",
    atoItemCodes: ["24O", "24P"],
    workpaperAssociation: "income-allowances",
    subcategories: [
      {
        code: "ALLOW_CAR",
        name: "Car and Travel Allowances",
        description: "Allowances for using personal vehicle for work",
        atoItemCode: "24O",
        taxTreatment: "taxable",
        commonSources: ["PAYG payment summary - allowances", "Payslips"]
      },
      {
        code: "ALLOW_MEAL",
        name: "Meal Allowances",
        description: "Overtime meal allowances and travel meal allowances",
        atoItemCode: "24O",
        taxTreatment: "taxable",
        commonSources: ["PAYG payment summary", "Enterprise agreement"]
      },
      {
        code: "ALLOW_UNIFORM",
        name: "Uniform and Laundry",
        description: "Allowances for work clothing and cleaning",
        atoItemCode: "24O",
        taxTreatment: "taxable",
        commonSources: ["PAYG payment summary"]
      },
      {
        code: "ALLOW_REMOTE",
        name: "Remote Area Allowances",
        description: "Zone and remote area allowances (partially exempt)",
        atoItemCode: "24P",
        taxTreatment: "concessional",
        commonSources: ["PAYG payment summary - exempt allowances"]
      },
      {
        code: "ALLOW_LIVING",
        name: "Living Away From Home",
        description: "LAFHA - special tax treatment may apply",
        atoItemCode: "24P",
        taxTreatment: "concessional",
        commonSources: ["PAYG payment summary", "LAFHA documentation"]
      }
    ],
    taxTreatment: "taxable",
    source: "australia",
    frequency: ["weekly", "fortnightly", "monthly"],
    recordKeeping: {
      description: "Keep payment summary showing allowance breakdown",
      requiredDocuments: ["PAYG payment summary with allowances listed", "Employment contract"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: true,
    commonMistakes: [
      "Not reporting exempt allowances",
      "Claiming deductions for expenses covered by non-deductible allowances",
      "Confusing reimbursements with allowances"
    ],
    tips: [
      "Check if your allowance is 'deductible' or 'non-deductible' on payment summary",
      "You may need to claim deductions for expenses incurred against allowances",
      "Remote area allowances may have special zone tax offset implications"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/allowances",
    priority: "high",
    estimatedReportingPercentage: 40
  },

  // DIVIDENDS - Dividend Income
  {
    code: "DIVIDENDS",
    name: "Dividends",
    shortDescription: "Share dividend income with franking credits",
    fullDescription: `Income from shares including dividends from Australian companies with franking credits. Franking credits represent tax already paid by the company and may entitle you to a tax offset. Must also declare foreign dividends.`,
    atoLabel: "Dividends",
    atoItemCodes: ["11", "12"],
    workpaperAssociation: "income-dividends",
    subcategories: [
      {
        code: "DIV_AU_FULLY_FRANKED",
        name: "Australian Fully Franked",
        description: "Dividends with 100% franking credits attached",
        atoItemCode: "11",
        taxTreatment: "taxable",
        commonSources: ["Dividend statements", "Computershare", "Link Market Services"]
      },
      {
        code: "DIV_AU_PARTIALLY_FRANKED",
        name: "Australian Partially Franked",
        description: "Dividends with partial franking credits",
        atoItemCode: "11",
        taxTreatment: "taxable",
        commonSources: ["Dividend statements"]
      },
      {
        code: "DIV_AU_UNFRANKED",
        name: "Australian Unfranked",
        description: "Dividends without franking credits",
        atoItemCode: "11",
        taxTreatment: "taxable",
        commonSources: ["Dividend statements", "REIT distributions"]
      },
      {
        code: "DIV_FOREIGN",
        name: "Foreign Dividends",
        description: "Dividends from foreign companies",
        atoItemCode: "11",
        taxTreatment: "taxable",
        commonSources: ["Foreign broker statements", "DRP statements"]
      },
      {
        code: "DIV_REIT",
        name: "Trust Distributions (REITs)",
        description: "Property trust and managed fund distributions",
        atoItemCode: "12",
        taxTreatment: "taxable",
        commonSources: ["Distribution statements", "AMIT statements"]
      }
    ],
    taxTreatment: "taxable",
    source: "both",
    frequency: ["quarterly", "annually", "irregular"],
    recordKeeping: {
      description: "Keep all dividend statements showing franking credits",
      requiredDocuments: ["Dividend statements", "DRP statements", "Distribution statements", "Computershare/Link statements"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: true,
    commonMistakes: [
      "Forgetting to include franking credits in assessable income",
      "Not declaring foreign dividends",
      "Double counting DRP reinvested dividends",
      "Missing dividend statements from share registries"
    ],
    tips: [
      "Franking credits are included in assessable income AND claimed as a tax offset",
      "Check Computershare and Link Market Services for all holdings",
      "DRP reinvestments still count as income received",
      "Foreign dividends may have foreign tax credits"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/dividends",
    priority: "high",
    estimatedReportingPercentage: 25
  },

  // INTEREST - Interest Income
  {
    code: "INTEREST",
    name: "Interest",
    shortDescription: "Bank interest and term deposit income",
    fullDescription: `Interest income from Australian bank accounts, term deposits, bonds, and other interest-bearing investments. Must declare interest even if reinvested or credited to offset accounts.`,
    atoLabel: "Interest",
    atoItemCodes: ["10"],
    workpaperAssociation: "income-interest",
    subcategories: [
      {
        code: "INT_SAVINGS",
        name: "Savings Account Interest",
        description: "Interest from everyday and high-interest savings accounts",
        atoItemCode: "10",
        taxTreatment: "taxable",
        commonSources: ["Bank statements", "Annual interest summaries"]
      },
      {
        code: "INT_TERM_DEPOSIT",
        name: "Term Deposit Interest",
        description: "Interest from term deposits and fixed-term investments",
        atoItemCode: "10",
        taxTreatment: "taxable",
        commonSources: ["Term deposit statements", "Maturity notices"]
      },
      {
        code: "INT_BONDS",
        name: "Government/Corporate Bonds",
        description: "Interest from bond investments",
        atoItemCode: "10",
        taxTreatment: "taxable",
        commonSources: ["CHESS statements", "Broker statements"]
      },
      {
        code: "INT_CHILD",
        name: "Children's Account Interest",
        description: "Interest attributed to parent from children's accounts",
        atoItemCode: "10",
        taxTreatment: "taxable",
        commonSources: ["Bank statements", "Trust distribution statements"]
      },
      {
        code: "INT_FOREIGN",
        name: "Foreign Interest",
        description: "Interest from foreign bank accounts",
        atoItemCode: "10",
        taxTreatment: "taxable",
        commonSources: ["Foreign bank statements"]
      }
    ],
    taxTreatment: "taxable",
    source: "both",
    frequency: ["monthly", "quarterly", "annually"],
    recordKeeping: {
      description: "Keep annual interest summaries from all banks",
      requiredDocuments: ["Annual interest summaries", "Bank statements showing interest", "Term deposit statements"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: true,
    commonMistakes: [
      "Not declaring interest from children's accounts (attribution rules apply)",
      "Forgetting interest from dormant accounts",
      "Missing interest credited to offset accounts",
      "Not declaring foreign interest"
    ],
    tips: [
      "Check all bank accounts including those with minimal balances",
      "Joint accounts - declare your share (usually 50%)",
      "Offset account benefits are NOT interest income",
      "Children's accounts over $416 interest may trigger attribution"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/interest",
    priority: "high",
    estimatedReportingPercentage: 60
  },

  // RENTAL - Rental Property Income
  {
    code: "RENTAL",
    name: "Rental Income",
    shortDescription: "Property rental income and deductions",
    fullDescription: `Income from renting out residential or commercial properties. Includes rent, bond retention, and insurance recoveries. Associated with detailed rental property schedule and depreciation claims.`,
    atoLabel: "Gross rent",
    atoItemCodes: ["21"],
    workpaperAssociation: "rental-property",
    subcategories: [
      {
        code: "RENT_RESIDENTIAL",
        name: "Residential Rent",
        description: "Rent from residential property leases",
        atoItemCode: "21",
        taxTreatment: "taxable",
        commonSources: ["Property manager statements", "Lease agreements", "Bank statements"]
      },
      {
        code: "RENT_SHORT_TERM",
        name: "Short-term Rental",
        description: "Airbnb, Stayz, short-stay accommodation",
        atoItemCode: "21",
        taxTreatment: "taxable",
        commonSources: ["Airbnb statements", "Stayz statements", "Booking platform reports"]
      },
      {
        code: "RENT_COMMERCIAL",
        name: "Commercial Property Rent",
        description: "Rent from commercial/retail/industrial properties",
        atoItemCode: "21",
        taxTreatment: "taxable",
        commonSources: ["Lease agreements", "Property manager statements"]
      },
      {
        code: "RENT_INSURANCE",
        name: "Insurance Recoveries",
        description: "Insurance payments for lost rent or damage",
        atoItemCode: "21",
        taxTreatment: "taxable",
        commonSources: ["Insurance claim statements"]
      },
      {
        code: "RENT_BOND",
        name: "Bond Retention",
        description: "Retained tenant bonds for damages",
        atoItemCode: "21",
        taxTreatment: "taxable",
        commonSources: ["Bond disposal statements"]
      }
    ],
    taxTreatment: "taxable",
    source: "australia",
    frequency: ["weekly", "fortnightly", "monthly"],
    recordKeeping: {
      description: "Keep detailed records of all rental income and expenses",
      requiredDocuments: ["Lease agreements", "Property manager statements", "Bank statements", "Expense receipts"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: false,
    commonMistakes: [
      "Not declaring bond money retained",
      "Forgetting to declare insurance recoveries",
      "Not keeping expense receipts",
      "Confusing repairs vs improvements"
    ],
    tips: [
      "Use a dedicated bank account for each rental property",
      "Keep all receipts for 5 years",
      "Repairs are deductible immediately, improvements depreciate",
      "Consider a quantity surveyor for depreciation schedule"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/rental-income",
    priority: "high",
    estimatedReportingPercentage: 15
  },

  // CAPITAL_GAINS - Capital Gains
  {
    code: "CAPITAL_GAINS",
    name: "Capital Gains",
    shortDescription: "Profits from selling assets (shares, property, crypto)",
    fullDescription: `Capital gains or losses from selling or disposing of assets including shares, investment properties, cryptocurrency, and collectibles. Special discount rules apply for assets held over 12 months.`,
    atoLabel: "Net capital gain",
    atoItemCodes: ["18A", "18H"],
    workpaperAssociation: "capital-gains",
    subcategories: [
      {
        code: "CGT_SHARES",
        name: "Shares and Units",
        description: "Capital gains from selling shares or managed funds",
        atoItemCode: "18A",
        taxTreatment: "taxable",
        commonSources: ["Contract notes", "CHESS statements", "Broker statements"]
      },
      {
        code: "CGT_PROPERTY",
        name: "Investment Property",
        description: "Capital gains from selling investment properties",
        atoItemCode: "18A",
        taxTreatment: "taxable",
        commonSources: ["Contract of sale", "Settlement statement", "Conveyancing documents"]
      },
      {
        code: "CGT_CRYPTO",
        name: "Cryptocurrency",
        description: "Capital gains from crypto trading or disposal",
        atoItemCode: "18A",
        taxTreatment: "taxable",
        commonSources: ["Exchange reports", "Wallet transactions", "Blockchain records"]
      },
      {
        code: "CGT_COLLECTIBLES",
        name: "Collectibles",
        description: "Art, antiques, jewelry (special rules apply)",
        atoItemCode: "18H",
        taxTreatment: "taxable",
        commonSources: ["Purchase receipts", "Sale records", "Valuation reports"]
      },
      {
        code: "CGT_PERSONAL",
        name: "Personal Use Assets",
        description: "Boats, cars, furniture (special rules apply)",
        atoItemCode: "18H",
        taxTreatment: "taxable",
        commonSources: ["Purchase and sale documentation"]
      }
    ],
    taxTreatment: "taxable",
    source: "both",
    frequency: ["irregular"],
    recordKeeping: {
      description: "Keep records of purchase and sale for every asset",
      requiredDocuments: ["Contract notes", "Settlement statements", "Broker statements", "Cost base calculations"],
      retentionPeriod: "5 years after disposal"
    },
    prefillAvailable: false,
    commonMistakes: [
      "Not declaring crypto-to-crypto trades as disposals",
      "Forgetting to add purchase costs to cost base",
      "Not applying 50% discount for assets held >12 months",
      "Missing partial CGT on inherited properties"
    ],
    tips: [
      "Keep ALL purchase records - they reduce your taxable gain",
      "Every crypto trade is a CGT event",
      "Main residence exemption may apply to home sales",
      "Consider timing of sales across financial years"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/capital-gains",
    priority: "high",
    estimatedReportingPercentage: 10
  },

  // FREELANCE - Freelance/Sole Trader
  {
    code: "FREELANCE",
    name: "Freelance / Sole Trader",
    shortDescription: "Self-employed income from services",
    fullDescription: `Income earned as a freelancer, contractor, or sole trader providing services. This is business income where you need to report gross income and claim business expenses.`,
    atoLabel: "Business income",
    atoItemCodes: ["15"],
    workpaperAssociation: "business-income",
    subcategories: [
      {
        code: "FREEL_SERVICE",
        name: "Service Income",
        description: "Income from providing professional services",
        atoItemCode: "15",
        taxTreatment: "taxable",
        commonSources: ["Invoices", "Payment receipts", "Bank statements"]
      },
      {
        code: "FREEL_CONSULTING",
        name: "Consulting",
        description: "Consulting and advisory fees",
        atoItemCode: "15",
        taxTreatment: "taxable",
        commonSources: ["Client contracts", "Invoices"]
      },
      {
        code: "FREEL_CREATIVE",
        name: "Creative Work",
        description: "Design, writing, photography, video income",
        atoItemCode: "15",
        taxTreatment: "taxable",
        commonSources: ["Platform payments", "Client invoices", "Royalty statements"]
      },
      {
        code: "FREEL_PLATFORM",
        name: "Platform/Gig Work",
        description: "Uber, Airtasker, Fiverr, Upwork income",
        atoItemCode: "15",
        taxTreatment: "taxable",
        commonSources: ["Platform tax summaries", "Payment reports"]
      },
      {
        code: "FREEL_CONTRACTOR",
        name: "Contractor Payments",
        description: "Payments as independent contractor",
        atoItemCode: "15",
        taxTreatment: "taxable",
        commonSources: ["Tax invoices", "Payment summaries"]
      }
    ],
    taxTreatment: "taxable",
    source: "australia",
    frequency: ["irregular", "weekly", "monthly"],
    recordKeeping: {
      description: "Keep all invoices and business expense receipts",
      requiredDocuments: ["Tax invoices issued", "Business expense receipts", "Bank statements", "Logbooks"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: false,
    commonMistakes: [
      "Not keeping business expense receipts",
      "Mixing personal and business expenses",
      "Not registering for GST when over $75k",
      "Forgetting to pay quarterly PAYG instalments"
    ],
    tips: [
      "Open a separate business bank account",
      "Use accounting software like Xero or MYOB",
      "Consider quarterly tax planning to avoid surprises",
      "Home office expenses may be claimable"
    ],
    atoReference: "https://www.ato.gov.au/business",
    priority: "medium",
    estimatedReportingPercentage: 12
  },

  // TRUST_DISTRIBUTIONS - Trust Distributions
  {
    code: "TRUST_DISTRIBUTIONS",
    name: "Trust Distributions",
    shortDescription: "Income from family trusts or unit trusts",
    fullDescription: `Income distributed to you from a family trust, unit trust, or managed investment trust. May include franked dividends, capital gains, and other components with different tax treatments.`,
    atoLabel: "Trust distributions",
    atoItemCodes: ["13", "12"],
    workpaperAssociation: "trust-distributions",
    subcategories: [
      {
        code: "TRUST_FAMILY",
        name: "Family Trust Distribution",
        description: "Distribution from discretionary family trust",
        atoItemCode: "13",
        taxTreatment: "taxable",
        commonSources: ["Trust distribution statements"]
      },
      {
        code: "TRUST_UNIT",
        name: "Unit Trust Distribution",
        description: "Distribution from fixed unit trust",
        atoItemCode: "13",
        taxTreatment: "taxable",
        commonSources: ["Trust distribution statements"]
      },
      {
        code: "TRUST_MANAGED",
        name: "Managed Fund Distribution",
        description: "Distribution from managed investment scheme",
        atoItemCode: "12",
        taxTreatment: "taxable",
        commonSources: ["AMIT statements", "Distribution statements"]
      },
      {
        code: "TRUST_CAPITAL",
        name: "Trust Capital Gains",
        description: "Capital gains component of trust distribution",
        atoItemCode: "18A",
        taxTreatment: "taxable",
        commonSources: ["Trust distribution statements - CGT schedule"]
      },
      {
        code: "TRUST_FRANKED",
        name: "Trust Franked Dividends",
        description: "Franked dividends flowing through trust",
        atoItemCode: "11",
        taxTreatment: "taxable",
        commonSources: ["Trust distribution statements"]
      }
    ],
    taxTreatment: "taxable",
    source: "australia",
    frequency: ["annually", "quarterly"],
    recordKeeping: {
      description: "Keep all trust distribution statements with component breakdowns",
      requiredDocuments: ["Trust distribution statements", "AMIT statements", "Taxable component schedules"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: true,
    commonMistakes: [
      "Not reporting each component separately",
      "Missing franking credits from trust distributions",
      "Forgetting to report trust capital gains",
      "Not keeping the detailed component statement"
    ],
    tips: [
      "Trust distributions can have multiple components - each goes to different items",
      "Retain the full distribution statement - ATO may request it",
      "Managed funds may provide AMIT statements with tax deferred amounts",
      "Consider trust distribution resolution timing"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/trust-distributions",
    priority: "medium",
    estimatedReportingPercentage: 8
  },

  // FOREIGN_INCOME - Foreign Income
  {
    code: "FOREIGN_INCOME",
    name: "Foreign Income",
    shortDescription: "Income from overseas sources",
    fullDescription: `Income earned from foreign sources including employment, investments, pensions, and business. Must be reported in Australian dollars with foreign tax credits claimed for tax already paid overseas.`,
    atoLabel: "Foreign income",
    atoItemCodes: ["20", "22"],
    workpaperAssociation: "foreign-income",
    subcategories: [
      {
        code: "FOREIGN_EMPLOYMENT",
        name: "Foreign Employment Income",
        description: "Salary from overseas employment",
        atoItemCode: "20",
        taxTreatment: "taxable",
        commonSources: ["Foreign payment summaries", "Employment contracts"]
      },
      {
        code: "FOREIGN_INVESTMENT",
        name: "Foreign Investment Income",
        description: "Interest, dividends, royalties from overseas",
        atoItemCode: "20",
        taxTreatment: "taxable",
        commonSources: ["Foreign bank statements", "Dividend vouchers"]
      },
      {
        code: "FOREIGN_PENSION",
        name: "Foreign Pension",
        description: "Pension from foreign government or scheme",
        atoItemCode: "20",
        taxTreatment: "taxable",
        commonSources: ["Pension statements", "Foreign tax documents"]
      },
      {
        code: "FOREIGN_BUSINESS",
        name: "Foreign Business Income",
        description: "Business income from overseas operations",
        atoItemCode: "20",
        taxTreatment: "taxable",
        commonSources: ["Business accounts", "Foreign tax returns"]
      },
      {
        code: "FOREIGN_CGT",
        name: "Foreign Capital Gains",
        description: "CGT events on foreign assets",
        atoItemCode: "18A",
        taxTreatment: "taxable",
        commonSources: ["Foreign brokerage statements"]
      }
    ],
    taxTreatment: "taxable",
    source: "foreign",
    frequency: ["irregular", "monthly", "annually"],
    recordKeeping: {
      description: "Keep foreign income records and proof of foreign tax paid",
      requiredDocuments: ["Foreign income documents", "Foreign tax paid receipts", "Exchange rate calculations"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: false,
    commonMistakes: [
      "Not converting to Australian dollars",
      "Forgetting to claim foreign tax credits",
      "Not reporting exempt foreign employment income",
      "Missing foreign bank account FBAR reporting requirements"
    ],
    tips: [
      "Convert using ATO exchange rates or actual rates received",
      "Claim foreign tax credits to avoid double taxation",
      "Some short-term foreign employment may be exempt",
      "Report foreign bank accounts if total value > $10,000"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/foreign-income",
    priority: "medium",
    estimatedReportingPercentage: 5
  },

  // GOVERNMENT_PAYMENTS - Government Payments
  {
    code: "GOVERNMENT_PAYMENTS",
    name: "Government Payments",
    shortDescription: "Centrelink and other government benefits",
    fullDescription: `Government payments including Centrelink benefits, JobSeeker, Youth Allowance, Austudy, and parenting payments. Some are taxable, some are tax-free but affect other entitlements.`,
    atoLabel: "Australian Government allowances",
    atoItemCodes: ["5", "6"],
    workpaperAssociation: "government-payments",
    subcategories: [
      {
        code: "GOVT_JOBSEEKER",
        name: "JobSeeker Payment",
        description: "Unemployment benefit from Centrelink",
        atoItemCode: "5",
        taxTreatment: "taxable",
        commonSources: ["Centrelink payment summary", "myGov"]
      },
      {
        code: "GOVT_YOUTH",
        name: "Youth Allowance",
        description: "Student or unemployed youth payment",
        atoItemCode: "5",
        taxTreatment: "taxable",
        commonSources: ["Centrelink payment summary"]
      },
      {
        code: "GOVT_AUSTUDY",
        name: "Austudy",
        description: "Payment for full-time students",
        atoItemCode: "5",
        taxTreatment: "taxable",
        commonSources: ["Centrelink payment summary"]
      },
      {
        code: "GOVT_PARENTING",
        name: "Parenting Payment",
        description: "Income support for primary carers",
        atoItemCode: "5",
        taxTreatment: "taxable",
        commonSources: ["Centrelink payment summary"]
      },
      {
        code: "GOVT_FTB",
        name: "Family Tax Benefit",
        description: "Payment to help with cost of children",
        atoItemCode: "6",
        taxTreatment: "tax_free",
        commonSources: ["Centrelink statements"]
      }
    ],
    taxTreatment: "taxable",
    source: "australia",
    frequency: ["fortnightly"],
    recordKeeping: {
      description: "Keep Centrelink payment summaries",
      requiredDocuments: ["Centrelink payment summary", "myGov income statement"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: true,
    commonMistakes: [
      "Not declaring taxable government payments",
      "Confusing taxable vs non-taxable benefits",
      "Not declaring lump sum back payments correctly",
      "Missing reportable fringe benefits from Centrelink"
    ],
    tips: [
      "Most working-age Centrelink payments are taxable",
      "Family Tax Benefit is not taxable but may affect Medicare levy",
      "Lump sum back payments may need to be spread across years",
      "Check myGov for pre-filled information"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/australian-government-allowances-and-payments",
    priority: "medium",
    estimatedReportingPercentage: 20
  },

  // SUPER_PENSION - Superannuation Pension
  {
    code: "SUPER_PENSION",
    name: "Superannuation Pension",
    shortDescription: "Income stream from superannuation",
    fullDescription: `Regular income payments from a superannuation fund in pension phase. Different tax treatment applies depending on your age and whether the component is tax-free or taxable.`,
    atoLabel: "Super income stream",
    atoItemCodes: ["7A", "7B"],
    workpaperAssociation: "super-pension",
    subcategories: [
      {
        code: "SUPER_TAX_FREE",
        name: "Tax-Free Component",
        description: "Non-concessional contributions and crystallized segments",
        atoItemCode: "7A",
        taxTreatment: "tax_free",
        commonSources: ["Super fund payment summary", "Pension statements"]
      },
      {
        code: "SUPER_TAXABLE",
        name: "Taxable Component",
        description: "Concessional contributions and earnings",
        atoItemCode: "7B",
        taxTreatment: "concessional",
        commonSources: ["Super fund payment summary"]
      },
      {
        code: "SUPER_DEATH",
        name: "Death Benefit Pension",
        description: "Pension received as beneficiary",
        atoItemCode: "7",
        taxTreatment: "concessional",
        commonSources: ["Super fund beneficiary statement"]
      },
      {
        code: "SUPER_TPI",
        name: "Disability/Invalidity Pension",
        description: "Pension due to permanent incapacity",
        atoItemCode: "7",
        taxTreatment: "concessional",
        commonSources: ["Super fund disability documentation"]
      }
    ],
    taxTreatment: "concessional",
    source: "australia",
    frequency: ["monthly", "quarterly"],
    recordKeeping: {
      description: "Keep super fund payment summaries showing components",
      requiredDocuments: ["Super fund payment summary", "Pension statements with component split"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: true,
    commonMistakes: [
      "Not reporting both tax-free and taxable components",
      "Forgetting 15% tax offset on taxable component for over 60s",
      "Not considering transfer balance cap implications",
      "Missing death benefit pension reporting"
    ],
    tips: [
      "Over 60: Tax-free component is tax-free, taxable component gets 15% offset",
      "Under 60: Taxable component taxed at marginal rates with 15% offset",
      "Keep track of your transfer balance cap",
      "Death benefit pensions have special rules"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/super-income-streams",
    priority: "low",
    estimatedReportingPercentage: 8
  },

  // SUPER_LUMPSUM - Superannuation Lump Sums
  {
    code: "SUPER_LUMPSUM",
    name: "Superannuation Lump Sums",
    shortDescription: "One-off payments from superannuation",
    fullDescription: `One-time withdrawals from superannuation including retirement benefits, death benefits, and disability payments. Tax treatment varies significantly based on age and circumstances.`,
    atoLabel: "Super lump sum",
    atoItemCodes: ["8A", "8B"],
    workpaperAssociation: "super-lumpsum",
    subcategories: [
      {
        code: "LUMP_RETIREMENT",
        name: "Retirement Lump Sum",
        description: "Withdrawal upon reaching preservation age",
        atoItemCode: "8A",
        taxTreatment: "concessional",
        commonSources: ["Super fund benefit statement"]
      },
      {
        code: "LUMP_DEATH",
        name: "Death Benefit Lump Sum",
        description: "Lump sum paid to beneficiary on death",
        atoItemCode: "8B",
        taxTreatment: "concessional",
        commonSources: ["Super fund death benefit statement"]
      },
      {
        code: "LUMP_DISABILITY",
        name: "Disability/Invalidity Lump Sum",
        description: "Payment due to permanent incapacity",
        atoItemCode: "8A",
        taxTreatment: "concessional",
        commonSources: ["Super fund disability documentation"]
      },
      {
        code: "LUMP_TERMINATION",
        name: "Termination Payment (Pre-1999)",
        description: "Employment termination rolled into super",
        atoItemCode: "8A",
        taxTreatment: "concessional",
        commonSources: ["Super fund statements"]
      }
    ],
    taxTreatment: "concessional",
    source: "australia",
    frequency: ["irregular"],
    recordKeeping: {
      description: "Keep super fund benefit payment statements",
      requiredDocuments: ["Super fund lump sum payment statement", "Benefit payment breakdown"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: true,
    commonMistakes: [
      "Not reporting taxable component correctly",
      "Missing low rate cap application for 55-59 age group",
      "Forgetting death benefits may have different tax rates",
      "Not considering withholding tax implications"
    ],
    tips: [
      "Over 60: Generally tax-free",
      "55-59: Taxable component taxed at 15% up to low rate cap",
      "Under 55: Taxable component added to income at marginal rates",
      "Death benefits to non-dependents have different tax treatment"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/super-lump-sums",
    priority: "low",
    estimatedReportingPercentage: 5
  },

  // EMPLOYMENT_TERMINATION - Employment Termination Payments
  {
    code: "EMPLOYMENT_TERMINATION",
    name: "Employment Termination Payments",
    shortDescription: "ETP from redundancy or termination",
    fullDescription: `Payments received when employment ends including genuine redundancy, early retirement scheme payments, golden handshakes, and unused leave. Different tax rates apply to different components.`,
    atoLabel: "Employment termination payments",
    atoItemCodes: ["4"],
    workpaperAssociation: "etp-payments",
    subcategories: [
      {
        code: "ETP_REDUNDANCY",
        name: "Genuine Redundancy",
        description: "Tax-free and taxable redundancy payments",
        atoItemCode: "4",
        taxTreatment: "concessional",
        commonSources: ["Employer ETP payment summary", "Redundancy letter"]
      },
      {
        code: "ETP_EARLY_RETIREMENT",
        name: "Early Retirement Scheme",
        description: "Payments under approved early retirement scheme",
        atoItemCode: "4",
        taxTreatment: "concessional",
        commonSources: ["Employer payment summary", "Scheme approval letter"]
      },
      {
        code: "ETP_GRATUITY",
        name: "Gratuity/Golden Handshake",
        description: "Voluntary termination payments",
        atoItemCode: "4",
        taxTreatment: "concessional",
        commonSources: ["Employer payment summary"]
      },
      {
        code: "ETP_NON_GENUINE",
        name: "Non-Genuine Redundancy",
        description: "Termination payments not meeting genuine redundancy criteria",
        atoItemCode: "4",
        taxTreatment: "concessional",
        commonSources: ["Employer payment summary"]
      }
    ],
    taxTreatment: "concessional",
    source: "australia",
    frequency: ["irregular"],
    recordKeeping: {
      description: "Keep ETP payment summaries and redundancy documentation",
      requiredDocuments: ["ETP payment summary", "Redundancy letter", "Termination agreement"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: true,
    commonMistakes: [
      "Not splitting tax-free and taxable components",
      "Missing ETP caps and offsets",
      "Not considering whole-of-income cap",
      "Confusing ETP with normal termination leave payments"
    ],
    tips: [
      "Genuine redundancy has tax-free base amount + service amount",
      "ETP tax is capped and may include offsets",
      "Cannot roll ETP into superannuation",
      "Get professional advice for large ETPs"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/employment-termination-payments-etps",
    priority: "low",
    estimatedReportingPercentage: 3
  },

  // ROYALTIES - Royalties
  {
    code: "ROYALTIES",
    name: "Royalties",
    shortDescription: "Royalties from intellectual property",
    fullDescription: `Income from intellectual property including book royalties, music royalties, patent royalties, and licensing fees. May be treated as business income or investment income depending on circumstances.`,
    atoLabel: "Royalties",
    atoItemCodes: ["23"],
    workpaperAssociation: "royalties",
    subcategories: [
      {
        code: "ROYALTY_BOOK",
        name: "Book/Writing Royalties",
        description: "Royalties from published works",
        atoItemCode: "23",
        taxTreatment: "taxable",
        commonSources: ["Publisher royalty statements"]
      },
      {
        code: "ROYALTY_MUSIC",
        name: "Music/Performance Royalties",
        description: "APRA/AMCOS royalties, mechanical royalties",
        atoItemCode: "23",
        taxTreatment: "taxable",
        commonSources: ["APRA statements", "Record label statements"]
      },
      {
        code: "ROYALTY_PATENT",
        name: "Patent/Licensing",
        description: "Royalties from patents, trademarks, know-how",
        atoItemCode: "23",
        taxTreatment: "taxable",
        commonSources: ["License agreements", "Royalty statements"]
      },
      {
        code: "ROYALTY_SOFTWARE",
        name: "Software/IP Licensing",
        description: "Licensing fees for software or digital products",
        atoItemCode: "23",
        taxTreatment: "taxable",
        commonSources: ["Platform reports", "License agreements"]
      }
    ],
    taxTreatment: "taxable",
    source: "both",
    frequency: ["irregular", "quarterly", "annually"],
    recordKeeping: {
      description: "Keep royalty statements and licensing agreements",
      requiredDocuments: ["Royalty statements", "License agreements", "Platform reports"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: false,
    commonMistakes: [
      "Not declaring royalties as assessable income",
      "Confusing royalties with capital gains from IP sale",
      "Not claiming related expenses",
      "Missing foreign royalty withholding tax credits"
    ],
    tips: [
      "Royalties are generally ordinary income, not capital gains",
      "Related expenses (agents, marketing) may be deductible",
      "Foreign royalties may have withholding tax - claim credit",
      "Consider income averaging for fluctuating royalties"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/royalties",
    priority: "low",
    estimatedReportingPercentage: 2
  },

  // OTHER - Other Income
  {
    code: "OTHER",
    name: "Other Income",
    shortDescription: "Miscellaneous income not elsewhere classified",
    fullDescription: `Other assessable income not covered by other categories including prizes, crowdfunding, insurance payouts, and recoveries. Each type has specific tax treatment.`,
    atoLabel: "Other income",
    atoItemCodes: ["24X"],
    workpaperAssociation: "other-income",
    subcategories: [
      {
        code: "OTHER_PRIZES",
        name: "Prizes and Awards",
        description: "Cash prizes and awards (may be tax-free in some cases)",
        atoItemCode: "24X",
        taxTreatment: "taxable",
        commonSources: ["Prize documentation", "Award certificates"]
      },
      {
        code: "OTHER_CROWDFUNDING",
        name: "Crowdfunding",
        description: "Income from crowdfunding campaigns",
        atoItemCode: "24X",
        taxTreatment: "taxable",
        commonSources: ["Crowdfunding platform reports"]
      },
      {
        code: "OTHER_INSURANCE",
        name: "Insurance Payouts",
        description: "Income component of insurance settlements",
        atoItemCode: "24X",
        taxTreatment: "taxable",
        commonSources: ["Insurance settlement statements"]
      },
      {
        code: "OTHER_RECOVERY",
        name: "Bad Debt Recovery",
        description: "Recovery of previously written-off amounts",
        atoItemCode: "24X",
        taxTreatment: "taxable",
        commonSources: ["Recovery documentation"]
      },
      {
        code: "OTHER_REFUNDS",
        name: "Refunds of Deducted Expenses",
        description: "Refunds of expenses previously claimed",
        atoItemCode: "24X",
        taxTreatment: "taxable",
        commonSources: ["Refund receipts"]
      }
    ],
    taxTreatment: "taxable",
    source: "both",
    frequency: ["irregular"],
    recordKeeping: {
      description: "Keep documentation for all miscellaneous income",
      requiredDocuments: ["Income documentation", "Contracts", "Settlement statements"],
      retentionPeriod: "5 years from lodgment date"
    },
    prefillAvailable: false,
    commonMistakes: [
      "Not declaring prizes thinking they are tax-free",
      "Missing crowdfunding income reporting",
      "Not including refunded expenses",
      "Confusing capital vs revenue receipts"
    ],
    tips: [
      "Most prizes are taxable unless specifically exempt",
      "Crowdfunding is income if you provide goods/services",
      "Donation-based crowdfunding may not be income",
      "Seek advice for unusual income types"
    ],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare",
    priority: "low",
    estimatedReportingPercentage: 3
  }
];

/**
 * Get all income categories
 */
export function getAllIncomeCategories(): IncomeCategory[] {
  return incomeCategories;
}

/**
 * Get income category by code
 */
export function getIncomeCategoryByCode(code: IncomeCategoryCode): IncomeCategory | undefined {
  return incomeCategories.find(cat => cat.code === code);
}

/**
 * Get income categories by priority
 */
export function getIncomeCategoriesByPriority(priority: "high" | "medium" | "low"): IncomeCategory[] {
  return incomeCategories.filter(cat => cat.priority === priority);
}

/**
 * Get income categories with prefill availability
 */
export function getPrefillableIncomeCategories(): IncomeCategory[] {
  return incomeCategories.filter(cat => cat.prefillAvailable);
}

/**
 * Get high-priority categories (for initial setup/UI)
 */
export function getHighPriorityCategories(): IncomeCategory[] {
  return incomeCategories.filter(cat => cat.priority === "high");
}

/**
 * Search income categories by name or description
 */
export function searchIncomeCategories(query: string): IncomeCategory[] {
  const lowercaseQuery = query.toLowerCase();
  return incomeCategories.filter(cat => 
    cat.name.toLowerCase().includes(lowercaseQuery) ||
    cat.shortDescription.toLowerCase().includes(lowercaseQuery) ||
    cat.fullDescription.toLowerCase().includes(lowercaseQuery)
  );
}

/**
 * Get subcategory by code
 */
export function getSubcategoryByCode(subcategoryCode: string): { category: IncomeCategory; subcategory: IncomeSubcategory } | undefined {
  for (const category of incomeCategories) {
    const subcategory = category.subcategories.find(sub => sub.code === subcategoryCode);
    if (subcategory) {
      return { category, subcategory };
    }
  }
  return undefined;
}

/**
 * Get all subcategories for a category
 */
export function getSubcategoriesForCategory(categoryCode: IncomeCategoryCode): IncomeSubcategory[] {
  const category = getIncomeCategoryByCode(categoryCode);
  return category?.subcategories || [];
}

/**
 * Get ATO item codes summary for all categories
 * Useful for tax return preparation
 */
export function getAtoItemCodesSummary(): { code: string; category: string; atoItems: string[] }[] {
  return incomeCategories.map(cat => ({
    code: cat.code,
    category: cat.name,
    atoItems: cat.atoItemCodes || []
  }));
}

/**
 * Get income categories requiring specific workpapers
 */
export function getCategoriesWithWorkpapers(): IncomeCategory[] {
  return incomeCategories.filter(cat => cat.workpaperAssociation);
}

/**
 * Validate income amount against category typical ranges
 * Returns warning if amount seems unusual
 */
export function validateIncomeAmount(
  categoryCode: IncomeCategoryCode, 
  amount: number
): { valid: boolean; warning?: string } {
  // This is a simplified validation - in practice, you'd have more sophisticated rules
  if (amount < 0) {
    return { valid: false, warning: "Income amount cannot be negative" };
  }
  
  if (amount === 0) {
    return { valid: true, warning: "Amount is zero - verify if this is intentional" };
  }
  
  // Very large amounts might warrant review
  if (amount > 10000000) { // $10M
    return { valid: true, warning: "Very large amount - please verify" };
  }
  
  return { valid: true };
}
