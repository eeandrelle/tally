import { useState } from 'react';
import {
  Calculator,
  Download,
  FileText,
  HelpCircle,
  Info,
  Landmark,
  Plus,
  Receipt,
  Trash2,
  AlertCircle,
  CheckCircle,
  BookOpen,
  Car,
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
import { useTaxAffairs, type TaxExpense, type TaxExpenseType } from '@/hooks/useTaxAffairs';

const TAX_EXPENSE_TYPES: { value: TaxExpenseType; label: string; icon: React.ReactNode }[] = [
  { value: 'agent_fees', label: 'Tax Agent Fees', icon: <HelpCircle className="h-4 w-4" /> },
  { value: 'tax_software', label: 'Tax Software', icon: <Calculator className="h-4 w-4" /> },
  { value: 'tax_books', label: 'Tax Reference Books', icon: <BookOpen className="h-4 w-4" /> },
  { value: 'travel_to_agent', label: 'Travel to Tax Agent', icon: <Car className="h-4 w-4" /> },
  { value: 'litigation', label: 'Tax Litigation Costs', icon: <FileText className="h-4 w-4" /> },
  { value: 'valuation', label: 'Valuation for Tax', icon: <Landmark className="h-4 w-4" /> },
  { value: 'advice', label: 'Tax Advice', icon: <HelpCircle className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <Receipt className="h-4 w-4" /> },
];

export function TaxAffairsWorkpaper() {
  const { expenses, addExpense, deleteExpense, getTotalExpenses } = useTaxAffairs();
  const [activeTab, setActiveTab] = useState('expenses');
  const [newExpense, setNewExpense] = useState<Partial<TaxExpense>>({
    type: 'agent_fees',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
  });

  const handleAddExpense = () => {
    if (newExpense.description && newExpense.amount && newExpense.amount > 0) {
      addExpense({
        type: newExpense.type as TaxExpenseType,
        description: newExpense.description,
        amount: newExpense.amount,
        date: newExpense.date || new Date().toISOString().split('T')[0],
        agentName: newExpense.agentName,
      });
      setNewExpense({
        type: 'agent_fees',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleExport = () => {
    const data = {
      category: 'D9',
      totalExpenses: getTotalExpenses(),
      expenses: expenses,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `D9-tax-affairs-${new Date().getFullYear()}.json`;
    a.click();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AtoCategoryBadge code="D9" size="lg" />
              <h2 className="text-2xl font-bold">Cost of Managing Tax Affairs</h2>
            </div>
            <p className="text-muted-foreground">
              Claim costs for preparing and lodging your tax return (D9)
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
            Expenses must relate to managing your tax affairs. This includes tax return preparation, 
            lodgment costs, and travel to get tax advice.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(getTotalExpenses())}</div>
              <p className="text-xs text-muted-foreground">D9 Claim Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expense Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.length}</div>
              <p className="text-xs text-muted-foreground">Tax-related expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Common Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">Agent Fees</Badge>
                <Badge variant="secondary">Tax Software</Badge>
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
                <CardTitle className="text-lg">Add Tax Expense</CardTitle>
                <CardDescription>Record expenses for managing your tax affairs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expense Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                      value={newExpense.type}
                      onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value as TaxExpenseType })}
                    >
                      {TAX_EXPENSE_TYPES.map((t) => (
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
                    placeholder="e.g., Annual tax return preparation"
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
                  {newExpense.type === 'agent_fees' && (
                    <div className="space-y-2">
                      <Label>Tax Agent Name (Optional)</Label>
                      <Input
                        placeholder="e.g., Smith & Associates"
                        value={newExpense.agentName || ''}
                        onChange={(e) => setNewExpense({ ...newExpense, agentName: e.target.value })}
                      />
                    </div>
                  )}
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
                <CardTitle className="text-lg">Tax Affairs Expenses</CardTitle>
                <CardDescription>{expenses.length} expenses recorded</CardDescription>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No expenses recorded yet</p>
                    <p className="text-sm">Add your first tax expense above</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {TAX_EXPENSE_TYPES.find(t => t.value === expense.type)?.icon}
                              <span className="text-sm">
                                {TAX_EXPENSE_TYPES.find(t => t.value === expense.type)?.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{expense.description}</p>
                              {expense.agentName && (
                                <p className="text-xs text-muted-foreground">{expense.agentName}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{expense.date}</TableCell>
                          <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
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
                <CardTitle>ATO Guidelines - D9</CardTitle>
                <CardDescription>Cost of managing tax affairs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">What You Can Claim</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Tax agent fees for preparing and lodging your return</li>
                    <li>Cost of tax reference books and software</li>
                    <li>Travel costs to visit your tax agent (parking, transport)</li>
                    <li>Tax-related legal advice and litigation costs</li>
                    <li>Valuation fees for tax purposes</li>
                    <li>Depreciation schedule for rental property</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">What You Cannot Claim</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>General financial planning fees</li>
                    <li>Budgeting software costs</li>
                    <li>Personal bookkeeping services</li>
                    <li>Investment advice (claim in D7 instead)</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Record Keeping</h4>
                  <p className="text-sm text-muted-foreground">
                    Keep receipts and tax agent invoices for 5 years. Your tax agent should provide 
                    a tax invoice showing the services provided and fees charged.
                  </p>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Tax Agent Fees:</strong> Tax agent fees are deductible in the year they are paid, 
                    not the year the return relates to. Keep your invoice even if you prepare your own return.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Car className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Travel Costs:</strong> Don't forget to claim travel costs to see your tax agent, 
                    including parking fees and public transport fares.
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
