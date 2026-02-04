/**
 * Document Type Detection Engine Tests
 * Run with: npm test -- document-detection.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import {
  detectDocumentType,
  detectDocumentTypesBatch,
  getDocumentTypeLabel,
  getDocumentTypeIcon,
  isConfidenceAcceptable,
  getRecommendedAction,
  exportDetectionResults,
  DocumentType,
} from "./document-detection";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("Document Type Detection Engine", () => {
  describe("Receipt Detection", () => {
    it("should detect a simple receipt with high confidence", async () => {
      const text = `
        COLES SUPERMARKET
        Receipt #12345
        ABN 45 004 189 708
        
        Item          Qty    Price
        Milk          1      $2.50
        Bread         1      $3.00
        
        Subtotal             $5.50
        GST                  $0.50
        Total                $6.00
        
        Payment: Card
        Thank you for shopping!
      `;

      const result = await detectDocumentType(text);
      
      expect(result.type).toBe("receipt");
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.method).toBeDefined();
    });

    it("should detect tax invoice as receipt", async () => {
      const text = `
        TAX INVOICE
        Invoice #: INV-2024-001
        ABN: 12 345 678 901
        
        Total Amount Due: $150.00
        GST: $13.64
      `;

      const result = await detectDocumentType(text);
      
      expect(result.type).toBe("receipt");
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("Bank Statement Detection", () => {
    it("should detect bank statement with high confidence", async () => {
      const text = `
        Commonwealth Bank Statement
        Account Number: 1234 5678 9012
        BSB: 062-000
        
        Period: 01/01/2024 to 31/01/2024
        Opening Balance: $1,234.56
        Closing Balance: $2,345.67
        
        Date        Transaction                    Debit      Credit
        01/01       Direct Debit - Electricity     $120.00
        05/01       Salary Deposit                            $3,000.00
        10/01       Grocery Purchase               $85.50
      `;

      const result = await detectDocumentType(text);
      
      expect(result.type).toBe("bank_statement");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should detect various Australian bank statements", async () => {
      const banks = ["CommBank", "NAB", "Westpac", "ANZ", "ING"];
      
      for (const bank of banks) {
        const text = `
          ${bank} Account Statement
          Opening Balance: $1000
          Closing Balance: $1200
          Transactions listed below
        `;
        
        const result = await detectDocumentType(text);
        expect(result.type).toBe("bank_statement");
      }
    });
  });

  describe("Dividend Statement Detection", () => {
    it("should detect dividend statement with franking credits", async () => {
      const text = `
        DIVIDEND STATEMENT
        Commonwealth Bank of Australia
        Share Registry: Link Market Services
        
        Dividend Payment Date: 15/03/2024
        Franked Dividend: $500.00
        Franking Credits: $214.29
        Unfranked Amount: $0.00
        
        Shares Held: 1,000
        Dividend per Share: $0.50
      `;

      const result = await detectDocumentType(text);
      
      expect(result.type).toBe("dividend_statement");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should detect DRIP (Dividend Reinvestment Plan) statement", async () => {
      const text = `
        Dividend Reinvestment Plan (DRP) Statement
        Computershare Investor Services
        
        Dividend Amount: $250.00
        Shares Allocated: 10
        Price per Share: $25.00
        Remainder: $0.00
      `;

      const result = await detectDocumentType(text);
      
      expect(result.type).toBe("dividend_statement");
    });
  });

  describe("Invoice Detection", () => {
    it("should detect commercial invoice with payment terms", async () => {
      const text = `
        INVOICE
        Invoice Number: INV-2024-056
        Date: 15/02/2024
        
        Bill To:
        ABC Company Pty Ltd
        
        Payment Terms: Net 30
        Due Date: 17/03/2024
        
        Description              Qty    Unit Price    Amount
        Consulting Services      10     $150.00       $1,500.00
        
        Subtotal: $1,500.00
        GST (10%): $150.00
        Total: $1,650.00
        
        Payment Instructions:
        BSB: 062-000
        Account: 12345678
      `;

      const result = await detectDocumentType(text);
      
      expect(result.type).toBe("invoice");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should detect invoice with PO number", async () => {
      const text = `
        Tax Invoice
        PO Number: PO-789
        Invoice #: 456
        
        Description: Professional Services
        Amount Due: $5,000.00
        Payment Terms: Due on Receipt
      `;

      const result = await detectDocumentType(text);
      
      expect(result.type).toBe("invoice");
    });
  });

  describe("Contract Detection", () => {
    it("should detect contract with legal terms", async () => {
      const text = `
        SERVICE AGREEMENT
        
        This Agreement is made between Party A and Party B.
        
        1. TERM AND TERMINATION
        This agreement shall commence on 1 January 2024 and continue for 12 months.
        Either party may terminate with 30 days written notice.
        
        2. LIABILITY AND INDEMNITY
        Party A indemnifies Party B against all claims.
        
        3. GOVERNING LAW
        This agreement is governed by the laws of New South Wales.
        
        Signature: _________________ Date: _______________
      `;

      const result = await detectDocumentType(text);
      
      expect(result.type).toBe("contract");
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("Edge Cases", () => {
    it("should return unknown for empty text", async () => {
      const result = await detectDocumentType("");
      expect(result.type).toBe("unknown");
    });

    it("should return unknown for generic text", async () => {
      const text = "This is just some random text without any document indicators.";
      const result = await detectDocumentType(text);
      expect(result.type).toBe("unknown");
    });

    it("should handle mixed content and pick best match", async () => {
      // Text that has some receipt keywords but is clearly a bank statement
      const text = `
        Bank Statement - January 2024
        Opening Balance: $1000
        Closing Balance: $1200
        
        Transactions:
        01/01 - Receipt of Salary: $2000
        05/01 - Grocery Receipt: $150
      `;

      const result = await detectDocumentType(text);
      expect(result.type).toBe("bank_statement");
    });
  });

  describe("Batch Processing", () => {
    it("should process multiple documents", async () => {
      const documents = [
        { text: "Receipt #123 Total $50.00 Payment: Card" },
        { text: "Bank Statement Opening Balance $1000" },
        { text: "Invoice #456 Payment Terms: Net 30" },
      ];

      const results = await detectDocumentTypesBatch(documents);

      expect(results).toHaveLength(3);
      expect(results[0].type).toBe("receipt");
      expect(results[1].type).toBe("bank_statement");
      expect(results[2].type).toBe("invoice");
    });
  });

  describe("Helper Functions", () => {
    it("should return correct labels for all document types", () => {
      const types: DocumentType[] = [
        "receipt",
        "bank_statement",
        "dividend_statement",
        "invoice",
        "contract",
        "unknown",
      ];

      for (const type of types) {
        const label = getDocumentTypeLabel(type);
        expect(label).toBeDefined();
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it("should return correct icons for all document types", () => {
      const types: DocumentType[] = [
        "receipt",
        "bank_statement",
        "dividend_statement",
        "invoice",
        "contract",
        "unknown",
      ];

      for (const type of types) {
        const icon = getDocumentTypeIcon(type);
        expect(icon).toBeDefined();
        expect(typeof icon).toBe("string");
      }
    });

    it("should correctly assess confidence levels", () => {
      expect(isConfidenceAcceptable(0.85)).toBe(true);
      expect(isConfidenceAcceptable(0.60)).toBe(true);
      expect(isConfidenceAcceptable(0.59)).toBe(false);
      expect(isConfidenceAcceptable(0.40)).toBe(false);
    });

    it("should return correct recommended actions", async () => {
      const highConfidence = await detectDocumentType("Receipt #123 Total $50 ABN 123456");
      highConfidence.confidence = 0.90;
      expect(getRecommendedAction(highConfidence)).toBe("accept");

      const mediumConfidence = await detectDocumentType("Receipt #123 Total $50");
      mediumConfidence.confidence = 0.50;
      expect(getRecommendedAction(mediumConfidence)).toBe("review");

      const lowConfidence = await detectDocumentType("Some text");
      lowConfidence.confidence = 0.30;
      expect(getRecommendedAction(lowConfidence)).toBe("manual");
    });

    it("should export results to JSON", () => {
      const results = [
        {
          filePath: "/path/to/receipt.pdf",
          result: {
            type: "receipt" as DocumentType,
            confidence: 0.85,
            method: "keyword" as const,
            metadata: { detectedKeywords: ["receipt"], format: "pdf" },
          },
        },
      ];

      const json = exportDetectionResults(results);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("receipt");
      expect(parsed[0].confidence).toBe(0.85);
      expect(parsed[0].recommendedAction).toBe("accept");
    });
  });
});

// Integration test example
describe("Document Detection Integration", () => {
  it("should handle real-world receipt variations", async () => {
    const receipts = [
      // Supermarket receipt
      `Woolworths Receipt
       Items: Milk $2.50, Bread $3.00
       Total: $5.50`,
      
      // Restaurant receipt
      `Joe's Cafe
       Table 5
       Coffee $4.50
       Sandwich $12.00
       Total: $16.50
       Thank you!`,
      
      // Fuel receipt
      `7-Eleven Fuel
       Pump 3: Unleaded 98
       45.5L @ $1.85/L
       Total: $84.18`,
      
      // Online purchase
      `Amazon.com.au Order
       Order #: 123-4567890
       Total: $129.99
       GST: $11.82`,
    ];

    for (const receipt of receipts) {
      const result = await detectDocumentType(receipt);
      expect(result.type).toBe("receipt");
      expect(result.confidence).toBeGreaterThan(0.4);
    }
  });

  it("should handle real-world bank statements", async () => {
    const statements = [
      // Personal account
      `Statement Period: Jan 2024
       Account: Everyday Offset
       Opening: $5,234.00
       Closing: $4,876.50`,
      
      // Business account
      `Business Account Statement
       BSB: 062-000 Acc: 12345678
       Total Credits: $15,000
       Total Debits: $12,500`,
      
      // Credit card
      `Credit Card Statement
       Credit Limit: $10,000
       Balance Due: $2,345.67
       Minimum Payment: $50.00`,
    ];

    for (const statement of statements) {
      const result = await detectDocumentType(statement);
      expect(result.type).toBe("bank_statement");
    }
  });
});
