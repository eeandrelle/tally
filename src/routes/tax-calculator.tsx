import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  TrendingUp, 
  PiggyBank, 
  Scale,
  ChevronLeft,
  Sparkles,
  Info
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTaxCalculator } from '@/hooks/useTaxCalculator';
import { 
  CalculatorForm, 
  TaxBracketChart, 
  SavingsDisplay, 
  ComparisonView 
} from '@/components/tax-calculator';
import { TaxYearSelector } from '@/components/TaxYearSelector';

export const Route = createFileRoute('/tax-calculator')({
  component: TaxCalculatorPage,
});

function TaxCalculatorPage() {
  const calculator = useTaxCalculator();
  const [activeTab, setActiveTab] = useState('calculator');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Tax Savings Calculator</h1>
            </div>
          </div>
          <TaxYearSelector />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Quick Stats */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Taxable Income</p>
                  <p className="text-2xl font-bold">{calculator.formatCurrency(calculator.taxableIncome)}</p>
                </div>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Marginal Rate</span>
                    <span className="font-medium">{calculator.formatPercent(calculator.marginalRate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Deductions</span>
                    <span className="font-medium text-green-600">
                      {calculator.formatCurrency(calculator.totalDeductions)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Tax</span>
                    <span className="font-medium">
                      {calculator.formatCurrency(calculator.taxResult.totalTax)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <p className="text-muted-foreground">
                    Add deductions to see how they reduce your taxable income
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <p className="text-muted-foreground">
                    Compare immediate vs depreciation methods for assets over $300
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <p className="text-muted-foreground">
                    Check the Brackets tab to see your marginal tax rate
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="calculator" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span className="hidden sm:inline">Calculator</span>
                </TabsTrigger>
                <TabsTrigger value="brackets" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Brackets</span>
                </TabsTrigger>
                <TabsTrigger value="savings" className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  <span className="hidden sm:inline">Savings</span>
                </TabsTrigger>
                <TabsTrigger value="comparison" className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  <span className="hidden sm:inline">Compare</span>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="calculator" className="mt-0">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <CalculatorForm calculator={calculator} />
                    <div className="space-y-6">
                      {/* Preview Summary */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Tax Summary Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg bg-muted p-3">
                              <p className="text-xs text-muted-foreground">Gross Income</p>
                              <p className="text-lg font-semibold">
                                {calculator.formatCurrency(calculator.currentScenario.taxableIncome)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-muted p-3">
                              <p className="text-xs text-muted-foreground">After Deductions</p>
                              <p className="text-lg font-semibold">
                                {calculator.formatCurrency(calculator.taxableIncome)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-muted p-3">
                              <p className="text-xs text-muted-foreground">Tax Payable</p>
                              <p className="text-lg font-semibold">
                                {calculator.formatCurrency(calculator.taxResult.taxPayable)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-muted p-3">
                              <p className="text-xs text-muted-foreground">Take Home</p>
                              <p className="text-lg font-semibold text-green-600">
                                {calculator.formatCurrency(calculator.taxableIncome - calculator.taxResult.totalTax)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* What If Section */}
                      {calculator.totalDeductions > 0 && (
                        <Card className="bg-gradient-to-br from-green-500/5 to-green-600/5 border-green-500/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <PiggyBank className="h-5 w-5 text-green-500" />
                              Your Potential Savings
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground mb-2">
                                With {calculator.formatCurrency(calculator.totalDeductions)} in deductions
                              </p>
                              <p className="text-3xl font-bold text-green-600">
                                {calculator.comparison 
                                  ? calculator.formatCurrency(calculator.comparison.savingsBreakdown.totalSavings)
                                  : calculator.formatCurrency(calculator.getSavingsForDeduction(calculator.totalDeductions).totalSavings)
                                }
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                estimated tax savings
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="brackets" className="mt-0">
                  <TaxBracketChart calculator={calculator} />
                </TabsContent>

                <TabsContent value="savings" className="mt-0">
                  <SavingsDisplay calculator={calculator} />
                </TabsContent>

                <TabsContent value="comparison" className="mt-0">
                  <ComparisonView calculator={calculator} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
