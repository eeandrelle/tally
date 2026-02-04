/**
 * ATO Category Database - Complete D1-D15 Deduction Categories
 * 
 * This module provides comprehensive ATO tax deduction categories with metadata
 * including descriptions, receipt requirements, claim limits, and record keeping.
 * 
 * Categories based on Australian Taxation Office Individual Tax Return Guide
 * FY 2024-2025
 */

export type AtoCategoryCode = 
  | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7" | "D8" | "D9" 
  | "D10" | "D11" | "D12" | "D13" | "D14" | "D15";

export type ReceiptRequirement = "required" | "recommended" | "not_required" | "depends";
export type RecordKeepingPeriod = "5_years" | "28_days" | "12_weeks" | "ongoing" | "not_required";

export interface AtoCategory {
  code: AtoCategoryCode;
  name: string;
  shortDescription: string;
  fullDescription: string;
  eligibilityCriteria: string[];
  claimLimits?: {
    description: string;
    amount?: number;
    percentage?: number;
    method?: "cents_per_km" | "logbook" | "actual_costs" | "fixed_rate" | "other";
  };
  receiptRequirements: {
    required: ReceiptRequirement;
    description: string;
    thresholdAmount?: number;
  };
  recordKeeping: {
    period: RecordKeepingPeriod;
    description: string;
    specificRequirements?: string[];
  };
  typicalWorksheetItems?: string[];
  relatedCategories?: AtoCategoryCode[];
  atoReference: string;
  commonMistakes: string[];
  tips: string[];
  examples: {
    claimable: string[];
    notClaimable: string[];
  };
  priority: "high" | "medium" | "low";
  estimatedUsersPercentage: number; // Percentage of taxpayers who typically claim this
}

/**
 * Complete ATO Deduction Categories D1-D15
 */
export const atoCategories: AtoCategory[] = [
  // D1 - Work-related car expenses
  {
    code: "D1",
    name: "Work-related car expenses",
    shortDescription: "Car expenses for work-related travel",
    fullDescription: `Claim costs for using your own car for work-related purposes. This includes travel between workplaces, to meetings, or to remote job sites. Does NOT include normal commute between home and work unless carrying bulky tools or equipment that cannot be left at work.`,
    eligibilityCriteria: [
      "You use your car for work-related purposes",
      "You personally paid for the expenses",
      "You have records to support your claim",
      "Travel between workplaces or to alternate workplaces is claimable",
      "Normal home-to-work commute is NOT claimable (unless carrying bulky tools)"
    ],
    claimLimits: {
      description: "Choose between cents per km method (max 5,000 km at 88c/km for 2024-25) or logbook method (percentage of actual costs based on business use)",
      method: "cents_per_km",
      amount: 5000, // km limit for cents per km
    },
    receiptRequirements: {
      required: "depends",
      description: "Cents per km: No receipts needed but must keep diary record of work trips. Logbook: Keep receipts for 12 consecutive weeks plus all car expense receipts.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep records for 5 years from lodgment date",
      specificRequirements: [
        "Cents per km: Diary or log showing work-related trips (date, purpose, km)",
        "Logbook: 12 continuous weeks of business vs private use log",
        "All receipts for fuel, registration, insurance, servicing, depreciation"
      ]
    },
    typicalWorksheetItems: [
      "Cents per km work trips",
      "Logbook business use percentage",
      "Fuel and oil costs",
      "Registration and insurance",
      "Servicing and repairs",
      "Depreciation (logbook method only)",
      "Interest on car loan (logbook method only)"
    ],
    relatedCategories: ["D2", "D5"],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/cars-transport-and-travel",
    commonMistakes: [
      "Claiming home-to-work commute",
      "Using both methods for the same car",
      "Not keeping required logbook for logbook method",
      "Claiming more than 5,000 km under cents per km method"
    ],
    tips: [
      "Calculate both methods - choose the higher deduction",
      "Keep a simple diary even if using cents per km",
      "Consider getting a logbook app for easier tracking",
      "Don't forget depreciation if using logbook method"
    ],
    examples: {
      claimable: [
        "Travel between different workplaces",
        "Client visits and meetings",
        "Travel to job sites",
        "Travel to conferences or training",
        "Carrying bulky tools (saws, ladders) that can't be left at work"
      ],
      notClaimable: [
        "Normal commute from home to regular workplace",
        "Private travel",
        "Car expenses reimbursed by employer",
        "Travel fines or parking penalties"
      ]
    },
    priority: "high",
    estimatedUsersPercentage: 35
  },

  // D2 - Work-related travel expenses
  {
    code: "D2",
    name: "Work-related travel expenses",
    shortDescription: "Travel expenses excluding car expenses",
    fullDescription: `Claim costs for work-related travel when you stay away from home overnight. Includes accommodation, meals, incidentals. Also includes public transport, taxis, rideshare, and airfares for work purposes (including same-day trips).`,
    eligibilityCriteria: [
      "Travel is directly related to your work",
      "You stayed away from home overnight (for accommodation claims)",
      "You paid for the expenses yourself",
      "You have receipts or other evidence"
    ],
    claimLimits: {
      description: "Reasonable amounts apply for meals and incidentals when travelling for work. Check ATO reasonable amounts for your salary level and location.",
      method: "actual_costs"
    },
    receiptRequirements: {
      required: "required",
      description: "Receipts required for all expenses over $300 total for a trip. Keep receipts for accommodation, flights, meals, and incidentals.",
      thresholdAmount: 300
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep receipts and travel records for 5 years",
      specificRequirements: [
        "Receipts for all expenses",
        "Travel itinerary or diary showing work purpose",
        "Evidence of work-related reason for travel"
      ]
    },
    typicalWorksheetItems: [
      "Airfares and baggage fees",
      "Accommodation costs",
      "Meals (overnight travel only)",
      "Taxi/rideshare fares",
      "Public transport",
      "Car hire",
      "Parking and tolls",
      "Incidental expenses"
    ],
    relatedCategories: ["D1", "D5"],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/cars-transport-and-travel",
    commonMistakes: [
      "Claiming meals for same-day travel (not overnight)",
      "Not keeping receipts for accommodation",
      "Claiming private travel expenses",
      "Exceeding reasonable amounts without justification"
    ],
    tips: [
      "Keep a travel diary noting work purpose",
      "Use per diem rates if provided by employer",
      "Separate personal days if extending for holiday",
      "Keep boarding passes and booking confirmations"
    ],
    examples: {
      claimable: [
        "Overnight accommodation for work conference",
        "Flights to attend work meetings interstate",
        "Meals during overnight work trips",
        "Taxi from airport to hotel for work travel",
        "Public transport to client meetings"
      ],
      notClaimable: [
        "Meals during normal work day (not overnight)",
        "Personal sightseeing during work trip",
        "Travel to and from work (normal commute)",
        "Travel reimbursed by employer"
      ]
    },
    priority: "high",
    estimatedUsersPercentage: 15
  },

  // D3 - Work-related clothing, laundry and dry-cleaning expenses
  {
    code: "D3",
    name: "Work-related clothing, laundry and dry-cleaning",
    shortDescription: "Occupation-specific and protective clothing",
    fullDescription: `Claim costs for occupation-specific clothing, protective clothing, and compulsory uniforms. Also includes laundry and dry-cleaning costs for eligible work clothing.`,
    eligibilityCriteria: [
      "Clothing is occupation-specific (distinctive to your job)",
      "OR protective clothing required for work safety",
      "OR compulsory uniform with employer logo",
      "Non-compulsory uniforms must be registered with ATO by employer",
      "You paid for cleaning costs yourself"
    ],
    claimLimits: {
      description: "Laundry: $1 per load for work clothing only, 50c per load if mixed. Dry cleaning: actual cost with receipts. Clothing: actual cost for eligible items.",
      method: "actual_costs"
    },
    receiptRequirements: {
      required: "depends",
      description: "Receipts required for clothing purchases and dry cleaning. Laundry: can claim without receipts up to $150 using reasonable basis.",
      thresholdAmount: 150
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep receipts for clothing and dry cleaning. For laundry diary - reasonable estimate acceptable.",
      specificRequirements: [
        "Receipts for clothing purchases",
        "Receipts for dry cleaning",
        "Diary of laundry loads (optional but recommended)"
      ]
    },
    typicalWorksheetItems: [
      "Occupation-specific clothing",
      "Protective clothing and footwear",
      "Compulsory uniform items",
      "Registered non-compulsory uniforms",
      "Laundry costs",
      "Dry cleaning costs"
    ],
    relatedCategories: ["D5"],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/clothing-and-laundry",
    commonMistakes: [
      "Claiming conventional clothing (suits, black pants)",
      "Claiming without required logo or registration",
      "Not apportioning for private use",
      "Claiming laundry for non-eligible clothing"
    ],
    tips: [
      "Keep clothing receipts separate from regular clothes",
      "Photograph employer logos on uniforms",
      "Use reasonable basis for laundry: $1 per load work-only, 50c mixed",
      "Check if non-compulsory uniform is registered with ATO"
    ],
    examples: {
      claimable: [
        "Chef's checkered pants and white jacket",
        "Safety boots and high-vis vest",
        "Uniform with permanently attached employer logo",
        "Protective gloves and safety glasses",
        "Laundry costs for eligible work clothing"
      ],
      notClaimable: [
        "Conventional business suits or black pants",
        "Plain white shirts or black shoes",
        "Non-compulsory uniform not registered with ATO",
        "Clothing worn for fashion not safety"
      ]
    },
    priority: "medium",
    estimatedUsersPercentage: 25
  },

  // D4 - Work-related self-education expenses
  {
    code: "D4",
    name: "Work-related self-education expenses",
    shortDescription: "Education directly related to current employment",
    fullDescription: `Claim costs for self-education if the study maintains or improves skills required for your current employment, or is likely to result in increased income from your current employment. Course must be directly related to current job, not future career.`,
    eligibilityCriteria: [
      "Course maintains or improves skills for current employment",
      "OR course is likely to increase income from current employment",
      "Study is directly related to current occupation",
      "You paid the expenses yourself"
    ],
    claimLimits: {
      description: "Must apportion expenses if course also provides general education or future career benefits. First $250 of non-deductible expenses reduces deductible amount.",
      method: "actual_costs"
    },
    receiptRequirements: {
      required: "required",
      description: "Receipts required for all expenses including course fees, textbooks, stationery, and travel.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep all receipts and course documentation for 5 years",
      specificRequirements: [
        "Course enrollment receipts and invoices",
        "Textbook and equipment receipts",
        "Travel receipts for course attendance",
        "Course syllabus showing work relevance"
      ]
    },
    typicalWorksheetItems: [
      "Course fees and tuition",
      "Textbooks and course materials",
      "Stationery and consumables",
      "Travel to course location",
      "Depreciation on equipment over $300",
      "Internet and home office portion",
      "Student union fees"
    ],
    relatedCategories: ["D5"],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/self-education-expenses",
    commonMistakes: [
      "Claiming for future career change (not current job)",
      "Not apportioning for private benefit",
      "Forgetting the $250 reduction rule",
      "Claiming HECS/HELP repayments"
    ],
    tips: [
      "Keep course brochure showing work relevance",
      "Apportion internet based on study hours",
      "First $250 of non-deductible expenses reduces claim",
      "Can claim depreciation on computer/equipment over $300"
    ],
    examples: {
      claimable: [
        "CPA course for current accounting role",
        "Project management certification for current PM job",
        "Programming course to upgrade developer skills",
        "Management course for promotion in current company",
        "Safety certification required for current trade"
      ],
      notClaimable: [
        "Degree to change careers entirely",
        "General interest course not work-related",
        "Course for future dream job (not current role)",
        "HECS/HELP repayments"
      ]
    },
    priority: "medium",
    estimatedUsersPercentage: 10
  },

  // D5 - Other work-related expenses
  {
    code: "D5",
    name: "Other work-related expenses",
    shortDescription: "Other expenses related to earning income",
    fullDescription: `Claim other work-related expenses not covered elsewhere. Includes home office expenses (non-WFH), phone and internet, union fees, professional subscriptions, seminars, reference books, and equipment under $300.`,
    eligibilityCriteria: [
      "Expense is directly related to earning your income",
      "You paid for it yourself",
      "You were not reimbursed",
      "You have records to prove it"
    ],
    claimLimits: {
      description: "Items $300 or less can be claimed immediately. Items over $300 must be depreciated. Home office running expenses use fixed rate or actual costs.",
      method: "actual_costs"
    },
    receiptRequirements: {
      required: "depends",
      description: "Receipts required for items over $300 or for depreciation. Phone/internet: keep bills and diary showing work percentage.",
      thresholdAmount: 300
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep receipts for 5 years. For phone/internet: 4-week diary showing work use.",
      specificRequirements: [
        "Receipts for all purchases",
        "4-week diary for phone/internet work percentage",
        "Receipts for union fees and subscriptions",
        "Home office hours diary if claiming running costs"
      ]
    },
    typicalWorksheetItems: [
      "Union and professional association fees",
      "Professional subscriptions",
      "Work-related phone and internet",
      "Home office running expenses (non-WFH)",
      "Reference books and technical journals",
      "Tools and equipment under $300",
      "Work-related seminars and conferences",
      "First aid courses"
    ],
    relatedCategories: ["D1", "D2", "D3", "D4", "D6"],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/home-office-expenses",
    commonMistakes: [
      "Claiming private expenses",
      "Not apportioning phone/internet for private use",
      "Claiming equipment over $300 immediately (should depreciate)",
      "Double claiming with other categories"
    ],
    tips: [
      "Keep 4-week diary for phone/internet apportionment",
      "Claim equipment under $300 immediately",
      "Home office: 67c/hour fixed rate for running costs",
      "Union fees are deductible even if industrial action occurs"
    ],
    examples: {
      claimable: [
        "Union membership fees",
        "Professional association subscriptions",
        "Work-related portion of phone bill",
        "Reference books for current job",
        "Tools and equipment under $300",
        "Overtime meal allowances (if paid)",
        "First aid certificate renewal"
      ],
      notClaimable: [
        "Private phone calls and internet use",
        "Commuting costs",
        "Childcare expenses",
        "Grooming and personal care",
        "Relocation costs"
      ]
    },
    priority: "high",
    estimatedUsersPercentage: 40
  },

  // D6 - Low-value pool deduction
  {
    code: "D6",
    name: "Low-value pool deduction",
    shortDescription: "Decline in value of low-cost and low-value assets",
    fullDescription: `Claim decline in value (depreciation) for low-cost assets ($300 or less) and low-value assets (pooled). Assets in the pool are depreciated at 37.5% (18.75% in first year).`,
    eligibilityCriteria: [
      "Asset used for income-producing purposes",
      "Low-cost asset: $300 or less (can claim immediately OR pool)",
      "Low-value asset: under $1,000 written-down value at start of year",
      "Asset not part of a set costing more than $300"
    ],
    claimLimits: {
      description: "Low-value pool depreciated at 37.5% annually (18.75% for first year additions). Immediate deduction available for assets $300 or less instead of pooling.",
      method: "fixed_rate",
      percentage: 37.5
    },
    receiptRequirements: {
      required: "required",
      description: "Receipts required for all asset purchases. Keep records of pool balance and calculations.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep purchase receipts and pool calculation records for 5 years after asset disposal",
      specificRequirements: [
        "Receipts for all pooled assets",
        "Pool balance worksheet",
        "Private use apportionment records",
        "Disposal records when assets sold/scrapped"
      ]
    },
    typicalWorksheetItems: [
      "Opening pool balance",
      "New assets added to pool (first year at 18.75%)",
      "Existing pool depreciation (37.5%)",
      "Private use adjustment",
      "Disposals and adjustments",
      "Closing pool balance"
    ],
    relatedCategories: ["D5"],
    atoReference: "https://www.ato.gov.au/businesses-and-organisations/depreciation-and-capital-expenses-and-allowances/depreciation-of-assets/low-value-pools",
    commonMistakes: [
      "Adding assets over $1,000 to low-value pool",
      "Not adjusting for private use",
      "Forgetting first-year assets are at 18.75%",
      "Pooling assets that should be immediately deducted"
    ],
    tips: [
      "Assets $300 or less: claim immediately OR pool",
      "First year pool rate is 18.75%, subsequent years 37.5%",
      "Keep running pool balance spreadsheet",
      "Don't pool assets with >50% private use"
    ],
    examples: {
      claimable: [
        "Computer equipment under $1,000 depreciated value",
        "Office furniture under $1,000",
        "Tools under $300 (if pooled rather than immediate)",
        "Software under $1,000",
        "Calculators and small electronics"
      ],
      notClaimable: [
        "Assets costing over $1,000 initially (use general depreciation)",
        "Assets with written-down value over $1,000",
        "Buildings and structural improvements",
        "Items of a set costing over $300 total"
      ]
    },
    priority: "low",
    estimatedUsersPercentage: 5
  },

  // D7 - Interest, dividends and other investment income deductions
  {
    code: "D7",
    name: "Interest, dividend and other investment income deductions",
    shortDescription: "Costs to earn interest, dividends or investment income",
    fullDescription: `Claim costs incurred to earn interest, dividends, or other investment income. Includes account fees, investment advice, interest on investment loans, and management fees.`,
    eligibilityCriteria: [
      "Expense directly related to earning investment income",
      "For interest income: costs of that specific account",
      "For dividends: costs related to share investments",
      "You paid the expense and were not reimbursed"
    ],
    claimLimits: {
      description: "Claim actual costs incurred. Apportion if expense relates to both income-producing and private investments.",
      method: "actual_costs"
    },
    receiptRequirements: {
      required: "required",
      description: "Receipts or statements showing fees and charges. Keep annual statements from financial institutions.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep statements and receipts for 5 years",
      specificRequirements: [
        "Bank and investment account statements",
        "Investment advice fee invoices",
        "Loan statements for investment loans",
        "Management fee statements"
      ]
    },
    typicalWorksheetItems: [
      "Account keeping fees for investment accounts",
      "Investment advice fees",
      "Interest on investment loans",
      "Share registry fees",
      "Investment property management fees",
      "Subscribing to investment publications",
      "Internet costs for managing investments"
    ],
    relatedCategories: ["D8"],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/investments",
    commonMistakes: [
      "Claiming fees for private savings accounts",
      "Not apportioning for mixed-use investments",
      "Claiming financial advice that includes non-deductible components",
      "Forgetting to claim share registry fees"
    ],
    tips: [
      "Keep all investment account statements",
      "Investment loan interest is deductible (not principal)",
      "Advice fees must relate to existing investments",
      "Claim internet proportion for managing investments"
    ],
    examples: {
      claimable: [
        "Bank account fees for term deposit account",
        "Interest on loan used to buy shares",
        "Share registry maintenance fees",
        "Investment newsletter subscription",
        "Financial advice fee for existing portfolio"
      ],
      notClaimable: [
        "Account fees for everyday savings account",
        "Interest on private home loan",
        "Advice for future investments (not yet made)",
        "Costs of attending investment seminars"
      ]
    },
    priority: "medium",
    estimatedUsersPercentage: 20
  },

  // D8 - Gifts and donations
  {
    code: "D8",
    name: "Gifts and donations",
    shortDescription: "Donations to deductible gift recipients",
    fullDescription: `Claim donations of $2 or more to deductible gift recipients (DGRs). Must be a genuine gift (not receiving anything in return). Can include money, property, shares, or cultural/bequest gifts.`,
    eligibilityCriteria: [
      "Donation of $2 or more",
      "Made to a Deductible Gift Recipient (DGR)",
      "Genuine gift with no material benefit received",
      "Must be money or property (not services)"
    ],
    claimLimits: {
      description: "Minimum $2 per donation. Some property donations have special rules. Cultural and bequest donations may have different limits.",
      method: "other"
    },
    receiptRequirements: {
      required: "required",
      description: "Receipt required for all donations showing DGR status, amount, and date. Can use credit card statement if receipt unavailable for small donations.",
      thresholdAmount: 2
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep receipts for 5 years",
      specificRequirements: [
        "Tax receipts from DGR organizations",
        "Credit card statements (backup only)",
        "Payroll giving statements from employer"
      ]
    },
    typicalWorksheetItems: [
      "Cash donations to charities",
      "Regular giving donations",
      "Donations to religious organizations",
      "Political donations (different rules apply)",
      "Cultural gifts program donations",
      "Workplace giving program donations"
    ],
    relatedCategories: [],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/gifts-and-donations",
    commonMistakes: [
      "Claiming raffle tickets or charity auctions",
      "Donating to non-DGR organizations",
      "Claiming volunteer time (not deductible)",
      "Not keeping receipts for donations"
    ],
    tips: [
      "Check DGR status at ABN Lookup before donating",
      "Consolidate receipts - many charities provide annual summary",
      "Workplace giving: pre-tax deduction through payroll",
      "Political donations have different rules and limits"
    ],
    examples: {
      claimable: [
        "Cash donation of $50 to registered charity",
        "Monthly donations to World Vision",
        "Church donations with receipt",
        "Disaster relief donations",
        "Workplace giving through salary sacrifice"
      ],
      notClaimable: [
        "Raffle or lottery tickets",
        "Charity auction purchases",
        "Volunteering time and services",
        "Donations to non-DGR crowdfunding",
        "Purchasing merchandise from charity"
      ]
    },
    priority: "medium",
    estimatedUsersPercentage: 30
  },

  // D9 - Cost of managing tax affairs
  {
    code: "D9",
    name: "Cost of managing tax affairs",
    shortDescription: "Costs to prepare and lodge your tax return",
    fullDescription: `Claim costs for preparing and lodging your tax return, including tax agent fees, tax reference materials, and travel to get tax advice.`,
    eligibilityCriteria: [
      "Expense relates to managing your tax affairs",
      "Includes tax return preparation and lodgment",
      "Can include travel to see tax agent",
      "You paid the expense yourself"
    ],
    claimLimits: {
      description: "Claim actual costs incurred including tax agent fees, tax books, and travel costs.",
      method: "actual_costs"
    },
    receiptRequirements: {
      required: "required",
      description: "Receipts required for tax agent fees and other expenses. Tax agent should provide tax invoice.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep receipts and tax agent invoices for 5 years",
      specificRequirements: [
        "Tax agent fee invoice",
        "Receipts for tax reference materials",
        "Travel receipts for tax advice visits"
      ]
    },
    typicalWorksheetItems: [
      "Tax agent fees",
      "Tax reference books and software",
      "Travel to tax agent",
      "Litigation costs for tax disputes",
      "Valuation fees for tax purposes"
    ],
    relatedCategories: [],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/cost-of-managing-tax-affairs",
    commonMistakes: [
      "Claiming private financial planning fees",
      "Not keeping tax agent invoices",
      "Claiming personal accounting software for budgeting",
      "Missing travel costs to see tax agent"
    ],
    tips: [
      "Tax agent fee is deductible in the year paid",
      "Keep invoice even if you prepare your own return",
      "Travel to tax agent includes parking and transport",
      "Tax litigation costs may be deductible"
    ],
    examples: {
      claimable: [
        "Tax agent fee for preparing return",
        "Cost of tax reference guide",
        "Parking when visiting tax agent",
        "Tax-related legal advice",
        "Depreciation schedule for rental property"
      ],
      notClaimable: [
        "General financial planning fees",
        "Budgeting software costs",
        "Personal bookkeeping services",
        "Investment advice (claim in D7 instead)"
      ]
    },
    priority: "high",
    estimatedUsersPercentage: 45
  },

  // D10 - Personal superannuation contributions
  {
    code: "D10",
    name: "Personal superannuation contributions",
    shortDescription: "Voluntary contributions to superannuation",
    fullDescription: `Claim personal contributions made to a complying superannuation fund or RSA. Must give your fund a notice of intent to claim and receive acknowledgment BEFORE claiming.`,
    eligibilityCriteria: [
      "Made personal (after-tax) contributions to super",
      "Fund is a complying super fund or RSA",
      "Submitted notice of intent to claim to fund",
      "Received acknowledgment from fund",
      "Under 75 years old (some exceptions apply)"
    ],
    claimLimits: {
      description: "Concessional contributions cap applies ($30,000 for 2024-25 including employer contributions). Contributions tax of 15% applies.",
      method: "other",
      amount: 30000
    },
    receiptRequirements: {
      required: "required",
      description: "Required: Notice of intent acknowledgment from super fund. Also keep contribution receipts.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep acknowledgment from super fund and contribution records permanently",
      specificRequirements: [
        "Notice of intent to claim deduction (submitted to fund)",
        "Acknowledgment letter from super fund (REQUIRED)",
        "Contribution receipts/statements",
        "Fund compliance statement"
      ]
    },
    typicalWorksheetItems: [
      "Personal super contributions",
      "Notice of intent date submitted",
      "Fund acknowledgment received",
      "Total concessional contributions (including employer)",
      "Contribution cap remaining"
    ],
    relatedCategories: [],
    atoReference: "https://www.ato.gov.au/individuals-and-families/super-for-individuals",
    commonMistakes: [
      "Claiming without fund acknowledgment",
      "Exceeding concessional contributions cap",
      "Claiming employer contributions (already done)",
      "Not submitting notice of intent in time"
    ],
    tips: [
      "Submit notice of intent BEFORE claiming",
      "Must receive acknowledgment from fund first",
      "Check total concessional cap ($30,000 for 2024-25)",
      "15% contributions tax applies to deducted amount"
    ],
    examples: {
      claimable: [
        "Personal contribution of $10,000 to super",
        "Spouse contribution (may have different rules)",
        "Self-employed super contributions"
      ],
      notClaimable: [
        "Employer super guarantee contributions",
        "Salary sacrifice (already concessional)",
        "Contributions without notice of intent",
        "Contributions exceeding the cap"
      ]
    },
    priority: "medium",
    estimatedUsersPercentage: 10
  },

  // D11 - Dividend tax offsets
  {
    code: "D11",
    name: "Dividend tax offsets",
    shortDescription: "Foreign income tax offsets for dividends",
    fullDescription: `Claim foreign income tax offsets for tax paid on foreign dividends. Offset is limited to the Australian tax payable on that foreign income.`,
    eligibilityCriteria: [
      "Received dividends from foreign sources",
      "Foreign tax was withheld from dividends",
      "Have evidence of foreign tax paid",
      "Not claiming foreign tax credit elsewhere"
    ],
    claimLimits: {
      description: "Offset limited to the lesser of: foreign tax paid, or Australian tax payable on that foreign income. Complex calculation for large amounts.",
      method: "other"
    },
    receiptRequirements: {
      required: "required",
      description: "Required: Dividend statements showing foreign tax withheld. Keep all foreign dividend statements.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep dividend statements and tax documents for 5 years",
      specificRequirements: [
        "Foreign dividend statements showing tax withheld",
        "Dividend reinvestment statements",
        "Foreign tax assessment documents"
      ]
    },
    typicalWorksheetItems: [
      "Foreign dividend income",
      "Foreign tax withheld",
      "Gross dividend amount",
      "Country of origin",
      "Dividend statement reference"
    ],
    relatedCategories: ["D7"],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/offsets-and-rebates/foreign-income-tax-offset",
    commonMistakes: [
      "Claiming franking credits here (claim separately)",
      "Not converting foreign amounts to AUD",
      "Double claiming foreign tax credit",
      "Missing dividend reinvestment statements"
    ],
    tips: [
      "Convert all amounts to Australian dollars",
      "Use ATO exchange rates or specific date rates",
      "Keep all foreign dividend statements",
      "Offset limited to Australian tax on that income"
    ],
    examples: {
      claimable: [
        "US dividend with 15% withholding tax",
        "UK dividend with foreign tax deducted",
        "International share ETF distributions"
      ],
      notClaimable: [
        "Australian franking credits (separate claim)",
        "Foreign income without tax paid",
        "Tax already claimed as credit elsewhere"
      ]
    },
    priority: "low",
    estimatedUsersPercentage: 3
  },

  // D12 - National rental affordability scheme
  {
    code: "D12",
    name: "National Rental Affordability Scheme (NRAS) tax offset",
    shortDescription: "NRAS tax offset for affordable housing investment",
    fullDescription: `Claim tax offset for investing in approved NRAS properties that provide affordable rental accommodation. Offset is refundable even if it exceeds tax liability.`,
    eligibilityCriteria: [
      "Invested in an NRAS approved property",
      "Property meets affordable housing requirements",
      "Received NRAS incentive certificate",
      "Certificate issued by Housing Department"
    ],
    claimLimits: {
      description: "Offset amount specified on NRAS certificate. Refundable offset - can receive refund even if no tax payable.",
      method: "other"
    },
    receiptRequirements: {
      required: "required",
      description: "Required: NRAS tax offset certificate from Housing Department. Keep certificate with tax records.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep NRAS certificates for 5 years",
      specificRequirements: [
        "NRAS tax offset certificate from Housing Department",
        "Property investment records",
        "Rental income and expense records"
      ]
    },
    typicalWorksheetItems: [
      "NRAS certificate reference number",
      "Tax offset amount from certificate",
      "Property address",
      "Certificate year"
    ],
    relatedCategories: [],
    atoReference: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/offsets-and-rebates/national-rental-affordability-scheme-tax-offset",
    commonMistakes: [
      "Claiming without valid NRAS certificate",
      "Not keeping certificate with tax records",
      "Claiming for non-NRAS properties"
    ],
    tips: [
      "Certificate issued by Department of Social Services",
      "Offset is refundable - can exceed tax liability",
      "Keep certificate with tax records",
      "Separate from rental property deductions"
    ],
    examples: {
      claimable: [
        "NRAS approved property investment",
        "Joint ownership - claim your share"
      ],
      notClaimable: [
        "Standard rental property (not NRAS)",
        "Property without valid certificate",
        "NRAS property not meeting requirements"
      ]
    },
    priority: "low",
    estimatedUsersPercentage: 1
  },

  // D13 - Early stage venture capital limited partnership
  {
    code: "D13",
    name: "Early stage venture capital limited partnership tax offset",
    shortDescription: "ESVCLP investment tax offset",
    fullDescription: `Claim tax offset for investments in Early Stage Venture Capital Limited Partnerships (ESVCLPs). Offset is 10% of investment amount.`,
    eligibilityCriteria: [
      "Invested in an ESVCLP",
      "Partnership is registered as ESVCLP",
      "Investment meets eligibility requirements",
      "Have statement from partnership"
    ],
    claimLimits: {
      description: "Offset is 10% of the amount paid for eligible investments. Maximum investment and offset limits apply per year.",
      method: "other",
      percentage: 10
    },
    receiptRequirements: {
      required: "required",
      description: "Required: Statement from ESVCLP showing eligible investment. Keep all investment documentation.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep ESVCLP statements for 5 years",
      specificRequirements: [
        "ESVCLP statement of eligible investment",
        "Investment purchase documentation",
        "Partnership registration confirmation"
      ]
    },
    typicalWorksheetItems: [
      "ESVCLP name and ABN",
      "Investment amount",
      "10% offset calculation",
      "Statement reference"
    ],
    relatedCategories: [],
    atoReference: "https://www.ato.gov.au/businesses-and-organisms/income-deductions-offsets-and-records/tax-offsets/early-stage-venture-capital-limited-partnerships",
    commonMistakes: [
      "Claiming for non-ESVCLP investments",
      "Incorrect percentage calculation",
      "Not keeping partnership statement"
    ],
    tips: [
      "Offset is 10% of investment amount",
      "Partnership must be registered as ESVCLP",
      "Keep statement with tax records",
      "Check investment limits for year"
    ],
    examples: {
      claimable: [
        "Investment in registered ESVCLP",
        "Multiple ESVCLP investments (within limits)"
      ],
      notClaimable: [
        "Standard venture capital (not ESVCLP)",
        "Unregistered partnerships",
        "Investments over annual limits"
      ]
    },
    priority: "low",
    estimatedUsersPercentage: 0.5
  },

  // D14 - Early stage investor
  {
    code: "D14",
    name: "Early stage investor tax offset",
    shortDescription: "Tax offset for early stage innovation company investments",
    fullDescription: `Claim tax offset for investments in qualifying Early Stage Innovation Companies (ESICs). Offset is 20% of investment amount (capped). Also provides capital gains exemption.`,
    eligibilityCriteria: [
      "Invested in a qualifying ESIC",
      "Company meets ESIC requirements",
      "Investment is at arm's length",
      "Not an affiliate of the company",
      "Investment held for minimum period"
    ],
    claimLimits: {
      description: "Offset is 20% of investment amount. Maximum offset $200,000 per year (requires $1M investment). Minimum hold period applies.",
      method: "other",
      percentage: 20,
      amount: 200000
    },
    receiptRequirements: {
      required: "required",
      description: "Required: Investment documentation and ESIC qualification evidence. Keep share certificates and company documentation.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep investment records permanently (CGT implications)",
      specificRequirements: [
        "Share certificate or investment confirmation",
        "ESIC qualification documentation",
        "Investment agreement",
        "Company registration details"
      ]
    },
    typicalWorksheetItems: [
      "ESIC company name and ABN",
      "Investment amount",
      "20% offset calculation",
      "Share acquisition date",
      "Investment hold period confirmation"
    ],
    relatedCategories: [],
    atoReference: "https://www.ato.gov.au/businesses-and-organisations/tax-incentives-for-innovation/early-stage-investors",
    commonMistakes: [
      "Claiming for non-qualifying companies",
      "Exceeding annual investment limits",
      "Not meeting holding period requirements",
      "Related party investment (not arm's length)"
    ],
    tips: [
      "Offset is 20% of investment (max $200,000)",
      "Also provides CGT exemption if held 12+ months",
      "Company must meet ESIC test requirements",
      "Investment must be at arm's length"
    ],
    examples: {
      claimable: [
        "Investment in qualifying ESIC startup",
        "Multiple ESIC investments (within caps)"
      ],
      notClaimable: [
        "Investment in non-ESIC company",
        "Related party investment",
        "Investment exceeding annual caps",
        "Investment held less than required period"
      ]
    },
    priority: "low",
    estimatedUsersPercentage: 0.5
  },

  // D15 - Exploration credit tax offset
  {
    code: "D15",
    name: "Exploration credit tax offset",
    shortDescription: "Greenfields minerals exploration credit",
    fullDescription: `Claim tax offset for investment in greenfields minerals exploration through Australian Junior Minerals Exploration Companies (AJMECs). Offset is transferable and can be sold.`,
    eligibilityCriteria: [
      "Invested in shares of an AJMEC",
      "Company issued exploration credits",
      "Investment is at arm's length",
      "Received exploration credit statement"
    ],
    claimLimits: {
      description: "Offset based on exploration credits issued by company. Credits can be transferred or sold to other taxpayers.",
      method: "other"
    },
    receiptRequirements: {
      required: "required",
      description: "Required: Exploration credit statement from AJMEC. Keep share investment documentation.",
      thresholdAmount: 0
    },
    recordKeeping: {
      period: "5_years",
      description: "Keep exploration credit statements for 5 years",
      specificRequirements: [
        "Exploration credit statement from company",
        "Share purchase documentation",
        "Company notification of credit allocation"
      ]
    },
    typicalWorksheetItems: [
      "AJMEC company name and ABN",
      "Exploration credit amount",
      "Share investment details",
      "Credit statement reference"
    ],
    relatedCategories: [],
    atoReference: "https://www.ato.gov.au/businesses-and-organisations/income-deductions-offsets-and-records/tax-offsets/exploration-credits",
    commonMistakes: [
      "Claiming for non-AJMEC investments",
      "Not receiving valid credit statement",
      "Double claiming exploration expenses"
    ],
    tips: [
      "Credit received from AJMEC company",
      "Credits can be transferred or sold",
      "Specific to greenfields minerals exploration",
      "Keep statement with tax records"
    ],
    examples: {
      claimable: [
        "Investment in qualifying AJMEC",
        "Exploration credits received and not transferred"
      ],
      notClaimable: [
        "Investment in non-AJMEC company",
        "Credits already transferred to another taxpayer",
        "Non-greenfields exploration"
      ]
    },
    priority: "low",
    estimatedUsersPercentage: 0.1
  }
];

/**
 * Get a specific category by code
 */
export function getCategoryByCode(code: AtoCategoryCode): AtoCategory | undefined {
  return atoCategories.find(cat => cat.code === code);
}

/**
 * Get all categories
 */
export function getAllCategories(): AtoCategory[] {
  return [...atoCategories];
}

/**
 * Get categories by priority level
 */
export function getCategoriesByPriority(priority: "high" | "medium" | "low"): AtoCategory[] {
  return atoCategories.filter(cat => cat.priority === priority);
}

/**
 * Get categories that commonly apply together
 */
export function getRelatedCategories(code: AtoCategoryCode): AtoCategory[] {
  const category = getCategoryByCode(code);
  if (!category || !category.relatedCategories) return [];
  return category.relatedCategories.map(getCategoryByCode).filter(Boolean) as AtoCategory[];
}

/**
 * Search categories by keyword
 */
export function searchCategories(keyword: string): AtoCategory[] {
  const lowerKeyword = keyword.toLowerCase();
  return atoCategories.filter(cat => 
    cat.name.toLowerCase().includes(lowerKeyword) ||
    cat.shortDescription.toLowerCase().includes(lowerKeyword) ||
    cat.fullDescription.toLowerCase().includes(lowerKeyword) ||
    cat.code.toLowerCase() === lowerKeyword
  );
}

/**
 * Get categories sorted by estimated usage (most common first)
 */
export function getCategoriesByUsage(): AtoCategory[] {
  return [...atoCategories].sort((a, b) => b.estimatedUsersPercentage - a.estimatedUsersPercentage);
}

/**
 * Check if a category requires receipts
 */
export function requiresReceipts(code: AtoCategoryCode): { required: boolean; threshold?: number; description: string } {
  const category = getCategoryByCode(code);
  if (!category) return { required: true, description: "Unknown category" };
  
  const { receiptRequirements } = category;
  return {
    required: receiptRequirements.required === "required" || receiptRequirements.required === "depends",
    threshold: receiptRequirements.thresholdAmount,
    description: receiptRequirements.description
  };
}

/**
 * Get the total number of categories
 */
export function getCategoryCount(): number {
  return atoCategories.length;
}

/**
 * Get summary statistics for all categories
 */
export function getCategoryStats(): {
  total: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  highUsage: number;
} {
  return {
    total: atoCategories.length,
    highPriority: atoCategories.filter(c => c.priority === "high").length,
    mediumPriority: atoCategories.filter(c => c.priority === "medium").length,
    lowPriority: atoCategories.filter(c => c.priority === "low").length,
    highUsage: atoCategories.filter(c => c.estimatedUsersPercentage > 20).length
  };
}

export default atoCategories;
