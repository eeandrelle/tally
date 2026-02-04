# Invoice Parser Test Fixtures

This directory contains sample invoice documents for testing the invoice parsing functionality.

## Files

### sample-invoice-1.txt
A comprehensive Australian tax invoice with:
- ABN: 51 824 753 556 (valid format)
- Invoice Number: INV-2024-001
- Multiple line items with quantities and unit prices
- GST calculation
- Payment terms
- Full vendor details

### sample-invoice-2.txt
A simpler invoice format with:
- ABN: 98 765 432 109
- Invoice Number: TS-2024-0558
- Australian date format (DD/MM/YYYY)
- Simple line items
- GST breakdown

## Testing Patterns

The invoice parser should extract:

1. **ABN** - 11 digit number with optional spaces
2. **Invoice Number** - Various formats (INV-XXX, #XXX, etc.)
3. **Dates** - Multiple formats (ISO, Australian, written)
4. **Line Items** - Description, quantity, unit price, total
5. **Payment Terms** - Net 30, 14 days, etc.
6. **Totals** - Including GST breakdown

## Expected Confidence Scores

- High confidence (>0.8): Clear ABN, standard invoice format
- Medium confidence (0.6-0.8): Partial matches, missing some fields
- Low confidence (<0.6): Poor quality scans, handwritten, unusual formats
