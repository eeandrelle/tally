/**
 * FrankingRefundEstimator Component
 * 
 * Interactive tool to estimate franking credit refunds based on:
 * - Total franking credits received
 * - User's taxable income
 * - Other income sources
 * 
 * Shows refundable vs non-refundable scenarios and provides
 * guidance on maximizing franking credit benefits.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  Info,
  Wallet,
  PiggyBank,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Download,
} from 'lucide-react';
import {
  calculateFrankingFromDividend,
  calculateTaxImpactForIncome,
  getMarginalTaxRate,
  MARGINAL_TAX_RATES_2025,
  formatCurrency,
} from '@/lib/franking-credits';

interface RefundEstimate {
  // Inputs
  totalDividends: number;
  totalFrankingCredits: number;
  taxableIncome: number;
  otherIncome: number;
  
  // Calculated
  totalTaxableIncome: number;
  marginalRate: number;
  taxOnDividends: number;
  netFrankingBenefit: number;
  refundAmount: number;
  taxPayable: number;
  effectiveTaxRate: number;
  
  // Scenarios
  breakEvenRate: number;
  maxRefundScenario: {
    income: number;
    refund: number;
  };
}

interface FrankingRefundEstimatorProps {
  /** Initial dividend amount */
  initialDividends?: number;
  /** Initial franking credits */
  initialCredits?: number;
  /** User's current taxable income (if known) */
  initialTaxableIncome?: number;
  /** Callback when estimate changes */
  onEstimateChange?: (estimate: RefundEstimate) => void;
}

export function FrankingRefundEstimator({
  initialDividends = 0,
  initialCredits = 0,
  initialTaxableIncome = 50000,
  onEstimateChange,
}: FrankingRefundEstimatorProps) {
  // Input state
  const [totalDividends, setTotalDividends] = useState(initialDividends);
  const [totalFrankingCredits, setTotalFrankingCredits] = useState(initialCredits);
  const [taxableIncome, setTaxableIncome] = useState(initialTaxableIncome);
  const [otherIncome, setOtherIncome] = useState(0);
  const [showScenarios, setShowScenarios] = useState(false);

  // Calculate estimate
  const estimate = useMemo<RefundEstimate>(() => {
    const totalTaxableIncome = taxableIncome + otherIncome + totalDividends + totalFrankingCredits;
    const marginalRate = getMarginalTaxRate(totalTaxableIncome).rate;
    const grossedUpDividends = totalDividends + totalFrankingCredits;
    
    const taxImpact = calculateTaxImpactForIncome(
      grossedUpDividends,
      totalFrankingCredits,
      totalTaxableIncome
    );
    
    const netFrankingBenefit = totalFrankingCredits - taxImpact.taxOnGrossedUp;
    const refundAmount = netFrankingBenefit > 0 ? netFrankingBenefit : 0;
    const taxPayable = netFrankingBenefit < 0 ? Math.abs(netFrankingBenefit) : 0;
    
    // Calculate break-even rate (where refund = 0)
    const breakEvenRate = grossedUpDividends > 0 
      ? (totalFrankingCredits / grossedUpDividends) * 100 
      : 30;
    
    // Find max refund scenario (at 0% tax rate)
    const maxRefundScenario = {
      income: 0,
      refund: totalFrankingCredits,
    };
    
    const result: RefundEstimate = {
      totalDividends,
      totalFrankingCredits,
      taxableIncome,
      otherIncome,
      totalTaxableIncome,
      marginalRate,
      taxOnDividends: taxImpact.taxOnGrossedUp,
      netFrankingBenefit,
      refundAmount,
      taxPayable,
      effectiveTaxRate: taxImpact.effectiveTaxRate,
      breakEvenRate,
      maxRefundScenario,
    };
    
    onEstimateChange?.(result);
    return result;
  }, [totalDividends, totalFrankingCredits, taxableIncome, otherIncome, onEstimateChange]);

  // Quick calculate from dividend input
  const handleDividendChange = (value: number) => {
    setTotalDividends(value);
    // Auto-calculate credits at 100% franked if not manually set
    if (totalFrankingCredits === 0 && value > 0) {
      const calc = calculateFrankingFromDividend(value, 100);
      setTotalFrankingCredits(calc.frankingCredit);
    }
  };

  const reset = () => {
    setTotalDividends(initialDividends);
    setTotalFrankingCredits(initialCredits);
    setTaxableIncome(initialTaxableIncome);
    setOtherIncome(0);
  };

  const exportEstimate = () => {
    const data = {
      estimate,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `franking-estimate-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isRefundable = estimate.refundAmount > 0;
  const isTaxPayable = estimate.taxPayable > 0;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Refund Estimator
                </CardTitle>
                <CardDescription>
                  Calculate your franking credit refund or tax liability
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dividend Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="total-dividends">
                  <Wallet className="h-4 w-4 inline mr-2" />
                  Total Dividends Received
                </Label>
                <span className="text-sm font-medium">
                  {formatCurrency(totalDividends)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[totalDividends]}
                  onValueChange={([v]) => handleDividendChange(v)}
                  min={0}
                  max={50000}
                  step={100}
                  className="flex-1"
                />
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="total-dividends"
                    type="number"
                    min={0}
                    step={100}
                    value={totalDividends || ''}
                    onChange={(e) => handleDividendChange(parseFloat(e.target.value) || 0)}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            {/* Franking Credits Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="total-credits">
                  <PiggyBank className="h-4 w-4 inline mr-2" />
                  Total Franking Credits
                </Label>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(totalFrankingCredits)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[totalFrankingCredits]}
                  onValueChange={([v]) => setTotalFrankingCredits(v)}
                  min={0}
                  max={20000}
                  step={50}
                  className="flex-1"
                />
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="total-credits"
                    type="number"
                    min={0}
                    step={50}
                    value={totalFrankingCredits || ''}
                    onChange={(e) => setTotalFrankingCredits(parseFloat(e.target.value) || 0)}
                    className="pl-7"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically calculated at 100% franked. Adjust if your dividends are partially franked.
              </p>
            </div>

            {/* Taxable Income Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="taxable-income">
                  <Info className="h-4 w-4 inline mr-2" />
                  Your Taxable Income
                </Label>
                <Badge variant="outline">
                  {(estimate.marginalRate * 100).toFixed(0)}% marginal rate
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[taxableIncome]}
                  onValueChange={([v]) => setTaxableIncome(v)}
                  min={0}
                  max={250000}
                  step={1000}
                  className="flex-1"
                />
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="taxable-income"
                    type="number"
                    min={0}
                    step={1000}
                    value={taxableIncome || ''}
                    onChange={(e) => setTaxableIncome(parseFloat(e.target.value) || 0)}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            {/* Other Income (optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="other-income" className="text-muted-foreground">
                  Other Income (Optional)
                </Label>
                <span className="text-sm">
                  {formatCurrency(otherIncome)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[otherIncome]}
                  onValueChange={([v]) => setOtherIncome(v)}
                  min={0}
                  max={100000}
                  step={1000}
                  className="flex-1"
                />
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="other-income"
                    type="number"
                    min={0}
                    step={1000}
                    value={otherIncome || ''}
                    onChange={(e) => setOtherIncome(parseFloat(e.target.value) || 0)}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className={`${isRefundable ? 'border-green-500' : isTaxPayable ? 'border-orange-500' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isRefundable ? (
                <>
                  <TrendingDown className="h-5 w-5 text-green-600" />
                  Refund Estimate
                </>
              ) : isTaxPayable ? (
                <>
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Tax Payable
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Break-Even
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Result */}
            <div className={`text-center p-6 rounded-lg ${
              isRefundable ? 'bg-green-50' : isTaxPayable ? 'bg-orange-50' : 'bg-gray-50'
            }`}>
              <p className="text-sm text-muted-foreground mb-2">
                {isRefundable 
                  ? 'Estimated Refund' 
                  : isTaxPayable 
                  ? 'Additional Tax Due' 
                  : 'No Refund or Tax Due'}
              </p>
              <p className={`text-4xl font-bold ${
                isRefundable ? 'text-green-600' : isTaxPayable ? 'text-orange-600' : 'text-gray-600'
              }`}>
                {formatCurrency(isRefundable ? estimate.refundAmount : estimate.taxPayable)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Effective tax rate on dividends: {estimate.effectiveTaxRate.toFixed(2)}%
              </p>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Tax on Grossed-Up</p>
                <p className="text-xl font-semibold">{formatCurrency(estimate.taxOnDividends)}</p>
                <p className="text-xs text-muted-foreground">
                  @ {(estimate.marginalRate * 100).toFixed(0)}% rate
                </p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Franking Credit Offset</p>
                <p className="text-xl font-semibold text-primary">-{formatCurrency(totalFrankingCredits)}</p>
                <p className="text-xs text-muted-foreground">
                  Tax already paid
                </p>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                How this works
              </h4>
              <p className="text-sm text-muted-foreground">
                {isRefundable 
                  ? `Your marginal tax rate of ${(estimate.marginalRate * 100).toFixed(0)}% is lower than the 30% company tax rate. The difference results in a refund of excess franking credits.`
                  : isTaxPayable
                  ? `Your marginal tax rate of ${(estimate.marginalRate * 100).toFixed(0)}% is higher than the 30% company tax rate. You need to pay the difference between your tax rate and the company rate.`
                  : `Your marginal tax rate of ${(estimate.marginalRate * 100).toFixed(0)}% equals the company tax rate, resulting in no additional tax or refund.`}
              </p>
            </div>

            {/* Tax Bracket Info */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Current Tax Position</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxable Income:</span>
                  <span>{formatCurrency(estimate.taxableIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Income:</span>
                  <span>{formatCurrency(estimate.otherIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grossed-Up Dividends:</span>
                  <span>{formatCurrency(estimate.totalDividends + estimate.totalFrankingCredits)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-medium">Total Taxable Income:</span>
                  <span className="font-medium">{formatCurrency(estimate.totalTaxableIncome)}</span>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <Button variant="outline" className="w-full" onClick={exportEstimate}>
              <Download className="h-4 w-4 mr-2" />
              Export Estimate
            </Button>
          </CardContent>
        </Card>

        {/* Scenarios Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Refund Scenarios</CardTitle>
            <CardDescription>
              See how your refund changes at different income levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MARGINAL_TAX_RATES_2025.map((rate) => {
                const scenarioIncome = rate.minIncome + (rate.maxIncome ? (rate.maxIncome - rate.minIncome) / 2 : 50000);
                const grossedUp = totalDividends + totalFrankingCredits;
                const scenarioImpact = calculateTaxImpactForIncome(
                  grossedUp,
                  totalFrankingCredits,
                  scenarioIncome + grossedUp
                );
                const isScenarioRefundable = scenarioImpact.netTaxPosition < 0;
                const isCurrentBracket = rate.rate === estimate.marginalRate;
                
                return (
                  <div 
                    key={rate.rate} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isCurrentBracket ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'
                    }`}
                  >
                    <div>
                      <p className="font-medium">
                        {(rate.rate * 100).toFixed(0)}% Tax Rate
                        {isCurrentBracket && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{rate.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isScenarioRefundable ? 'text-green-600' : scenarioImpact.netTaxPosition > 0 ? 'text-orange-600' : ''}`}>
                        {isScenarioRefundable 
                          ? `Refund ${formatCurrency(Math.abs(scenarioImpact.netTaxPosition))}`
                          : scenarioImpact.netTaxPosition > 0
                          ? `Pay ${formatCurrency(scenarioImpact.netTaxPosition)}`
                          : 'Break-even'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rate.minIncome === 0 && rate.maxIncome 
                          ? `Up to ${formatCurrency(rate.maxIncome!)}`
                          : rate.maxIncome 
                          ? `${formatCurrency(rate.minIncome)} - ${formatCurrency(rate.maxIncome)}`
                          : `${formatCurrency(rate.minIncome)}+`
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                <strong>Tip:</strong> If you're in a lower tax bracket, you may be eligible for a refund of excess franking credits. 
                Consider consulting a tax professional about strategies to maximize your refund.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

export type { RefundEstimate };
