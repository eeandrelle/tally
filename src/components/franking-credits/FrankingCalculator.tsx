/**
 * FrankingCalculator Component
 * 
 * Main calculator component with input and real-time results
 */

import { useState } from 'react';
import { Calculator, Info, RotateCcw, DollarSign, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useFrankingCalculator, formatCurrency } from '@/hooks/useFrankingCredits';
import { TaxImpactDisplay } from './TaxImpactDisplay';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FrankingCalculatorProps {
  onCalculate?: (result: {
    dividendAmount: number;
    frankingPercentage: number;
    frankingCredit: number;
    grossedUpDividend: number;
  }) => void;
}

export function FrankingCalculator({ onCalculate }: FrankingCalculatorProps) {
  const {
    dividendAmount,
    frankingPercentage,
    setDividendAmount,
    setFrankingPercentage,
    calculation,
    reset,
    isValid,
  } = useFrankingCalculator();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleDividendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setDividendAmount(isNaN(value) ? 0 : value);
  };

  const handlePercentageChange = (values: number[]) => {
    setFrankingPercentage(values[0]);
  };

  const handlePercentageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setFrankingPercentage(isNaN(value) ? 0 : Math.min(100, Math.max(0, value)));
  };

  const handleSaveResult = () => {
    if (onCalculate && isValid) {
      onCalculate({
        dividendAmount: calculation.dividendAmount,
        frankingPercentage: calculation.frankingPercentage,
        frankingCredit: calculation.frankingCredit,
        grossedUpDividend: calculation.grossedUpDividend,
      });
    }
  };

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
                  Franking Credit Calculator
                </CardTitle>
                <CardDescription>
                  Calculate franking credits and grossed-up dividends
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dividend Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dividend-amount" className="text-base">
                  Dividend Amount
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      The cash dividend amount you received from the company.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dividend-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={dividendAmount || ''}
                  onChange={handleDividendChange}
                  className="pl-10 text-lg"
                />
              </div>
            </div>

            {/* Franking Percentage Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="franking-percentage" className="text-base">
                  Franking Percentage
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      The percentage of the dividend that has been franked. 
                      100% = fully franked, 0% = unfranked.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex items-center gap-4">
                <Slider
                  id="franking-percentage-slider"
                  value={[frankingPercentage]}
                  onValueChange={handlePercentageChange}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <div className="relative w-24">
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="franking-percentage"
                    type="number"
                    min={0}
                    max={100}
                    value={frankingPercentage}
                    onChange={handlePercentageInputChange}
                    className="pr-10 text-right"
                  />
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Unfranked (0%)</span>
                <span className="font-medium text-foreground">
                  {frankingPercentage.toFixed(0)}% franked
                </span>
                <span>Fully Franked (100%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Calculation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Franked Amount */}
              <div className="bg-background rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Franked Portion</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(calculation.frankedAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((calculation.frankedAmount / (calculation.dividendAmount || 1)) * 100).toFixed(1)}% of dividend
                </p>
              </div>

              {/* Unfranked Amount */}
              <div className="bg-background rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Unfranked Portion</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculation.unfrankedAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((calculation.unfrankedAmount / (calculation.dividendAmount || 1)) * 100).toFixed(1)}% of dividend
                </p>
              </div>

              {/* Franking Credit */}
              <div className="bg-background rounded-lg p-4 border-2 border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Franking Credit</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(calculation.frankingCredit)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tax already paid by company
                </p>
              </div>
            </div>

            {/* Grossed-Up Dividend */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Grossed-Up Dividend</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(calculation.grossedUpDividend)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Amount to declare in tax return
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">
                    {formatCurrency(calculation.dividendAmount)} dividend
                  </p>
                  <p className="text-muted-foreground">+</p>
                  <p className="text-primary">
                    {formatCurrency(calculation.frankingCredit)} credit
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            {onCalculate && (
              <Button 
                onClick={handleSaveResult} 
                disabled={!isValid || calculation.dividendAmount <= 0}
                className="w-full"
              >
                Save to Dividend Entries
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Tax Impact Section */}
        <TaxImpactDisplay
          grossedUpDividend={calculation.grossedUpDividend}
          frankingCredit={calculation.frankingCredit}
          showAllRates={showAdvanced}
          onToggleView={() => setShowAdvanced(!showAdvanced)}
        />

        {/* Formula Reference */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">ATO Calculation Formula (2024-2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Franking Credit</strong> = (Franked Amount × 0.30) ÷ 0.70
              </p>
              <p>
                <strong>Grossed-Up Dividend</strong> = Dividend + Franking Credit
              </p>
              <p className="text-xs pt-2">
                Based on 30% company tax rate. The franking credit represents tax already paid by the company on your behalf.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
