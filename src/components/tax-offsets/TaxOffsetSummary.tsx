import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/tax-offsets';
import type { TaxOffsetSummary, TaxOffsetResult } from '@/lib/tax-offsets';
import { 
  TrendingDown, 
  Receipt, 
  PiggyBank, 
  Info,
  CheckCircle2
} from 'lucide-react';

interface TaxOffsetSummaryProps {
  summary: TaxOffsetSummary;
  showBreakdown?: boolean;
  showFrankingCredits?: boolean;
}

export function TaxOffsetSummaryDisplay({ 
  summary, 
  showBreakdown = true,
  showFrankingCredits = true 
}: TaxOffsetSummaryProps) {
  const totalOffsets = summary.totalOffsets;
  const totalFranking = summary.frankingCredits.totalCredits;
  const grandTotal = totalOffsets + totalFranking;

  const eligibleOffsets = summary.breakdown.filter(o => o.eligibilityMet && o.amount > 0);
  
  return (
    <div className="space-y-4">
      {/* Grand Total Card */}
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <PiggyBank className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Total Tax Savings
              </span>
            </div>
            <div className="text-4xl font-bold text-green-600 mb-2">
              {formatCurrency(grandTotal)}
            </div>
            <p className="text-sm text-muted-foreground">
              From tax offsets and franking credits
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Tax Offsets */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-medium">Tax Offsets</CardTitle>
              </div>
              <Badge variant="secondary">{eligibleOffsets.length} applied</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatCurrency(totalOffsets)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Reduces your tax payable dollar-for-dollar
            </p>
            
            {showBreakdown && eligibleOffsets.length > 0 && (
              <div className="mt-3 space-y-2">
                {eligibleOffsets.map((offset, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{offset.offsetType}</span>
                    <span className="font-medium">{formatCurrency(offset.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Franking Credits */}
        {showFrankingCredits && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-medium">Franking Credits</CardTitle>
                </div>
                <Badge variant="secondary">
                  {summary.frankingCredits.credits.length} dividends
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{formatCurrency(totalFranking)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Refundable if exceeding tax liability
              </p>
              
              {summary.frankingCredits.credits.length > 0 && (
                <div className="mt-3 space-y-2">
                  {summary.frankingCredits.credits.slice(0, 3).map((credit, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[120px]">
                        {credit.companyName}
                      </span>
                      <span className="font-medium">{formatCurrency(credit.frankingCredit)}</span>
                    </div>
                  ))}
                  {summary.frankingCredits.credits.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{summary.frankingCredits.credits.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Eligibility Info */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-sm">How Tax Offsets Work</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tax offsets reduce the amount of tax you pay. Unlike deductions which reduce 
                your taxable income, offsets directly reduce your tax liability. Franking credits 
                represent tax already paid by companies and can result in a refund if they exceed your tax.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offset Details List */}
      {showBreakdown && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            All Offset Calculations
          </h4>
          {summary.breakdown.map((offset, idx) => (
            <OffsetRow key={idx} offset={offset} />
          ))}
        </div>
      )}
    </div>
  );
}

function OffsetRow({ offset }: { offset: TaxOffsetResult }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        {offset.eligibilityMet && offset.amount > 0 ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <div className="h-4 w-4 rounded-full border-2 border-muted" />
        )}
        <div>
          <p className="font-medium text-sm">{offset.description}</p>
          <p className="text-xs text-muted-foreground">{offset.offsetType}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${offset.amount > 0 ? 'text-green-600' : ''}`}>
          {formatCurrency(offset.amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {offset.eligibilityMet ? 'Eligible' : 'Not eligible'}
        </p>
      </div>
    </div>
  );
}

export default TaxOffsetSummaryDisplay;
