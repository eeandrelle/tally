import { useState } from 'react';
import {
  Banknote,
  Calculator,
  Download,
  HelpCircle,
  Info,
  PiggyBank,
  Plus,
  Receipt,
  Save,
  Trash2,
  TrendingUp,
  Percent,
  FileText,
  AlertCircle,
  Building2,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';
import { AtoCategoryBadge } from '@/components/ato/AtoCategoryBadge';
import { useInterestDividendDeductions, type InvestmentExpense, type InvestmentType } from '@/hooks/useInterestDividendDeductions';

const INVESTMENT_TYPES: { value: InvestmentType; label: string; icon: React.ReactNode }[] = [
  { value: 'account_fees', label: 'Account Fees', icon: <Building2 className="h-4 w-4" /> },
  { value: 'investment_advice', label: 'Investment Advice', icon: <HelpCircle className="h-4 w-4" /> },
  { value: 'interest_loan', label: 'Interest on Investment Loan', icon: <Banknote className="h-4 w-4" /> },
  { value: 'management_fees', label: 'Management Fees', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'share_registry', label: 'Share Registry Fees', icon: <FileText className="h-4 w-4" /> },
  { value: 'publications', label: 'Investment Publications', icon: <Receipt className="h-4 w-4" /> },
  { value: 'internet', label: 'Internet (Investment Portion)', icon: <Landmark className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <Percent className="h-4 w-4" /> },
];

export function InterestDividendWorkpaper() {
  const { expenses, addExpense, updateExpense, deleteExpense, getTotalDeductions } = useInterestDividendDeductions();
  const [activeTab, setActiveTab] = useState('expenses');
  const [newExpense, setNewExpense] = useState<Partial<InvestmentExpense>>({
    type: 'account_fees',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
  });

  const handleAddExpense = () => {
    if (newExpense.description && newExpense.amount && newExpense.amount > 0) {
      addExpense({
        type: newExpense.type as InvestmentType,
        description: newExpense.description,
        amount: newExpense.amount,
        date: newExpense.date || new Date().toISOString().split('T')[0],
        investmentAccount: newExpense.investmentAccount,
        workRelatedPercent: newExpense.workRelatedPercent || 100,
      });
      setNewExpense({
        type: 'account_fees',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleExport = () => {
    const data = {
      category: 'D7',
      totalDeductions: getTotalDeductions(),
      expenses: expenses,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `D7-interest-dividend-deductions-${new Date().getFullYear()}.json`;
    a.click();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AtoCategoryBadge code="D7" size="lg" />
              <h2 className="text-2xl font-bold">Interest & Dividend Deductions</h2>
            </div>
            <p className="text-muted-foreground">
              Claim costs incurred to earn interest, dividends, or other investment income (D7)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setActiveTab('expenses')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Expenses must be directly related to earning investment income. 
            Apportion costs if they relate to both income-producing and private investments.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(getTotalDeductions())}</div>
              <p className="text-xs text-muted-foreground">D7 Claim Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expense Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.length}</div>
              <p className="text-xs text-muted-foreground">Investment expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Common Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">Account Fees</Badge>
                <Badge variant="secondary">Investment Advice</Badge>
                <Badge variant="secondary">Loan Interest</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="guide">ATO Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            {/* Add New Expense */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Investment Expense</CardTitle>
                <CardDescription>Record expenses related to earning investment income</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expense Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                      value={newExpense.type}
                      onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value as InvestmentType })}
                    >
                      {INVESTMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
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
                    placeholder="e.g., Broker account annual fee"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newExpense.amount || ''}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Investment Account (Optional)</Label>
                    <Input
                      placeholder="e.g., CommSec, NAB Trade"
                      value={newExpense.investmentAccount || ''}
                      onChange={(e) => setNewExpense({ ...newExpense, investmentAccount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Income-Producing Percentage (%)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newExpense.workRelatedPercent || 100}
                      onChange={(e) => setNewExpense({ ...newExpense, workRelatedPercent: parseInt(e.target.value) })}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      Apportion if expense relates to both income-producing and private investments
                    </span>
                  </div>
                </div>
                <Button onClick={handleAddExpense} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </CardContent>
            </Card>

            {/* Expenses List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Investment Expenses</CardTitle>
                <CardDescription>{expenses.length} expenses recorded</CardDescription>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No expenses recorded yet</p>
                    <p className="text-sm">Add your first investment expense above</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Deductible</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {INVESTMENT_TYPES.find(t => t.value === expense.type)?.icon}
                              <span className="text-sm">
                                {INVESTMENT_TYPES.find(t => t.value === expense.type)?.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>{expense.date}</TableCell>
                          <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(expense.amount * (expense.workRelatedPercent / 100))}
                            {expense.workRelatedPercent < 100 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({expense.workRelatedPercent}%)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteExpense(expense.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guide">
            <Card>
              <CardHeader>
                <CardTitle>ATO Guidelines - D7</CardTitle>
                <CardDescription>Interest, dividend and other investment income deductions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">What You Can Claim</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Account keeping fees for investment accounts</li>
                    <li>Investment advice fees (for existing investments)</li>
                    <li>Interest on loans used to purchase investments</li>
                    <li>Share registry maintenance fees</li>
                    <li>Investment publication subscriptions</li>
                    <li>Internet costs for managing investments (apportioned)</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">What You Cannot Claim</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Fees for private savings accounts</li>
                    <li>Interest on private home loans</li>
                    <li>Advice for future investments (not yet made)</li>
                    <li>Costs of attending investment seminars</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Record Keeping</h4>
                  <p className="text-sm text-muted-foreground">
                    Keep statements and receipts for 5 years. This includes bank and investment account statements, 
                    investment advice fee invoices, loan statements for investment loans, and management fee statements.
                  </p>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Apportionment:</strong> If an expense relates to both income-producing and private investments, 
                    you must apportion the deduction. Only claim the percentage related to income-producing investments.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
