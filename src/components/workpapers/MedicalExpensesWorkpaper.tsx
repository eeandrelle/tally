import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Stethoscope, 
  Plus, 
  Trash2, 
  Info,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Calculator,
  FileText,
  HeartPulse,
  Accessibility,
  UserCircle
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { atoCategories } from '@/lib/ato-categories';

// Medical expense types for D10
interface MedicalExpense {
  id: string;
  description: string;
  provider: string;
  date: string;
  amount: number;
  category: 'disability_aid' | 'attendant_care' | 'aged_care' | 'other';
  receiptRef?: string;
  notes?: string;
}

interface MedicalExpensesWorkpaperProps {
  taxYear?: string;
  onSave?: (data: MedicalExpensesData) => void;
}

export interface MedicalExpensesData {
  expenses: MedicalExpense[];
  disabilityAidsTotal: number;
  attendantCareTotal: number;
  agedCareTotal: number;
  totalClaimable: number;
}

const EXPENSE_CATEGORIES = [
  { 
    value: 'disability_aid' as const, 
    label: 'Disability Aid',
    description: 'Medical aids, appliances, and disability-related items',
    icon: Accessibility
  },
  { 
    value: 'attendant_care' as const, 
    label: 'Attendant Care',
    description: 'Care for disability or illness at home',
    icon: UserCircle
  },
  { 
    value: 'aged_care' as const, 
    label: 'Aged Care',
    description: 'Aged care facility fees and services',
    icon: HeartPulse
  },
  { 
    value: 'other' as const, 
    label: 'Other (Review)',
    description: 'Other expenses - may not be claimable',
    icon: AlertTriangle
  },
];

export function MedicalExpensesWorkpaper({ taxYear, onSave }: MedicalExpensesWorkpaperProps) {
  const [expenses, setExpenses] = useState<MedicalExpense[]>([]);
  const [activeTab, setActiveTab] = useState('expenses');

  // Form state for new expense
  const [newExpense, setNewExpense] = useState<Partial<MedicalExpense>>({
    category: 'disability_aid',
    date: new Date().toISOString().split('T')[0],
  });

  // Get category info from ATO database
  const categoryInfo = useMemo(() => {
    return atoCategories.find(c => c.code === 'D10');
  }, []);

  // Calculate totals by category
  const totals = useMemo(() => {
    const result = {
      disabilityAidsTotal: 0,
      attendantCareTotal: 0,
      agedCareTotal: 0,
      otherTotal: 0,
      totalClaimable: 0,
    };

    expenses.forEach(expense => {
      switch (expense.category) {
        case 'disability_aid':
          result.disabilityAidsTotal += expense.amount;
          result.totalClaimable += expense.amount;
          break;
        case 'attendant_care':
          result.attendantCareTotal += expense.amount;
          result.totalClaimable += expense.amount;
          break;
        case 'aged_care':
          result.agedCareTotal += expense.amount;
          result.totalClaimable += expense.amount;
          break;
        case 'other':
          result.otherTotal += expense.amount;
          break;
      }
    });

    return result;
  }, [expenses]);

  // Add new expense
  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.date) {
      return;
    }

    const expense: MedicalExpense = {
      id: `med-${Date.now()}`,
      description: newExpense.description,
      provider: newExpense.provider || '',
      date: newExpense.date,
      amount: Number(newExpense.amount),
      category: newExpense.category || 'disability_aid',
      receiptRef: newExpense.receiptRef,
      notes: newExpense.notes,
    };

    setExpenses(prev => [...prev, expense]);
    
    // Reset form
    setNewExpense({
      category: 'disability_aid',
      date: new Date().toISOString().split('T')[0],
      description: '',
      provider: '',
      amount: undefined,
      receiptRef: '',
      notes: '',
    });
  };

  // Delete expense
  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Group expenses by category
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, MedicalExpense[]> = {
      disability_aid: [],
      attendant_care: [],
      aged_care: [],
      other: [],
    };
    
    expenses.forEach(expense => {
      groups[expense.category].push(expense);
    });
    
    return groups;
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Stethoscope className="h-8 w-8 text-primary" />
            D10 Medical Expenses
          </h1>
          <p className="text-muted-foreground mt-1">
            Disability aids, attendant care, and aged care expenses
            {taxYear && ` • FY ${taxYear}`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(totals.totalClaimable)}
          </div>
          <p className="text-sm text-muted-foreground">Total claimable</p>
        </div>
      </div>

      {/* Important Notice */}
      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">Important Rule Change</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
          From 2019-20 onwards, you can only claim medical expenses for:
          • <strong>Disability aids</strong> - items that assist with daily living
          • <strong>Attendant care</strong> - care for disability or illness at home  
          • <strong>Aged care</strong> - fees for residential aged care or in-home care
          <br />
          General medical expenses (doctor visits, medications, etc.) are <strong>no longer claimable</strong>.
        </AlertDescription>
      </Alert>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className="h-4 w-4" />
            Expenses ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="add" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <FileText className="h-4 w-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {expenses.length === 0 ? (
            <Card className="p-8 text-center">
              <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No medical expenses recorded</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add disability aids, attendant care, or aged care expenses
              </p>
              <Button onClick={() => setActiveTab('add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Expense
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {EXPENSE_CATEGORIES.map(category => {
                const categoryExpenses = groupedExpenses[category.value];
                if (categoryExpenses.length === 0) return null;
                
                const CategoryIcon = category.icon;
                const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
                
                return (
                  <Card key={category.value}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{category.label}</CardTitle>
                        </div>
                        <Badge variant="secondary">{formatCurrency(categoryTotal)}</Badge>
                      </div>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-auto max-h-[300px]">
                        <div className="space-y-2">
                          {categoryExpenses.map(expense => (
                            <div 
                              key={expense.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{expense.description}</p>
                                  {expense.receiptRef && (
                                    <Badge variant="outline" className="text-xs">Receipt</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                  {expense.provider && <span>{expense.provider}</span>}
                                  <span>•</span>
                                  <span>{formatDate(expense.date)}</span>
                                  {expense.notes && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate">{expense.notes}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 ml-4">
                                <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Add Expense Tab */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Medical Expense
              </CardTitle>
              <CardDescription>
                Record a disability aid, attendant care, or aged care expense
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category Selection */}
              <div className="space-y-2">
                <Label>Expense Category</Label>
                <div className="grid grid-cols-2 gap-3">
                  {EXPENSE_CATEGORIES.map(cat => {
                    const CategoryIcon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setNewExpense(prev => ({ ...prev, category: cat.value }))}
                        className={cn(
                          "flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all",
                          newExpense.category === cat.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CategoryIcon className="h-4 w-4" />
                          <span className="font-medium">{cat.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{cat.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Expense Details */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Wheelchair, Home care services..."
                    value={newExpense.description || ''}
                    onChange={e => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider">Provider/Supplier</Label>
                  <Input
                    id="provider"
                    placeholder="e.g., Mobility Aids Australia"
                    value={newExpense.provider || ''}
                    onChange={e => setNewExpense(prev => ({ ...prev, provider: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newExpense.date || ''}
                    onChange={e => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newExpense.amount || ''}
                    onChange={e => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiptRef">Receipt Reference (optional)</Label>
                <Input
                  id="receiptRef"
                  placeholder="Receipt number or link to scanned receipt"
                  value={newExpense.receiptRef || ''}
                  onChange={e => setNewExpense(prev => ({ ...prev, receiptRef: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any additional details..."
                  value={newExpense.notes || ''}
                  onChange={e => setNewExpense(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <Button 
                className="w-full"
                onClick={handleAddExpense}
                disabled={!newExpense.description || !newExpense.amount}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                D10 Summary
              </CardTitle>
              <CardDescription>
                Breakdown of medical expenses by category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Accessibility className="h-4 w-4" />
                    <span>Disability Aids</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(totals.disabilityAidsTotal)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    <span>Attendant Care</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(totals.attendantCareTotal)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4" />
                    <span>Aged Care</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(totals.agedCareTotal)}</span>
                </div>

                {totals.otherTotal > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-amber-800 dark:text-amber-200">Other (Not Claimable)</span>
                    </div>
                    <span className="font-semibold text-amber-800 dark:text-amber-200">{formatCurrency(totals.otherTotal)}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div>
                  <p className="font-semibold text-lg">Total D10 Claim</p>
                  <p className="text-sm text-muted-foreground">Box D10 on your tax return</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{formatCurrency(totals.totalClaimable)}</p>
                  <p className="text-sm text-muted-foreground">{expenses.filter(e => e.category !== 'other').length} expenses</p>
                </div>
              </div>

              {/* ATO Reference */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>ATO Reference</AlertTitle>
                <AlertDescription className="text-sm">
                  {categoryInfo?.atoReference}
                </AlertDescription>
              </Alert>

              {/* Record Keeping */}
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Record Keeping Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  {categoryInfo?.recordKeeping.specificRequirements?.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MedicalExpensesWorkpaper;
