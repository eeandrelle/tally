import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ReportGeneratorCard } from "@/components/tax-report/ReportGeneratorCard";
import { ReportPreviewDialog } from "@/components/tax-report/ReportPreviewDialog";
import { ReportSettingsPanel } from "@/components/tax-report/ReportSettingsPanel";
import { ReportHistoryList, ReportHistoryItem, addReportToHistory } from "@/components/tax-report/ReportHistoryList";
import { useTaxReportPDF, ReportOptions } from "@/hooks/useTaxReportPDF";
import { useTaxYear } from "@/contexts/TaxYearContext";
import { TaxReportConfig, ClientInfo, getTaxReportBlob } from "@/lib/tax-report-pdf";
import { 
  FileText, 
  Settings, 
  History, 
  Sparkles, 
  ChevronRight,
  Download,
  Eye,
  Calculator,
  Receipt,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tax-reports")({
  component: TaxReportsPage,
});

function TaxReportsPage() {
  const { selectedYear, getYearDates } = useTaxYear();
  const [activeTab, setActiveTab] = useState("generate");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedConfig, setSavedConfig] = useState<Partial<TaxReportConfig>>({});

  const {
    state,
    pdf,
    previewUrl: hookPreviewUrl,
    generateReportForYear,
    downloadReport,
    saveReport,
  } = useTaxReportPDF({
    onComplete: (generatedPdf, filename) => {
      // Add to history
      const blob = getTaxReportBlob(generatedPdf);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      
      addReportToHistory({
        id: `report-${Date.now()}`,
        filename,
        clientName: savedConfig.clientInfo?.name || "Client",
        taxYear: selectedYear,
        generatedAt: new Date(),
        mode: savedConfig.mode || "full",
        pageCount: generatedPdf.getNumberOfPages(),
        fileSize: formatFileSize(blob.size),
        sections: savedConfig.includeSections,
      });
    },
    onError: (error) => {
      toast.error(`Report generation failed: ${error.message}`);
    },
  });

  const handleSettingsSave = useCallback((config: TaxReportConfig) => {
    setSavedConfig(config);
    toast.success("Settings saved. You can now generate your report.");
  }, []);

  const handlePreview = useCallback(() => {
    if (hookPreviewUrl) {
      setPreviewUrl(hookPreviewUrl);
      setIsPreviewOpen(true);
    } else if (pdf) {
      const blob = getTaxReportBlob(pdf);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setIsPreviewOpen(true);
    }
  }, [hookPreviewUrl, pdf]);

  const handleDownload = useCallback(() => {
    downloadReport();
  }, [downloadReport]);

  const handleHistoryPreview = useCallback((report: ReportHistoryItem) => {
    // In a real implementation, we'd load the saved PDF
    toast.info("Loading report preview...");
  }, []);

  const handleHistoryDownload = useCallback((report: ReportHistoryItem) => {
    // In a real implementation, we'd download the saved PDF
    toast.info("Downloading report...");
  }, []);

  const isGenerating = state.status === "preparing" || state.status === "generating";
  const hasCompleteReport = state.status === "complete" && pdf;

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>Tax Tools</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">Tax Reports</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Tax Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate comprehensive tax reports for your accountant
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Financial Year</p>
              <p className="font-medium">{selectedYear - 1}-{selectedYear}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Report Mode</p>
                <p className="text-2xl font-bold">{savedConfig.mode === "summary" ? "Summary" : "Full"}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sections</p>
                <p className="text-2xl font-bold">
                  {savedConfig.includeSections?.length || 9}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold capitalize">
                  {state.status === "idle" ? "Ready" : state.status}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{state.progress}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="generate" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ReportGeneratorCard
                onPreview={handlePreview}
                onSettings={() => setActiveTab("settings")}
              />
              
              {hasCompleteReport && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      Report Ready
                    </CardTitle>
                    <CardDescription>
                      Your tax report has been generated successfully
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button onClick={handleDownload} className="flex-1">
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What's Included</CardTitle>
                  <CardDescription>
                    Your tax report will contain these sections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {[
                      { title: "Cover Page", desc: "Client info & summary totals" },
                      { title: "Income Summary", desc: "All income sources" },
                      { title: "Deductions Summary", desc: "D1-D15 category totals" },
                      { title: "Detailed Deductions", desc: "Itemized by category" },
                      { title: "Tax Calculation", desc: "Step-by-step breakdown" },
                      { title: "Document Index", desc: "Supporting documents list" },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-primary">{i + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Report Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <p className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Review all receipts before generating to ensure completeness</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Full mode includes all receipt details; Summary mode shows only totals</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Save your client info in Settings for faster report generation</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Share the PDF directly with your accountant or print for meetings</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportSettingsPanel
              initialConfig={savedConfig}
              onSave={handleSettingsSave}
              onReset={() => setSavedConfig({})}
            />
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Report Sections Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-1">Cover Page</h4>
                      <p className="text-muted-foreground">
                        Professional cover with client information, tax year, and summary totals.
                        Essential for accountant reference.
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-1">Table of Contents</h4>
                      <p className="text-muted-foreground">
                        Navigation aid for multi-page reports. Lists all sections with page numbers.
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-1">Tax Calculation</h4>
                      <p className="text-muted-foreground">
                        Step-by-step breakdown showing how taxable income, tax payable, and 
                        refund estimates are calculated.
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-1">Document Index</h4>
                      <p className="text-muted-foreground">
                        Complete list of all receipts and supporting documents with page references.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ReportHistoryList
                onPreview={handleHistoryPreview}
                onDownload={handleHistoryDownload}
              />
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About Report History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    Your generated reports are tracked locally in your browser. This helps you:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Keep track of reports shared with accountants</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Re-download previous versions if needed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Monitor report generation over time</span>
                    </li>
                  </ul>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Note: Report history is stored locally and will be lost if you clear browser data. 
                    The actual PDF files need to be saved separately.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <ReportPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfUrl={previewUrl}
        onDownload={handleDownload}
      />
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
