import { useState, useEffect, useCallback } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FileText, Download, Calendar, Settings, Eye, FileImage, TrendingUp } from "lucide-react";
import {
  generateTaxReportPDF,
  getCurrentFinancialYear,
  getFinancialYearDates,
  calculateEstimatedTaxSavings,
  type PDFExportOptions,
  type TaxReportData,
  ATO_CATEGORIES,
} from "@/lib/pdf";
import {
  getReceiptsByDateRange,
  getTotalDeductions,
  getDeductionsByCategory,
  type Receipt,
} from "@/lib/db";
import jsPDF from "jspdf";
import { readFile } from "@tauri-apps/plugin-fs";

interface PDFExportDialogProps {
  trigger?: React.ReactNode;
  onExportComplete?: () => void;
}

export function PDFExportDialog({ trigger, onExportComplete }: PDFExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Export settings
  const [exportMode, setExportMode] = useState<"fy" | "custom">("fy");
  const [selectedFY, setSelectedFY] = useState<number>(getCurrentFinancialYear());
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [includeReceiptImages, setIncludeReceiptImages] = useState(true);
  const [imageQuality, setImageQuality] = useState([70]);
  const [comparePreviousYear, setComparePreviousYear] = useState(false);

  // User info
  const [userName, setUserName] = useState("");
  const [userAbn, setUserAbn] = useState("");
  const [userTfn, setUserTfn] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Preview data
  const [previewData, setPreviewData] = useState<{
    receiptCount: number;
    totalDeductions: number;
    categories: { category: string; total: number }[];
    estimatedSavings: number;
  } | null>(null);

  // Available financial years
  const currentFY = getCurrentFinancialYear();
  const availableFYs = Array.from({ length: 5 }, (_, i) => currentFY - i);

  // Load preview data when settings change
  useEffect(() => {
    loadPreviewData();
  }, [selectedFY, startDate, endDate, exportMode]);

  const loadPreviewData = useCallback(async () => {
    try {
      let start: string;
      let end: string;

      if (exportMode === "fy") {
        const dates = getFinancialYearDates(selectedFY);
        start = dates.startDate;
        end = dates.endDate;
      } else {
        start = startDate;
        end = endDate;
      }

      if (!start || !end) return;

      const [total, categories, receipts] = await Promise.all([
        getTotalDeductions(start, end),
        getDeductionsByCategory(start, end),
        getReceiptsByDateRange(start, end),
      ]);

      setPreviewData({
        receiptCount: receipts.length,
        totalDeductions: total,
        categories,
        estimatedSavings: calculateEstimatedTaxSavings(total, "medium"),
      });
    } catch (error) {
      console.error("Error loading preview data:", error);
    }
  }, [exportMode, selectedFY, startDate, endDate]);

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
      setProgress(10);

      let start: string;
      let end: string;

      if (exportMode === "fy") {
        const dates = getFinancialYearDates(selectedFY);
        start = dates.startDate;
        end = dates.endDate;
      } else {
        if (!startDate || !endDate) {
          toast.error("Please select both start and end dates");
          return;
        }
        start = startDate;
        end = endDate;
      }

      setProgress(20);

      // Fetch all data
      const [receipts, totalDeductions, deductionsByCategory] = await Promise.all([
        getReceiptsByDateRange(start, end),
        getTotalDeductions(start, end),
        getDeductionsByCategory(start, end),
      ]);

      setProgress(40);

      // Fetch previous year data if comparison is enabled
      let previousYearData: TaxReportData["previousYearData"] | undefined;
      if (comparePreviousYear) {
        const prevFY = selectedFY - 1;
        const prevDates = getFinancialYearDates(prevFY);
        const [prevTotal, prevCategories] = await Promise.all([
          getTotalDeductions(prevDates.startDate, prevDates.endDate),
          getDeductionsByCategory(prevDates.startDate, prevDates.endDate),
        ]);
        previousYearData = {
          totalDeductions: prevTotal,
          deductionsByCategory: prevCategories,
        };
      }

      setProgress(60);

      const taxData: TaxReportData = {
        receipts,
        totalDeductions,
        deductionsByCategory,
        previousYearData,
      };

      const options: PDFExportOptions = {
        title: "Tax Deductions Report",
        financialYear: selectedFY,
        startDate: start,
        endDate: end,
        userInfo: {
          name: userName || undefined,
          abn: userAbn || undefined,
          tfn: userTfn || undefined,
          email: userEmail || undefined,
        },
        includeReceiptImages,
        imageQuality: imageQuality[0] / 100,
        comparePreviousYear,
      };

      setProgress(80);

      // Load receipt images if requested
      let imageDataMap: Map<number, string> | undefined;
      if (includeReceiptImages) {
        imageDataMap = await loadReceiptImages(receipts);
      }

      setProgress(90);

      // Generate and download PDF
      const doc = await generateTaxReportPDF(taxData, options);

      // Add images to PDF if we have them
      if (imageDataMap && imageDataMap.size > 0) {
        await addImagesToPDF(doc, receipts, imageDataMap, imageQuality[0] / 100);
      }

      // Generate filename
      const filename = `Tax_Report_FY${selectedFY}_${new Date().toISOString().split("T")[0]}.pdf`;

      // Download
      doc.save(filename);

      setProgress(100);
      toast.success("PDF report generated successfully!", {
        description: `Saved as ${filename}`,
      });

      onExportComplete?.();
      setOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const loadReceiptImages = async (receipts: Receipt[]): Promise<Map<number, string>> => {
    const imageMap = new Map<number, string>();

    for (const receipt of receipts) {
      if (receipt.id && receipt.image_path) {
        try {
          // In a real Tauri app, we'd use the fs API to read the image file
          // For now, we'll skip this since we need Tauri's fs plugin
          // This is a placeholder for the actual implementation
          const imageData = await loadImageFromPath(receipt.image_path);
          if (imageData) {
            imageMap.set(receipt.id, imageData);
          }
        } catch (error) {
          console.error(`Error loading image for receipt ${receipt.id}:`, error);
        }
      }
    }

    return imageMap;
  };

  const loadImageFromPath = async (path: string): Promise<string | null> => {
    try {
      // Clean up the path (remove file:// prefix if present)
      const cleanPath = path.replace(/^file:\/\//, "");
      
      // Read file using Tauri's fs API
      const fileData = await readFile(cleanPath);
      
      // Convert Uint8Array to base64
      const bytes = new Uint8Array(fileData);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      // Detect MIME type from file extension
      const ext = cleanPath.split(".").pop()?.toLowerCase();
      let mimeType = "image/jpeg";
      if (ext === "png") mimeType = "image/png";
      else if (ext === "webp") mimeType = "image/webp";
      else if (ext === "gif") mimeType = "image/gif";
      
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error("Error loading image from path:", error);
      return null;
    }
  };

  const addImagesToPDF = async (
    doc: jsPDF,
    receipts: Receipt[],
    imageMap: Map<number, string>,
    quality: number
  ): Promise<void> => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add appendix header page
    doc.addPage();
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RECEIPT IMAGES", pageWidth / 2, 16, { align: "center" });

    doc.setTextColor(51, 51, 51);
    doc.setFontSize(12);
    doc.text(`Appendix: ${imageMap.size} receipt images included`, pageWidth / 2, 50, {
      align: "center",
    });

    // Add each image
    for (const receipt of receipts) {
      if (receipt.id && imageMap.has(receipt.id)) {
        const imageData = imageMap.get(receipt.id)!;

        doc.addPage();

        // Receipt info header
        doc.setFillColor(240, 240, 240);
        doc.rect(0, 0, pageWidth, 30, "F");

        doc.setTextColor(51, 51, 51);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(receipt.vendor, 15, 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(
          `${formatDate(receipt.date)} | ${formatCurrency(receipt.amount)} | ${receipt.category}`,
          15,
          22
        );

        // Add image
        try {
          const imgWidth = pageWidth - 30;
          const imgHeight = pageHeight - 60;

          if (imageData.startsWith("data:image/jpeg") || imageData.startsWith("data:image/jpg")) {
            doc.addImage(imageData, "JPEG", 15, 40, imgWidth, imgHeight, undefined, "FAST");
          } else if (imageData.startsWith("data:image/png")) {
            doc.addImage(imageData, "PNG", 15, 40, imgWidth, imgHeight, undefined, "FAST");
          }
        } catch (error) {
          console.error("Error adding image to PDF:", error);
          doc.setTextColor(255, 165, 0);
          doc.text("Error loading receipt image", pageWidth / 2, pageHeight / 2, { align: "center" });
        }

        // Page number
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text(`Receipt ID: ${receipt.id}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      }
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Export Tax Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Tax Report
          </DialogTitle>
          <DialogDescription>
            Generate a professional PDF tax report with your deductions and receipt images.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="user" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Taxpayer Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Report Period</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant={exportMode === "fy" ? "default" : "outline"}
                    onClick={() => setExportMode("fy")}
                    className="flex-1 gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Financial Year
                  </Button>
                  <Button
                    variant={exportMode === "custom" ? "default" : "outline"}
                    onClick={() => setExportMode("custom")}
                    className="flex-1 gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Custom Range
                  </Button>
                </div>

                {exportMode === "fy" ? (
                  <div className="space-y-2">
                    <Label>Select Financial Year</Label>
                    <Select value={selectedFY.toString()} onValueChange={(v) => setSelectedFY(parseInt(v))}>
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
                    <p className="text-xs text-muted-foreground">
                      Australian financial year runs from 1 July to 30 June.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="receipt-images" className="flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Include Receipt Images
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Embed receipt photos in the PDF appendix
                    </p>
                  </div>
                  <Switch
                    id="receipt-images"
                    checked={includeReceiptImages}
                    onCheckedChange={setIncludeReceiptImages}
                  />
                </div>

                {includeReceiptImages && (
                  <div className="space-y-2 pl-6">
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
                    <Label htmlFor="compare-yoy">Year-over-Year Comparison</Label>
                    <p className="text-xs text-muted-foreground">
                      Compare with previous financial year
                    </p>
                  </div>
                  <Switch
                    id="compare-yoy"
                    checked={comparePreviousYear}
                    onCheckedChange={setComparePreviousYear}
                    disabled={exportMode === "custom"}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Report Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {previewData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-xs text-muted-foreground">Total Receipts</p>
                        <p className="text-2xl font-bold">{previewData.receiptCount}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-xs text-muted-foreground">Total Deductions</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(previewData.totalDeductions)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                      <p className="text-xs text-primary font-medium">Estimated Tax Savings</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(previewData.estimatedSavings)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Based on 32.5% marginal tax rate
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-3">Deductions by Category</p>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {previewData.categories.map((cat) => {
                            const atoInfo = ATO_CATEGORIES[cat.category];
                            const percentage =
                              previewData.totalDeductions > 0
                                ? (cat.total / previewData.totalDeductions) * 100
                                : 0;
                            return (
                              <div key={cat.category} className="flex items-center gap-3">
                                <Badge variant="outline" className="w-10 justify-center">
                                  {atoInfo?.code || "D15"}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{cat.category}</p>
                                  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                                    <div
                                      className="bg-primary h-1.5 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">
                                    {formatCurrency(cat.total)}
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
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Loading preview...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Taxpayer Information (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="e.g., John Smith"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ABN (if applicable)</Label>
                    <Input
                      placeholder="12 345 678 901"
                      value={userAbn}
                      onChange={(e) => setUserAbn(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TFN (optional)</Label>
                    <Input
                      placeholder="*** *** ***"
                      value={userTfn}
                      onChange={(e) => setUserTfn(e.target.value)}
                      type="password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This information will appear on the cover page of your report. It is not stored
                  permanently.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Generating PDF...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating || (exportMode === "custom" && (!startDate || !endDate))}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PDFExportDialog;
