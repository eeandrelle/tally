import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import type { MethodComparison } from '@/lib/car-expenses';

interface MethodComparisonCardProps {
  comparison: MethodComparison;
}

export function MethodComparisonCard({ comparison }: MethodComparisonCardProps) {
  const { centsPerKm, logbook, recommended, difference, reasoning } = comparison;

  const savingsPercent = centsPerKm.claim > 0 
    ? Math.round((difference / Math.min(centsPerKm.claim, logbook.claim)) * 100)
    : 0;

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Method Comparison
        </CardTitle>
        <CardDescription>
          Compare both methods to see which gives you the better deduction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Side by side comparison */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Cents per km */}
          <div className={`rounded-lg border-2 p-4 ${recommended === 'cents-per-km' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium">Cents per Kilometre</h4>
              {recommended === 'cents-per-km' && (
                <Badge className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Recommended
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Work kilometres</span>
                <span>{centsPerKm.workKilometres.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Claimable</span>
                <span>{Math.min(centsPerKm.workKilometres, centsPerKm.maxKilometres).toLocaleString()} km</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Claim amount</span>
                <span className="text-lg font-bold">${centsPerKm.claim.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Logbook */}
          <div className={`rounded-lg border-2 p-4 ${recommended === 'logbook' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium">Logbook Method</h4>
              {recommended === 'logbook' && (
                <Badge className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Recommended
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total expenses</span>
                <span>${logbook.totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Business use</span>
                <span>{logbook.businessPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Logbook entries</span>
                <span>{logbook.entriesCount} entries</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Claim amount</span>
                <span className="text-lg font-bold">${logbook.claim.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <Alert className={recommended === 'logbook' ? 'bg-green-50' : 'bg-blue-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">
              {recommended === 'logbook' 
                ? `Save an extra $${difference.toFixed(2)} with the logbook method!`
                : `The cents per km method is simpler and better for your situation.`}
            </p>
            <p className="text-sm">{reasoning}</p>
            {savingsPercent > 10 && recommended === 'logbook' && (
              <p className="text-sm font-medium text-green-700">
                That's {savingsPercent}% more than the cents per km method!
              </p>
            )}
          </AlertDescription>
        </Alert>

        {/* Quick tips */}
        <div className="rounded-lg bg-muted p-4">
          <h4 className="mb-2 font-medium">Quick Tips</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {recommended === 'cents-per-km' ? (
              <>
                <li>• The cents per km method is perfect for lower work mileage</li>
                <li>• No need to keep receipts or a logbook - just estimate your work km</li>
                <li>• Remember the 5,000 km cap - if you exceed this, consider the logbook method</li>
              </>
            ) : (
              <>
                <li>• The logbook method is worth the extra effort for higher claims</li>
                <li>• Your logbook is valid for 5 years - you only need 12 weeks of records</li>
                <li>• Keep all receipts for fuel, registration, insurance, and maintenance</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
