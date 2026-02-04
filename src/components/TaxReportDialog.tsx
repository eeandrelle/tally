/**
 * Tax Report Generation Dialog
 * 
 * Professional tax report generator UI with:
 * - Report configuration options
 * - Real-time preview
 * - PDF, CSV, and JSON export
 * - Progress tracking
 * - File size estimation
 * 
 * TAL-162: Professional Tax Report PDF
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  FileText, 
  Download, 
  Calendar, 
  Settings, 
  Eye, 
  FileImage, 
  TrendingUp,
  FileSpreadsheet,
  FileJson,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileOutput,
  BarChart3,
  Printer
} from "lucide-react";
import {
  generateTaxReportPDF,
  saveTaxReportPDF,
  exportToCSV,
  exportToJSON,
  downloadCSV,
  downloadJSON,
  prepareIncomeSummary,
  prepareDeductionCategories,
  calculateTaxWithRefund,
  prepareDocumentReferences,
  createDefaultReportConfig,
  type TaxReportData,
  type TaxReportConfig,
  type ReportGenerationProgress,
  type CSVExportOptions,
  ATO_CATEGORY_ORDER,
} from "@/lib/tax-report-pdf";
import {
  getReceiptsByDateRange,
  getIncomeByDateRange,
  getTotalDeductions,
  getTotalIncome,
  getTotalTaxWithheld,
  getWorkpapersByTaxYear,
  getClaimsForTaxYear,
  type Receipt,
  type Income,
} from "@/lib/db";
import { atoCategories, type AtoCategoryCode } from "@/lib/ato-categories";
import { calculateTaxPayable } from "@/lib/tax-calculator";
import { getCurrentFinancialYear, getFinancialYearDates } from "@/lib/pdf";

interface TaxReportDialogProps {
  trigger?: React.ReactNode;
  onExportComplete?: () => void;
  defaultTaxYear?: number;
}

type ExportFormat = "pdf" | "csv" | "json" | "all";
type ReportMode = "compact" | "full" | "comprehensive";

export function TaxReportDialog({ trigger, onExportComplete, defaultTaxYear }: TaxReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("configure");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ReportGenerationProgress | null>(null);
  const [previewData, setPreviewData] = useState<TaxReportData | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<string>("2-3 MB");

  // Report configuration
  const [taxYear, setTaxYear] = useState<number>(defaultTaxYear || getCurrentFinancialYear());
  const [reportMode, setReportMode] = useState<ReportMode>("full");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [comparePreviousYear, setComparePreviousYear] = useState(false);
  
  // PDF Options
  const [includeReceiptImages, setIncludeReceiptImages] = useState(false);
  const [imageQuality, setImageQuality] = useState([70]);
  const [includeWorkpapers, setIncludeWorkpapers] = useState(true);
  const [includeSourceDocuments, setIncludeSourceDocuments] = useState(false);
  
  // Section selection
  const [sections, setSections] = useState<Record<string, boolean>>({
    cover: true,
    tableOfContents: true,
    executiveSummary: true,
    incomeSummary: true,
    deductionsSummary: true,
    detailedDeductions: true,
    taxOffsets: true,
    taxCalculation: true,
    workpapers: true,
    documentIndex: true,
    appendix: false,
  });

  // Client info
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAbn, setClientAbn] = useState("");
  const [clientTfn, setClientTfn] = useState("");
  const [accountantNotes, setAccountantNotes] = useState("");

  // Available years
  const currentFY = getCurrentFinancialYear();
  const availableFYs = Array.from({ length: 5 }, (_, i) => currentFY - i);

  // Load preview data when configuration changes
  useEffect(() => {
    if (open) {
      loadPreviewData();
    }
  }, [open, taxYear, reportMode, includeReceiptImages, imageQuality]);

  // Update estimated file size
  useEffect(() => {
    estimateFileSize();
  }, [includeReceiptImages, imageQuality, reportMode, previewData?.receipts.length]);

  const estimateFileSize = () => {
    const receiptCount = previewData?.receipts.length || 50;
    let baseSize = reportMode === "compact" ? 0.5 : reportMode === "full" ? 1.5 : 3;
    
    if (includeReceiptImages) {
      // Estimate: ~50KB per image at 70% quality, scaled by quality setting
      const imageSizeMB = (receiptCount * 50 * (imageQuality[0] / 100)) / 1024;
      baseSize += imageSizeMB;
    }
    
    // Cap at 10MB as per requirements
    const finalSize = Math.min(baseSize, 10);
    setEstimatedSize(`${finalSize.toFixed(1)} MB`);
  };

  const loadPreviewData = useCallback(async () => {
    try {
      const { startDate, endDate } = getFinancialYearDates(taxYear);
      
      // Fetch data
      const [receipts, incomeRecords, totalDeductions, totalIncome, taxWithheld, workpapers, claims] = await Promise.all([
        getReceiptsByDateRange(startDate, endDate),
        getIncomeByDateRange(startDate, endDate),
        getTotalDeductions(startDate, endDate),
        getTotalIncome(startDate, endDate),
        getTotalTaxWithheld(startDate, endDate),
        getWorkpapersByTaxYear(taxYear),
        getClaimsForTaxYear(taxYear),
      ]);

      // Prepare data structures
      const income = prepareIncomeSummary(incomeRecords);
      const deductions = prepareDeductionCategories(receipts);
      
      // Prepare tax offsets from claims
      const taxOffsets = claims
        .filter(c => c.amount > 0)
        .map(c => ({
          type: "Category Claim",
          description: atoCategories.find(cat => cat.code === c.category_code)?.name || c.category_code,
          amount: c.amount,
          code: c.category_code,
        }));

      // Calculate tax
      const taxableIncome = totalIncome - totalDeductions;
      const taxCalculation = calculateTaxWithRefund(
        taxableIncome,
        taxOffsets.reduce((s, o) => s + o.amount, 0),
        taxWithheld
      );

      // Prepare workpaper summaries
      const workpaperSummaries = workpapers.map(wp => ({
        id: wp.id!,
        title: wp.title,
        categoryCode: wp.category_code,
        totalAmount: wp.total_amount,
        receiptCount: wp.receipt_ids ? JSON.parse(wp.receipt_ids).length : 0,
        isFinalized: wp.is_finalized,
      }));

      // Prepare documents
      const documents = prepareDocumentReferences(receipts, workpaperSummaries);

      const data: TaxReportData = {
        config: {
          taxYear,
          clientInfo: { name: clientName || "Taxpayer" },
          reportDate: new Date(),
          includeSections: [],
          mode: reportMode === "compact" ? "compact" : reportMode === "comprehensive" ? "full" : "full",
          includeSourceDocuments,
          imageQuality: imageQuality[0] / 100,
          includeWorkpapers,
        },
        income,
        deductions,
        totalDeductions,
        taxOffsets,
        taxCalculation,
        documents,
        receipts,
        incomeRecords,
        workpapers: workpaperSummaries,
      };

      // Load year-over-year comparison if requested
      if (comparePreviousYear) {
        const prevYear = taxYear - 1;
        const prevDates = getFinancialYearDates(prevYear);
        const [prevDeductions, prevIncome] = await Promise.all([
          getTotalDeductions(prevDates.startDate, prevDates.endDate),
          getTotalIncome(prevDates.startDate, prevDates.endDate),
        ]);
        
        data.yearOverYear = {
          previousYear: prevYear,
          previousTotalDeductions: prevDeductions,
          previousTaxableIncome: prevIncome - prevDeductions,
          categoryComparisons: deductions.map(d => ({
            code: d.code,
            name: d.name,
            currentAmount: d.total,
            previousAmount: 0, // Would need historical data
            change: d.total,
            changePercent: 100,
          })),
        };
      }

      setPreviewData(data);
    } catch (error) {
      console.error("Error loading preview data:", error);
      toast.error("Failed to load preview data");
    }
  }, [taxYear, reportMode, includeSourceDocuments, imageQuality, includeWorkpapers, clientName, comparePreviousYear]);

  const handleGenerateReport = async () => {
    if (!previewData) {
      toast.error("No data available for report generation");
      return;
    }

    setIsGenerating(true);
    setProgress({ stage: "Initializing", progress: 0 });

    try {
      // Update config with current settings
      const config: TaxReportConfig = {
        taxYear,
        clientInfo: {
          name: clientName || "Taxpayer",
          address: clientAddress || undefined,
          phone: clientPhone || undefined,
          email: clientEmail || undefined,
          abn: clientAbn || undefined,
          tfn: clientTfn || undefined,
        },
        reportDate: new Date(),
        includeSections: Object.entries(sections)
          .filter(([, enabled]) => enabled)
          .map(([key]) => key as TaxReportData["config"]["includeSections"][number]),
        mode: reportMode === "compact" ? "compact" : reportMode === "comprehensive" ? "full" : "full",
        includeSourceDocuments,
        imageQuality: imageQuality[0] / 100,
        includeWorkpapers,
        accountantNotes: accountantNotes || undefined,
      };

      const reportData: TaxReportData = {
        ...previewData,
        config,
      };

      if (exportFormat === "pdf" || exportFormat === "all") {
        setProgress({ stage: "Generating PDF...", progress: 10 });
        
        const doc = await generateTaxReportPDF(reportData, (p) => {
          setProgress(p);
        });

        await saveTaxReportPDF(doc, taxYear, clientName);
        
        toast.success("PDF report generated successfully!", {
          description: `Saved Tax Report for FY${taxYear}`,
        });
      }

      if (exportFormat === "csv" || exportFormat === "all") {
        setProgress({ stage: "Exporting CSV...", progress: 70 });
        
        const { startDate, endDate } = getFinancialYearDates(taxYear);
        const csvOptions: CSVExportOptions = {
          taxYear,
          startDate,
          endDate,
          includeReceipts: true,
          includeIncome: true,
          includeCategories: true,
          includeWorkpapers: true,
        };

        const csvData = exportToCSV(reportData, csvOptions);
        
        if (csvData.receipts) {
          downloadCSV(csvData.receipts, `Receipts_FY${taxYear}.csv`);
        }
        if (csvData.income) {
          downloadCSV(csvData.income, `Income_FY${taxYear}.csv`);
        }
        if (csvData.categories) {
          downloadCSV(csvData.categories, `Categories_FY${taxYear}.csv`);
        }
        
        toast.success("CSV files exported successfully!");
      }

      if (exportFormat === "json" || exportFormat === "all") {
        setProgress({ stage: "Exporting JSON...", progress: 90 });
        
        const jsonData = exportToJSON(reportData);
        downloadJSON(jsonData, `TaxReport_FY${taxYear}.json`);
        
        toast.success("JSON export completed!");
      }

      setProgress({ stage: "Complete", progress: 100 });
      onExportComplete?.();
      
      // Close dialog after a short delay
      setTimeout(() => {
        setOpen(false);
        setProgress(null);
      }, 1500);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSection = (section: string) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Generate Tax Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Professional Tax Report Generator
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive tax report for your accountant with all supporting documents.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="configure" className="gap-2">
              <Settings className="h-4 w-4" />
              Configure
            </TabsTrigger>
            <TabsTrigger value="sections" className="gap-2">
              <FileOutput className="h-4 w-4" />
              Sections
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="client" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Client Info
            </TabsTrigger>
          </TabsList>

          {/* Configure Tab */}
          <TabsContent value="configure" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Tax Year
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={taxYear.toString()} onValueChange={(v) => setTaxYear(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFYs.map((fy) => (
                        <SelectItem key={fy} value={fy.toString()}>
                          FY {fy}-{fy + 1} (Jul {fy} - Jun {fy + 1})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Report Mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={reportMode} onValueChange={(v) => setReportMode(v as ReportMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">
                        Compact (~1-2 MB)
                      </SelectItem>
                      <SelectItem value="full">
                        Full Report (~2-5 MB)
                      </SelectItem>
                      <SelectItem value="comprehensive">
                        Comprehensive (~5-10 MB)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Export Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant={exportFormat === "pdf" ? "default" : "outline"}
                    onClick={() => setExportFormat("pdf")}
                    className="flex-1 gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    PDF Only
                  </Button>
                  <Button
                    variant={exportFormat === "csv" ? "default" : "outline"}
                    onClick={() => setExportFormat("csv")}
                    className="flex-1 gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV Only
                  </Button>
                  <Button
                    variant={exportFormat === "json" ? "default" : "outline"}
                    onClick={() => setExportFormat("json")}
                    className="flex-1 gap-2"
                  >
                    <FileJson className="h-4 w-4" />
                    JSON Only
                  </Button>
                  <Button
                    variant={exportFormat === "all" ? "default" : "outline"}
                    onClick={() => setExportFormat("all")}
                    className="flex-1 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    All Formats
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">PDF Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="receipt-images" className="flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Include Receipt Images
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Embed receipt photos (increases file size significantly)
                    </p>
                  </div>
                  <Switch
                    id="receipt-images"
                    checked={includeReceiptImages}
                    onCheckedChange={setIncludeReceiptImages}
                  />
                </div>

                {includeReceiptImages && (
                  <div className="space-y-2 pl-6 border-l-2 border-muted">
                    <div className="flex justify-between">
                      <Label className="text-xs">Image Quality</Label>
                      <span className="text-xs text-muted-foreground">{imageQuality[0]}%</span>
                    </div>
                    <Slider
                      value={imageQuality}
                      onValueChange={setImageQuality}
                      min={30}
                      max={100}
                      step={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower quality = smaller file size. Recommended: 70% for good balance.
                    </p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="include-workpapers">Include Workpapers</Label>
                    <p className="text-xs text-muted-foreground">
                      Show workpaper calculations in report
                    </p>
                  </div>
                  <Switch
                    id="include-workpapers"
                    checked={includeWorkpapers}
                    onCheckedChange={setIncludeWorkpapers}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="yoy-compare">Year-over-Year Comparison</Label>
                    <p className="text-xs text-muted-foreground">
                      Compare with previous financial year
                    </p>
                  </div>
                  <Switch
                    id="yoy-compare"
                    checked={comparePreviousYear}
                    onCheckedChange={setComparePreviousYear}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="source-docs">Include Source Documents</Label>
                    <p className="text-xs text-muted-foreground">
                      Add appendix with raw data tables
                    </p>
                  </div>
                  <Switch
                    id="source-docs"
                    checked={includeSourceDocuments}
                    onCheckedChange={setIncludeSourceDocuments}
                  />
                </div>
              </CardContent>
            </Card>

            {/* File size estimate */}
            <div className="flex items-center justify-between bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Estimated file size:</span>
              </div>
              <Badge variant="secondary">{estimatedSize}</Badge>
            </div>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Included Sections</CardTitle>
                <CardDescription>
                  Select which sections to include in your report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(sections).map(([key, enabled]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`section-${key}`}
                        checked={enabled}
                        onCheckedChange={() => toggleSection(key)}
                      />
                      <Label htmlFor={`section-${key}`} className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Report Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {previewData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-xs text-muted-foreground">Total Receipts</p>
                        <p className="text-2xl font-bold">{previewData.receipts.length}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-xs text-muted-foreground">Total Deductions</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(previewData.totalDeductions)}
                        </p>
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-xs text-muted-foreground">Taxable Income</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(previewData.taxCalculation.taxableIncome)}
                        </p>
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-xs text-muted-foreground">Est. Refund</p>
                        <p className={`text-2xl font-bold ${previewData.taxCalculation.refundEstimate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(previewData.taxCalculation.refundEstimate))}
                        </p>
                      </div>
                    </div>

                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-primary font-medium">Total Income</p>
                          <p className="text-xl font-bold text-primary">
                            {formatCurrency(previewData.income.total)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Tax Payable</p>
                          <p className="text-xl font-bold">
                            {formatCurrency(previewData.taxCalculation.taxPayable)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-3">Deductions by ATO Category</p>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {ATO_CATEGORY_ORDER.map((code) => {
                            const category = previewData.deductions.find(d => d.code === code);
                            if (!category) return null;
                            
                            const percentage = previewData.totalDeductions > 0
                              ? (category.total / previewData.totalDeductions) * 100
                              : 0;
                              
                            return (
                              <div key={code} className="flex items-center gap-3">
                                <Badge variant="outline" className="w-10 justify-center font-mono">
                                  {code}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{category.name}</p>
                                  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                                    <div
                                      className="bg-primary h-1.5 rounded-full"
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right min-w-[80px]">
                                  <p className="text-sm font-medium">
                                    {formatCurrency(category.total)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {percentage.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading preview...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Client Info Tab */}
          <TabsContent value="client" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Taxpayer Information</CardTitle>
                <CardDescription>
                  This information will appear on the cover page of your report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Full Name *</Label>
                  <Input
                    id="client-name"
                    placeholder="e.g., John Smith"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-address">Address</Label>
                  <Input
                    id="client-address"
                    placeholder="Full address"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-phone">Phone</Label>
                    <Input
                      id="client-phone"
                      placeholder="Phone number"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-email">Email</Label>
                    <Input
                      id="client-email"
                      type="email"
                      placeholder="email@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-abn">ABN (if applicable)</Label>
                    <Input
                      id="client-abn"
                      placeholder="12 345 678 901"
                      value={clientAbn}
                      onChange={(e) => setClientAbn(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-tfn">TFN (optional)</Label>
                    <Input
                      id="client-tfn"
                      placeholder="*** *** ***"
                      value={clientTfn}
                      onChange={(e) => setClientTfn(e.target.value)}
                      type="password"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Accountant Notes</CardTitle>
                <CardDescription>
                  Optional notes for your accountant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add any special instructions or notes for your accountant..."
                  value={accountantNotes}
                  onChange={(e) => setAccountantNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Progress indicator */}
        {isGenerating && progress && (
          <div className="space-y-2 bg-muted rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress.stage}
              </span>
              <span className="font-medium">{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} />
            {progress.message && (
              <p className="text-xs text-muted-foreground">{progress.message}</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || !previewData}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TaxReportDialog;
