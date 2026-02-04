import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Receipt, 
  TrendingUp, 
  Calendar, 
  Plus,
  FileText,
  Camera,
  DollarSign,
  ShoppingBag,
  Search,
  ChevronRight,
  FileSpreadsheet,
  Wallet,
  HelpCircle,
  Upload,
  Car,
  Building,
  UserPlus,
  Calculator,
  Home,
  BookOpen,
  Landmark,
  Package,
  ShieldCheck,
  FolderOpen,
  Bell,
  Library
} from "lucide-react";
import { OcrScanButton } from "@/components/OcrScanButton";
import { TaxYearSelector } from "@/components/TaxYearSelector";
import { useTaxYear } from "@/contexts/TaxYearContext";
import { 
  getReceiptsByDateRange, 
  getCategories, 
  getTotalDeductions,
  getDeductionsByCategory,
  getReceiptCount,
  type Receipt as ReceiptType,
  getTotalIncome,
  getIncomeByDateRange,
  getReviewStatusCounts,
  getReceiptsNeedingReview
} from "@/lib/db";
import { ReviewStatusBadge } from "@/components/ReviewStatusBadge";
import { ReportGeneratorCard } from "@/components/tax-report/ReportGeneratorCard";
import { ReviewStatusDialog } from "@/components/ReviewStatusDialog";
import { PDFExportDialog } from "@/components/PDFExportDialog";
import { CSVExportDialog } from "@/components/CSVExportDialog";
import { IncomeManager } from "@/components/IncomeManager";
import { ATOPrefillExportDialog } from "@/components/ATOPrefillExport";
import { AccountantPortalShare } from "@/components/AccountantPortalShare";
import { UpcomingDeadlinesCard } from "@/components/tax-calendar/UpcomingDeadlinesCard";
import { MissingDocumentsCard } from "@/components/upload-reminders/MissingDocumentsCard";
import { WeeklyDigestCard } from "@/components/weekly-digest/WeeklyDigestCard";
import { useMissingUploadReminders } from "@/hooks/useUploadReminders";
import { useDashboardReminders } from "@/hooks/useProactiveReminders";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { selectedYear, getYearDates, isViewingCurrentYear } = useTaxYear();
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [categories, setCategories] = useState<{ category: string; total: number }[]>([]);
  const [stats, setStats] = useState({
    totalDeductions: 0,
    receiptCount: 0,
    topCategory: "-",
    totalIncome: 0,
  });
  const [reviewStats, setReviewStats] = useState({
    pending: 0,
    inReview: 0,
    totalNeedingReview: 0,
  });
  const [receiptsNeedingReview, setReceiptsNeedingReview] = useState<ReceiptType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Missing upload reminders
  const {
    missing,
    reminders,
    missingLoading,
    dismissMissing,
  } = useMissingUploadReminders();

  // Proactive reminders for notification bell
  const {
    totalUnread,
    criticalCount,
    highPriorityCount,
    actionSummary,
    hasActionableReminders,
  } = useDashboardReminders();

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [receiptToReview, setReceiptToReview] = useState<ReceiptType | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { startDate, endDate } = getYearDates();
      
      const [receiptsData, categoriesData, total, count, incomeTotal, reviewCounts, needReviewReceipts] = await Promise.all([
        getReceiptsByDateRange(startDate, endDate),
        getDeductionsByCategory(startDate, endDate),
        getTotalDeductions(startDate, endDate),
        getReceiptCount(startDate, endDate),
        getTotalIncome(startDate, endDate),
        getReviewStatusCounts(),
        getReceiptsNeedingReview(),
      ]);

      setReceipts(receiptsData.slice(0, 5)); // Show last 5
      setCategories(categoriesData);
      setStats({
        totalDeductions: total,
        receiptCount: count,
        topCategory: categoriesData[0]?.category || "-",
        totalIncome: incomeTotal,
      });
      setReviewStats({
        pending: reviewCounts.pending,
        inReview: reviewCounts.in_review,
        totalNeedingReview: reviewCounts.pending + reviewCounts.in_review,
      });
      setReceiptsNeedingReview(needReviewReceipts.slice(0, 5)); // Show first 5 needing review
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewClick = (receipt: ReceiptType) => {
    setReceiptToReview(receipt);
    setReviewDialogOpen(true);
  };

  const handleReviewStatusUpdated = () => {
    loadData();
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]); // Reload when tax year changes

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatYear = (year: number) => `${year}-${String(year + 1).slice(-2)}`;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Tally Desktop</h1>
                <p className="text-sm text-muted-foreground">
                  Tax receipt management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <Link to="/reminders">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  title={actionSummary}
                >
                  <Bell className="h-5 w-5" />
                  {totalUnread > 0 && (
                    <span className={cn(
                      "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-xs font-medium flex items-center justify-center",
                      criticalCount > 0
                        ? "bg-destructive text-destructive-foreground"
                        : highPriorityCount > 0
                        ? "bg-orange-500 text-white"
                        : "bg-primary text-primary-foreground"
                    )}>
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </Button>
              </Link>

              <TaxYearSelector />
              <PDFExportDialog
                trigger={
                  <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Export Report
                  </Button>
                }
              />
              <OcrScanButton onReceiptCreated={loadData} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Deductions</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? "-" : formatCurrency(stats.totalDeductions)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>FY {formatYear(selectedYear)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Receipts</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? "-" : stats.receiptCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingBag className="h-4 w-4" />
                <span>In selected year</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Top Category</CardDescription>
              <CardTitle className="text-xl truncate">
                {isLoading ? "-" : stats.topCategory}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>
                  {categories[0]
                    ? formatCurrency(categories[0].total)
                    : "$0.00"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                Total Income
                {!isViewingCurrentYear && (
                  <Badge variant="outline" className="text-[10px] h-5 border-amber-500/50 text-amber-600">
                    Past
                  </Badge>
                )}
              </CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? "-" : formatCurrency(stats.totalIncome)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>FY {formatYear(selectedYear)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={reviewStats.totalNeedingReview > 0 ? "border-amber-500/50" : ""}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                Needs Professional Review
                {reviewStats.totalNeedingReview > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5">
                    {reviewStats.totalNeedingReview}
                  </Badge>
                )}
              </CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? "-" : reviewStats.totalNeedingReview}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {reviewStats.totalNeedingReview > 0 ? (
                  <>
                    <span className="text-amber-600 dark:text-amber-400">
                      {reviewStats.pending} pending, {reviewStats.inReview} in review
                    </span>
                  </>
                ) : (
                  <span>All items reviewed</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Receipts */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Recent Receipts
                    {!isViewingCurrentYear && (
                      <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                        FY {formatYear(selectedYear)}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Your latest scanned receipts</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/receipts">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Search className="h-4 w-4" />
                      View All
                    </Button>
                  </Link>
                  <OcrScanButton variant="outline" size="sm" onReceiptCreated={loadData}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </OcrScanButton>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : receipts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No receipts yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isViewingCurrentYear 
                        ? "Scan your first receipt to get started"
                        : `No receipts found for FY ${formatYear(selectedYear)}`}
                    </p>
                    {isViewingCurrentYear && <OcrScanButton onReceiptCreated={loadData} />}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-2 rounded-md">
                            <Receipt className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{receipt.vendor}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(receipt.date)} • {receipt.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(receipt.amount)}
                          </p>
                          {receipt.notes?.includes("OCR") && (
                            <Badge variant="secondary" className="text-xs">
                              OCR
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    <Link to="/receipts">
                      <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-foreground">
                        View all receipts with search & filters
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Categories
                  {!isViewingCurrentYear && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
                      FY {formatYear(selectedYear)}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Spending by category</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                        <div className="h-2 bg-muted animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No data for FY {formatYear(selectedYear)}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {categories.map((cat) => {
                      const total = categories.reduce((sum, c) => sum + c.total, 0);
                      const percentage = total > 0 ? (cat.total / total) * 100 : 0;
                      
                      return (
                        <div key={cat.category} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{cat.category}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(cat.total)}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tax Calendar */}
            <div className="mt-6">
              <UpcomingDeadlinesCard limit={5} showViewAll={true} />
            </div>

            {/* Missing Upload Reminders */}
            <div className="mt-6">
              <MissingDocumentsCard
                missingDocuments={missing}
                reminders={reminders}
                onUpload={(missingDoc) => {
                  window.location.href = '/upload';
                }}
                onDismiss={dismissMissing}
                onViewAll={() => {
                  window.location.href = '/upload-reminders';
                }}
              />
            </div>

            {/* Weekly Optimization Digest */}
            <div className="mt-6">
              <WeeklyDigestCard />
            </div>

            {/* Income Management */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Income
                  {!isViewingCurrentYear && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
                      FY {formatYear(selectedYear)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <IncomeManager onIncomeChange={loadData} />
              </CardContent>
            </Card>

            {/* Items Needing Review */}
            {receiptsNeedingReview.length > 0 && (
              <Card className="mt-6 border-amber-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <HelpCircle className="h-5 w-5" />
                    Needs Review
                    <Badge variant="secondary" className="text-xs">
                      {receiptsNeedingReview.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Items flagged for accountant review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {receiptsNeedingReview.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between p-3 bg-amber-500/5 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                        onClick={() => handleReviewClick(receipt)}
                      >
                        <div className="flex items-center gap-3">
                          <ReviewStatusBadge status={receipt.review_status || 'pending'} size="sm" />
                          <div>
                            <p className="font-medium text-sm">{receipt.vendor}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(receipt.amount)} • {receipt.category}
                            </p>
                            {receipt.review_notes && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                "{receipt.review_notes}"
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                  {reviewStats.totalNeedingReview > 5 && (
                    <Link to="/receipts">
                      <Button variant="ghost" className="w-full mt-3 text-sm">
                        View all {reviewStats.totalNeedingReview} items needing review
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/weekly-digest">
                  <Button variant="outline" className="w-full justify-start border-pink-500/50 hover:border-pink-500 hover:bg-pink-50">
                    <TrendingUp className="h-4 w-4 mr-2 text-pink-600" />
                    Weekly Optimization Digest
                    <Badge variant="default" className="ml-auto text-[10px] bg-pink-600">New</Badge>
                  </Button>
                </Link>
                <Link to="/upload-reminders">
                  <Button variant="outline" className="w-full justify-start border-blue-500/50 hover:border-blue-500 hover:bg-blue-50">
                    <Bell className="h-4 w-4 mr-2 text-blue-600" />
                    Missing Upload Reminders
                    <Badge variant="default" className="ml-auto text-[10px] bg-blue-600">New</Badge>
                  </Button>
                </Link>
                <Link to="/completeness">
                  <Button variant="outline" className="w-full justify-start border-green-500/50 hover:border-green-500 hover:bg-green-50">
                    <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                    Completeness Check
                    <Badge variant="default" className="ml-auto text-[10px] bg-green-600">New</Badge>
                  </Button>
                </Link>
                <Link to="/tax-report">
                  <Button variant="outline" className="w-full justify-start border-amber-500/50 hover:border-amber-500 hover:bg-amber-50">
                    <FileText className="h-4 w-4 mr-2 text-amber-600" />
                    Professional Tax Report
                    <Badge variant="default" className="ml-auto text-[10px] bg-amber-600">New</Badge>
                  </Button>
                </Link>
                <Link to="/tax-calendar">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Tax Calendar
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/upload">
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                </Link>
                <Link to="/documents">
                  <Button variant="outline" className="w-full justify-start border-purple-500/50 hover:border-purple-500 hover:bg-purple-50">
                    <FolderOpen className="h-4 w-4 mr-2 text-purple-600" />
                    Documents Library
                    <Badge variant="default" className="ml-auto text-[10px] bg-purple-600">New</Badge>
                  </Button>
                </Link>
                <Link to="/workpapers">
                  <Button variant="outline" className="w-full justify-start border-indigo-500/50 hover:border-indigo-500 hover:bg-indigo-50">
                    <Library className="h-4 w-4 mr-2 text-indigo-600" />
                    Workpaper Library
                    <Badge variant="default" className="ml-auto text-[10px] bg-indigo-600">New</Badge>
                  </Button>
                </Link>
                <OcrScanButton
                  variant="outline"
                  className="w-full justify-start"
                  onReceiptCreated={loadData}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Scan Receipt
                </OcrScanButton>
                <Link to="/car-expenses">
                  <Button variant="outline" className="w-full justify-start">
                    <Car className="h-4 w-4 mr-2" />
                    D1 Car Expenses
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/vehicle-logbook">
                  <Button variant="outline" className="w-full justify-start">
                    <Car className="h-4 w-4 mr-2" />
                    Vehicle Logbook
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/clothing-expenses">
                  <Button variant="outline" className="w-full justify-start">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    D3 Clothing & Laundry
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/self-education">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    D4 Self-Education
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/other-work-expenses">
                  <Button variant="outline" className="w-full justify-start">
                    <Briefcase className="h-4 w-4 mr-2" />
                    D5 Other Expenses
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/low-value-pool">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    D6 Low-Value Pool
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/wfh-expenses">
                  <Button variant="outline" className="w-full justify-start">
                    <Home className="h-4 w-4 mr-2" />
                    WFH Expenses
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/franking-credits">
                  <Button variant="outline" className="w-full justify-start">
                    <Calculator className="h-4 w-4 mr-2" />
                    Franking Credits
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/dividends">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Dividend Tracker
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/income-dashboard">
                  <Button variant="outline" className="w-full justify-start">
                    <Wallet className="h-4 w-4 mr-2" />
                    Income Dashboard
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/bank-statements">
                  <Button variant="outline" className="w-full justify-start">
                    <Landmark className="h-4 w-4 mr-2" />
                    Bank Statements
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <Link to="/invoices">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Invoice Documents
                    <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
                <PDFExportDialog
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF Report
                    </Button>
                  }
                />
                <CSVExportDialog
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV Data
                    </Button>
                  }
                />
                <ATOPrefillExportDialog
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      <Building className="h-4 w-4 mr-2" />
                      ATO Pre-fill Export
                      <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                    </Button>
                  }
                />
                <AccountantPortalShare
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Share with Accountant
                      <Badge variant="secondary" className="ml-auto text-[10px]">New</Badge>
                    </Button>
                  }
                />
                <Link to="/tax-reports">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Tax Report
                    <Badge variant="default" className="ml-auto text-[10px]">New</Badge>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Review Status Dialog */}
      <ReviewStatusDialog
        receipt={receiptToReview}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onStatusUpdated={handleReviewStatusUpdated}
      />
    </div>
  );
}
