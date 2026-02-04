import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import type { UseCarExpensesReturn } from '@/hooks/useCarExpenses';
import { Calculator, Info, AlertTriangle, TrendingUp, MapPin, Briefcase } from 'lucide-react';

interface CentsPerKmPanelProps {
  carExpenses: UseCarExpensesReturn;
}

export function CentsPerKmPanel({ carExpenses }: CentsPerKmPanelProps) {
  const {
    workpaper,
    setCentsPerKmData,
    centsPerKmCalculation,
    centsPerKmRate,
    maxCentsPerKmKilometres,
  } = carExpenses;

  const [workKilometres, setWorkKilometres] = useState(
    workpaper.centsPerKmData?.workKilometres || 0
  );
  const [reasonForClaim, setReasonForClaim] = useState(
    workpaper.centsPerKmData?.reasonForClaim || ''
  );
  const [showEstimator, setShowEstimator] = useState(false);

  // Trip estimator state
  const [trips, setTrips] = useState([
    { id: 1, description: '', daysPerWeek: 0, weeksPerYear: 48, kilometresPerTrip: 0 },
  ]);

  const handleSave = () => {
    setCentsPerKmData({ workKilometres, reasonForClaim });
  };

  const addTrip = () => {
    setTrips([...trips, { id: Date.now(), description: '', daysPerWeek: 0, weeksPerYear: 48, kilometresPerTrip: 0 }]);
  };

  const updateTrip = (id: number, field: string, value: number | string) => {
    setTrips(trips.map(trip => 
      trip.id === id ? { ...trip, [field]: value } : trip
    ));
  };

  const removeTrip = (id: number) => {
    setTrips(trips.filter(trip => trip.id !== id));
  };

  const estimatedKilometres = trips.reduce((total, trip) => {
    return total + (trip.daysPerWeek * trip.weeksPerYear * trip.kilometresPerTrip);
  }, 0);

  const applyEstimate = () => {
    setWorkKilometres(Math.round(estimatedKilometres));
    setShowEstimator(false);
  };

  const isAtCap = workKilometres >= maxCentsPerKmKilometres;
  const claimAmount = centsPerKmCalculation?.totalClaim || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cents per Kilometre Calculation
          </CardTitle>
          <CardDescription>
            Enter your work-related kilometres for the tax year. 
            The ATO allows a maximum of 5,000 kilometres at 78 cents per kilometre.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rate information */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-2xl font-bold text-primary">78c</p>
              <p className="text-xs text-muted-foreground">per kilometre</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-2xl font-bold">5,000</p>
              <p className="text-xs text-muted-foreground">km maximum</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-2xl font-bold text-primary">$3,900</p>
              <p className="text-xs text-muted-foreground">maximum claim</p>
            </div>
          </div>

          {/* Work kilometres input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="workKilometres">Work Kilometres</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowEstimator(!showEstimator)}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {showEstimator ? 'Hide Estimator' : 'Use Estimator'}
              </Button>
            </div>

            {/* Trip Estimator */}
            {showEstimator && (
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Trip Pattern Estimator</CardTitle>
                  <CardDescription className="text-xs">
                    Calculate your annual kilometres based on regular trip patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trips.map((trip, index) => (
                    <div key={trip.id} className="grid gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-4">
                      <div className="sm:col-span-4">
                        <Input
                          placeholder="e.g., Client visits to CBD"
                          value={trip.description}
                          onChange={(e) => updateTrip(trip.id, 'description', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Days/week</Label>
                        <Input
                          type="number"
                          min={0}
                          max={7}
                          value={trip.daysPerWeek || ''}
                          onChange={(e) => updateTrip(trip.id, 'daysPerWeek', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Weeks/year</Label>
                        <Input
                          type="number"
                          min={0}
                          max={52}
                          value={trip.weeksPerYear || ''}
                          onChange={(e) => updateTrip(trip.id, 'weeksPerYear', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Km per trip</Label>
                        <Input
                          type="number"
                          min={0}
                          value={trip.kilometresPerTrip || ''}
                          onChange={(e) => updateTrip(trip.id, 'kilometresPerTrip', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTrip(trip.id)}
                          disabled={trips.length === 1}
                          className="h-8 text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={addTrip}>
                      Add Trip Pattern
                    </Button>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Estimated Total</p>
                      <p className="text-lg font-semibold">{estimatedKilometres.toLocaleString()} km</p>
                    </div>
                  </div>
                  
                  <Button onClick={applyEstimate} className="w-full">
                    Apply Estimate
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Input
                  id="workKilometres"
                  type="number"
                  min={0}
                  max={maxCentsPerKmKilometres}
                  value={workKilometres || ''}
                  onChange={(e) => setWorkKilometres(parseInt(e.target.value) || 0)}
                  className="flex-1"
                  placeholder="Enter kilometres"
                />
                <span className="text-muted-foreground">km</span>
              </div>
              
              {/* Slider for quick adjustment */}
              <Slider
                value={[Math.min(workKilometres, maxCentsPerKmKilometres)]}
                onValueChange={([value]) => setWorkKilometres(value)}
                max={maxCentsPerKmKilometres}
                step={50}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 km</span>
                <span>{(maxCentsPerKmKilometres / 2).toLocaleString()} km</span>
                <span>{maxCentsPerKmKilometres.toLocaleString()} km</span>
              </div>
            </div>

            {isAtCap && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You've reached the maximum 5,000 km cap. Consider using the logbook method 
                  if you travelled more than 5,000 km for work.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Reason for claim */}
          <div className="space-y-2">
            <Label htmlFor="reasonForClaim">
              Reason for Work Travel <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reasonForClaim"
              placeholder="e.g., Travel between offices, visiting clients, carrying bulky tools to work sites..."
              value={reasonForClaim}
              onChange={(e) => setReasonForClaim(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Describe the work-related purposes for which you used your vehicle. 
              This is required by the ATO but no receipts or logbook are needed for this method.
            </p>
          </div>

          {/* Calculation preview */}
          {workKilometres > 0 && (
            <>
              <Separator />
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-3 font-medium">Calculation Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Work kilometres claimed</span>
                    <span>{workKilometres.toLocaleString()} km</span>
                  </div>
                  {workKilometres > maxCentsPerKmKilometres && (
                    <div className="flex justify-between text-destructive">
                      <span>Excess kilometres (not claimable)</span>
                      <span>{(workKilometres - maxCentsPerKmKilometres).toLocaleString()} km</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Claimable kilometres</span>
                    <span>{Math.min(workKilometres, maxCentsPerKmKilometres).toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>78c per km</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Estimated deduction</span>
                    <span className="text-primary">${claimAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Important notes */}
          <Alert variant="default" className="bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">Important reminders:</p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>You can claim a maximum of 5,000 work kilometres per vehicle per year</li>
                <li>Commuting from home to your regular workplace is <strong>not</strong> claimable</li>
                <li>You don't need receipts, but you should be able to explain how you calculated the kilometres</li>
                <li>This rate covers all car expenses (fuel, maintenance, depreciation, etc.)</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={workKilometres === 0 || !reasonForClaim.trim()}
            >
              Save Calculation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Examples of claimable travel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Examples of Claimable Travel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Briefcase className="mt-0.5 h-4 w-4 text-green-500" />
              <div className="text-sm">
                <p className="font-medium">Directly work-related</p>
                <p className="text-muted-foreground">Travel between offices, client meetings, conferences</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-green-500" />
              <div className="text-sm">
                <p className="font-medium">Alternative work location</p>
                <p className="text-muted-foreground">Travel to a work site that's not your regular workplace</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 text-green-500" />
              <div className="text-sm">
                <p className="font-medium">Carrying bulky tools</p>
                <p className="text-muted-foreground">Transporting equipment that can't be left at work</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <div className="text-sm">
                <p className="font-medium">Not claimable</p>
                <p className="text-muted-foreground">Normal home to work commuting, even if you run errands</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
