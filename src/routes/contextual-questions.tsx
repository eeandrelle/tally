import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useContextualQuestions } from "../hooks/useContextualQuestions";
import { ContextualQuestionPanel, TaxImpactBadge } from "../components/contextual";
import { Receipt } from "../components/ReceiptListView";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  HelpCircle,
  Sparkles,
  MessageSquare,
  DollarSign,
  Download,
  RotateCcw,
  Lightbulb,
} from "lucide-react";

// Mock receipts for demo
const MOCK_RECEIPTS: Receipt[] = [
  {
    id: 1,
    vendor: "IKEA",
    amount: 299.0,
    date: "2026-02-15",
    category: "D5 Other Work-Related",
    description: "Office desk for home office",
    status: "pending",
  },
  {
    id: 2,
    vendor: "BP",
    amount: 85.5,
    date: "2026-02-14",
    category: "D1 Car Expenses",
    description: "Fuel refill",
    status: "pending",
  },
  {
    id: 3,
    vendor: "University of Sydney",
    amount: 1200.0,
    date: "2026-02-10",
    category: "D4 Self-Education",
    description: "Professional development course",
    status: "pending",
  },
  {
    id: 4,
    vendor: "Bunnings Warehouse",
    amount: 145.99,
    date: "2026-02-08",
    category: "D5 Other Work-Related",
    description: "Tools and safety equipment",
    status: "pending",
  },
  {
    id: 5,
    vendor: "Telstra",
    amount: 89.0,
    date: "2026-02-01",
    category: "D5 Other Work-Related",
    description: "Monthly mobile bill",
    status: "pending",
  },
  {
    id: 6,
    vendor: "Qantas",
    amount: 450.0,
    date: "2026-01-28",
    category: "D2 Travel Expenses",
    description: "Flight to Melbourne for client meeting",
    status: "pending",
  },
  {
    id: 7,
    vendor: "Apple",
    amount: 2499.0,
    date: "2026-01-20",
    category: "D5 Other Work-Related",
    description: "MacBook Pro for work",
    status: "pending",
  },
];

export const Route = createFileRoute("/contextual-questions")({
  component: ContextualQuestionsPage,
});

function ContextualQuestionsPage() {
  const [receipts] = useState<Receipt[]>(MOCK_RECEIPTS);
  const [activeTab, setActiveTab] = useState("questions");

  const {
    questions,
    responses,
    taxImpact,
    addResponse,
    exportToJson,
    resetResponses,
    refreshQuestions,
  } = useContextualQuestions({
    receipts,
    userProfile: {
      workArrangement: "hybrid",
      vehicleUsedForWork: true,
      occupation: "Software Engineer",
    },
  });

  const handleExport = () => {
    const json = exportToJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contextual-responses.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: questions.length,
    answered: responses.length,
    pending: questions.length - responses.length,
    highPriority: questions.filter((q) => q.priority === "high").length,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              <h1 className="text-2xl font-bold">Contextual Question System</h1>
            </div>
            <p className="mt-1 text-muted-foreground">
              Smart prompts that help maximize your tax deductions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={resetResponses}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Questions</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <HelpCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.answered}</div>
                <div className="text-xs text-muted-foreground">Answered</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Lightbulb className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.highPriority}</div>
                <div className="text-xs text-muted-foreground">High Priority</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ${taxImpact.totalEstimatedSavings.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Est. Savings</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tax Impact Summary */}
        {taxImpact.totalEstimatedSavings > 0 && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800">
                    💰 Potential Tax Savings Identified!
                  </h3>
                  <p className="text-sm text-green-700">
                    Based on your responses, you could claim additional deductions
                  </p>
                </div>
                <div className="flex gap-2">
                  <TaxImpactBadge
                    amount={taxImpact.confirmedSavings}
                    type="confirmed"
                  />
                  <TaxImpactBadge
                    amount={taxImpact.potentialSavings}
                    type="potential"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="questions">
              <MessageSquare className="mr-2 h-4 w-4" />
              Questions ({stats.pending} pending)
            </TabsTrigger>
            <TabsTrigger value="about">
              <Lightbulb className="mr-2 h-4 w-4" />
              How It Works
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="mt-4">
            <ContextualQuestionPanel
              questions={questions}
              receipts={receipts}
              responses={responses}
              onResponse={addResponse}
            />
          </TabsContent>

          <TabsContent value="about" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>How Contextual Questions Work</CardTitle>
                <CardDescription>
                  Understanding how we help you maximize deductions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <span className="text-lg font-bold text-blue-600">1</span>
                    </div>
                    <h4 className="font-semibold">Upload Receipts</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload your receipts and documents. Our system analyzes each one
                      to understand the context.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <span className="text-lg font-bold text-blue-600">2</span>
                    </div>
                    <h4 className="font-semibold">Smart Questions</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Based on what you uploaded, we ask targeted questions to identify
                      potential deductions you might miss.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <span className="text-lg font-bold text-blue-600">3</span>
                    </div>
                    <h4 className="font-semibold">Maximize Savings</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your answers help us categorize expenses correctly and identify
                      additional deductions you can claim.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <h4 className="mb-3 font-semibold">Example Questions</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary">WFH</Badge>
                      <p className="text-sm">
                        <strong>"Are you working from home?"</strong> - Asked when you
                        upload office furniture or equipment purchases
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary">Vehicle</Badge>
                      <p className="text-sm">
                        <strong>"Is this vehicle expense work-related?"</strong> - Asked
                        for fuel, repairs, or registration costs
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary">Education</Badge>
                      <p className="text-sm">
                        <strong>"Is this course related to your current work?"</strong>{" "}
                        - Asked for training and course fees
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary">Depreciation</Badge>
                      <p className="text-sm">
                        <strong>"Is this item over $300 and used for work?"</strong> -
                        Asked for expensive equipment purchases
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h4 className="mb-2 font-semibold text-amber-800">
                    Privacy & Security
                  </h4>
                  <p className="text-sm text-amber-700">
                    Your responses are stored locally on your device and are only used
                    to help categorize your expenses correctly. We never share your
                    personal tax information with third parties.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sample Receipts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sample Receipts Being Analyzed</CardTitle>
            <CardDescription>
              These receipts are triggering contextual questions above
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {MOCK_RECEIPTS.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-medium">
                      {receipt.vendor.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{receipt.vendor}</div>
                      <div className="text-xs text-muted-foreground">
                        {receipt.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${receipt.amount.toFixed(2)}</div>
                    <Badge variant="outline" className="text-xs">
                      {receipt.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
