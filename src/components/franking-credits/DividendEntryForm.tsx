/**
 * DividendEntryForm Component
 * 
 * Form for adding/editing dividend entries with auto-calculation
 */

import { Building2, DollarSign, Percent, Calendar, FileText, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDividendEntryForm } from '@/hooks/useDividendEntry';
import type { DividendEntry } from '@/lib/franking-credits';
import { formatCurrency } from '@/hooks/useFrankingCredits';
import { calculateFrankingFromDividend } from '@/lib/franking-credits';

interface DividendEntryFormProps {
  initialEntry?: DividendEntry;
  taxYear?: string;
  onSubmit: (entry: {
    companyName: string;
    dividendAmount: number;
    frankingPercentage: number;
    dateReceived: string;
    notes?: string;
    taxYear?: string;
  }) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function DividendEntryForm({
  initialEntry,
  taxYear,
  onSubmit,
  onCancel,
  submitLabel = 'Save Entry',
}: DividendEntryFormProps) {
  const {
    values,
    errors,
    isSubmitting,
    setCompanyName,
    setDividendAmount,
    setFrankingPercentage,
    setDateReceived,
    setNotes,
    handleSubmit,
    reset,
    parsedDividendAmount,
    parsedFrankingPercentage,
  } = useDividendEntryForm({
    initialValues: initialEntry
      ? {
          companyName: initialEntry.companyName,
          dividendAmount: initialEntry.dividendAmount.toString(),
          frankingPercentage: initialEntry.frankingPercentage.toString(),
          dateReceived: initialEntry.dateReceived,
          notes: initialEntry.notes || '',
        }
      : {
          dateReceived: new Date().toISOString().split('T')[0],
          frankingPercentage: '100',
        },
    onSubmit,
    onSuccess: () => {
      if (!initialEntry) {
        reset();
      }
    },
  });

  // Calculate preview values
  const calculation = calculateFrankingFromDividend(
    parsedDividendAmount,
    parsedFrankingPercentage
  );

  // Handle form submission
  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleSubmit();
    if (!success && onCancel) {
      // Form had errors
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {initialEntry ? 'Edit Dividend Entry' : 'Add Dividend Entry'}
            </CardTitle>
            <CardDescription>
              {initialEntry 
                ? 'Update the dividend entry details below' 
                : 'Enter dividend details to calculate franking credits automatically'}
            </CardDescription>
          </div>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onFormSubmit} className="space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company-name">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="company-name"
                placeholder="e.g., Commonwealth Bank of Australia"
                value={values.companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="pl-10"
              />
            </div>
            {errors.companyName && (
              <p className="text-sm text-red-500">{errors.companyName}</p>
            )}
          </div>

          {/* Dividend Amount */}
          <div className="space-y-2">
            <Label htmlFor="dividend-amount">
              Dividend Amount <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="dividend-amount"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={values.dividendAmount}
                onChange={(e) => setDividendAmount(e.target.value)}
                className="pl-10"
              />
            </div>
            {errors.dividendAmount && (
              <p className="text-sm text-red-500">{errors.dividendAmount}</p>
            )}
          </div>

          {/* Franking Percentage */}
          <div className="space-y-4">
            <Label htmlFor="franking-percentage">
              Franking Percentage <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[parsedFrankingPercentage]}
                onValueChange={(vals) => setFrankingPercentage(vals[0].toString())}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <div className="relative w-24">
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={values.frankingPercentage}
                  onChange={(e) => setFrankingPercentage(e.target.value)}
                  className="pr-10 text-right"
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Unfranked</span>
              <span className={parsedFrankingPercentage === 100 ? 'text-green-600 font-medium' : ''}>
                {parsedFrankingPercentage === 100 ? 'Fully Franked' : `${parsedFrankingPercentage.toFixed(0)}% Franked`}
              </span>
            </div>
            {errors.frankingPercentage && (
              <p className="text-sm text-red-500">{errors.frankingPercentage}</p>
            )}
          </div>

          {/* Date Received */}
          <div className="space-y-2">
            <Label htmlFor="date-received">
              Date Received <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="date-received"
                type="date"
                value={values.dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="pl-10"
              />
            </div>
            {errors.dateReceived && (
              <p className="text-sm text-red-500">{errors.dateReceived}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this dividend..."
                value={values.notes}
                onChange={(e) => setNotes(e.target.value)}
                className="pl-10 min-h-[80px]"
              />
            </div>
          </div>

          {/* Real-time Calculation Preview */}
          {parsedDividendAmount > 0 && (
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">Auto-Calculated Values</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Franking Credit</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatCurrency(calculation.frankingCredit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grossed-Up</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(calculation.grossedUpDividend)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Franked Amount</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(calculation.frankedAmount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hidden tax year field */}
          {taxYear && <input type="hidden" name="taxYear" value={taxYear} />}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
