# Smart Number Extraction System (TAL-102)

A comprehensive number extraction system for the Tally tax platform that extracts structured numerical data from documents including amounts, dates, ABNs, account numbers, and more.

## Features

### Extraction Types

| Type               | Patterns                            | Validation                  |
| ------------------ | ----------------------------------- | --------------------------- |
| **Amount**         | $1,234.56, AUD 500, €100, £50, etc. | Currency symbol recognition |
| **Date**           | 15/03/2024, Mar 15, 2024, etc.      | Normalization to ISO format |
| **ABN**            | 51 824 753 556                      | ATO checksum validation     |
| **ACN**            | 123 456 789                         | ASIC checksum validation    |
| **Account Number** | ACC-12345, Account: 12345           | Pattern matching            |
| **Invoice Number** | INV-2024-001, Invoice #: 123        | Prefix recognition          |
| **GST/Tax**        | GST: $10.00, Tax: $50               | Context detection           |
| **Percentage**     | 10%, 15.5%                          | Decimal support             |
| **Quantity**       | Qty: 5, 10 items                    | Unit recognition            |

### Key Capabilities

- **Multi-pattern matching**: Uses multiple regex patterns for each type to handle various formats
- **Confidence scoring**: Each extraction has a confidence score based on context
- **Context extraction**: Optionally extracts surrounding text for verification
- **ABN/ACN validation**: Official checksum validation for Australian business numbers
- **Date normalization**: Converts various date formats to ISO YYYY-MM-DD
- **Currency recognition**: Supports AUD, USD, EUR, GBP symbols and codes
- **Batch processing**: Process multiple documents efficiently

## Usage

### Basic Extraction

```typescript
import { extractNumbers } from '@/lib/number-extraction'

const text = `
TAX INVOICE
Coffee Shop Pty Ltd
ABN: 51 824 753 556
Date: 15/03/2024
Total: $18.15
`

const result = await extractNumbers(text)
console.log(result.numbers)
// [
//   { type: "abn", value: "51 824 753 556", normalized: "51 824 753 556", confidence: 0.95 },
//   { type: "date", value: "15/03/2024", normalized: "2024-03-15", confidence: 0.65 },
//   { type: "amount", value: "$18.15", normalized: 18.15, confidence: 0.80 }
// ]
```

### React Hook

```typescript
import { useNumberExtraction } from "@/hooks/useNumberExtraction";

function MyComponent() {
  const { numbers, summary, isExtracting, extract } = useNumberExtraction();

  return (
    <div>
      <button onClick={() => extract(documentText)}>
        Extract
      </button>
      {summary && (
        <div>Found {summary.totalFound} numbers</div>
      )}
    </div>
  );
}
```

### Document Type Awareness

```typescript
import { useDocumentNumberExtraction } from '@/hooks/useNumberExtraction'

function MyComponent() {
  const { numbers, extract } = useDocumentNumberExtraction({
    documentType: 'receipt',
  })

  // Extract with automatic type-specific settings
  await extract(text)

  // Or override per-extraction
  await extract(text, 'invoice')
}
```

### Batch Processing

```typescript
import { useBatchNumberExtraction } from '@/hooks/useNumberExtraction'

function MyComponent() {
  const { results, isExtracting, progress, extract } = useBatchNumberExtraction(
    {
      onProgress: (completed, total) => console.log(`${completed}/${total}`),
    },
  )

  const handleExtract = async () => {
    await extract([
      { id: 'doc1', text: '...' },
      { id: 'doc2', text: '...' },
    ])
  }
}
```

## Validation Functions

### ABN Validation

```typescript
import { validateAbn, formatAbn } from '@/lib/number-extraction'

validateAbn('51 824 753 556') // true (valid Commonwealth Bank ABN)
validateAbn('51 824 753 557') // false (invalid checksum)

formatAbn('51824753556') // "51 824 753 556"
```

### ACN Validation

```typescript
import { validateAcn, formatAcn } from '@/lib/number-extraction'

validateAcn('005 749 984') // true
validateAcn('123 456 789') // false (invalid checksum)

formatAcn('005749984') // "005 749 984"
```

### Date Normalization

```typescript
import { normalizeDate } from '@/lib/number-extraction'

normalizeDate('15/03/2024') // "2024-03-15"
normalizeDate('Mar 15, 2024') // "2024-03-15"
normalizeDate('today') // "2024-02-22" (current date)
```

## UI Components

### Number Badges

```tsx
import { NumberTypeBadge, ExtractedNumberList } from "@/components/numbers";

// Display a single number type
<NumberTypeBadge type="amount" />

// Display a list of extracted numbers
<ExtractedNumberList numbers={numbers} groupByType={true} />
```

### Extraction Summary

```tsx
import { ExtractionResultView, ExtractionSummaryCard } from "@/components/numbers";

// Full extraction result view
<ExtractionResultView result={extractionResult} />

// Just the summary card
<ExtractionSummaryCard summary={summary} />
```

## Options

```typescript
interface ExtractionOptions {
  minConfidence?: number // Minimum confidence threshold (default: 0.5)
  extractContext?: boolean // Extract surrounding text (default: true)
  contextWindow?: number // Characters of context (default: 50)
  validateAbn?: boolean // Validate ABN checksums (default: true)
  normalizeDates?: boolean // Normalize dates to ISO (default: true)
  currency?: 'AUD' | 'USD' | 'EUR' | 'GBP' | 'auto' // Preferred currency
}
```

## File Structure

```
src/
├── lib/
│   ├── number-extraction.ts       # Core extraction engine
│   └── number-extraction.test.ts  # Test suite
├── hooks/
│   └── useNumberExtraction.ts     # React hooks
├── components/numbers/
│   ├── NumberBadges.tsx           # Badge components
│   ├── ExtractionSummary.tsx      # Summary components
│   └── index.ts                   # Exports
└── routes/
    └── number-extraction.tsx      # Demo page
```

## Testing

Run the test suite:

```bash
npx tsx src/lib/number-extraction.test.ts
```

Tests include:

- ABN validation (ATO checksum algorithm)
- ACN validation (ASIC checksum algorithm)
- Date normalization (various formats)
- Amount normalization (multiple currencies)
- Full document extraction (receipts, invoices, statements)
- Batch extraction
- Context extraction

## Demo

Visit `/number-extraction` in the app to try the interactive demo with sample documents:

- Coffee shop receipt
- Consulting invoice
- Bank statement
- Dividend statement

## Stack

- TanStack Start
- TypeScript
- Tauri-ready (works in browser and desktop)
- shadcn/ui components

## Related Tasks

- TAL-101: Document Type Detection Engine (completed)
- TAL-102: Smart Number Extraction System (this task)
- TAL-110: ATO Category Database - Complete D1-D15 (next P0 task)
- TAL-111: Income Category Database
- TAL-120: Tax Optimization Engine
