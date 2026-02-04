/**
 * Smart Number Extraction System Tests (TAL-102)
 * 
 * Comprehensive test suite for number extraction functionality:
 * - Amount/currency extraction
 * - Date parsing and normalization
 * - ABN validation
 * - ACN validation
 * - Account number extraction
 * - Invoice number extraction
 * - GST and tax extraction
 * - Context-aware extraction
 */

import {
  extractNumbers,
  extractNumbersBatch,
  extractFromDocument,
  validateAbn,
  validateAcn,
  formatAbn,
  formatAcn,
  normalizeDate,
  normalizeAmount,
  type ExtractedNumber,
} from "./number-extraction";

// Test data
const TEST_RECEIPT = `
TAX INVOICE
Coffee Shop Pty Ltd
ABN: 51 824 753 556

Date: 15/03/2024
Invoice #: INV-2024-00123

Items:
1 x Flat White           $4.50
1 x Avocado Toast       $12.00

Subtotal:                $16.50
GST (10%):                $1.65
Total Amount:            $18.15
Paid: $18.15 (Card ending 1234)
Thank you for your business!
`;

const TEST_BANK_STATEMENT = `
Commonwealth Bank Statement
Account: 06 1234 5678901
Statement Period: 01/01/2024 to 31/01/2024

Date        | Description           | Debit    | Credit   | Balance
-----------|----------------------|----------|----------|----------
01/01/2024 | Opening Balance      |          |          | $5,234.56
05/01/2024 | Salary Deposit       |          | $4,500.00| $9,734.56
10/01/2024 | Grocery Store        | $156.78  |          | $9,577.78
15/01/2024 | Rent Payment         | $2,000.00|          | $7,577.78
31/01/2024 | Closing Balance      |          |          | $7,577.78
`;

const TEST_DIVIDEND_STATEMENT = `
COMPUTERSHARE DIVIDEND STATEMENT
Company: BHP Group Limited
ABN: 49 004 028 077

Payment Date: 28 Mar 2024
Record Date: 15 Feb 2024

Dividend Details:
- Shares Held: 500
- Dividend per Share: $1.50
- Franked Amount: $750.00
- Franking Credits: $321.43
- Unfranked Amount: $0.00
- Total Payment: $750.00

TFN Withheld: $0.00
Net Payment: $750.00
`;

const TEST_INVOICE = `
INVOICE
ABC Consulting Services Pty Ltd
ACN: 123 456 789
ABN: 12 345 678 901

Invoice Number: INV-2024-789
Date: 20 January 2024
Due Date: 20 February 2024

Bill To:
XYZ Corporation Ltd
Account: ACC-9876543

Description              Qty    Rate      Amount
------------------------------------------------
Consulting Services      40hrs  $150/hr   $6,000.00
Travel Expenses                 -         $450.00

Subtotal:                                   $6,450.00
GST (10%):                                    $645.00
Total Due:                                  $7,095.00

Payment Terms: Net 30
`;

// ABN validation tests
console.log("=== ABN VALIDATION TESTS ===");

// These are real, valid ABNs from Australian businesses
const validAbns = [
  "51 824 753 556",  // Commonwealth Bank
  "51824753556",
  "49 004 028 077",  // BHP
  "49004028077",
];

const invalidAbns = [
  "51 824 753 557",  // Wrong check digit
  "51824753557",
  "12 345 678 901",  // Invalid format (doesn't pass checksum)
  "1234567890",      // Too short
  "123456789012",    // Too long
  "abcdefghijk",     // Not numeric
];

console.log("Valid ABNs:");
for (const abn of validAbns) {
  const isValid = validateAbn(abn);
  const formatted = formatAbn(abn);
  console.log(`  "${abn}" -> ${isValid ? "✅ VALID" : "❌ INVALID"} (formatted: ${formatted})`);
}

console.log("\nInvalid ABNs:");
for (const abn of invalidAbns) {
  const isValid = validateAbn(abn);
  console.log(`  "${abn}" -> ${isValid ? "✅ VALID" : "❌ INVALID"}`);
}

// ACN validation tests
console.log("\n=== ACN VALIDATION TESTS ===");

// These are real, valid ACNs
const validAcns = [
  "005 749 984",  // Valid ACN with check digit
  "005749984",
];

const invalidAcns = [
  "123 456 789",  // Invalid check digit
  "123456789",
  "005 749 987",  // Wrong check digit
  "12345678",     // Too short
  "1234567890",   // Too long
];

console.log("Valid ACNs:");
for (const acn of validAcns) {
  const isValid = validateAcn(acn);
  const formatted = formatAcn(acn);
  console.log(`  "${acn}" -> ${isValid ? "✅ VALID" : "❌ INVALID"} (formatted: ${formatted})`);
}

console.log("\nInvalid ACNs:");
for (const acn of invalidAcns) {
  const isValid = validateAcn(acn);
  console.log(`  "${acn}" -> ${isValid ? "✅ VALID" : "❌ INVALID"}`);
}

// Date normalization tests
console.log("\n=== DATE NORMALIZATION TESTS ===");

const dateTests = [
  { input: "15/03/2024", expected: "2024-03-15" },
  { input: "15-03-2024", expected: "2024-03-15" },
  { input: "15 Mar 2024", expected: "2024-03-15" },
  { input: "15 March 2024", expected: "2024-03-15" },
  { input: "Mar 15, 2024", expected: "2024-03-15" },
  { input: "15/03/24", expected: "2024-03-15" },
];

console.log("Date formats:");
for (const test of dateTests) {
  const result = normalizeDate(test.input);
  const status = result === test.expected ? "✅" : "❌";
  console.log(`  "${test.input}" -> "${result}" ${status}`);
}

// Amount normalization tests
console.log("\n=== AMOUNT NORMALIZATION TESTS ===");

const amountTests = [
  { input: "$1,234.56", expected: 1234.56 },
  { input: "$ 1234.56", expected: 1234.56 },
  { input: "AUD 1,234.56", expected: 1234.56 },
  { input: "A$ 1,234.56", expected: 1234.56 },
  { input: "USD 1,234.56", expected: 1234.56 },
  { input: "€1,234.56", expected: 1234.56 },
  { input: "£1,234.56", expected: 1234.56 },
  { input: "1234.56", expected: 1234.56 },
];

console.log("Amount formats:");
for (const test of amountTests) {
  const result = normalizeAmount(test.input);
  const status = result === test.expected ? "✅" : "❌";
  console.log(`  "${test.input}" -> ${result} ${status}`);
}

// Receipt extraction test
console.log("\n=== RECEIPT EXTRACTION TEST ===");

const receiptResult = await extractNumbers(TEST_RECEIPT);

console.log(`Found ${receiptResult.numbers.length} numbers:`);
for (const num of receiptResult.numbers) {
  console.log(`  [${num.type.toUpperCase()}] "${num.value}" -> ${JSON.stringify(num.normalized)} (confidence: ${(num.confidence * 100).toFixed(0)}%)`);
}

console.log("\nReceipt Summary:");
console.log(`  Total found: ${receiptResult.summary.totalFound}`);
console.log(`  By type: ${JSON.stringify(receiptResult.summary.byType)}`);
console.log(`  Total amount: $${receiptResult.summary.totalAmount?.toFixed(2) ?? "N/A"}`);
console.log(`  Primary ABN: ${receiptResult.summary.primaryAbn ?? "N/A"}`);
console.log(`  Date range: ${receiptResult.summary.dateRange ? `${receiptResult.summary.dateRange.earliest} to ${receiptResult.summary.dateRange.latest}` : "N/A"}`);
console.log(`  Overall confidence: ${(receiptResult.summary.confidence * 100).toFixed(1)}%`);

// Bank statement extraction test
console.log("\n=== BANK STATEMENT EXTRACTION TEST ===");

const statementResult = await extractNumbers(TEST_BANK_STATEMENT);

console.log(`Found ${statementResult.numbers.length} numbers:`);
for (const num of statementResult.numbers) {
  console.log(`  [${num.type.toUpperCase()}] "${num.value}" -> ${JSON.stringify(num.normalized)} (confidence: ${(num.confidence * 100).toFixed(0)}%)`);
}

// Invoice extraction test
console.log("\n=== INVOICE EXTRACTION TEST ===");

const invoiceResult = await extractNumbers(TEST_INVOICE);

console.log(`Found ${invoiceResult.numbers.length} numbers:`);
for (const num of invoiceResult.numbers) {
  console.log(`  [${num.type.toUpperCase()}] "${num.value}" -> ${JSON.stringify(num.normalized)} (confidence: ${(num.confidence * 100).toFixed(0)}%)`);
}

console.log("\nInvoice Summary:");
console.log(`  Total found: ${invoiceResult.summary.totalFound}`);
console.log(`  By type: ${JSON.stringify(invoiceResult.summary.byType)}`);
console.log(`  Primary ABN: ${invoiceResult.summary.primaryAbn ?? "N/A"}`);
console.log(`  Date range: ${invoiceResult.summary.dateRange ? `${invoiceResult.summary.dateRange.earliest} to ${invoiceResult.summary.dateRange.latest}` : "N/A"}`);

// Dividend statement extraction test
console.log("\n=== DIVIDEND STATEMENT EXTRACTION TEST ===");

const dividendResult = await extractNumbers(TEST_DIVIDEND_STATEMENT);

console.log(`Found ${dividendResult.numbers.length} numbers:`);
for (const num of dividendResult.numbers) {
  console.log(`  [${num.type.toUpperCase()}] "${num.value}" -> ${JSON.stringify(num.normalized)} (confidence: ${(num.confidence * 100).toFixed(0)}%)`);
}

// Batch extraction test
console.log("\n=== BATCH EXTRACTION TEST ===");

const batchDocs = [
  { id: "receipt-001", text: TEST_RECEIPT },
  { id: "invoice-001", text: TEST_INVOICE },
  { id: "statement-001", text: TEST_BANK_STATEMENT },
];

const batchResults = await extractNumbersBatch(batchDocs);

console.log("Batch extraction results:");
for (const [id, result] of batchResults) {
  console.log(`  ${id}: ${result.numbers.length} numbers extracted`);
}

// Context-aware extraction test
console.log("\n=== CONTEXT-AWARE EXTRACTION TEST ===");

const contextText = `
Purchase Order: PO-2024-5678
Date: March 20, 2024
Vendor ABN: 51 824 753 556
Account: ACC-12345

Line Items:
Item 1: Widget A, Qty: 10, Price: $25.00 each = $250.00
Item 2: Widget B, Qty: 5, Price: $50.00 each = $250.00

Subtotal: $500.00
Discount (10%): -$50.00
GST (10%): $45.00
Total Due: $495.00
`;

const contextResult = await extractNumbers(contextText, { extractContext: true, contextWindow: 30 });

console.log(`Found ${contextResult.numbers.length} numbers with context:`);
for (const num of contextResult.numbers) {
  if (num.context) {
    console.log(`  [${num.type.toUpperCase()}] "${num.value}"`);
    console.log(`    Context: "...${num.context}..."`);
  }
}

// Test options
console.log("\n=== OPTIONS TEST ===");

const minConfidenceResult = await extractNumbers(TEST_RECEIPT, { minConfidence: 0.8 });
console.log(`With minConfidence=0.8: ${minConfidenceResult.numbers.length} numbers (vs ${receiptResult.numbers.length} with default)`);

const noNormalizeResult = await extractNumbers(TEST_RECEIPT, { normalizeDates: false });
const normalizedDates = noNormalizeResult.numbers.filter(n => n.type === "date" && n.normalized);
console.log(`With normalizeDates=false: ${normalizedDates.length} dates have normalized values`);

// Test extraction from different document types
console.log("\n=== DOCUMENT TYPE EXTRACTION TEST ===");

const docTypes = ["receipt", "bank_statement", "invoice", "dividend_statement", "contract"];

for (const docType of docTypes) {
  const result = await extractFromDocument(TEST_RECEIPT, docType);
  console.log(`  ${docType}: ${result.numbers.length} numbers (confidence: ${(result.summary.confidence * 100).toFixed(1)}%)`);
}

// Summary
console.log("\n=== TEST SUMMARY ===");

// Verify ACN tests
const validAcnTest = validAcns.every(validateAcn);
const invalidAcnTest = invalidAcns.every(a => !validateAcn(a));
console.log(`ACN validation check - valid: ${validAcnTest}, invalid: ${invalidAcnTest}`);

const allTests = [
  { name: "ABN Validation", passed: validAbns.every(validateAbn) && invalidAbns.every(a => !validateAbn(a)) },
  { name: "ACN Validation", passed: validAcnTest && invalidAcnTest },
  { name: "Date Normalization", passed: dateTests.every(t => normalizeDate(t.input) === t.expected) },
  { name: "Amount Normalization", passed: amountTests.every(t => normalizeAmount(t.input) === t.expected) },
  { name: "Receipt Extraction", passed: receiptResult.numbers.length >= 3 },
  { name: "Invoice Extraction", passed: invoiceResult.numbers.length >= 3 },
  { name: "Bank Statement Extraction", passed: statementResult.numbers.length >= 3 },
  { name: "Dividend Statement Extraction", passed: dividendResult.numbers.length >= 3 },
  { name: "Batch Extraction", passed: batchResults.size === 3 },
  { name: "Context Extraction", passed: contextResult.numbers.some(n => n.context && n.context.length > 0) },
];

let passedCount = 0;
for (const test of allTests) {
  const status = test.passed ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${status}: ${test.name}`);
  if (test.passed) passedCount++;
}

console.log(`\nTotal: ${passedCount}/${allTests.length} tests passed`);

// Export test results for potential automated testing
export { allTests as testResults };
