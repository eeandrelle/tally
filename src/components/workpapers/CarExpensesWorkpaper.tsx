import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCarExpenses, type UseCarExpensesReturn } from '@/hooks/useCarExpenses';
import { CentsPerKmPanel } from './CentsPerKmPanel';
import { LogbookPanel } from './LogbookPanel';
import { MethodComparisonCard } from './MethodComparisonCard';
import { Car, FileText, Calculator, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface CarExpensesWorkpaperProps {
  taxYear?: string;
}

export function CarExpensesWorkpaper({ taxYear }: CarExpensesWorkpaperProps) {
  const carExpenses = useCarExpenses({ taxYear });
  const { 
    workpaper, 
    setVehicleInfo, 
    selectMethod, 
    stats,
    methodComparison,
    exportData,
  } = carExpenses;

  const [activeTab, setActiveTab] = useState<string>('vehicle');

  // Determine which tabs should be enabled
  const hasVehicleInfo = workpaper.vehicleDescription.trim().length > 0;
  const hasSelectedMethod = !!workpaper.selectedMethod;
  const canExport = stats.isComplete;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">D1 Car Expenses Workpaper</h1>
          <p className="text-muted-foreground">
            Tax Year {workpaper.taxYear} • Work-related car expense claims
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.isComplete && (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </Badge>
          )}
          <Badge variant="outline">D1</Badge>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={hasVehicleInfo ? "default" : "secondary"} className="gap-1">
          {hasVehicleInfo ? <CheckCircle2 className="h-3 w-3" /> : "1"}
          Vehicle
        </Badge>
        <Separator className="w-8" />
        <Badge variant={hasSelectedMethod ? "default" : hasVehicleInfo ? "secondary" : "outline"} className="gap-1">
          {hasSelectedMethod ? <CheckCircle2 className="h-3 w-3" /> : "2"}
          Method
        </Badge>
        <Separator className="w-8" />
        <Badge variant={stats.isComplete ? "default" : hasSelectedMethod ? "secondary" : "outline"} className="gap-1">
          {stats.isComplete ? <CheckCircle2 className="h-3 w-3" /> : "3"}
          Details
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vehicle" className="gap-2">
            <Car className="h-4 w-4" />
            Vehicle
          </TabsTrigger>
          <TabsTrigger value="method" disabled={!hasVehicleInfo} className="gap-2">
            <Calculator className="h-4 w-4" />
            Method
          </TabsTrigger>
          <TabsTrigger value="details" disabled={!hasSelectedMethod} className="gap-2">
            <FileText className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="summary" disabled={!canExport} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* Vehicle Information Tab */}
        <TabsContent value="vehicle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
              <CardDescription>
                Enter details about the vehicle you're claiming expenses for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vehicleDescription">Vehicle Description *</Label>
                  <Input
                    id="vehicleDescription"
                    placeholder="e.g., 2020 Toyota Camry Silver"
                    value={workpaper.vehicleDescription}
                    onChange={(e) => setVehicleInfo({ 
                      vehicleDescription: e.target.value,
                      registrationNumber: workpaper.registrationNumber,
                      engineCapacity: workpaper.engineCapacity,
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe your vehicle (make, model, color, year)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    placeholder="e.g., ABC123"
                    value={workpaper.registrationNumber || ''}
                    onChange={(e) => setVehicleInfo({ 
                      vehicleDescription: workpaper.vehicleDescription,
                      registrationNumber: e.target.value,
                      engineCapacity: workpaper.engineCapacity,
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                Optional - for your reference
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Engine Capacity (for reference)</Label>
                <div className="flex flex-wrap gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={workpaper.engineCapacity === size ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVehicleInfo({
                        vehicleDescription: workpaper.vehicleDescription,
                        registrationNumber: workpaper.registrationNumber,
                        engineCapacity: size,
                      })}
                    >
                      {size === 'small' && 'Small (1.0L or less)'}
                      {size === 'medium' && 'Medium (1.1L - 1.6L)'}
                      {size === 'large' && 'Large (Over 1.6L)'}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={!workpaper.engineCapacity ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVehicleInfo({
                      vehicleDescription: workpaper.vehicleDescription,
                      registrationNumber: workpaper.registrationNumber,
                      engineCapacity: undefined,
                    })}
                  >
                    Not sure
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Engine capacity no longer affects deduction rates. All vehicles use the same 78c/km rate.
                </p>
              </div>

              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  You can claim car expenses if you use your vehicle for work-related purposes, 
                  such as traveling to meet clients, attending work meetings off-site, or carrying bulky tools.
                  Commuting from home to work is generally not claimable.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button 
                  onClick={() => setActiveTab('method')}
                  disabled={!hasVehicleInfo}
                >
                  Continue to Method Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Method Selection Tab */}
        <TabsContent value="method" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Calculation Method</CardTitle>
              <CardDescription>
                Choose how you want to calculate your car expense deduction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Cents per km option */}
                <MethodCard
                  title="Cents per Kilometre Method"
                  description="Simple method using a standard rate per kilometre. No need to keep receipts or logbook."
                  rate="78c per km"
                  maxKm="5,000 km cap"
                  requirements={[
                    "Estimate your work-related kilometres",
                    "No receipts required",
                    "No logbook needed",
                    "Maximum 5,000 work km per year",
                  ]}
                  bestFor="Low to moderate work travel"
                  selected={workpaper.selectedMethod === 'cents-per-km'}
                  onSelect={() => selectMethod('cents-per-km')}
                />

                {/* Logbook method option */}
                <MethodCard
                  title="Logbook Method"
                  description="Claim actual expenses based on business use percentage. Requires 12-week logbook."
                  rate="Actual expenses × % business use"
                  maxKm="No kilometre limit"
                  requirements={[
                    "12-week continuous logbook",
                    "Keep all receipts",
                    "Record odometer readings",
                    "Calculate business use %",
                  ]}
                  bestFor="High work travel or expensive vehicle costs"
                  selected={workpaper.selectedMethod === 'logbook'}
                  onSelect={() => selectMethod('logbook')}
                />
              </div>

              {workpaper.selectedMethod && (
                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab('details')}>
                    Continue to {workpaper.selectedMethod === 'cents-per-km' ? 'Kilometres' : 'Logbook & Expenses'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {workpaper.selectedMethod === 'cents-per-km' ? (
            <CentsPerKmPanel carExpenses={carExpenses} />
          ) : (
            <LogbookPanel carExpenses={carExpenses} />
          )}
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <SummaryPanel carExpenses={carExpenses} />
        </TabsContent>
      </Tabs>

      {/* Method Comparison - show when both methods have data */}
      {methodComparison && (
        <MethodComparisonCard comparison={methodComparison} />
      )}
    </div>
  );
}

// Method Selection Card Component
interface MethodCardProps {
  title: string;
  description: string;
  rate: string;
  maxKm: string;
  requirements: string[];
  bestFor: string;
  selected: boolean;
  onSelect: () => void;
}

function MethodCard({ title, description, rate, maxKm, requirements, bestFor, selected, onSelect }: MethodCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all ${selected ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 text-sm">
          <div className="flex-1 rounded-lg bg-muted p-2">
            <p className="font-medium text-primary">{rate}</p>
            <p className="text-xs text-muted-foreground">Rate</p>
          </div>
          <div className="flex-1 rounded-lg bg-muted p-2">
            <p className="font-medium">{maxKm}</p>
            <p className="text-xs text-muted-foreground">Limit</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Requirements:</p>
          <ul className="space-y-1">
            {requirements.map((req, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-1 w-1 rounded-full bg-primary" />
                {req}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-sm">
            <span className="font-medium">Best for:</span>{' '}
            <span className="text-muted-foreground">{bestFor}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Summary Panel Component
function SummaryPanel({ carExpenses }: { carExpenses: UseCarExpensesReturn }) {
  const { workpaper, stats, exportData, centsPerKmCalculation, logbookCalculation, reset } = carExpenses;

  if (!exportData) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workpaper Summary</CardTitle>
          <CardDescription>
            Review your car expense claim before finalizing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Vehicle Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Vehicle</p>
              <p className="font-medium">{workpaper.vehicleDescription}</p>
            </div>
            {workpaper.registrationNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Registration</p>
                <p className="font-medium">{workpaper.registrationNumber}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Claim Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Method</span>
              <Badge variant="outline">
                {workpaper.selectedMethod === 'cents-per-km' ? 'Cents per Kilometre' : 'Logbook Method'}
              </Badge>
            </div>

            {workpaper.selectedMethod === 'cents-per-km' && centsPerKmCalculation && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Work Kilometres</span>
                  <span>{centsPerKmCalculation.workKilometres.toLocaleString()} km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Claimable Kilometres</span>
                  <span>{centsPerKmCalculation.claimableKilometres.toLocaleString()} km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span>78c per km</span>
                </div>
              </div>
            )}

            {workpaper.selectedMethod === 'logbook' && logbookCalculation && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Expenses</span>
                  <span>${logbookCalculation.totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Business Use</span>
                  <span>{logbookCalculation.businessUsePercentage.toFixed(1)}%</span>
                </div>
                {stats.totalLogbookEntries > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Logbook Entries</span>
                    <span>{stats.totalLogbookEntries} entries</span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total Claim</span>
              <span className="text-primary">${exportData.claimAmount.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Supporting Documents */}
          <div>
            <p className="mb-2 font-medium">Supporting Documents</p>
            <div className="space-y-2 text-sm">
              {workpaper.selectedMethod === 'logbook' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Logbook entries</span>
                    <Badge variant={stats.totalLogbookEntries > 0 ? "default" : "destructive"}>
                      {stats.totalLogbookEntries} entries
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Receipts</span>
                    <Badge variant={stats.totalReceipts > 0 ? "default" : "secondary"}>
                      {stats.totalReceipts} receipts
                    </Badge>
                  </div>
                </>
              )}
              {workpaper.selectedMethod === 'cents-per-km' && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reason for claim</span>
                  <Badge variant="default">Provided</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Warning if incomplete */}
          {!stats.isComplete && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please complete all required fields before finalizing this workpaper.
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={reset}>
              Start Over
            </Button>
            <Button disabled={!stats.isComplete}>
              Save to Tax Return
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
