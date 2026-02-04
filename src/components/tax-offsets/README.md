# Tax Offset & Credits Engine (TAL-112)

Complete implementation of Australian tax offsets and credits for the 2024-2025 financial year.

## Overview

This engine calculates all major Australian tax offsets and credits:

- **LITO** - Low Income Tax Offset
- **LMITO** - Low and Middle Income Tax Offset (ended 2021-22)
- **SAPTO** - Seniors and Pensioners Tax Offset
- **Franking Credits** - Imputation credits from dividend payments
- **PHI Rebate** - Private Health Insurance Rebate

## Features

### Tax Offset Calculations
- Accurate calculations based on 2024-2025 ATO rates
- Income-based phase-out thresholds
- Age and residency considerations
- Spouse income integration for relevant offsets

### Database Integration
- SQLite storage for tax profiles
- Persistent franking credit records
- Historical calculation tracking
- Export/import functionality

### React Hooks
- `useTaxOffsets` - Complete offset calculation management
- `useLITO`, `useLMITO`, `useSAPTO` - Individual offset hooks
- `useFrankingCredits` - Dividend credit calculations
- `usePHIRebate` - Health insurance rebate calculation

### UI Components
- `TaxOffsetCalculator` - Main calculator interface
- `TaxOffsetCard` - Individual offset display
- `FrankingCreditForm` - Dividend entry form
- `TaxOffsetSummary` - Results summary view

## Tax Year 2024-2025 Rates

### LITO (Low Income Tax Offset)
| Income Range | Offset Amount |
|-------------|---------------|
| $0 - $15,000 | $700 (full) |
| $15,000 - $37,500 | Reduced by 1% of excess over $15,000 |
| $37,500 - $66,667 | Reduced by 5% of excess over $37,500 |
| Above $66,667 | $0 |

### SAPTO (Seniors and Pensioners)
| Status | Max Offset | Shade-out Threshold |
|--------|-----------|---------------------|
| Single | $2,230 | $33,089 |
| Couple (each) | $1,602 | $29,000 |
| Couple (separated) | $2,040 | $31,000 |

### PHI Rebate (Base Tier)
| Age | Rebate % |
|-----|----------|
| Under 65 | 24.743% |
| 65-69 | 28.971% |
| 70+ | 33.2% |

## Usage

### Basic Calculation

```typescript
import { calculateAllTaxOffsets } from '@/lib/tax-offsets';

const result = calculateAllTaxOffsets({
  profile: {
    taxableIncome: 45000,
    age: 35,
    isResident: true,
    hasPrivateHealthInsurance: true,
    isSeniorOrPensioner: false,
    hasSpouse: false
  },
  frankingCredits: [
    {
      companyName: 'CommBank',
      dividendAmount: 280,
      frankedAmount: 280,
      frankingCredit: 120,
      frankingPercentage: 100,
      paymentDate: new Date()
    }
  ],
  phiPremiumAmount: 2000
});

console.log(result.totalOffsets); // Total tax offsets
console.log(result.frankingCredits.totalCredits); // Total franking credits
```

### With React Hook

```typescript
import { useTaxOffsets } from '@/hooks/useTaxOffsets';

function TaxOffsetWidget() {
  const { 
    calculate, 
    summary, 
    totalTaxOffsets,
    addFrankingCredit 
  } = useTaxOffsets({ profileId: 'user-123' });

  const handleCalculate = () => {
    calculate({
      profileId: 'user-123',
      taxableIncome: 60000,
      age: 40,
      hasPrivateHealthInsurance: true,
      phiPremiumAmount: 2500
    });
  };

  return (
    <div>
      <button onClick={handleCalculate}>Calculate</button>
      {summary && <p>Total: {totalTaxOffsets}</p>}
    </div>
  );
}
```

### UI Component

```typescript
import { TaxOffsetCalculator } from '@/components/tax-offsets';

function TaxPage() {
  return (
    <TaxOffsetCalculator 
      profileId="user-123"
      taxYear="2024-25"
      onSave={(summary) => console.log(summary)}
    />
  );
}
```

## Database Schema

### tax_profiles
- profile_id (TEXT, UNIQUE)
- tax_year (TEXT)
- taxable_income (REAL)
- age (INTEGER)
- is_resident (INTEGER)
- has_private_health_insurance (INTEGER)
- private_health_cover_type (TEXT)
- private_health_tier (TEXT)
- is_senior_or_pensioner (INTEGER)
- has_spouse (INTEGER)
- spouse_income (REAL)
- is_sole_parent (INTEGER)
- phi_premium_amount (REAL)

### tax_offsets
- profile_id (TEXT)
- tax_year (TEXT)
- offset_type (TEXT)
- amount (REAL)
- calculation_details (TEXT)
- created_at (DATETIME)

### franking_credits
- profile_id (TEXT)
- tax_year (TEXT)
- company_name (TEXT)
- dividend_amount (REAL)
- franked_amount (REAL)
- franking_credit (REAL)
- franking_percentage (REAL)
- payment_date (TEXT)
- created_at (DATETIME)

## Testing

Run the test suite:

```bash
npm test src/lib/tax-offsets.test.ts
```

Tests cover:
- LITO calculations at various income levels
- LMITO ended status
- SAPTO for seniors/pensioners
- Franking credit calculations
- PHI rebate tier determination
- Complete integration scenarios

## Files Structure

```
src/
├── lib/
│   ├── tax-offsets.ts         # Core calculation engine
│   ├── db-tax-offsets.ts      # Database integration
│   └── tax-offsets.test.ts    # Test suite
├── hooks/
│   └── useTaxOffsets.ts       # React hooks
└── components/tax-offsets/
    ├── TaxOffsetCard.tsx      # Offset display card
    ├── FrankingCreditForm.tsx # Dividend entry form
    ├── TaxOffsetSummary.tsx   # Results summary
    ├── TaxOffsetCalculator.tsx # Main calculator
    └── index.ts               # Exports
```

## API Reference

### Core Functions

| Function | Description |
|----------|-------------|
| `calculateLITO(income)` | Calculate Low Income Tax Offset |
| `calculateLMITO(income)` | Calculate LMITO (returns $0) |
| `calculateSAPTO(income, age, hasSpouse, spouseIncome, isSoleParent)` | Calculate Seniors offset |
| `calculateFrankingCredits(dividends)` | Sum franking credits |
| `calculateFrankingCreditFromPercentage(dividend, percentage)` | Calculate single credit |
| `calculatePHIRebate(premium, age, tier)` | Calculate PHI rebate |
| `determinePHITier(income, hasSpouse, spouseIncome)` | Determine rebate tier |
| `calculateAllTaxOffsets(input)` | Calculate all offsets |
| `formatCurrency(amount)` | Format as AUD |
| `getFinancialYear(date)` | Get FY string |

### Database Functions

| Function | Description |
|----------|-------------|
| `initializeTaxOffsetDatabase(path?)` | Initialize SQLite |
| `saveTaxProfile(input)` | Save/update profile |
| `getTaxProfile(profileId)` | Get saved profile |
| `addFrankingCredit(input)` | Add dividend |
| `getFrankingCredits(profileId, taxYear?)` | Get dividends |
| `calculateAndSaveTaxOffsets(profile, credits)` | Calculate and save |
| `getTaxOffsetSummary(profileId, taxYear?)` | Get summary |
| `exportTaxOffsets(profileId, taxYear?)` | Export data |

## Compliance

All calculations based on:
- ATO Tax Rates 2024-2025
- Income Tax Assessment Act 1997
- Private Health Insurance Act 2007

Note: Always verify calculations against current ATO guidance. Tax laws change frequently.

## Stack

- TanStack Start
- Tauri (desktop)
- SQLite (via better-sqlite3)
- shadcn/ui components
- TypeScript

---

**Task**: TAL-112 - Tax Offset & Credits Engine  
**Status**: Complete  
**Assignee**: Forge  
**Completed**: 2026-06-23
