import { createFileRoute, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Receipt as ReceiptIcon,
  DollarSign,
  TrendingUp,
  FileText,
  User,
  Calendar,
  Shield,
  Eye,
  Download,
  Building,
  AlertCircle,
  Clock,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  validateShareLink,
  getShareLinkByToken,
  recordAccess,
  type ShareLink,
} from '@/lib/accountant-sharing';
import {
  getReceiptsByDateRange,
  getDeductionsByCategory,
  getTotalDeductions,
  getReceiptCount,
  getTotalIncome,
  getIncomeByDateRange,
  type Receipt,
} from '@/lib/db';

export const Route = createFileRoute('/portal/$token')({
  component: AccountantPortalView,
});

interface PortalData {
  shareLink: ShareLink;
  receipts: Receipt[];
  categories: { category: string; total: number }[];
  totalDeductions: number;
  totalIncome: number;
  receiptCount: number;
  taxableIncome: number;
  estimatedTax: number;
}

function AccountantPortalView() {
  const { token } = useParams({ from: '/portal/$token' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    async function loadPortalData() {
      // Validate the share link
      const validation = validateShareLink(token);
      if (!validation.valid) {
        setError(validation.reason || 'Invalid link');
        setLoading(false);
        return;
      }

      const shareLink = getShareLinkByToken(token);
      if (!shareLink) {
        setError('Share link not found');
        setLoading(false);
        return;
      }

      // Record access
      recordAccess(shareLink.id, 'view_summary');

      // Load data for the tax year
      const year = shareLink.taxYear;
      const startDate = `${year}-07-01`;
      const endDate = `${year + 1}-06-30`;

      try {
        const [
          receipts,
          categories,
          totalDeductions,
          receiptCount,
          totalIncome,
        ] = await Promise.all([
          getReceiptsByDateRange(startDate, endDate),
          getDeductionsByCategory(startDate, endDate),
          getTotalDeductions(startDate, endDate),
          getReceiptCount(startDate, endDate),
          getTotalIncome(startDate, endDate),
        ]);

        const taxableIncome = Math.max(0, totalIncome - totalDeductions);
        // Simple tax estimation for Australia (2024-25 rates)
        let estimatedTax = 0;
        if (taxableIncome > 190000) {
          estimatedTax = (taxableIncome - 190000) * 0.45 + 51638;
        } else if (taxableIncome > 135000) {
          estimatedTax = (taxableIncome - 135000) * 0.37 + 31288;
        } else if (taxableIncome > 45000) {
          estimatedTax = (taxableIncome - 45000) * 0.30 + 5092;
        } else if (taxableIncome > 18200) {
          estimatedTax = (taxableIncome - 18200) * 0.16;
        }

        setData({
          shareLink,
          receipts: receipts.slice(0, 50), // Limit for performance
          categories,
          totalDeductions,
          totalIncome,
          receiptCount,
          taxableIncome,
          estimatedTax,
        });
      } catch (err) {
        setError('Failed to load tax data');
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="bg-red-100 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              This link may have expired or been revoked. Please contact your client for a new share link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { shareLink, receipts, categories, totalDeductions, totalIncome, receiptCount, taxableIncome, estimatedTax } = data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Tally Accountant Portal</h1>
                <p className="text-sm text-muted-foreground">
                  Shared by {shareLink.accountantName ? `for ${shareLink.accountantName}` : 'your client'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                Read-only
              </Badge>
              <Badge variant="secondary">
                FY {shareLink.taxYear}-{String(shareLink.taxYear + 1).slice(-2)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Access Notice */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-700 dark:text-blue-400">
              Secure Accountant Access
            </p>
            <p className="text-sm text-muted-foreground">
              You are viewing a read-only snapshot of your client's tax data. 
              This access {shareLink.expiresAt ? `expires on ${formatDate(shareLink.expiresAt)}` : 'does not expire'}.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Deductions</CardDescription>
              <CardTitle className="text-3xl">{formatCurrency(totalDeductions)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>FY {shareLink.taxYear}-{String(shareLink.taxYear + 1).slice(-2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Receipts</CardDescription>
              <CardTitle className="text-3xl">{receiptCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ReceiptIcon className="h-4 w-4" />
                <span>Documents attached</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Taxable Income</CardDescription>
              <CardTitle className="text-3xl">{formatCurrency(taxableIncome)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>After deductions</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Est. Tax Payable</CardDescription>
              <CardTitle className="text-3xl">{formatCurrency(estimatedTax)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>2024-25 rates</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="summary" className="gap-2">
              <FileText className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="receipts" className="gap-2">
              <ReceiptIcon className="h-4 w-4" />
              Receipts ({receiptCount})
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Categories
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Income Summary</CardTitle>
                  <CardDescription>Total income for the tax year</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Total Income</span>
                    <span className="text-lg font-semibold">{formatCurrency(totalIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Total Deductions</span>
                    <span className="text-lg font-semibold text-green-600">-{formatCurrency(totalDeductions)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                    <span className="font-medium">Taxable Income</span>
                    <span className="text-xl font-bold">{formatCurrency(taxableIncome)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tax Estimate</CardTitle>
                  <CardDescription>Based on 2024-25 Australian tax rates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Taxable Income</span>
                    <span>{formatCurrency(taxableIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg">
                    <span className="font-medium">Estimated Tax</span>
                    <span className="text-lg font-semibold text-amber-600">{formatCurrency(estimatedTax)}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>
                      This is an estimate only and does not include Medicare levy, offsets, or other adjustments. 
                      Final tax liability should be calculated using official ATO tools.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Deduction Categories</CardTitle>
                  <CardDescription>Highest value deduction categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.slice(0, 5).map((cat, index) => {
                      const maxTotal = categories[0]?.total || 1;
                      const percentage = (cat.total / maxTotal) * 100;
                      
                      return (
                        <div key={cat.category} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">#{index + 1}</span>
                              <span className="font-medium">{cat.category}</span>
                            </div>
                            <span>{formatCurrency(cat.total)}</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts">
            <Card>
              <CardHeader>
                <CardTitle>Receipts</CardTitle>
                <CardDescription>
                  Showing {receipts.length} of {receiptCount} receipts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {receipts.length === 0 ? (
                  <div className="text-center py-12">
                    <ReceiptIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No receipts</h3>
                    <p className="text-sm text-muted-foreground">
                      No receipts have been uploaded for this tax year.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-2 rounded-md">
                            <ReceiptIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{receipt.vendor}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(receipt.date)} • {receipt.category}
                            </p>
                            {receipt.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Note: {receipt.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(receipt.amount)}</p>
                          {receipt.review_status && receipt.review_status !== 'not_required' && (
                            <Badge 
                              variant={receipt.review_status === 'pending' ? 'destructive' : 'secondary'}
                              className="text-xs mt-1"
                            >
                              {receipt.review_status === 'pending' ? 'Review Pending' : 'In Review'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>
                  Deduction breakdown across {categories.length} categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No data</h3>
                    <p className="text-sm text-muted-foreground">
                      No categorized deductions for this tax year.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {categories.map((cat) => {
                      const total = categories.reduce((sum, c) => sum + c.total, 0);
                      const percentage = total > 0 ? (cat.total / total) * 100 : 0;
                      
                      return (
                        <div key={cat.category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{cat.category}</span>
                            <div className="text-right">
                              <span className="font-semibold">{formatCurrency(cat.total)}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <Progress value={percentage} className="h-3" />
                        </div>
                      );
                    })}
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <span className="font-semibold">Total Deductions</span>
                      <span className="text-xl font-bold">{formatCurrency(totalDeductions)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Secure accountant portal powered by Tally</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Access code: {token.slice(0, 8)}...</span>
              <span>•</span>
              <span>Viewed {new Date().toLocaleDateString('en-AU')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
