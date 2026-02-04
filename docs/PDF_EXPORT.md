# PDF Export Feature (TAL-072)

This feature enables professional tax report generation in PDF format for Tally Desktop.

## Features

- **Professional Tax Reports**: ATO-compliant formatting with official deduction category codes
- **Cover Page**: Includes taxpayer information, financial year, and summary
- **Category Breakdown**: Summary by ATO deduction category (D1-D15 codes)
- **Detailed Transactions**: Complete list of all receipts with metadata
- **Year-over-Year Comparison**: Compare current FY with previous year
- **Receipt Images**: Optional embedding of receipt images as appendix
- **File Size Optimization**: Configurable image quality (30-100%) to keep files under 10MB

## Usage

### Basic Export

```tsx
import { PDFExportDialog } from '@/components/PDFExportDialog'

function MyComponent() {
  return (
    <PDFExportDialog
      onExportComplete={() => {
        console.log('Export complete!')
      }}
    />
  )
}
```

### Programmatic Export

```tsx
import { generateTaxReportPDF, downloadTaxReport } from '@/lib/pdf'
import {
  getReceiptsByDateRange,
  getTotalDeductions,
  getDeductionsByCategory,
} from '@/lib/db'

async function exportReport() {
  const startDate = '2024-07-01'
  const endDate = '2025-06-30'

  const receipts = await getReceiptsByDateRange(startDate, endDate)
  const totalDeductions = await getTotalDeductions(startDate, endDate)
  const deductionsByCategory = await getDeductionsByCategory(startDate, endDate)

  const data = {
    receipts,
    totalDeductions,
    deductionsByCategory,
  }

  const options = {
    title: 'Tax Deductions Report',
    financialYear: 2024,
    startDate,
    endDate,
    userInfo: {
      name: 'John Smith',
      abn: '12 345 678 901',
    },
    includeReceiptImages: true,
    imageQuality: 0.7,
    comparePreviousYear: true,
  }

  await downloadTaxReport(data, options)
}
```

## ATO Deduction Categories

The PDF export uses official ATO deduction category codes:

| Code | Category                 | Description                          |
| ---- | ------------------------ | ------------------------------------ |
| D1   | Vehicle                  | Work-related car expenses            |
| D2   | Travel                   | Work-related travel expenses         |
| D3   | Meals                    | Work-related travel expenses         |
| D4   | Professional Development | Work-related self-education expenses |
| D5   | Home Office              | Work-related home office expenses    |
| D10  | Insurance                | Cost of managing tax affairs         |
| D15  | Other                    | Other work-related expenses          |

## File Size Optimization

To keep PDF files under 10MB for 100 receipts:

1. **Image Quality Setting**: Use 60-70% quality for good balance
2. **Receipt Image Size**: Keep original receipt photos under 2MB each
3. **PDF Compression**: jsPDF automatically compresses content
4. **Optional Images**: Users can disable receipt images if file size is critical

## Dependencies

- `jspdf`: PDF generation library
- `jspdf-autotable`: Table generation for PDFs
- `@tauri-apps/plugin-fs`: File system access for loading receipt images

## Configuration

The feature requires Tauri filesystem permissions. Ensure your `tauri.conf.json` includes:

```json
{
  "security": {
    "capabilities": [
      {
        "permissions": ["fs:allow-read-file", "fs:allow-read-dir"]
      }
    ]
  }
}
```

## Testing

The PDF export dialog is integrated into the component showcase at `/`. Click "Export Tax Report" to test the feature.

For development testing without the full UI:

```tsx
// Add test receipts to database first
await createReceipt({
  vendor: 'Test Vendor',
  amount: 150.0,
  category: 'Home Office',
  date: '2024-08-15',
})

// Then export
await exportReport()
```
