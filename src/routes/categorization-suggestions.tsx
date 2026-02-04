import React, { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SuggestionList, SuggestionListTabs } from '@/components/suggestions';
import { useCategorizationSuggestions } from '@/hooks/useCategorizationSuggestions';
import { 
  getReceipts, 
  updateReceiptAtoCategory, 
  type Receipt,
  getTotalIncome,
  getFinancialYearDates,
  getCurrentFinancialYear,
} from '@/lib/db';
import { Lightbulb, AlertCircle, CheckCircle2, Loader2, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { UserProfile } from '@/lib/tax-optimization';
import type { ReceiptForSuggestion } from '@/lib/categorization-suggestions';

export const Route = createFileRoute('/categorization-suggestions')({
  component: CategorizationSuggestionsPage,
});

function CategorizationSuggestionsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const {
    suggestions,
    isGenerating,
    generateAsync,
    acceptSuggestion,
    rejectSuggestion,
    ignoreSuggestion,
    resetSuggestion,
    acceptAll,
    acceptHighConfidence,
    clearSuggestions,
    acceptedSuggestions,
    pendingSuggestions,
    analytics,
    totalPotentialSavings,
    acceptedSavings,
    pendingSavings,
    exportReport,
    getPendingChanges,
  } = useCategorizationSuggestions();

  // Load receipts on mount
  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    setIsLoading(true);
    try {
      const data = await getReceipts();
      setReceipts(data);
    } catch (error) {
      console.error('Failed to load receipts:', error);
      toast.error('Failed to load receipts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (receipts.length === 0) {
      toast.error('No receipts to analyze');
      return;
    }

    // Get user profile (simplified - in real app would come from user settings)
    const currentYear = getCurrentFinancialYear();
    const { startDate, endDate } = getFinancialYearDates(currentYear);
    
    try {
      const totalIncome = await getTotalIncome(startDate, endDate);
      
      const profile: UserProfile = {
        taxableIncome: totalIncome || 75000, // Default if no income data
        occupation: 'office-worker',
        age: 35,
        hasVehicle: receipts.some(r => 
          r.category.toLowerCase().includes('vehicle') || 
          r.category.toLowerCase().includes('car')
        ),
        workArrangement: 'hybrid',
        hasInvestments: false,
        investmentTypes: [],
        isStudying: false,
        hasHomeOffice: receipts.some(r => 
          r.category.toLowerCase().includes('home') || 
          r.category.toLowerCase().includes('office')
        ),
        employmentType: 'full-time',
        yearsWithAccountant: 0,
      };

      const receiptForSuggestions: ReceiptForSuggestion[] = receipts.map(r => ({
        id: r.id!,
        vendor: r.vendor,
        amount: r.amount,
        category: r.category,
        atoCategoryCode: r.ato_category_code,
        date: r.date,
        description: r.notes,
      }));

      await generateAsync(receiptForSuggestions, profile);
      setHasGenerated(true);
      
      const count = receipts.length;
      toast.success(`Analyzed ${count} receipts for optimization opportunities`);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      toast.error('Failed to generate suggestions');
    }
  };

  const handleApplyChanges = async () => {
    const changes = getPendingChanges();
    
    if (changes.length === 0) {
      toast.info('No changes to apply');
      return;
    }

    setIsSaving(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const change of changes) {
        try {
          await updateReceiptAtoCategory(change.receiptId, change.newCategory as any);
          successCount++;
        } catch (error) {
          console.error(`Failed to update receipt ${change.receiptId}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`Successfully applied ${successCount} categorization changes`);
      } else {
        toast.warning(`Applied ${successCount} changes, ${errorCount} failed`);
      }

      // Reload receipts to show updated categories
      await loadReceipts();
      
      // Clear suggestions after applying
      clearSuggestions();
      setHasGenerated(false);
    } catch (error) {
      console.error('Failed to apply changes:', error);
      toast.error('Failed to apply changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const report = exportReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categorization-suggestions-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin mr-2" size={24} />
          <span>Loading receipts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Lightbulb className="text-yellow-500" />
          Categorization Suggestions
        </h1>
        <p className="text-muted-foreground mt-2">
          Smart recommendations to optimize your tax deductions. Review and accept suggestions to maximize your tax savings.
        </p>
      </div>

      {/* Info Alert */}
      {!hasGenerated && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>How it works</AlertTitle>
          <AlertDescription>
            We'll analyze your {receipts.length} receipts and suggest better categorizations based on ATO rules. 
            Suggestions include moving assets to low-value pools, claiming immediate deductions, and correcting miscategorized expenses.
          </AlertDescription>
        </Alert>
      )}

      {/* Generate Button */}
      {!hasGenerated && (
        <Card className="mb-6">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lightbulb size={32} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Ready to Optimize</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Analyze your {receipts.length} receipts to find categorization improvements that could save you money at tax time.
              </p>
              <Button 
                size="lg" 
                onClick={handleGenerate}
                disabled={isGenerating || receipts.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={18} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Lightbulb className="mr-2" size={18} />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasGenerated && (
        <>
          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                <RefreshCw className={`mr-2 ${isGenerating ? 'animate-spin' : ''}`} size={16} />
                Regenerate
              </Button>
              <Button variant="outline" onClick={handleExport}>
                Export Report
              </Button>
            </div>
            
            {acceptedSuggestions.length > 0 && (
              <Button 
                onClick={handleApplyChanges} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    Applying...
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={16} />
                    Apply {acceptedSuggestions.length} Changes
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Summary Cards */}
          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Suggestions</CardDescription>
                  <CardTitle className="text-3xl">{analytics.totalSuggestions}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Potential Savings</CardDescription>
                  <CardTitle className="text-3xl text-green-600">
                    {new Intl.NumberFormat('en-AU', {
                      style: 'currency',
                      currency: 'AUD',
                      minimumFractionDigits: 0,
                    }).format(totalPotentialSavings)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Accepted</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">
                    {analytics.acceptedCount}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({new Intl.NumberFormat('en-AU', {
                        style: 'currency',
                        currency: 'AUD',
                        minimumFractionDigits: 0,
                      }).format(acceptedSavings)})
                    </span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending</CardDescription>
                  <CardTitle className="text-3xl text-amber-600">
                    {analytics.pendingCount}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({new Intl.NumberFormat('en-AU', {
                        style: 'currency',
                        currency: 'AUD',
                        minimumFractionDigits: 0,
                      }).format(pendingSavings)})
                    </span>
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Suggestions List */}
          <SuggestionListTabs
            suggestions={suggestions}
            onAccept={acceptSuggestion}
            onReject={rejectSuggestion}
            onIgnore={ignoreSuggestion}
            onReset={resetSuggestion}
            onAcceptAll={acceptAll}
            onAcceptHighConfidence={acceptHighConfidence}
            onExport={handleExport}
            isGenerating={isGenerating}
          />

          {/* Success State - All Processed */}
          {pendingSuggestions.length === 0 && suggestions.length > 0 && (
            <Alert className="mt-6 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-300">All suggestions reviewed!</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">
                You've reviewed all {suggestions.length} suggestions. 
                {acceptedSuggestions.length > 0 && (
                  <> Apply the {acceptedSuggestions.length} accepted changes to update your receipts.</>
                )}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}

export default CategorizationSuggestionsPage;