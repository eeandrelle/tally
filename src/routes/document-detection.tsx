import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useDocumentDetection } from "../hooks/useDocumentDetection";
import {
  DocumentTypeBadge,
  ConfidenceIndicator,
} from "../components/document/DocumentTypeBadge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Loader2, Sparkles, FileText, RefreshCw, Upload } from "lucide-react";

// Sample documents for testing
const SAMPLE_DOCUMENTS = {
  receipt: `COLES SUPERMARKET
Receipt #: 12345
ABN: 45 004 189 708
Date: 20/02/2024

Item          Qty    Price
Milk          1      $2.50
Bread         1      $3.00
Eggs          1      $6.00

Subtotal             $11.50
GST                  $1.05
Total                $12.55

Payment: Card Tap
Thank you for shopping!`,

  bank_statement: `Commonwealth Bank
Account Statement
Account: 1234 5678 9012
BSB: 062-000

Period: 01/01/2024 to 31/01/2024
Opening Balance: $2,500.00
Closing Balance: $3,200.00

Date        Description                    Debit      Credit
01/01       Salary Deposit                            $4,000.00
05/01       Rent Payment                   $1,800.00
10/01       Grocery Store                  $156.50
15/01       Direct Debit - Phone           $89.00`,

  dividend: `Dividend Statement
BHP Group Limited
Share Registry: Computershare

Payment Date: 28/03/2024

Dividend Details:
Franked Dividend: $850.00
Franking Credits: $364.29
Unfranked Amount: $0.00

Shares Held: 500
Dividend per Share: $1.70
Total Payment: $850.00`,

  invoice: `TAX INVOICE
ABC Consulting Pty Ltd
Invoice #: INV-2024-089
Date: 15/02/2024
ABN: 88 123 456 789

Bill To:
XYZ Company Ltd

Payment Terms: Net 14
Due Date: 01/03/2024

Description                    Amount
Professional Services          $2,500.00

Subtotal                       $2,500.00
GST (10%)                      $250.00
Total Amount Due               $2,750.00

Payment: BSB 062-000 Acc 12345678`,

  contract: `SERVICE AGREEMENT

This Agreement is entered into on 1st January 2024 between:

PARTY A: Service Provider Pty Ltd
PARTY B: Client Company Ltd

1. TERM
This agreement shall commence on 1 January 2024 and continue for 12 months unless terminated earlier in accordance with clause 5.

2. SERVICES
The Service Provider agrees to provide consulting services as detailed in Schedule A.

3. PAYMENT
The Client agrees to pay fees as invoiced within 14 days of receipt.

4. LIABILITY
Each party indemnifies the other against claims arising from negligence.

5. TERMINATION
Either party may terminate with 30 days written notice.

Signature: _________________ Date: _______________`,
};

export const Route = createFileRoute("/document-detection")({
  component: DocumentDetectionDemo,
});

function DocumentDetectionDemo() {
  const [inputText, setInputText] = useState("");
  const [selectedSample, setSelectedSample] = useState<keyof typeof SAMPLE_DOCUMENTS | null>(null);
  
  const {
    result,
    isDetecting,
    error,
    detect,
    reset,
    shouldReview,
    canAutoProcess,
    documentLabel,
    confidenceLevel,
  } = useDocumentDetection();

  const handleDetect = async () => {
    if (!inputText.trim()) return;
    await detect(inputText);
  };

  const loadSample = (type: keyof typeof SAMPLE_DOCUMENTS) => {
    setInputText(SAMPLE_DOCUMENTS[type]);
    setSelectedSample(type);
    reset();
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Document Type Detection Engine</h1>
        <p className="text-muted-foreground">
          TAL-101: ML-based classifier for auto-detecting document types
        </p>
      </div>

      <div className="grid gap-6">
        {/* Sample Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Documents</CardTitle>
            <CardDescription>
              Click to load a sample document for testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SAMPLE_DOCUMENTS) as Array<keyof typeof SAMPLE_DOCUMENTS>).map(
                (type) => (
                  <Button
                    key={type}
                    variant={selectedSample === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => loadSample(type)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* File Upload Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Upload a PDF or image to analyze (file picker integration coming soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PDF, JPG, PNG
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Input Area */}
        <Card>
          <CardHeader>
            <CardTitle>Document Text</CardTitle>
            <CardDescription>
              Paste document text or edit the sample
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setSelectedSample(null);
              }}
              placeholder="Paste document text here..."
              rows={12}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleDetect}
                disabled={isDetecting || !inputText.trim()}
                className="flex-1"
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Detect Document Type
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={reset} disabled={isDetecting}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Detection Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Type & Confidence */}
              <div className="flex flex-wrap items-center gap-4">
                <DocumentTypeBadge
                  type={result.type}
                  confidence={result.confidence}
                  size="lg"
                />
                <ConfidenceIndicator
                  confidence={result.confidence}
                  size="lg"
                />
              </div>

              {/* Detection Method */}
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium">Detection Method</p>
                <p className="text-muted-foreground capitalize">
                  {result.method.replace("_", " ")}
                </p>
              </div>

              {/* Metadata */}
              {result.metadata.detectedKeywords.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Detected Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {result.metadata.detectedKeywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Required */}
              <div
                className={`rounded-lg border p-4 ${
                  canAutoProcess
                    ? "border-green-200 bg-green-50"
                    : shouldReview
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p className="font-medium">
                  {canAutoProcess
                    ? "✓ Can Auto-Process"
                    : shouldReview
                    ? "⚠ Review Recommended"
                    : "✗ Manual Entry Required"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Confidence: {Math.round(result.confidence * 100)}%
                </p>
              </div>

              {/* Technical Details */}
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="mb-2 text-sm font-medium">Technical Details</p>
                <pre className="overflow-auto rounded bg-slate-100 p-2 text-xs">
                  {JSON.stringify(
                    {
                      type: result.type,
                      confidence: result.confidence,
                      method: result.method,
                      format: result.metadata.format,
                      keywordCount: result.metadata.detectedKeywords.length,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <p className="text-red-600">Error: {error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
