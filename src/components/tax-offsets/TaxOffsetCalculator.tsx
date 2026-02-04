import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTaxOffsets } from '@/hooks/useTaxOffsets';
import { TaxOffsetCard } from './TaxOffsetCard';
import { FrankingCreditForm } from './FrankingCreditForm';
import { TaxOffsetSummaryDisplay } from './TaxOffsetSummary';
import { formatCurrency } from '@/lib/tax-offsets';
import { 
  Calculator, 
  User, 
  Heart, 
  Users, 
  Save,
  RotateCcw,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface TaxOffsetCalculatorProps {
  profileId?: string;
  taxYear?: string;
  onSave?: (summary: any) => void;
}

export function TaxOffsetCalculator({ profileId, taxYear, onSave }: TaxOffsetCalculatorProps) {
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    taxableIncome: '',
    age: '',
    isResident: true,
    hasPrivateHealthInsurance: false,
    privateHealthCoverType: 'single' as const,
    isSeniorOrPensioner: false,
    hasSpouse: false,
    spouseIncome: '',
    isSoleParent: false,
    phiPremiumAmount: ''
  });

  const {
    summary,
    frankingCredits,
    isLoading,
    error,
    calculate,
    addFrankingCredit,
    totalTaxOffsets,
    totalFrankingCredits,
    grandTotal,
    formattedGrandTotal
  } = useTaxOffsets({ profileId, taxYear });

  const handleCalculate = useCallback(() => {
    const profileInput = {
      profileId: profileId || `profile-${Date.now()}`,
      taxYear,
      taxableIncome: parseFloat(profileForm.taxableIncome) || 0,
      age: parseInt(profileForm.age) || 30,
      isResident: profileForm.isResident,
      hasPrivateHealthInsurance: profileForm.hasPrivateHealthInsurance,
      privateHealthCoverType: profileForm.privateHealthCoverType,
      isSeniorOrPensioner: profileForm.isSeniorOrPensioner,
      hasSpouse: profileForm.hasSpouse,
      spouseIncome: parseFloat(profileForm.spouseIncome) || 0,
      isSoleParent: profileForm.isSoleParent,
      phiPremiumAmount: parseFloat(profileForm.phiPremiumAmount) || 0
    };

    calculate(profileInput, frankingCredits);
    setActiveTab('results');
  }, [profileForm, profileId, taxYear, frankingCredits, calculate]);

  const canCalculate = profileForm.taxableIncome && profileForm.age;

  const resetForm = () => {
    setProfileForm({
      taxableIncome: '',
      age: '',
      isResident: true,
      hasPrivateHealthInsurance: false,
      privateHealthCoverType: 'single',
      isSeniorOrPensioner: false,
      hasSpouse: false,
      spouseIncome: '',
      isSoleParent: false,
      phiPremiumAmount: ''
    });
    setActiveTab('profile');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Tax Offset & Credits Calculator
          </h2>
          <p className="text-muted-foreground">
            Calculate your tax offsets and franking credits for {taxYear || '2024-25'}
          </p>
        </div>
        {summary && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Estimated Tax Savings</p>
            <p className="text-3xl font-bold text-green-600">{formattedGrandTotal}</p>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="dividends">
            <Sparkles className="h-4 w-4 mr-2" />
            Dividends
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!summary}>
            <Save className="h-4 w-4 mr-2" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Taxpayer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxableIncome">Taxable Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="taxableIncome"
                      type="number"
                      placeholder="80000"
                      className="pl-7"
                      value={profileForm.taxableIncome}
                      onChange={(e) => setProfileForm({ ...profileForm, taxableIncome: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="35"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="hasPHI">Private Health Insurance</Label>
                  </div>
                  <Switch
                    id="hasPHI"
                    checked={profileForm.hasPrivateHealthInsurance}
                    onCheckedChange={(checked) => 
                      setProfileForm({ ...profileForm, hasPrivateHealthInsurance: checked })
                    }
                  />
                </div>

                {profileForm.hasPrivateHealthInsurance && (
                  <div className="pl-6 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="coverType">Cover Type</Label>
                        <select
                          id="coverType"
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={profileForm.privateHealthCoverType}
                          onChange={(e) => setProfileForm({ 
                            ...profileForm, 
                            privateHealthCoverType: e.target.value as 'single' | 'couple' | 'family'
                          })}
                        >
                          <option value="single">Single</option>
                          <option value="couple">Couple</option>
                          <option value="family">Family</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phiPremium">Annual Premium</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="phiPremium"
                            type="number"
                            placeholder="2000"
                            className="pl-7"
                            value={profileForm.phiPremiumAmount}
                            onChange={(e) => setProfileForm({ ...profileForm, phiPremiumAmount: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="hasSpouse">Has Spouse/Partner</Label>
                  </div>
                  <Switch
                    id="hasSpouse"
                    checked={profileForm.hasSpouse}
                    onCheckedChange={(checked) => 
                      setProfileForm({ ...profileForm, hasSpouse: checked })
                    }
                  />
                </div>

                {profileForm.hasSpouse && (
                  <div className="pl-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="spouseIncome">Spouse Income</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="spouseIncome"
                          type="number"
                          placeholder="50000"
                          className="pl-7"
                          value={profileForm.spouseIncome}
                          onChange={(e) => setProfileForm({ ...profileForm, spouseIncome: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="isSenior">Senior/Pensioner (Age 67+)</Label>
                  <Switch
                    id="isSenior"
                    checked={profileForm.isSeniorOrPensioner}
                    onCheckedChange={(checked) => 
                      setProfileForm({ ...profileForm, isSeniorOrPensioner: checked })
                    }
                  />
                </div>
              </div>

              {!canCalculate && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">Please enter your taxable income and age to calculate offsets</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleCalculate} 
                  disabled={!canCalculate || isLoading}
                  className="flex-1"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {isLoading ? 'Calculating...' : 'Calculate Tax Offsets'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dividends Tab */}
        <TabsContent value="dividends">
          <Card>
            <CardHeader>
              <CardTitle>Franking Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <FrankingCreditForm
                credits={frankingCredits}
                onAdd={(credit) => addFrankingCredit(credit)}
                onRemove={(id) => {
                  // Handle removal
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          {summary ? (
            <div className="space-y-4">
              <TaxOffsetSummaryDisplay summary={summary} />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Offset Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {summary.breakdown.map((offset, idx) => (
                    <TaxOffsetCard key={idx} offset={offset} showDetails />
                  ))}
                </CardContent>
              </Card>

              {onSave && (
                <Button onClick={() => onSave(summary)} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Calculation
                </Button>
              )}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No calculations yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your profile and click Calculate
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TaxOffsetCalculator;
