import { useState, useEffect } from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle,
  Download,
  GraduationCap,
  HelpCircle,
  Info,
  Laptop,
  MapPin,
  Plus,
  Receipt,
  Save,
  Trash2,
  AlertCircle,
  FileText,
  Car,
  Wifi,
  MoreHorizontal,
  RotateCcw,
  ArrowRight,
  DollarSign,
  Clock,
  Award,
  Building2,
  Calendar,
  TrendingUp,
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
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useSelfEducation } from '@/hooks/useSelfEducation';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  EDUCATION_EXPENSE_TYPES,
  COURSE_TYPES,
  STUDY_MODES,
  ATO_GUIDANCE,
  generateD4WorkpaperSummary,
  type EducationExpenseType,
  type CourseType,
  type StudyMode,
} from '@/lib/self-education-expenses';

const EXPENSE_ICONS: Record<EducationExpenseType, React.ReactNode> = {
  course_fees: <GraduationCap className="h-4 w-4" />,
  textbooks: <BookOpen className="h-4 w-4" />,
  stationery: <FileText className="h-4 w-4" />,
  travel: <Car className="h-4 w-4" />,
  equipment: <Laptop className="h-4 w-4" />,
  depreciation: <TrendingUp className="h-4 w-4" />,
  internet: <Wifi className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

export default function SelfEducationWorkpaper() {
  const { data, isLoading, addCourse, updateCourse, removeCourse, addExpense, updateExpense, removeExpense, addAsset, updateAsset, removeAsset, calculateAssetDepreciation, reset } = useSelfEducation(2024);
  const [activeTab, setActiveTab] = useState('courses');
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<string | null>(null);

  // Form states
  const [courseForm, setCourseForm] = useState({
    name: '',
    provider: '',
    courseType: 'tertiary_degree' as CourseType,
    studyMode: 'part_time' as StudyMode,
    startDate: '',
    endDate: '',
    isWorkRelated: true,
    leadsToQualification: true,
    maintainsImprovesSkills: true,
    resultsInIncomeIncrease: false,
  });

  const [expenseForm, setExpenseForm] = useState({
    type: 'course_fees' as EducationExpenseType,
    description: '',
    amount: '',
    date: '',
    courseName: '',
    provider: '',
    workRelatedPercentage: '100',
    isApportioned: false,
    privateUsePercentage: '0',
  });

  const [assetForm, setAssetForm] = useState({
    name: '',
    cost: '',
    purchaseDate: '',
    effectiveLifeYears: '4',
    businessUsePercentage: '100',
    method: 'diminishing_value' as 'diminishing_value' | 'prime_cost',
  });

  const summary = generateD4WorkpaperSummary(data);

  const handleAddCourse = () => {
    addCourse({
      ...courseForm,
      startDate: courseForm.startDate || new Date().toISOString().split('T')[0],
    });
    setCourseForm({
      name: '',
      provider: '',
      courseType: 'tertiary_degree',
      studyMode: 'part_time',
      startDate: '',
      endDate: '',
      isWorkRelated: true,
      leadsToQualification: true,
      maintainsImprovesSkills: true,
      resultsInIncomeIncrease: false,
    });
    setShowCourseDialog(false);
  };

  const handleAddExpense = () => {
    addExpense({
      type: expenseForm.type,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount) || 0,
      date: expenseForm.date || new Date().toISOString().split('T')[0],
      courseName: expenseForm.courseName,
      provider: expenseForm.provider,
      workRelatedPercentage: parseFloat(expenseForm.workRelatedPercentage) || 100,
      isApportioned: expenseForm.isApportioned,
      privateUsePercentage: expenseForm.isApportioned ? (parseFloat(expenseForm.privateUsePercentage) || 0) : 0,
    });
    setExpenseForm({
      type: 'course_fees',
      description: '',
      amount: '',
      date: '',
      courseName: '',
      provider: '',
      workRelatedPercentage: '100',
      isApportioned: false,
      privateUsePercentage: '0',
    });
    setShowExpenseDialog(false);
  };

  const handleAddAsset = () => {
    addAsset({
      name: assetForm.name,
      cost: parseFloat(assetForm.cost) || 0,
      purchaseDate: assetForm.purchaseDate || new Date().toISOString().split('T')[0],
      effectiveLifeYears: parseFloat(assetForm.effectiveLifeYears) || 4,
      businessUsePercentage: parseFloat(assetForm.businessUsePercentage) || 100,
      method: assetForm.method,
    });
    setAssetForm({
      name: '',
      cost: '',
      purchaseDate: '',
      effectiveLifeYears: '4',
      businessUsePercentage: '100',
      method: 'diminishing_value',
    });
    setShowAssetDialog(false);
  };

  const handleExport = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `D4-self-education-${data.taxYear}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{ATO_GUIDANCE.title}</h1>
          <p className="text-muted-foreground mt-2">{ATO_GUIDANCE.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Eligibility Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Eligibility Requirements</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2 space-y-1">
            {ATO_GUIDANCE.eligibleIf.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Courses</CardDescription>
            <CardTitle className="text-3xl">{summary.courseCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(summary.totalExpenses)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>$250 Reduction</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(summary.taxableIncomeReduction)}</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>D4 Deduction</CardDescription>
            <CardTitle className="text-3xl text-primary">{formatCurrency(summary.deductibleAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="assets">Depreciating Assets</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Your Courses</h2>
            <Button onClick={() => setShowCourseDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          </div>

          {data.courses.length === 0 ? (
            <Card className="p-8 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses added yet</h3>
              <p className="text-muted-foreground mb-4">Add your first course to start tracking self-education expenses</p>
              <Button onClick={() => setShowCourseDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Course
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.courses.map((course) => (
                <Card key={course.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{course.name}</CardTitle>
                        <CardDescription>{course.provider}</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCourse(course.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(course.startDate)}</span>
                      {course.endDate && <span>→ {formatDate(course.endDate)}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary">
                        {COURSE_TYPES.find(t => t.value === course.courseType)?.label}
                      </Badge>
                      <Badge variant="outline">
                        {STUDY_MODES.find(m => m.value === course.studyMode)?.label}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1">
                      {course.isWorkRelated && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          <span>Work-related</span>
                        </div>
                      )}
                      {course.maintainsImprovesSkills && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          <span>Maintains/improves skills</span>
                        </div>
                      )}
                      {course.resultsInIncomeIncrease && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          <span>Likely to increase income</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Education Expenses</h2>
            <Button onClick={() => setShowExpenseDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>

          {data.expenses.length === 0 ? (
            <Card className="p-8 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No expenses recorded</h3>
              <p className="text-muted-foreground mb-4">Add course fees, textbooks, and other self-education costs</p>
              <Button onClick={() => setShowExpenseDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Work %</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {EXPENSE_ICONS[expense.type]}
                            <span className="text-sm">
                              {EDUCATION_EXPENSE_TYPES.find(t => t.value === expense.type)?.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            {expense.courseName && (
                              <p className="text-xs text-muted-foreground">{expense.courseName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell className="text-right">{expense.workRelatedPercentage || 100}%</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}

          {/* Expense Type Summary */}
          {data.expenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {EDUCATION_EXPENSE_TYPES.map((type) => {
                    const amount = summary.expensesByType[type.value] || 0;
                    if (amount === 0) return null;
                    return (
                      <div key={type.value} className="flex items-center gap-2">
                        {EXPENSE_ICONS[type.value]}
                        <div>
                          <p className="text-sm font-medium">{type.label}</p>
                          <p className="text-lg font-semibold">{formatCurrency(amount)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Depreciating Assets</h2>
              <p className="text-sm text-muted-foreground">Equipment costing more than $300 used for study</p>
            </div>
            <Button onClick={() => setShowAssetDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>

          {data.depreciatingAssets.length === 0 ? (
            <Card className="p-8 text-center">
              <Laptop className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No depreciating assets</h3>
              <p className="text-muted-foreground mb-4">Add computers, tablets, or other equipment over $300</p>
              <Button onClick={() => setShowAssetDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {data.depreciatingAssets.map((asset) => (
                <Card key={asset.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{asset.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Purchased {formatDate(asset.purchaseDate)} • ${asset.cost}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => calculateAssetDepreciation(asset.id)}
                        >
                          <Calculator className="mr-2 h-4 w-4" />
                          Calculate
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAsset(asset.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Effective Life</p>
                        <p className="font-medium">{asset.effectiveLifeYears} years</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Business Use</p>
                        <p className="font-medium">{asset.businessUsePercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Method</p>
                        <p className="font-medium capitalize">{asset.method.replace('_', ' ')}</p>
                      </div>
                      {asset.declineInValue !== undefined && (
                        <div>
                          <p className="text-sm text-muted-foreground">Decline in Value</p>
                          <p className="font-medium text-primary">{formatCurrency(asset.declineInValue)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>D4 Self-Education Deduction Summary</CardTitle>
              <CardDescription>For tax year {data.taxYear}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calculation Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between py-2">
                  <span>Total Education Expenses</span>
                  <span className="font-medium">{formatCurrency(summary.totalExpenses)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span>Depreciation on Assets</span>
                  <span className="font-medium">{formatCurrency(summary.totalDepreciation)}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-2">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(summary.totalExpenses + summary.totalDepreciation)}</span>
                </div>
                <div className="flex justify-between py-2 text-amber-600">
                  <span>Less: $250 Reduction</span>
                  <span className="font-medium">-{formatCurrency(summary.taxableIncomeReduction)}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-3 text-lg font-semibold">
                  <span>D4 Deductible Amount</span>
                  <span className="text-primary">{formatCurrency(summary.deductibleAmount)}</span>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This amount should be entered at Item D4 on your tax return. Keep all receipts and records for at least 5 years.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Eligibility Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Eligibility Checklist</CardTitle>
              <CardDescription>Ensure your self-education meets ATO requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.courses.map((course) => (
                  <div key={course.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="mt-0.5">
                      {course.isWorkRelated && course.maintainsImprovesSkills ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{course.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span>Work-related: {course.isWorkRelated ? 'Yes' : 'No'}</span>
                        <span>Improves skills: {course.maintainsImprovesSkills ? 'Yes' : 'No'}</span>
                        <span>Income increase: {course.resultsInIncomeIncrease ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About Self-Education Expenses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">You can claim if:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {ATO_GUIDANCE.eligibleIf.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">You cannot claim if:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {ATO_GUIDANCE.notEligibleIf.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">The $250 Reduction</h3>
                <p className="text-muted-foreground">
                  Self-education expenses are reduced by $250. However, some expenses (like travel) don't count toward this reduction but can still be deducted. This workpaper automatically calculates the correct reduction.
                </p>
              </div>

              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  For more information, visit the{' '}
                  <a
                    href={ATO_GUIDANCE.reference}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ATO website
                  </a>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Course Dialog */}
      <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Course</DialogTitle>
            <DialogDescription>Enter details about your self-education course</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Course Name</Label>
              <Input
                placeholder="e.g., Bachelor of Business Administration"
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Provider</Label>
              <Input
                placeholder="e.g., University of Sydney"
                value={courseForm.provider}
                onChange={(e) => setCourseForm({ ...courseForm, provider: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Course Type</Label>
                <Select
                  value={courseForm.courseType}
                  onValueChange={(v) => setCourseForm({ ...courseForm, courseType: v as CourseType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Study Mode</Label>
                <Select
                  value={courseForm.studyMode}
                  onValueChange={(v) => setCourseForm({ ...courseForm, studyMode: v as StudyMode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDY_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={courseForm.startDate}
                  onChange={(e) => setCourseForm({ ...courseForm, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={courseForm.endDate}
                  onChange={(e) => setCourseForm({ ...courseForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Work-related study</Label>
                <Switch
                  checked={courseForm.isWorkRelated}
                  onCheckedChange={(v) => setCourseForm({ ...courseForm, isWorkRelated: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Maintains or improves skills</Label>
                <Switch
                  checked={courseForm.maintainsImprovesSkills}
                  onCheckedChange={(v) => setCourseForm({ ...courseForm, maintainsImprovesSkills: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Likely to increase income</Label>
                <Switch
                  checked={courseForm.resultsInIncomeIncrease}
                  onCheckedChange={(v) => setCourseForm({ ...courseForm, resultsInIncomeIncrease: v })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCourseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCourse} disabled={!courseForm.name}>
              Add Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Record a self-education expense</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Expense Type</Label>
              <Select
                value={expenseForm.type}
                onValueChange={(v) => setExpenseForm({ ...expenseForm, type: v as EducationExpenseType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {EXPENSE_ICONS[type.value]}
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {EDUCATION_EXPENSE_TYPES.find(t => t.value === expenseForm.type)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Semester 1 tuition fees"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Course Name (optional)</Label>
              <Input
                placeholder="e.g., MBA Program"
                value={expenseForm.courseName}
                onChange={(e) => setExpenseForm({ ...expenseForm, courseName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Work-Related Percentage</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={expenseForm.workRelatedPercentage}
                  onChange={(e) => setExpenseForm({ ...expenseForm, workRelatedPercentage: e.target.value })}
                  className="w-24"
                />
                <span>%</span>
              </div>
            </div>

            {EDUCATION_EXPENSE_TYPES.find(t => t.value === expenseForm.type)?.requiresApportionment && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">Apportion for private use</Label>
                  <Switch
                    checked={expenseForm.isApportioned}
                    onCheckedChange={(v) => setExpenseForm({ ...expenseForm, isApportioned: v })}
                  />
                </div>

                {expenseForm.isApportioned && (
                  <div className="space-y-2">
                    <Label>Private Use Percentage</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={expenseForm.privateUsePercentage}
                        onChange={(e) => setExpenseForm({ ...expenseForm, privateUsePercentage: e.target.value })}
                        className="w-24"
                      />
                      <span>%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Percentage of private/non-study use
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={!expenseForm.description || !expenseForm.amount}>
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Depreciating Asset</DialogTitle>
            <DialogDescription>Add equipment costing more than $300 used for study</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input
                placeholder="e.g., MacBook Pro"
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={assetForm.cost}
                  onChange={(e) => setAssetForm({ ...assetForm, cost: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={assetForm.purchaseDate}
                  onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective Life (years)</Label>
                <Select
                  value={assetForm.effectiveLifeYears}
                  onValueChange={(v) => setAssetForm({ ...assetForm, effectiveLifeYears: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 years (phones, tablets)</SelectItem>
                    <SelectItem value="3">3 years (laptops)</SelectItem>
                    <SelectItem value="4">4 years (computers)</SelectItem>
                    <SelectItem value="5">5 years (furniture)</SelectItem>
                    <SelectItem value="10">10 years (major equipment)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Business Use %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={assetForm.businessUsePercentage}
                  onChange={(e) => setAssetForm({ ...assetForm, businessUsePercentage: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Depreciation Method</Label>
              <Select
                value={assetForm.method}
                onValueChange={(v) => setAssetForm({ ...assetForm, method: v as 'diminishing_value' | 'prime_cost' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diminishing_value">Diminishing Value (higher deduction early)</SelectItem>
                  <SelectItem value="prime_cost">Prime Cost (equal deduction each year)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAsset} disabled={!assetForm.name || !assetForm.cost}>
              Add Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
