/**
 * Franking Credits Route
 * 
 * Full franking credits page with calculator, entries, and summary
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Calculator, Plus, FileText, Download, PiggyBank, BookOpen, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import {
  FrankingCalculator,
  DividendEntryForm,
  DividendEntryList,
  FrankingCreditSummary,
  FrankingRefundEstimator,
} from '@/components/franking-credits';
import { useFrankingCredits } from '@/hooks/useFrankingCredits';
import { useDividendEntry } from '@/hooks/useDividendEntry';
import type { DividendEntry } from '@/lib/franking-credits';
import { getFinancialYear, MARGINAL_TAX_RATES_2025, formatCurrency } from '@/lib/franking-credits';

export const Route = createFileRoute('/franking-credits')({
  component: FrankingCreditsPage,
});

function FrankingCreditsPage() {
  const [selectedTaxYear, setSelectedTaxYear] = useState(getFinancialYear());
  const [activeTab, setActiveTab] = useState('calculator');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DividendEntry | null>(null);

  const {
    entries,
    summary,
    taxYears,
    isLoading,
    isExporting,
    loadEntries,
    exportToCSV,
    exportToJSON,
  } = useFrankingCredits({
    taxYear: selectedTaxYear,
    autoLoad: true,
  });

  const {
    create,
    update,
    delete: deleteEntry,
    deleteMany,
    isCreating,
    isUpdating,
    isDeleting,
  } = useDividendEntry();

  // Handle creating a new entry
  const handleCreateEntry = async (input: {
    companyName: string;
    dividendAmount: number;
    frankingPercentage: number;
    dateReceived: string;
    notes?: string;
    taxYear?: string;
  }) => {
    try {
      await create({
        ...input,
        taxYear: selectedTaxYear,
      });
      toast.success('Dividend entry added successfully');
      setShowAddDialog(false);
      loadEntries();
    } catch (error) {
      toast.error('Failed to add dividend entry');
      console.error(error);
    }
  };

  // Handle updating an entry
  const handleUpdateEntry = async (input: {
    companyName: string;
    dividendAmount: number;
    frankingPercentage: number;
    dateReceived: string;
    notes?: string;
    taxYear?: string;
  }) => {
    if (!editingEntry?.id) return;

    try {
      await update(editingEntry.id, {
        ...input,
        taxYear: selectedTaxYear,
      });
      toast.success('Dividend entry updated successfully');
      setEditingEntry(null);
      loadEntries();
    } catch (error) {
      toast.error('Failed to update dividend entry');
      console.error(error);
    }
  };

  // Handle deleting an entry
  const handleDeleteEntry = async (id: number) => {
    try {
      await deleteEntry(id);
      toast.success('Dividend entry deleted');
      loadEntries();
    } catch (error) {
      toast.error('Failed to delete dividend entry');
      console.error(error);
    }
  };

  // Handle deleting multiple entries
  const handleDeleteMany = async (ids: number[]) => {
    try {
      await deleteMany(ids);
      toast.success(`${ids.length} entries deleted`);
      loadEntries();
    } catch (error) {
      toast.error('Failed to delete entries');
      console.error(error);
    }
  };

  // Handle exporting CSV
  const handleExportCSV = async () => {
    try {
      const csv = await exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `franking-credits-${selectedTaxYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
      console.error(error);
    }
  };

  // Handle exporting JSON
  const handleExportJSON = async () => {
    try {
      const json = await exportToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `franking-credits-${selectedTaxYear}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON exported successfully');
    } catch (error) {
      toast.error('Failed to export JSON');
      console.error(error);
    }
  };

  // Get all available tax years
  const availableTaxYears = [...new Set([...taxYears, selectedTaxYear])].sort().reverse();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Franking Credits
          </h1>
          <p className="text-muted-foreground mt-1">
            Calculate and track your dividend franking credits for tax returns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTaxYear} onValueChange={setSelectedTaxYear}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tax Year" />
            </SelectTrigger>
            <SelectContent>
              {availableTaxYears.map((year) => (
                <SelectItem key={year} value={year}>
                  FY {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <FrankingCreditSummary summary={summary} isLoading={isLoading} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-[550px]">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="refund">Refund</TabsTrigger>
          <TabsTrigger value="entries">Entries ({entries.length})</TabsTrigger>
          <TabsTrigger value="ato-rules">ATO Rules</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6 mt-6">
          <FrankingCalculator />
        </TabsContent>

        <TabsContent value="refund" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <FrankingRefundEstimator />
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="h-5 w-5" />
                    Quick Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-medium text-green-800 mb-1">Low Income? Get a Refund!</p>
                    <p className="text-green-700">
                      If your taxable income is below $45,000, you may receive a refund of excess franking credits.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="font-medium text-blue-800 mb-1">Pension Phase Benefits</p>
                    <p className="text-blue-700">
                      Self-funded retirees in pension phase with 0% tax rate can claim full refunds.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="font-medium text-amber-800 mb-1">High Income Considerations</p>
                    <p className="text-amber-700">
                      If you earn over $135,000, you may owe additional tax on fully franked dividends.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Tax Brackets (2024-2025)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {MARGINAL_TAX_RATES_2025.map((rate, index) => (
                      <div 
                        key={rate.rate} 
                        className="flex justify-between items-center p-2 rounded hover:bg-muted"
                      >
                        <div>
                          <span className="font-medium">{(rate.rate * 100).toFixed(0)}%</span>
                          <span className="text-xs text-muted-foreground ml-2">{rate.description}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {rate.maxIncome 
                            ? `$${(rate.minIncome/1000).toFixed(0)}k - $${(rate.maxIncome/1000).toFixed(0)}k`
                            : `$${(rate.minIncome/1000).toFixed(0)}k+`
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="entries" className="space-y-6 mt-6">
          <DividendEntryList
            entries={entries}
            isLoading={isLoading}
            onEdit={(entry) => setEditingEntry(entry)}
            onDelete={handleDeleteEntry}
            onDeleteMany={handleDeleteMany}
          />
        </TabsContent>

        <TabsContent value="ato-rules" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  What are Franking Credits?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p>
                  Franking credits (also known as imputation credits) represent the tax a company has already paid on its profits before distributing them as dividends to shareholders.
                </p>
                <p>
                  When you receive a franked dividend, you're entitled to a tax credit for the tax the company has already paid. This prevents double taxation of company profits.
                </p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium mb-2">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Company earns $1,000 profit</li>
                    <li>Company pays $300 tax (30%)</li>
                    <li>Company distributes $700 as dividend</li>
                    <li>You receive $700 + $300 franking credit</li>
                    <li>You declare $1,000 grossed-up dividend</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ATO Calculation Formula</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-3">
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="font-mono text-sm">Franking Credit = (Dividend × 0.30) ÷ 0.70</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      For 30% company tax rate
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-mono text-sm">Grossed-Up = Dividend + Franking Credit</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Amount to declare on tax return
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">Example Calculation:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Cash Dividend:</span>
                    <span className="text-right">{formatCurrency(700)}</span>
                    <span className="text-muted-foreground">Franking Credit:</span>
                    <span className="text-right text-green-600">{formatCurrency(300)}</span>
                    <span className="text-muted-foreground font-medium">Grossed-Up:</span>
                    <span className="text-right font-medium">{formatCurrency(1000)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Franking Percentages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Badge className="bg-green-600">100%</Badge>
                    <div>
                      <p className="font-medium text-sm text-green-800">Fully Franked</p>
                      <p className="text-sm text-green-700">
                        The entire dividend has franking credits attached. Most common for Australian companies.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Badge className="bg-blue-600">Partial</Badge>
                    <div>
                      <p className="font-medium text-sm text-blue-800">Partially Franked</p>
                      <p className="text-sm text-blue-700">
                        Only a portion of the dividend has franking credits. Common for companies with overseas income.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <Badge variant="secondary">0%</Badge>
                    <div>
                      <p className="font-medium text-sm text-gray-800">Unfranked</p>
                      <p className="text-sm text-gray-700">
                        No franking credits attached. Common for REITs, some international companies, or certain types of distributions.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tax Impact by Income Level</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-green-800">Low Income ($0 - $45k)</span>
                      <Badge variant="outline" className="text-green-700">Refund</Badge>
                    </div>
                    <p className="text-sm text-green-700">
                      You receive a refund of excess franking credits because your tax rate (0-16%) is less than the company rate (30%).
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-800">Middle Income ($45k - $135k)</span>
                      <Badge variant="outline">Break-even</Badge>
                    </div>
                    <p className="text-sm text-gray-700">
                      At 30% marginal rate, franking credits exactly offset tax owed. No refund or additional tax.
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-orange-800">High Income ($135k+)</span>
                      <Badge variant="outline" className="text-orange-700">Tax Payable</Badge>
                    </div>
                    <p className="text-sm text-orange-700">
                      You pay the difference between your marginal rate (37% or 45%) and the company rate (30%).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Important ATO Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Holding Period Rule:</strong> To claim franking credits, you must hold shares for at least 45 days (90 days for preference shares) excluding the day of acquisition and disposal.
              </p>
              <p>
                <strong>Tax Return Declaration:</strong> You must declare both the cash dividend and franking credits in your tax return. The grossed-up amount counts towards your taxable income.
              </p>
              <p>
                <strong>Excess Credits:</strong> Franking credits can only be used to offset tax on dividend income. Excess credits are refundable for individuals and super funds.
              </p>
              <p className="text-xs pt-2">
                For the most current information, always refer to the <a href="https://www.ato.gov.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Australian Taxation Office website</a>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Export as CSV</h3>
                  <p className="text-sm text-muted-foreground">
                    Download entries in CSV format for spreadsheets
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleExportCSV} 
                disabled={isExporting || entries.length === 0}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>

            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Export as JSON</h3>
                  <p className="text-sm text-muted-foreground">
                    Download entries in JSON format for data interchange
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleExportJSON} 
                disabled={isExporting || entries.length === 0}
                className="w-full"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
            </div>
          </div>

          {entries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No entries to export. Add some dividend entries first.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Dividend Entry</DialogTitle>
          </DialogHeader>
          <DividendEntryForm
            taxYear={selectedTaxYear}
            onSubmit={handleCreateEntry}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Dividend Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <DividendEntryForm
              initialEntry={editingEntry}
              taxYear={selectedTaxYear}
              onSubmit={handleUpdateEntry}
              onCancel={() => setEditingEntry(null)}
              submitLabel="Update Entry"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
