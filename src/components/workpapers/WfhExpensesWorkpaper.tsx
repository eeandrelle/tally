import { useState } from 'react';
import {
  AlertCircle,
  Calculator,
  CheckCircle,
  Clock,
  Download,
  FileText,
  HelpCircle,
  Home,
  Info,
  Lightbulb,
  MapPin,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  Trash2,
  TrendingUp,
  User,
  Zap,
  ChevronRight,
  CheckCircle2,
  Clock8,
  DollarSign,
  LayoutGrid,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useWfhExpenses } from '@/hooks/useWfhExpenses';
import {
  WFH_RATES,
  WFH_EXPENSE_CATEGORIES,
  WORK_AREA_TYPES,
  type WfhMethod,
  type WfhExpenseCategory,
} from '@/lib/wfh-expenses';
import { formatCurrency } from '@/lib/utils';

interface WfhExpensesWorkpaperProps {
  taxYear: string;
}

export function WfhExpensesWorkpaper({ taxYear }: WfhExpensesWorkpaperProps) {
  const {
    workpaper,
    isLoading,
    hasUnsavedChanges,
    validationErrors,
    comparison,
    isValid,
    setWorkAreaType,
    setFloorArea,
    setWorkAreaDescription,
    setRegularHours,
    addDiaryEntry,
    removeDiaryEntry,
    addExpense,
    removeExpense,
    setSelectedMethod,
    setAdditionalExpenses,
    setActualMethodPercentages,
    setNotes,
    saveWorkpaper,
    resetWorkpaper,
    exportSummary,
    totalHoursFromDiary,
    totalExpenses,
    recommendedMethod,
    potentialDeductions,
  } = useWfhExpenses(taxYear);

  const [activeTab, setActiveTab] = useState('setup');
  const [showComparison, setShowComparison] = useState(false);

  // Local form states
  const [newDiaryEntry, setNewDiaryEntry] = useState({ date: '', hours: '', description: '' });
  const [newExpense, setNewExpense] = useState({
    category: '' as WfhExpenseCategory | '',
    description: '',
    amount: '',
    date: '',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleAddDiaryEntry = () => {
    if (newDiaryEntry.date && newDiaryEntry.hours) {
      addDiaryEntry({
        date: newDiaryEntry.date,
        hours: parseFloat(newDiaryEntry.hours),
        description: newDiaryEntry.description,
      });
      setNewDiaryEntry({ date: '', hours: '', description: '' });
    }
  };

  const handleAddExpense = () => {
    if (newExpense.category && newExpense.amount && newExpense.date) {
      addExpense({
        category: newExpense.category as WfhExpenseCategory,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date,
      });
      setNewExpense({ category: '', description: '', amount: '', date: '' });
    }
  };

  const handleExport = () => {
    const summary = exportSummary();
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WFH-Deductions-${taxYear}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMethodIcon = (method: WfhMethod) => {
    switch (method) {
      case 'fixed':
        return <Clock className="h-5 w-5" />;
      case 'shortcut':
        return <Zap className="h-5 w-5" />;
      case 'actual':
        return <Calculator className="h-5 w-5" />;
    }
  };

  const getMethodColor = (method: WfhMethod) => {
    switch (method) {
      case 'fixed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'shortcut':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'actual':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Work From Home Expenses</h1>
            <p className="text-muted-foreground">
              Calculate your WFH deductions using the optimal ATO method for {taxYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={resetWorkpaper}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={saveWorkpaper} disabled={!isValid}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Please fix the following issues</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2">
                {validationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Smart Recommendation Banner */}
        {comparison && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Smart Recommendation</CardTitle>
              </div>
              <CardDescription>{comparison.explanation}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {comparison.comparison.map((item) => (
                  <div
                    key={item.method}
                    className={`p-3 rounded-lg border ${
                      item.method === comparison.recommended
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getMethodIcon(item.method)}
                      <span className="font-medium capitalize">{item.method}</span>
                      {item.method === comparison.recommended && (
                        <Badge variant="default" className="text-xs">Best</Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(item.amount)}</div>
                    {item.difference > 0 && (
                      <div className="text-xs text-muted-foreground">
                        -{formatCurrency(item.difference)} vs best
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={() => setShowComparison(!showComparison)}
              >
                {showComparison ? 'Hide Details' : 'View Comparison Details'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="setup" className="gap-2">
              <Home className="h-4 w-4" />
              Work Area
            </TabsTrigger>
            <TabsTrigger value="hours" className="gap-2">
              <Clock className="h-4 w-4" />
              Hours
            </TabsTrigger>
            <TabsTrigger value="methods" className="gap-2">
              <Calculator className="h-4 w-4" />
              Methods
            </TabsTrigger>
            <TabsTrigger value="actual" className="gap-2">
              <Receipt className="h-4 w-4" />
              Actual Costs
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <FileText className="h-4 w-4" />
              Summary
            </TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Work Area Setup
                </CardTitle>
                <CardDescription>
                  Define your work from home space. This affects which methods you can use.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Work Area Type */}
                <div className="space-y-3">
                  <Label>What type of space do you work in?</Label>
                  <RadioGroup
                    value={workpaper.workArea.type}
                    onValueChange={(v) => setWorkAreaType(v as typeof workpaper.workArea.type)}
                    className="grid grid-cols-3 gap-4"
                  >
                    {Object.entries(WORK_AREA_TYPES).map(([key, { label, description }]) => (
                      <div key={key}>
                        <RadioGroupItem
                          value={key}
                          id={`area-${key}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`area-${key}`}
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <MapPin className="h-6 w-6 mb-2" />
                          <div className="text-center">
                            <div className="font-medium">{label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{description}</div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Floor Area (needed for actual method) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="work-area-sqm">Work Area (m²)</Label>
                    <Input
                      id="work-area-sqm"
                      type="number"
                      placeholder="e.g., 12"
                      value={workpaper.workArea.floorAreaSqm || ''}
                      onChange={(e) =>
                        setFloorArea(
                          parseFloat(e.target.value) || 0,
                          workpaper.workArea.totalHomeAreaSqm || 0
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total-home-sqm">Total Home Area (m²)</Label>
                    <Input
                      id="total-home-sqm"
                      type="number"
                      placeholder="e.g., 120"
                      value={workpaper.workArea.totalHomeAreaSqm || ''}
                      onChange={(e) =>
                        setFloorArea(
                          workpaper.workArea.floorAreaSqm || 0,
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>

                {workpaper.workArea.floorAreaSqm && workpaper.workArea.totalHomeAreaSqm && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Your work area represents{' '}
                      <strong>
                        {Math.round(
                          (workpaper.workArea.floorAreaSqm / workpaper.workArea.totalHomeAreaSqm) *
                            100
                        )}
                        %
                      </strong>{' '}
                      of your total home floor area.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="area-description">Description (optional)</Label>
                  <Textarea
                    id="area-description"
                    placeholder="e.g., Dedicated home office with desk, chair, and computer setup"
                    value={workpaper.workArea.description || ''}
                    onChange={(e) => setWorkAreaDescription(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hours Tab */}
          <TabsContent value="hours" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Hours Worked from Home
                </CardTitle>
                <CardDescription>
                  Record the hours you worked from home. The ATO requires a 4-week representative
                  diary or timesheet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Entry */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium">Quick Calculation (Recommended)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="regular-hours">Average Hours per Week</Label>
                      <Input
                        id="regular-hours"
                        type="number"
                        placeholder="e.g., 40"
                        value={workpaper.hoursWorked.regularHours || ''}
                        onChange={(e) => setRegularHours(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Hours for Year (approx)</Label>
                      <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center font-mono">
                        {workpaper.hoursWorked.totalHoursForYear}
                      </div>
                      <p className="text-xs text-muted-foreground">Based on 48 working weeks</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Diary Entry */}
                <div className="space-y-4">
                  <h4 className="font-medium">Detailed Diary (ATO-compliant)</h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Input
                        type="date"
                        placeholder="Date"
                        value={newDiaryEntry.date}
                        onChange={(e) =>
                          setNewDiaryEntry({ ...newDiaryEntry, date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Hours"
                        value={newDiaryEntry.hours}
                        onChange={(e) =>
                          setNewDiaryEntry({ ...newDiaryEntry, hours: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <Input
                        placeholder="Description (optional)"
                        value={newDiaryEntry.description}
                        onChange={(e) =>
                          setNewDiaryEntry({ ...newDiaryEntry, description: e.target.value })
                        }
                      />
                      <Button onClick={handleAddDiaryEntry} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {workpaper.hoursWorked.diaryRecords.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workpaper.hoursWorked.diaryRecords.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{entry.date}</TableCell>
                            <TableCell>{entry.hours}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {entry.description || '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDiaryEntry(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell>Total</TableCell>
                          <TableCell>{totalHoursFromDiary}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Methods Tab */}
          <TabsContent value="methods" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Fixed Rate Method */}
              <Card
                className={`cursor-pointer transition-all ${
                  workpaper.selectedMethod === 'fixed'
                    ? 'ring-2 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedMethod('fixed')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getMethodColor('fixed')}>Popular</Badge>
                    {workpaper.selectedMethod === 'fixed' && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2">Fixed Rate</CardTitle>
                  <CardDescription>{WFH_RATES.fixed.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(WFH_RATES.fixed.ratePerHour)}
                    </div>
                    <div className="text-sm text-muted-foreground">per hour</div>
                  </div>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Simple record keeping</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Plus separate phone, internet, depreciation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Best for most people</span>
                    </li>
                  </ul>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your deduction:</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(potentialDeductions.fixed)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Shortcut Method */}
              <Card
                className={`cursor-pointer transition-all ${
                  workpaper.selectedMethod === 'shortcut'
                    ? 'ring-2 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedMethod('shortcut')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getMethodColor('shortcut')}>Simplest</Badge>
                    {workpaper.selectedMethod === 'shortcut' && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2">Shortcut</CardTitle>
                  <CardDescription>{WFH_RATES.shortcut.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(WFH_RATES.shortcut.ratePerHour)}
                    </div>
                    <div className="text-sm text-muted-foreground">per hour</div>
                  </div>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>All-inclusive rate</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>No additional expense tracking needed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-amber-500 mt-0.5" />
                      <span>Covers everything - no extras</span>
                    </li>
                  </ul>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your deduction:</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(potentialDeductions.shortcut)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Actual Cost Method */}
              <Card
                className={`cursor-pointer transition-all ${
                  workpaper.selectedMethod === 'actual'
                    ? 'ring-2 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedMethod('actual')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getMethodColor('actual')}>Maximum</Badge>
                    {workpaper.selectedMethod === 'actual' && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2">Actual Cost</CardTitle>
                  <CardDescription>{WFH_RATES.actual.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(potentialDeductions.actual)}
                    </div>
                    <div className="text-sm text-muted-foreground">based on your expenses</div>
                  </div>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Highest potential deduction</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Claim actual expenses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                      <span>Requires detailed records</span>
                    </li>
                  </ul>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your deduction:</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(potentialDeductions.actual)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Expenses for Fixed Method */}
            {workpaper.selectedMethod === 'fixed' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Expenses (Fixed Rate)</CardTitle>
                  <CardDescription>
                    With the fixed rate method, you can also claim phone, internet, stationery, and
                    depreciation separately.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="additional-expenses">Additional Expenses Amount</Label>
                      <Input
                        id="additional-expenses"
                        type="number"
                        placeholder="e.g., 500"
                        value={workpaper.methods.fixed.additionalExpenses || ''}
                        onChange={(e) =>
                          setAdditionalExpenses(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="pt-6">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total with Fixed Rate</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(workpaper.methods.fixed.totalDeduction)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Actual Costs Tab */}
          <TabsContent value="actual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Actual Cost Method Expenses
                </CardTitle>
                <CardDescription>
                  Add all your work from home expenses for the actual cost method calculation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Expense Form */}
                <div className="grid grid-cols-5 gap-2 p-4 rounded-lg bg-muted/50">
                  <Select
                    value={newExpense.category}
                    onValueChange={(v) => setNewExpense({ ...newExpense, category: v as WfhExpenseCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(WFH_EXPENSE_CATEGORIES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="Date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                  <Button onClick={handleAddExpense}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                {/* Expenses List */}
                {workpaper.methods.actual.expenses.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workpaper.methods.actual.expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              <Badge variant="outline">
                                {WFH_EXPENSE_CATEGORIES[expense.category].label}
                              </Badge>
                            </TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>{expense.date}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(expense.amount)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExpense(expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell colSpan={3}>Total Expenses</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(totalExpenses)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {/* Floor Area Adjustment */}
                    <div className="space-y-4">
                      <Separator />
                      <h4 className="font-medium">Floor Area Adjustment</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Floor Area Percentage</Label>
                          <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center font-mono">
                            {workpaper.methods.actual.floorAreaPercentage}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            From your work area measurements
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="work-related-pct">Work-Related Percentage</Label>
                          <Input
                            id="work-related-pct"
                            type="number"
                            min="0"
                            max="100"
                            value={workpaper.methods.actual.workRelatedPercentage}
                            onChange={(e) =>
                              setActualMethodPercentages(
                                workpaper.methods.actual.floorAreaPercentage,
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            % of time the area is used for work
                          </p>
                        </div>
                      </div>

                      <Alert>
                        <Calculator className="h-4 w-4" />
                        <AlertDescription>
                          Adjusted deduction: {formatCurrency(totalExpenses)} ×{' '}
                          {workpaper.methods.actual.floorAreaPercentage}% ×{' '}
                          {workpaper.methods.actual.workRelatedPercentage}% ={' '}
                          <strong>{formatCurrency(workpaper.methods.actual.totalDeduction)}</strong>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No expenses added yet.</p>
                    <p className="text-sm">
                      Add your home office expenses above to calculate the actual cost method.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Workpaper Summary
                </CardTitle>
                <CardDescription>
                  Review your WFH deduction calculation before saving or exporting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selected Method Summary */}
                {workpaper.selectedMethod && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {getMethodIcon(workpaper.selectedMethod)}
                        <span className="font-semibold capitalize">{workpaper.selectedMethod} Method Selected</span>
                      </div>
                      <Badge variant="default">Selected for Tax Return</Badge>
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2">
                      {formatCurrency(
                        workpaper.methods[workpaper.selectedMethod].totalDeduction
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Based on {workpaper.hoursWorked.totalHoursForYear} hours worked from home
                    </p>
                  </div>
                )}

                {/* All Methods Comparison */}
                <div>
                  <h4 className="font-medium mb-3">All Methods Comparison</h4>
                  <div className="space-y-2">
                    {(['fixed', 'shortcut', 'actual'] as WfhMethod[]).map((method) => (
                      <div
                        key={method}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          workpaper.selectedMethod === method
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {getMethodIcon(method)}
                          <div>
                            <div className="font-medium capitalize">{method} Method</div>
                            <div className="text-xs text-muted-foreground">
                              {WFH_RATES[method].description}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatCurrency(workpaper.methods[method].totalDeduction)}
                          </div>
                          {comparison?.recommended === method && (
                            <Badge variant="secondary" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Details */}
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Work Area:</span>{' '}
                    <span className="font-medium">
                      {WORK_AREA_TYPES[workpaper.workArea.type].label}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hours Worked:</span>{' '}
                    <span className="font-medium">{workpaper.hoursWorked.totalHoursForYear}</span>
                  </div>
                  {workpaper.workArea.floorAreaSqm && (
                    <div>
                      <span className="text-muted-foreground">Floor Area:</span>{' '}
                      <span className="font-medium">
                        {workpaper.workArea.floorAreaSqm}m²
                      </span>
                    </div>
                  )}
                  {workpaper.methods.actual.expenses.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Total Expenses:</span>{' '}
                      <span className="font-medium">{formatCurrency(totalExpenses)}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes or context..."
                    value={workpaper.notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={saveWorkpaper} disabled={!isValid} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save Workpaper
                  </Button>
                  <Button variant="outline" onClick={handleExport} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Export Summary
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
