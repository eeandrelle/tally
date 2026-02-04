import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileJson,
  Loader2,
  CheckCircle2,
  Building2,
  Briefcase,
  Car,
  Plane,
  Shirt,
  GraduationCap,
  Wallet,
  Heart,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import {
  generateATOPrefill,
  exportToJSON,
  exportToCSV,
  downloadFile,
  type ATOPrefillData,
  formatTaxYear,
} from '@/lib/ato-prefill';
import { useTaxYear } from '@/contexts/TaxYearContext';

interface ATOPrefillExportDialogProps {
  trigger?: React.ReactNode;
}

export function ATOPrefillExportDialog({ trigger }: ATOPrefillExportDialogProps) {
  const { selectedYear } = useTaxYear();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ATOPrefillData | null>(null);
  const [activeTab, setActiveTab] = useState('summary');

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const prefillData = await generateATOPrefill(selectedYear);
      setData(prefillData);
      toast.success('ATO prefill data generated successfully');
    } catch (error) {
      console.error('Failed to generate ATO prefill:', error);
      toast.error('Failed to generate ATO prefill data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (!data) return;
    const json = exportToJSON(data);
    const filename = `tally-ato-prefill-${formatTaxYear(selectedYear)}.json`;
    downloadFile(json, filename, 'application/json');
    toast.success('JSON file downloaded');
  };

  const handleExportCSV = () => {
    if (!data) return;
    const csv = exportToCSV(data);
    const filename = `tally-tax-summary-${formatTaxYear(selectedYear)}.csv`;
    downloadFile(csv, filename, 'text/csv');
    toast.success('CSV file downloaded');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const totalIncome = data ? 
    data.income.salaryWages.total + 
    data.income.interest.total + 
    data.income.dividends.total + 
    data.income.otherIncome.total : 0;

  const taxableIncome = data ? totalIncome - data.deductions.total : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            ATO Pre-fill
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            ATO myTax Pre-fill Export
          </DialogTitle>
          <DialogDescription>
            Generate ATO-compatible tax data for FY {formatTaxYear(selectedYear)}
          </DialogDescription>
        </DialogHeader>

        {!data ? (
          <div className="px-6 pb-6">
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Generate ATO Pre-fill</CardTitle>
                <CardDescription>
                  Create myTax-compatible export with all your income, deductions, and offsets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-muted rounded-lg">
                    <Building2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Income</p>
                    <p className="text-xs text-muted-foreground">Salary, interest, dividends</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <Receipt className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Deductions</p>
                    <p className="text-xs text-muted-foreground">D1-D15 categories</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <Wallet className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Offsets</p>
                    <p className="text-xs text-muted-foreground">Franking credits & more</p>
                  </div>
                </div>
                <Button 
                  onClick={handleGenerate} 
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Pre-fill Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-6 grid w-auto grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="deductions">Deductions</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 px-6 py-4">
                <TabsContent value="summary" className="mt-0 space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Total Income
                        </CardDescription>
                        <CardTitle className="text-2xl text-green-600">
                          {formatCurrency(totalIncome)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Deductions
                        </CardDescription>
                        <CardTitle className="text-2xl text-blue-600">
                          {formatCurrency(data.deductions.total)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Taxable Income</CardDescription>
                        <CardTitle className="text-2xl">
                          {formatCurrency(taxableIncome)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Deduction Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Deduction Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.deductions.d1_carExpenses.total > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              D1 Car Expenses ({data.deductions.d1_carExpenses.items.length} items)
                            </span>
                            <span className="font-medium">
                              {formatCurrency(data.deductions.d1_carExpenses.total)}
                            </span>
                          </div>
                          <Progress 
                            value={(data.deductions.d1_carExpenses.total / data.deductions.total) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                      {data.deductions.d2_travelExpenses.total > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Plane className="h-4 w-4 text-muted-foreground" />
                              D2 Travel Expenses ({data.deductions.d2_travelExpenses.items.length} items)
                            </span>
                            <span className="font-medium">
                              {formatCurrency(data.deductions.d2_travelExpenses.total)}
                            </span>
                          </div>
                          <Progress 
                            value={(data.deductions.d2_travelExpenses.total / data.deductions.total) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                      {data.deductions.d3_clothingExpenses.total > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Shirt className="h-4 w-4 text-muted-foreground" />
                              D3 Clothing & Laundry ({data.deductions.d3_clothingExpenses.items.length} items)
                            </span>
                            <span className="font-medium">
                              {formatCurrency(data.deductions.d3_clothingExpenses.total)}
                            </span>
                          </div>
                          <Progress 
                            value={(data.deductions.d3_clothingExpenses.total / data.deductions.total) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                      {data.deductions.d4_selfEducation.total > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              D4 Self-Education ({data.deductions.d4_selfEducation.items.length} items)
                            </span>
                            <span className="font-medium">
                              {formatCurrency(data.deductions.d4_selfEducation.total)}
                            </span>
                          </div>
                          <Progress 
                            value={(data.deductions.d4_selfEducation.total / data.deductions.total) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                      {data.deductions.d5_otherWorkExpenses.total > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              D5 Other Work Expenses ({data.deductions.d5_otherWorkExpenses.items.length} items)
                            </span>
                            <span className="font-medium">
                              {formatCurrency(data.deductions.d5_otherWorkExpenses.total)}
                            </span>
                          </div>
                          <Progress 
                            value={(data.deductions.d5_otherWorkExpenses.total / data.deductions.total) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                      {data.deductions.d8_donations.total > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-muted-foreground" />
                              D8 Donations ({data.deductions.d8_donations.items.length} items)
                            </span>
                            <span className="font-medium">
                              {formatCurrency(data.deductions.d8_donations.total)}
                            </span>
                          </div>
                          <Progress 
                            value={(data.deductions.d8_donations.total / data.deductions.total) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                      {data.deductions.d9_taxAffairs.total > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-muted-foreground" />
                              D9 Tax Affairs ({data.deductions.d9_taxAffairs.items.length} items)
                            </span>
                            <span className="font-medium">
                              {formatCurrency(data.deductions.d9_taxAffairs.total)}
                            </span>
                          </div>
                          <Progress 
                            value={(data.deductions.d9_taxAffairs.total / data.deductions.total) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tax Offsets */}
                  {data.offsets.total > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Tax Offsets</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between text-sm">
                          <span>T7 Franking Credits</span>
                          <span className="font-medium">
                            {formatCurrency(data.offsets.t7_frankingCredits)}
                          </span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-sm font-medium">
                          <span>Total Offsets</span>
                          <span>{formatCurrency(data.offsets.total)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>
                      Generated {new Date(data.metadata.generatedAt).toLocaleString()} 
                      • {data.metadata.receiptCount} receipts processed
                    </span>
                  </div>
                </TabsContent>

                <TabsContent value="income" className="mt-0 space-y-4">
                  {/* Salary */}
                  {data.income.salaryWages.employers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Salary & Wages
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {data.income.salaryWages.employers.map((employer, idx) => (
                          <div key={idx} className="flex justify-between p-2 bg-muted rounded">
                            <div>
                              <p className="font-medium">{employer.name}</p>
                              <p className="text-xs text-muted-foreground">ABN: {employer.abn || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(employer.grossPayments)}</p>
                              <p className="text-xs text-muted-foreground">
                                Tax withheld: {formatCurrency(employer.taxWithheld)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span>{formatCurrency(data.income.salaryWages.total)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Interest */}
                  {data.income.interest.accounts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Interest Income</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {data.income.interest.accounts.map((account, idx) => (
                          <div key={idx} className="flex justify-between p-2 bg-muted rounded">
                            <div>
                              <p className="font-medium">{account.institution}</p>
                              <p className="text-xs text-muted-foreground">
                                {account.bsb} {account.accountNumber}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(account.grossInterest)}</p>
                              <p className="text-xs text-muted-foreground">
                                Tax withheld: {formatCurrency(account.taxWithheld)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Total Interest</span>
                          <span>{formatCurrency(data.income.interest.total)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Dividends */}
                  {data.income.dividends.holdings.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Dividends</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {data.income.dividends.holdings.map((holding, idx) => (
                          <div key={idx} className="flex justify-between p-2 bg-muted rounded">
                            <div>
                              <p className="font-medium">{holding.companyName}</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                Franked: {formatCurrency(holding.frankedAmount)}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formatCurrency(holding.frankedAmount + holding.unfrankedAmount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Franking credits: {formatCurrency(holding.frankingCredits)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <Separator />
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Franked Amount</span>
                            <span>{formatCurrency(data.income.dividends.frankedAmount)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Unfranked Amount</span>
                            <span>{formatCurrency(data.income.dividends.unfrankedAmount)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Franking Credits</span>
                            <span>{formatCurrency(data.income.dividends.frankingCredits)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-medium">
                            <span>Total Dividends</span>
                            <span>{formatCurrency(data.income.dividends.total)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {totalIncome === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No income recorded for this tax year</p>
                      <p className="text-sm">Add income sources to see them here</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="deductions" className="mt-0 space-y-4">
                  {data.deductions.total === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No deductions recorded</p>
                      <p className="text-sm">Scan receipts to build your deductions</p>
                    </div>
                  ) : (
                    <>
                      {/* Car Expenses */}
                      {data.deductions.d1_carExpenses.items.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge>D1</Badge>
                              Car Expenses
                              <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {formatCurrency(data.deductions.d1_carExpenses.total)}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {data.deductions.d1_carExpenses.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-1">
                                  <span className="truncate">{item.description}</span>
                                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Travel Expenses */}
                      {data.deductions.d2_travelExpenses.items.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge>D2</Badge>
                              Travel Expenses
                              <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {formatCurrency(data.deductions.d2_travelExpenses.total)}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {data.deductions.d2_travelExpenses.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-1">
                                  <span className="truncate">{item.description}</span>
                                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Clothing */}
                      {data.deductions.d3_clothingExpenses.items.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge>D3</Badge>
                              Clothing & Laundry
                              <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {formatCurrency(data.deductions.d3_clothingExpenses.total)}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {data.deductions.d3_clothingExpenses.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-1">
                                  <span className="truncate">{item.description}</span>
                                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Self-Education */}
                      {data.deductions.d4_selfEducation.items.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge>D4</Badge>
                              Self-Education
                              <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {formatCurrency(data.deductions.d4_selfEducation.total)}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {data.deductions.d4_selfEducation.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-1">
                                  <span className="truncate">{item.description}</span>
                                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Other Work Expenses */}
                      {data.deductions.d5_otherWorkExpenses.items.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge>D5</Badge>
                              Other Work Expenses
                              <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {formatCurrency(data.deductions.d5_otherWorkExpenses.total)}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {data.deductions.d5_otherWorkExpenses.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-1">
                                  <span className="truncate">{item.description}</span>
                                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Donations */}
                      {data.deductions.d8_donations.items.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge>D8</Badge>
                              Gifts & Donations
                              <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {formatCurrency(data.deductions.d8_donations.total)}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {data.deductions.d8_donations.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-1">
                                  <span className="truncate">{item.recipient}</span>
                                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Tax Affairs */}
                      {data.deductions.d9_taxAffairs.items.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Badge>D9</Badge>
                              Cost of Managing Tax Affairs
                              <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {formatCurrency(data.deductions.d9_taxAffairs.total)}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {data.deductions.d9_taxAffairs.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-1">
                                  <span className="truncate">{item.description}</span>
                                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="export" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Export Options</CardTitle>
                      <CardDescription>
                        Download your tax data in various formats
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4">
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded">
                            <FileJson className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">JSON Export</h4>
                            <p className="text-sm text-muted-foreground">
                              Complete ATO prefill data in JSON format. Use this for digital import into tax software.
                            </p>
                          </div>
                          <Button onClick={handleExportJSON} variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>

                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded">
                            <FileSpreadsheet className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">CSV Summary</h4>
                            <p className="text-sm text-muted-foreground">
                              Human-readable summary in CSV format. Perfect for reviewing with your accountant.
                            </p>
                          </div>
                          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-amber-800 dark:text-amber-200">Important Notice</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                              This export is generated from your Tally data and is designed to match ATO myTax fields. 
                              Please review all figures carefully before lodging your tax return. Consider consulting 
                              with a registered tax agent for complex situations.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="px-6 py-4 border-t flex justify-between">
              <Button variant="outline" onClick={() => setData(null)}>
                Regenerate
              </Button>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
