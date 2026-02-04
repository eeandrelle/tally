/**
 * TaxImpactDisplay Component
 * 
 * Shows tax impact at different marginal rates
 */

import { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp, Info, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTaxImpact, formatCurrency } from '@/hooks/useFrankingCredits';
import type { TaxImpactResult } from '@/lib/franking-credits';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MARGINAL_TAX_RATES_2025 } from '@/lib/franking-credits';

interface TaxImpactDisplayProps {
  grossedUpDividend: number;
  frankingCredit: number;
  showAllRates?: boolean;
  onToggleView?: () => void;
}

export function TaxImpactDisplay({
  grossedUpDividend,
  frankingCredit,
  showAllRates = false,
  onToggleView,
}: TaxImpactDisplayProps) {
  const [taxableIncome, setTaxableIncome] = useState<string>('');
  const parsedIncome = parseFloat(taxableIncome) || 0;

  const {
    taxImpact,
    allTaxImpacts,
    isRefundable,
    refundAmount,
    taxPayableAmount,
  } = useTaxImpact({
    grossedUpDividend,
    frankingCredit,
    taxableIncome: parsedIncome,
  });

  const hasData = grossedUpDividend > 0;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Tax Impact Calculator
              </CardTitle>
              <CardDescription>
                See how franking credits affect your tax position
              </CardDescription>
            </div>
            {onToggleView && hasData && (
              <Button variant="outline" size="sm" onClick={onToggleView}>
                {showAllRates ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Summary
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show All Rates
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Income Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="taxable-income">
                Your Taxable Income (Optional)
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Enter your estimated taxable income to see your specific tax impact at your marginal rate.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="taxable-income"
                type="number"
                min={0}
                step={1000}
                placeholder="e.g., 75000"
                value={taxableIncome}
                onChange={(e) => setTaxableIncome(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {!hasData ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Enter a dividend amount to see tax impact calculations</p>
            </div>
          ) : showAllRates ? (
            /* All Rates Table */
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Tax Impact at All Marginal Rates</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Tax Rate</th>
                      <th className="text-right py-2 px-2">Tax on Dividend</th>
                      <th className="text-right py-2 px-2">Credit Offset</th>
                      <th className="text-right py-2 px-2">Net Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTaxImpacts.map((impact, index) => (
                      <TaxImpactRow key={index} impact={impact} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : parsedIncome > 0 && taxImpact ? (
            /* User's Specific Tax Impact */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Your Tax Impact</h4>
                <span className="text-xs text-muted-foreground">
                  Marginal Rate: {(taxImpact.marginalRate * 100).toFixed(0)}%
                </span>
              </div>

              {/* Net Position Card */}
              <div className={`rounded-lg p-4 ${isRefundable ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isRefundable ? (
                      <TrendingDown className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-orange-600" />
                    )}
                    <span className={`font-semibold ${isRefundable ? 'text-green-700' : 'text-orange-700'}`}>
                      {isRefundable ? 'Refund Due' : 'Tax Payable'}
                    </span>
                  </div>
                  <span className={`text-2xl font-bold ${isRefundable ? 'text-green-700' : 'text-orange-700'}`}>
                    {formatCurrency(isRefundable ? refundAmount : taxPayableAmount)}
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-muted rounded p-3">
                  <p className="text-muted-foreground">Tax on Grossed-Up</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(taxImpact.taxOnGrossedUp)}
                  </p>
                </div>
                <div className="bg-primary/10 rounded p-3">
                  <p className="text-muted-foreground">Franking Credit Offset</p>
                  <p className="text-lg font-semibold text-primary">
                    -{formatCurrency(taxImpact.frankingCreditOffset)}
                  </p>
                </div>
              </div>

              {/* Effective Rate */}
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Effective tax rate on dividend: {' '}
                  <span className="font-semibold">
                    {taxImpact.effectiveTaxRate.toFixed(2)}%
                  </span>
                </p>
              </div>
            </div>
          ) : (
            /* Summary View */
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Quick Reference</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Refund Scenario</span>
                  </div>
                  <p className="text-xs text-green-600">
                    If your marginal tax rate is less than {(allTaxImpacts.find(i => i.netTaxPosition >= 0)?.marginalRate || 0.3) * 100}%, 
                    you'll receive a refund of excess franking credits.
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">Tax Payable Scenario</span>
                  </div>
                  <p className="text-xs text-orange-600">
                    If your marginal tax rate is more than {(allTaxImpacts.find(i => i.netTaxPosition >= 0)?.marginalRate || 0.3) * 100}%, 
                    you'll need to pay additional tax on the dividend.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Enter your taxable income above to see your specific tax impact
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Individual tax impact row component
function TaxImpactRow({ impact }: { impact: TaxImpactResult }) {
  const isRefundable = impact.netTaxPosition < 0;
  const rateInfo = MARGINAL_TAX_RATES_2025.find(r => r.rate === impact.marginalRate);
  
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <td className="py-2 px-2">
        <div>
          <span className="font-medium">{(impact.marginalRate * 100).toFixed(0)}%</span>
          {rateInfo && (
            <p className="text-xs text-muted-foreground">
              {rateInfo.description}
            </p>
          )}
        </div>
      </td>
      <td className="text-right py-2 px-2">
        {formatCurrency(impact.taxOnGrossedUp)}
      </td>
      <td className="text-right py-2 px-2 text-primary">
        -{formatCurrency(impact.frankingCreditOffset)}
      </td>
      <td className={`text-right py-2 px-2 font-medium ${isRefundable ? 'text-green-600' : impact.netTaxPosition > 0 ? 'text-orange-600' : ''}`}>
        {isRefundable ? '-' : ''}{formatCurrency(Math.abs(impact.netTaxPosition))}
        <span className="text-xs ml-1">
          {isRefundable ? 'refund' : impact.netTaxPosition > 0 ? 'payable' : 'break-even'}
        </span>
      </td>
    </tr>
  );
}
