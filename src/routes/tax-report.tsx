/**
 * Tax Report Page
 * 
 * Dedicated page for generating and managing professional tax reports.
 * Includes historical reports list and quick generation options.
 * 
 * TAL-162: Professional Tax Report PDF
 */

import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  FileJson,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Printer,
  ChevronRight,
  History,
  Settings,
} from "lucide-react";
import { TaxReportDialog } from "@/components/TaxReportDialog";
import { 
  getCurrentFinancialYear, 
  getFinancialYearDates,
  ATO_CATEGORIES 
} from "@/lib/pdf";
import {
  getReceiptsByDateRange,
  getIncomeByDateRange,
  getTotalDeductions,
  getTotalIncome,
  getTotalTaxWithheld,
  getTaxYears,
  getWorkpapersByTaxYear,
  type TaxYear,
} from "@/lib/db";
import { prepareIncomeSummary, prepareDeductionCategories } from "@/lib/tax-report-pdf";
import { calculateTaxPayable } from "@/lib/tax-calculator";
import { atoCategories, AtoCategoryCode } from "@/lib/ato-categories";

export const Route = createFileRoute("/tax-report")({
  component: TaxReportPage,
});

interface TaxYearSummary {
  year: number;
  totalDeductions: number;
  totalIncome: number;
  taxableIncome: number;
  receiptCount: number;
  estimatedRefund: number;
  status: "complete" | "incomplete" | "draft";
  lastUpdated?: Date;
}

function TaxReportPage() {
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentFinancialYear());
  const [taxYears, setTaxYears] = useState<TaxYear[]>([]);
  const [yearSummaries, setYearSummaries] = useState<Record<number, TaxYearSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadTaxData();
  }, []);

  const loadTaxData = async () => {
    setIsLoading(true);
    try {
      // Load available tax years
      const years = await getTaxYears();
      setTaxYears(years);

      // Load summary for each tax year
      const summaries: Record<number, TaxYearSummary> = {};
      
      for (const year of years) {
        const { startDate, endDate } = getFinancialYearDates(year.year);
        
        const [receipts, incomeRecords, totalDeductions, totalIncome, taxWithheld] = await Promise.all([
          getReceiptsByDateRange(startDate, endDate),
          getIncomeByDateRange(startDate, endDate),
          getTotalDeductions(startDate, endDate),
          getTotalIncome(startDate, endDate),
          getTotalTaxWithheld(startDate, endDate),
        ]);

        const taxableIncome = totalIncome - totalDeductions;
        const taxCalc = calculateTaxPayable(taxableIncome);
        const estimatedRefund = taxWithheld - taxCalc.totalTax;

        summaries[year.year] = {
          year: year.year,
          totalDeductions,
          totalIncome,
          taxableIncome,
          receiptCount: receipts.length,
          estimatedRefund,
          status: receipts.length > 10 ? "complete" : receipts.length > 0 ? "incomplete" : "draft",
        };
      }

      setYearSummaries(summaries);
    } catch (error) {
      console.error("Error loading tax data:", error);
      toast.error("Failed to load tax data");
    } finally {
      setIsLoading(false);
    }
  };

  const currentSummary = yearSummaries[selectedYear];
  const currentFY = getCurrentFinancialYear();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Complete</Badge>;
      case "incomplete":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Incomplete</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate professional tax reports for your accountant
          </p>
        </div>
        <TaxReportDialog 
          defaultTaxYear={selectedYear}
          onExportComplete={loadTaxData}
          trigger={
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Generate New Report
            </Button>
          }
        />
      </div>

      {/* Year Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {taxYears.map((year) => (
          <Button
            key={year.year}
            variant={selectedYear === year.year ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedYear(year.year)}
            className="min-w-[100px]"
          >
            FY {year.year}-{year.year + 1}
            {year.year === currentFY && (
              <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>
            )}
          </Button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="deductions" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Deductions
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {currentSummary ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(currentSummary.totalIncome)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      FY {selectedYear}-{selectedYear + 1}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(currentSummary.totalDeductions)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {currentSummary.receiptCount} receipts
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxable Income</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(currentSummary.taxableIncome)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Income minus deductions
                    </p>
                  </CardContent>
                </Card>

                <Card className={currentSummary.estimatedRefund >= 0 ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Est. {currentSummary.estimatedRefund >= 0 ? "Refund" : "Tax Payable"}
                    </CardTitle>
                    {currentSummary.estimatedRefund >= 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${currentSummary.estimatedRefund >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(currentSummary.estimatedRefund))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Based on tax withheld
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Generate reports and export your tax data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TaxReportDialog
                      defaultTaxYear={selectedYear}
                      onExportComplete={loadTaxData}
                      trigger={
                        <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                          <FileText className="h-6 w-6" />
                          <span>Generate PDF Report</span>
                          <span className="text-xs text-muted-foreground">Professional format for accountant</span>
                        </Button>
                      }
                    />
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => toast.info("CSV export coming soon")}
                    >
                      <FileSpreadsheet className="h-6 w-6" />
                      <span>Export CSV</span>
                      <span className="text-xs text-muted-foreground">Spreadsheet format for analysis</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => toast.info("JSON export coming soon")}
                    >
                      <FileJson className="h-6 w-6" />
                      <span>Export JSON</span>
                      <span className="text-xs text-muted-foreground">Machine-readable format</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Status Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tax Year Status</CardTitle>
                      <CardDescription>
                        FY {selectedYear}-{selectedYear + 1} preparation status
                      </CardDescription>
                    </div>
                    {getStatusBadge(currentSummary.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Receipts collected</span>
                      <span className="font-medium">{currentSummary.receiptCount} / 50+ recommended</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((currentSummary.receiptCount / 50) * 100, 100)}%` }}
                      />
                    </div>
                    
                    {currentSummary.status !== "complete" && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">More receipts needed</p>
                          <p>Consider adding more receipts to maximize your deductions.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="p-8">
              <div className="text-center space-y-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-medium">No data available</h3>
                <p className="text-muted-foreground">
                  Start by adding receipts and income for FY {selectedYear}-{selectedYear + 1}
                </p>
                <Button onClick={() => toast.info("Navigate to receipts page")}>
                  Add Receipts
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Deductions Tab */}
        <TabsContent value="deductions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ATO Deduction Categories</CardTitle>
              <CardDescription>
                Summary of deductions by ATO category code (D1-D15)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {atoCategories.map((category) => {
                  const isRelevant = category.priority === "high" || category.priority === "medium";
                  if (!isRelevant) return null;
                  
                  return (
                    <div 
                      key={category.code}
                      className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="w-12 justify-center font-mono text-sm">
                          {category.code}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {category.shortDescription}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>
                Previously generated tax reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {Object.values(yearSummaries)
                    .sort((a, b) => b.year - a.year)
                    .map((summary) => (
                      <div 
                        key={summary.year}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">FY {summary.year}-{summary.year + 1} Report</h4>
                            <p className="text-sm text-muted-foreground">
                              {summary.receiptCount} receipts • {formatCurrency(summary.totalDeductions)} deductions
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(summary.status)}
                          <TaxReportDialog
                            defaultTaxYear={summary.year}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    ))}
                  
                  {Object.keys(yearSummaries).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>No reports generated yet</p>
                      <p className="text-sm">Generate your first report to see it here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TaxReportPage;
