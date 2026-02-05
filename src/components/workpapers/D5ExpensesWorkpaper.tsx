import { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle,
  Download,
  FileText,
  Globe,
  HardHat,
  HelpCircle,
  Home,
  Link2,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShoppingBag,
  StickyNote,
  Trash2,
  Unlink,
  Users,
  Wallet,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getReceiptsByDateRange, type Receipt as DbReceipt } from '@/lib/db';
import { useD5Expenses, D5_EXPENSE_TYPES, type D5ExpenseType } from '@/hooks/useD5Expenses';

interface ReceiptLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (receiptId: string, receiptUrl?: string) => void;
  expenseId: string;
}

function ReceiptLinkDialog({ isOpen, onClose, onLink }: ReceiptLinkDialogProps) {
  const [receipts, setReceipts] = useState<DbReceipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadReceipts = async () => {
    if (isOpen && receipts.length === 0) {
      setIsLoading(true);
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const data = await getReceiptsByDateRange(startDate, endDate);
        setReceipts(data);
      } catch (error) {
        console.error('Failed to load receipts:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Load receipts when dialog opens
  if (isOpen && !isLoading && receipts.length === 0) {
    loadReceipts();
  }

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = !searchQuery ||
      r.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Receipt</DialogTitle>
          <DialogDescription>
            Select a receipt to link to this expense
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search receipts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading receipts...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-50" />
              <p>No receipts found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReceipts.map((receipt) => (
                <button
                  key={receipt.id}
                  onClick={() => {
                    onLink(String(receipt.id), receipt.image_path);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{receipt.vendor || 'Unknown Vendor'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(receipt.date)} • {formatCurrency(receipt.amount)}
                      </p>
                    </div>
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface D5ExpensesWorkpaperProps {
  taxYear: string;
}

const EXPENSE_TYPE_ICONS: Record<D5ExpenseType, React.ReactNode> = {
  'phone': <Phone className="h-4 w-4" />,
  'internet': <Wifi className="h-4 w-4" />,
  'home-office-running': <Home className="h-4 w-4" />,
  'union-fees': <Users className="h-4 w-4" />,
  'subscriptions': <Globe className="h-4 w-4" />,
  'publications': <BookOpen className="h-4 w-4" />,
  'tools-equipment': <Package className="h-4 w-4" />,
  'protective-items': <Shield className="h-4 w-4" />,
  'briefcase': <ShoppingBag className="h-4 w-4" />,
  'stationery': <StickyNote className="h-4 w-4" />,
  'other': <MoreHorizontal className="h-4 w-4" />,
};

export function D5ExpensesWorkpaper({ taxYear }: D5ExpensesWorkpaperProps) {
  const {
    workpaper,
    summary,
    validation,
    addExpense,
    updateExpense,
    deleteExpense,
    linkReceipt,
    unlinkReceipt,
    updateNotes,
    reset,
    save,
    exportData,
  } = useD5Expenses(taxYear);

  const [activeTab, setActiveTab] = useState('expenses');
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Receipt linking state
  const [receiptDialog, setReceiptDialog] = useState<{
    isOpen: boolean;
    expenseId: string;
  }>({
    isOpen: false,
    expenseId: '',
  });

  // Form state for new expense
  const [newExpense, setNewExpense] = useState<{
    type: D5ExpenseType;
    description: string;
    amount: string;
    workRelatedPercentage: string;
    method: 'actual' | 'estimate' | 'apportioned';
    date: string;
    apportionmentReason: string;
  }>({
    type: 'phone',
    description: '',
    amount: '',
    workRelatedPercentage: '50',
    method: 'actual',
    date: '',
    apportionmentReason: '',
  });

  const handleAddExpense = () => {
    if (newExpense.description && newExpense.amount) {
      addExpense({
        type: newExpense.type,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        workRelatedPercentage: parseInt(newExpense.workRelatedPercentage) || 100,
        method: newExpense.method,
        date: newExpense.date || undefined,
        apportionmentReason: newExpense.apportionmentReason || undefined,
      });
      // Reset form
      setNewExpense({
        type: 'phone',
        description: '',
        amount: '',
        workRelatedPercentage: '50',
        method: 'actual',
        date: '',
        apportionmentReason: '',
      });
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `d5-expenses-${taxYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate claimable amount for display
  const getClaimableAmount = (amount: number, percentage: number) => {
    return amount * (percentage / 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">D5 Other Work-Related Expenses</h1>
          <p className="text-muted-foreground">
            Record work expenses not claimed elsewhere for {taxYear}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" onClick={save}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button onClick={handleExport} disabled={!validation.valid || summary.count === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Validation alerts */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert className="bg-yellow-500/10 border-yellow-500/50">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.valid && summary.count > 0 && (
        <Alert className="bg-green-500/10 border-green-500/50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Workpaper ready for export. Total claim: {formatCurrency(summary.total)}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claim</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total)}</div>
            <p className="text-xs text-muted-foreground">D5 category total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.count}</div>
            <p className="text-xs text-muted-foreground">Total entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(summary.byType).filter(t => t.count > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Types used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receipts</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.receiptCoverage}%</div>
            <p className="text-xs text-muted-foreground">Coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="guidance">ATO Guidance</TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {/* Add Expense Card */}
          <Card>
            <CardHeader>
              <CardTitle>Add Expense</CardTitle>
              <CardDescription>
                Add a work-related expense not claimed in other categories
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Expense Type</Label>
                  <Select
                    value={newExpense.type}
                    onValueChange={(value) => setNewExpense({ 
                      ...newExpense, 
                      type: value as D5ExpenseType,
                      workRelatedPercentage: String(D5_EXPENSE_TYPES[value as D5ExpenseType].defaultApportionment || 100),
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(D5_EXPENSE_TYPES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date (optional)</Label>
                  <Input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder={D5_EXPENSE_TYPES[newExpense.type].examples.join(', ')}
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {D5_EXPENSE_TYPES[newExpense.type].description}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Work Use %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newExpense.workRelatedPercentage}
                    onChange={(e) => setNewExpense({ ...newExpense, workRelatedPercentage: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={newExpense.method}
                    onValueChange={(value) => setNewExpense({ ...newExpense, method: value as 'actual' | 'estimate' | 'apportioned' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actual">Actual</SelectItem>
                      <SelectItem value="estimate">Estimate</SelectItem>
                      <SelectItem value="apportioned">Apportioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newExpense.method === 'apportioned' && (
                <div className="space-y-2">
                  <Label>Apportionment Reason</Label>
                  <Input
                    placeholder="e.g., 50% work use based on diary"
                    value={newExpense.apportionmentReason}
                    onChange={(e) => setNewExpense({ ...newExpense, apportionmentReason: e.target.value })}
                  />
                </div>
              )}

              <Button onClick={handleAddExpense} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </CardContent>
          </Card>

          {/* Expenses List */}
          <Card>
            <CardHeader>
              <CardTitle>Expense List</CardTitle>
              <CardDescription>
                {summary.count} expense{summary.count !== 1 ? 's' : ''} totaling {formatCurrency(summary.total)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workpaper.expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No expenses added yet</p>
                  <p className="text-sm">Add your first work-related expense above</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="text-right">Claimable</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workpaper.expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {EXPENSE_TYPE_ICONS[expense.type]}
                            <span className="text-sm">{D5_EXPENSE_TYPES[expense.type].label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            {expense.date && (
                              <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell className="text-center">{expense.workRelatedPercentage}%</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(getClaimableAmount(expense.amount, expense.workRelatedPercentage))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {expense.receiptId ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => unlinkReceipt(expense.id)}
                                title="Unlink receipt"
                              >
                                <Unlink className="h-4 w-4 text-green-500" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setReceiptDialog({ isOpen: true, expenseId: expense.id })}
                                title="Link receipt"
                              >
                                <Link2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteExpense(expense.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Additional information for your records</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any notes about these expenses..."
                value={workpaper.notes || ''}
                onChange={(e) => updateNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Summary by expense type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(summary.byType)
                  .filter(([_, data]) => data.count > 0)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          {EXPENSE_TYPE_ICONS[type as D5ExpenseType]}
                        </div>
                        <div>
                          <p className="font-medium">{D5_EXPENSE_TYPES[type as D5ExpenseType].label}</p>
                          <p className="text-sm text-muted-foreground">{data.count} expense{data.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{formatCurrency(data.total)}</p>
                      </div>
                    </div>
                  ))}

                {summary.count === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No expenses to display</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guidance Tab */}
        <TabsContent value="guidance">
          <Card>
            <CardHeader>
              <CardTitle>ATO Guidance</CardTitle>
              <CardDescription>Important information about D5 deductions</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(D5_EXPENSE_TYPES).map(([key, { label, atoGuidance, examples }]) => (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        {EXPENSE_TYPE_ICONS[key as D5ExpenseType]}
                        <span>{label}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-6">
                        <p className="text-sm text-muted-foreground">{atoGuidance}</p>
                        <div className="flex flex-wrap gap-2">
                          {examples.map((example, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {example}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Alert className="mt-4">
            <HelpCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Expenses claimed under D5 should not be claimed elsewhere. 
              Vehicle expenses go to D1, travel to D2, clothing to D3, and education to D4.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Workpaper?</DialogTitle>
            <DialogDescription>
              This will clear all D5 expenses. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { reset(); setShowResetDialog(false); }}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Link Dialog */}
      <ReceiptLinkDialog
        isOpen={receiptDialog.isOpen}
        onClose={() => setReceiptDialog({ isOpen: false, expenseId: '' })}
        onLink={(receiptId, receiptUrl) => {
          linkReceipt(receiptDialog.expenseId, receiptId, receiptUrl);
        }}
        expenseId={receiptDialog.expenseId}
      />
    </div>
  );
}
