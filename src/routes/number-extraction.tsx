/**
 * Number Extraction Demo Page (TAL-102)
 * 
 * Interactive demo page for the Smart Number Extraction System
 * Allows testing extraction on sample documents
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNumberExtraction } from "@/hooks/useNumberExtraction";
import {
  ExtractionResultView,
  EmptyExtractionState,
  ExtractingState,
} from "@/components/numbers";
import { Calculator, FileText, Receipt, CreditCard, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/number-extraction")({
  component: NumberExtractionDemo,
});

// Sample documents for testing
const SAMPLE_DOCUMENTS = {
  receipt: `TAX INVOICE
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
Thank you for your business!`,

  invoice: `INVOICE
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

Payment Terms: Net 30`,

  bank_statement: `Commonwealth Bank Statement
Account: 06 1234 5678901
Statement Period: 01/01/2024 to 31/01/2024

Date        | Description           | Debit    | Credit   | Balance
-----------|----------------------|----------|----------|----------
01/01/2024 | Opening Balance      |          |          | $5,234.56
05/01/2024 | Salary Deposit       |          | $4,500.00| $9,734.56
10/01/2024 | Grocery Store        | $156.78  |          | $9,577.78
15/01/2024 | Rent Payment         | $2,000.00|          | $7,577.78
31/01/2024 | Closing Balance      |          |          | $7,577.78`,

  dividend: `COMPUTERSHARE DIVIDEND STATEMENT
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
Net Payment: $750.00`,
};

function NumberExtractionDemo() {
  const [text, setText] = useState(SAMPLE_DOCUMENTS.receipt);
  const [selectedSample, setSelectedSample] = useState<keyof typeof SAMPLE_DOCUMENTS>("receipt");
  const { numbers, summary, isExtracting, extract, reset } = useNumberExtraction();

  const handleSampleChange = (value: keyof typeof SAMPLE_DOCUMENTS) => {
    setSelectedSample(value);
    setText(SAMPLE_DOCUMENTS[value]);
    reset();
  };

  const handleExtract = () => {
    extract(text);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calculator className="w-8 h-8" />
          Smart Number Extraction
        </h1>
        <p className="text-muted-foreground mt-2">
          Extract amounts, dates, ABNs, account numbers, and more from documents
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Text
            </CardTitle>
            <CardDescription>
              Paste document text or select a sample
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sample">Sample Document</Label>
              <Select value={selectedSample} onValueChange={handleSampleChange}>
                <SelectTrigger id="sample">
                  <SelectValue placeholder="Select a sample" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      Coffee Shop Receipt
                    </div>
                  </SelectItem>
                  <SelectItem value="invoice">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Consulting Invoice
                    </div>
                  </SelectItem>
                  <SelectItem value="bank_statement">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Bank Statement
                    </div>
                  </SelectItem>
                  <SelectItem value="dividend">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Dividend Statement
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">Document Content</Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={20}
                className="font-mono text-sm"
                placeholder="Paste document text here..."
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleExtract} 
                disabled={isExtracting || !text.trim()}
                className="flex-1"
              >
                {isExtracting ? "Extracting..." : "Extract Numbers"}
              </Button>
              <Button variant="outline" onClick={reset} disabled={isExtracting}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div>
          {isExtracting ? (
            <ExtractingState />
          ) : numbers.length === 0 ? (
            <EmptyExtractionState />
          ) : summary ? (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="all">All Numbers ({numbers.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="mt-4">
                <ExtractionResultView result={{ numbers, summary }} />
              </TabsContent>
              <TabsContent value="all" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>All Extracted Numbers</CardTitle>
                    <CardDescription>
                      {numbers.length} numbers found in document
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {numbers.map((num, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">{num.type}</Badge>
                            <div>
                              <p className="font-mono text-sm">{num.value}</p>
                              {num.normalized && num.normalized !== num.value && (
                                <p className="text-xs text-muted-foreground">
                                  → {String(num.normalized)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                num.confidence >= 0.9
                                  ? "border-green-500 text-green-600"
                                  : num.confidence >= 0.7
                                  ? "border-yellow-500 text-yellow-600"
                                  : "border-red-500 text-red-600"
                              }
                            >
                              {Math.round(num.confidence * 100)}%
                            </Badge>
                            {num.context && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                                {num.context}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>

      {/* Features Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Supported Extraction Types</CardTitle>
          <CardDescription>
            The Smart Number Extraction System can detect and extract:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <DollarSign className="w-6 h-6 mb-2 text-green-500" />
              <h4 className="font-medium">Amounts</h4>
              <p className="text-sm text-muted-foreground">
                $1,234.56, AUD 500, €100, etc.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <Calculator className="w-6 h-6 mb-2 text-blue-500" />
              <h4 className="font-medium">Dates</h4>
              <p className="text-sm text-muted-foreground">
                15/03/2024, Mar 15, 2024, etc.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <FileText className="w-6 h-6 mb-2 text-purple-500" />
              <h4 className="font-medium">ABNs</h4>
              <p className="text-sm text-muted-foreground">
                51 824 753 556 (with validation)
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <CreditCard className="w-6 h-6 mb-2 text-orange-500" />
              <h4 className="font-medium">Account Numbers</h4>
              <p className="text-sm text-muted-foreground">
                Bank accounts, references
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <Receipt className="w-6 h-6 mb-2 text-pink-500" />
              <h4 className="font-medium">Invoice Numbers</h4>
              <p className="text-sm text-muted-foreground">
                INV-2024-001, etc.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <FileSpreadsheet className="w-6 h-6 mb-2 text-red-500" />
              <h4 className="font-medium">GST/Tax</h4>
              <p className="text-sm text-muted-foreground">
                GST amounts, tax values
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <Badge percent className="w-6 h-6 mb-2 text-cyan-500" />
              <h4 className="font-medium">Percentages</h4>
              <p className="text-sm text-muted-foreground">
                10%, 15.5%, discounts
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <FileText className="w-6 h-6 mb-2 text-yellow-500" />
              <h4 className="font-medium">Quantities</h4>
              <p className="text-sm text-muted-foreground">
                Qty: 5, 10 items, etc.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NumberExtractionDemo;
