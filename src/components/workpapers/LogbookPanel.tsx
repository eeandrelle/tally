import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UseCarExpensesReturn, LogbookEntry, CarExpense } from '@/hooks/useCarExpenses';
import { CAR_EXPENSE_CATEGORIES, type CarExpenseCategory } from '@/lib/car-expenses';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit2, 
  Receipt, 
  AlertCircle, 
  CheckCircle2,
  Car,
  Gauge,
  Calculator
} from 'lucide-react';

interface LogbookPanelProps {
  carExpenses: UseCarExpensesReturn;
}

export function LogbookPanel({ carExpenses }: LogbookPanelProps) {
  const {
    logbookEntries,
    addLogbookEntry,
    updateLogbookEntry,
    deleteLogbookEntry,
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    odometerRecords,
    setOdometerStartOfYear,
    setOdometerEndOfYear,
    businessUsePercentage,
    totalExpenses,
    expensesByCategory,
    logbookCalculation,
    logbookValidation,
  } = carExpenses;

  const [activeTab, setActiveTab] = useState('logbook');
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logbook" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Logbook ({logbookEntries.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className="h-4 w-4" />
            Expenses ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="odometer" className="gap-2">
            <Gauge className="h-4 w-4" />
            Odometer
          </TabsTrigger>
        </TabsList>

        {/* Logbook Entries Tab */}
        <TabsContent value="logbook" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Logbook Entries
                </CardTitle>
                <CardDescription>
                  Record your trips for a minimum 12-week continuous period
                </CardDescription>
              </div>
              <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Logbook Entry</DialogTitle>
                  </DialogHeader>
                  <AddLogbookEntryForm 
                    onSubmit={(entry) => {
                      addLogbookEntry(entry);
                      setIsAddEntryOpen(false);
                    }}
                    onCancel={() => setIsAddEntryOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Validation alerts */}
              {!logbookValidation.isValid && logbookValidation.errors.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-inside list-disc">
                      {logbookValidation.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {logbookValidation.warnings.length > 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-inside list-disc">
                      {logbookValidation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {logbookEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-2 font-medium">No logbook entries yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Add entries for at least 12 continuous weeks to calculate your business use percentage
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead className="text-right">Total km</TableHead>
                        <TableHead className="text-right">Business km</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logbookEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="text-sm">{formatDate(entry.startDate)}</div>
                            <div className="text-xs text-muted-foreground">to {formatDate(entry.endDate)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[150px] truncate text-sm" title={entry.purpose}>
                              {entry.purpose}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{entry.totalKms.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{entry.businessKms.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={entry.businessPercentage >= 50 ? "default" : "secondary"}>
                              {entry.businessPercentage.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteLogbookEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}

              {/* Summary stats */}
              {logbookEntries.length > 0 && (
                <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{logbookEntries.length}</p>
                    <p className="text-xs text-muted-foreground">Entries</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {logbookEntries.reduce((sum, e) => sum + e.totalKms, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total km recorded</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{businessUsePercentage.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Business use</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logbook requirements info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ATO Logbook Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Minimum 12 continuous weeks of recording</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Record start and end odometer readings for each trip</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Note the purpose of each business trip</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Logbook is valid for 5 years (unless circumstances change significantly)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Car Expenses
                </CardTitle>
                <CardDescription>
                  Record all car-related expenses for the tax year
                </CardDescription>
              </div>
              <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Car Expense</DialogTitle>
                  </DialogHeader>
                  <AddExpenseForm 
                    onSubmit={(expense) => {
                      addExpense(expense);
                      setIsAddExpenseOpen(false);
                    }}
                    onCancel={() => setIsAddExpenseOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-2 font-medium">No expenses recorded</h3>
                  <p className="text-sm text-muted-foreground">
                    Add fuel, registration, insurance, and other car expenses
                  </p>
                </div>
              ) : (
                <>
                  {/* Category summary */}
                  <div className="mb-4 grid gap-2 sm:grid-cols-4">
                    {Object.entries(expensesByCategory).map(([category, amount]) => (
                      amount > 0 && (
                        <div key={category} className="rounded-lg bg-muted p-2 text-center">
                          <p className="text-sm font-medium">${amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {CAR_EXPENSE_CATEGORIES[category as CarExpenseCategory].label}
                          </p>
                        </div>
                      )
                    ))}
                  </div>

                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell className="whitespace-nowrap">{formatDate(expense.date)}</TableCell>
                            <TableCell>
                              <div className="max-w-[150px] truncate" title={expense.description}>
                                {expense.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {CAR_EXPENSE_CATEGORIES[expense.category].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
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
                  </ScrollArea>
                </>
              )}

              {/* Total */}
              {expenses.length > 0 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="font-medium">Total Expenses</span>
                  <span className="text-xl font-bold">${totalExpenses.toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense categories info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Claimable Car Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(CAR_EXPENSE_CATEGORIES).map(([key, category]) => (
                  <div key={key} className="flex items-start gap-2 text-sm">
                    <Car className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{category.label}</p>
                      <p className="text-xs text-muted-foreground">{category.atoDescription}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Odometer Tab */}
        <TabsContent value="odometer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Odometer Readings
              </CardTitle>
              <CardDescription>
                Record your odometer at the start and end of the tax year
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="odometerStart">Start of Year (1 July)</Label>
                  <Input
                    id="odometerStart"
                    type="number"
                    placeholder="e.g., 45000"
                    value={odometerRecords.startOfYear || ''}
                    onChange={(e) => setOdometerStartOfYear(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Odometer reading on the first day of the tax year
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="odometerEnd">End of Year (30 June)</Label>
                  <Input
                    id="odometerEnd"
                    type="number"
                    placeholder="e.g., 52000"
                    value={odometerRecords.endOfYear || ''}
                    onChange={(e) => setOdometerEndOfYear(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Odometer reading on the last day of the tax year
                  </p>
                </div>
              </div>

              {odometerRecords.startOfYear > 0 && odometerRecords.endOfYear > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="mb-3 font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Year Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total kilometres for the year</span>
                      <span className="font-medium">
                        {(odometerRecords.endOfYear - odometerRecords.startOfYear).toLocaleString()} km
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Business use percentage</span>
                      <span className="font-medium">{businessUsePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated business kilometres</span>
                      <span className="font-medium">
                        {Math.round((odometerRecords.endOfYear - odometerRecords.startOfYear) * (businessUsePercentage / 100)).toLocaleString()} km
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Keep evidence of your odometer readings, such as photos taken on the relevant dates 
                  or service records that show the odometer reading.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Calculation Summary */}
      {logbookCalculation && expenses.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Logbook Method Calculation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total car expenses</span>
                <span>${logbookCalculation.totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Business use percentage</span>
                <span>{logbookCalculation.businessUsePercentage.toFixed(1)}%</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Business portion claim</span>
                <span className="text-primary">${logbookCalculation.businessPortionClaim.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Add Logbook Entry Form
interface AddLogbookEntryFormProps {
  onSubmit: (entry: Omit<LogbookEntry, 'id' | 'businessPercentage'>) => void;
  onCancel: () => void;
}

function AddLogbookEntryForm({ onSubmit, onCancel }: AddLogbookEntryFormProps) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    startOdometer: 0,
    endOdometer: 0,
    businessKms: 0,
    purpose: '',
  });

  const totalKms = formData.endOdometer - formData.startOdometer;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      totalKms,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Start Odometer</Label>
          <Input
            type="number"
            value={formData.startOdometer || ''}
            onChange={(e) => setFormData({ ...formData, startOdometer: parseInt(e.target.value) || 0 })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>End Odometer</Label>
          <Input
            type="number"
            value={formData.endOdometer || ''}
            onChange={(e) => setFormData({ ...formData, endOdometer: parseInt(e.target.value) || 0 })}
            required
          />
        </div>
      </div>

      <div className="rounded-lg bg-muted p-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Calculated total km</span>
          <span className="font-medium">{totalKms.toLocaleString()} km</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Business Kilometres</Label>
        <Input
          type="number"
          value={formData.businessKms || ''}
          onChange={(e) => setFormData({ ...formData, businessKms: parseInt(e.target.value) || 0 })}
          max={totalKms}
          required
        />
        <p className="text-xs text-muted-foreground">
          Number of kilometres that were for business purposes
        </p>
      </div>

      <div className="space-y-2">
        <Label>Business Purpose</Label>
        <Input
          value={formData.purpose}
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          placeholder="e.g., Client site visits"
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Entry</Button>
      </div>
    </form>
  );
}

// Add Expense Form
interface AddExpenseFormProps {
  onSubmit: (expense: Omit<CarExpense, 'id'>) => void;
  onCancel: () => void;
}

function AddExpenseForm({ onSubmit, onCancel }: AddExpenseFormProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'fuel' as CarExpenseCategory,
    amount: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Date</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Shell fuel"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as CarExpenseCategory })}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          {Object.entries(CAR_EXPENSE_CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Amount ($)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.amount || ''}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Expense</Button>
      </div>
    </form>
  );
}

// Helper function
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
