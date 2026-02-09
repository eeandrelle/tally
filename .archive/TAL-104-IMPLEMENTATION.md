# TAL-104: Invoice Document Support Implementation

## Overview
This document describes the implementation of the Invoice Document Support feature for Tally v3 Desktop app.

## Features Implemented

### 1. Rust PDF Parsing Module (`src-tauri/src/invoice.rs`)
- **InvoiceParser struct**: Core parsing engine with regex patterns
- **ABN Extraction**: Validates Australian Business Numbers using checksum algorithm
- **Invoice Number Detection**: Multiple pattern matching for various invoice formats
- **Date Extraction**: Supports ISO (YYYY-MM-DD) and Australian (DD/MM/YYYY) formats
- **Amount Parsing**: Extracts monetary values with currency symbols
- **Payment Terms Detection**: Identifies Net 30, 14 days, COD, etc.
- **Line Item Extraction**: Parses tables and itemized lists
- **Confidence Scoring**: Each extracted field has a confidence score

### 2. OCR Integration
- Integration with existing OCR module for image-based invoices
- Tauri commands exposed to frontend:
  - `parse_invoice_pdf_command`
  - `parse_invoice_image_command`
  - `validate_invoice_command`

### 3. Data Extraction Logic
- **Regex Patterns**:
  - ABN: Multiple patterns for various formats (with/without spaces)
  - Invoice numbers: INV-XXX, #XXX, Tax Invoice patterns
  - Dates: Multiple format support
  - Amounts: Handles $X,XXX.XX format with thousand separators
  - Payment terms: Net X days, COD, EOM

- **ABN Validation**:
  - Implements official Australian Business Register checksum algorithm
  - 11-digit validation with weights [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

### 4. Database Integration
New tables added to SQLite database:
- `invoices`: Stores extracted invoice data
  - abn, invoice_number, invoice_date, due_date
  - vendor_name, total_amount, gst_amount
  - payment_terms, line_items_json, raw_text
  - document_path, document_type, confidence_score
  - status (draft/pending/approved/linked/rejected)
  - expense_id (foreign key to receipts)

### 5. React Components
- **InvoiceUploadDialog**: File upload with drag-and-drop
  - PDF and image support
  - Real-time parsing with progress indicator
  - Confidence visualization
  - Field-by-field review

- **Invoices Page** (`/invoices`):
  - List view with search and filter
  - Status management (draft → pending → approved → linked)
  - Statistics dashboard
  - Link to expense records

- **FileUpload Component**: Reusable file upload with validation

### 6. TypeScript Types (`src/lib/invoices.ts`)
Full type definitions matching Rust structures:
- `ExtractedInvoice`: Complete invoice data structure
- `ExtractedField<T>`: Generic field with confidence
- `LineItem`: Individual line item structure
- `Invoice`: Database record type

### 7. Expense Record Linking
- Automatic creation of expense records from invoices
- Manual linking to existing receipts
- Bidirectional relationship tracking

## Technical Details

### Dependencies Added
**Rust (Cargo.toml)**:
```toml
regex = "1.10"
pdf-extract = { version = "0.7", optional = true }
```

**Features**:
- `pdf-parse`: Enables PDF text extraction

### API Surface
```typescript
// Parse PDF invoice
parseInvoicePdf(pdfPath: string): Promise<ExtractedInvoice>

// Parse image invoice (via OCR)
parseInvoiceImage(imagePath: string): Promise<ExtractedInvoice>

// Validate extraction
validateInvoice(invoice: ExtractedInvoice): Promise<InvoiceValidationResult>

// Database operations
createInvoice(invoice: Omit<Invoice, 'id'>): Promise<number>
getInvoices(): Promise<Invoice[]>
linkInvoiceToExpense(invoiceId: number, expenseId: number): Promise<void>
```

## Testing

### Unit Tests (`src/lib/invoices.test.ts`)
- PDF parsing integration tests
- Image OCR parsing tests
- Validation logic tests
- Data conversion tests
- Line item parsing tests

### Test Fixtures (`src/test/fixtures/`)
- `sample-invoice-1.txt`: Comprehensive Australian tax invoice
- `sample-invoice-2.txt`: Simple invoice format
- `README.md`: Testing documentation

### Rust Tests (inline in invoice.rs)
- ABN validation checksum tests
- Pattern matching tests
- Amount extraction tests
- Payment terms tests

## User Workflow

1. **Upload**: User uploads PDF or image via InvoiceUploadDialog
2. **Parse**: Rust backend extracts data using regex patterns
3. **Review**: Frontend displays extracted data with confidence scores
4. **Validate**: System suggests action (accept/review/manual)
5. **Save**: Invoice stored in database with status
6. **Link**: User links invoice to existing or new expense record

## Confidence Scoring

| Score | Action | Description |
|-------|--------|-------------|
| ≥0.75 | Accept | High confidence, auto-approve |
| 0.5-0.75 | Review | Medium confidence, user review needed |
| <0.5 | Manual Entry | Low confidence, manual entry recommended |

## Security Considerations

- File upload validation (type, size)
- Path sanitization for document storage
- SQL injection prevention via parameterized queries

## Future Enhancements

1. **ML-based Extraction**: Train models for better accuracy
2. **Template Matching**: Learn vendor-specific formats
3. **Batch Processing**: Process multiple invoices at once
4. **Cloud OCR**: Integration with Google Vision/AWS Textract
5. **ABN Lookup**: Validate ABN against ABR web service
6. **GST Compliance**: Automated GST categorization

## Files Modified/Created

### New Files
- `src-tauri/src/invoice.rs` - Rust parsing module
- `src/lib/invoices.ts` - TypeScript types and DB operations
- `src/lib/invoices.test.ts` - Unit tests
- `src/components/InvoiceUploadDialog.tsx` - Upload UI
- `src/components/FileUpload.tsx` - Reusable upload component
- `src/routes/invoices.tsx` - Invoices page
- `src/test/fixtures/*` - Test data

### Modified Files
- `src-tauri/Cargo.toml` - Added regex dependency
- `src-tauri/src/lib.rs` - Added invoice module and commands
- `src/lib/db.ts` - Added invoice table initialization
- `src/routes/dashboard.tsx` - Added invoices quick link

## Compliance

- Australian Taxation Office (ATO) requirements for invoice records
- GST Act compliance for tax invoice elements
- Privacy Act considerations for business data
