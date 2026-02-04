import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit2, 
  Calculator,
  TrendingDown,
  Sparkles,
  Building,
  Home,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Plane,
  Car,
  Wifi,
  Shirt,
  Wrench,
  MoreHorizontal
} from 'lucide-react';
import type { DeductionItem } from '@/lib/tax-calculator';
import type { UseTaxCalculatorReturn } from '@/hooks/useTaxCalculator';

// ============= CATEGORY OPTIONS =============

const DEDUCTION_CATEGORIES = [
  { value: 'work-from-home', label: 'Work From Home', icon: Home },
  { value: 'vehicle', label: 'Vehicle Expenses', icon: Car },
  { value: 'travel', label: 'Travel', icon: Plane },
  { value: 'self-education', label: 'Self-Education', icon: GraduationCap },
  { value: 'tools', label: 'Tools & Equipment', icon: Wrench },
  { value: 'uniform', label: 'Uniform & Clothing', icon: Shirt },
  { value: 'internet-phone', label: 'Internet & Phone', icon: Wifi },
  { value: 'professional', label: 'Professional Fees', icon: Briefcase },
  { value: 'medical', label: 'Medical', icon: Stethoscope },
  { value: 'investment', label: 'Investment Expenses', icon: Building },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];

// ============= COMPONENT =============

interface CalculatorFormProps {
  calculator: UseTaxCalculatorReturn;
}

export function CalculatorForm({ calculator }: CalculatorFormProps) {
  const {
    currentScenario,
    totalDeductions,
    taxableIncome,
    taxResult,
    marginalRate,
    effectiveRate,
    savedScenarios,
    selectedDeductionId,
    showAddDeduction,
    setScenarioName,
    setTaxableIncome,
    setMedicareLevy,
    setPrivateHospitalCover,
    saveCurrentScenario,
    loadScenario,
    resetScenario,
    addDeduction,
    updateDeduction,
    removeDeduction,
    selectDeduction,
    setDeductionMethod,
    setShowAddDeduction,
    formatCurrency,
    formatPercent,
  } = calculator;

  // Local state for new deduction form
  const [newDeduction, setNewDeduction] = useState<Partial<DeductionItem>>({
    description: '',
    amount: 0,
    category: 'other',
    method: 'immediate',
    depreciationYears: 5,
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Handle adding new deduction
  const handleAddDeduction = () => {
    const result = addDeduction(newDeduction as Omit<DeductionItem, 'id'>);
    
    if (result.success) {
      setNewDeduction({
        description: '',
        amount: 0,
        category: 'other',
        method: 'immediate',
        depreciationYears: 5,
      });
      setFormErrors([]);
      setShowAddDeduction(false);
    } else {
      setFormErrors(result.errors);
    }
  };

  // Get category icon
  const getCategoryIcon = (categoryValue: string) => {
    const category = DEDUCTION_CATEGORIES.find((c) => c.value === categoryValue);
    const Icon = category?.icon || MoreHorizontal;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Income Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            Income & Tax Settings
          </CardTitle>
          <CardDescription>
            Enter your income and tax situation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scenario Name */}
          <div className="space-y-2">
            <Label htmlFor="scenario-name">Scenario Name</Label>
            <Input
              id="scenario-name"
              value={currentScenario.name}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g., My Tax Scenario"
            />
          </div>

          {/* Taxable Income */}
          <div className="space-y-2">
            <Label htmlFor="taxable-income">Taxable Income</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="taxable-income"
                type="number"
                min={0}
                step={1000}
                value={currentScenario.taxableIncome || ''}
                onChange={(e) => setTaxableIncome(Number(e.target.value))}
                className="pl-7"
                placeholder="75000"
              />
            </div>
          </div>

          {/* Tax Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="medicare-levy" className="text-sm">
                  Medicare Levy
                </Label>
                <p className="text-xs text-muted-foreground">
                  Include 2% levy
                </p>
              </div>
              <Switch
                id="medicare-levy"
                checked={currentScenario.medicareLevy}
                onCheckedChange={setMedicareLevy}
              />
            </div>

            <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="private-cover" className="text-sm">
                  Private Hospital Cover
                </Label>
                <p className="text-xs text-muted-foreground">
                  Avoid MLS
                </p>
              </div>
              <Switch
                id="private-cover"
                checked={currentScenario.privateHospitalCover}
                onCheckedChange={setPrivateHospitalCover}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Summary Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Taxable Income</p>
              <p className="text-2xl font-bold">{formatCurrency(taxableIncome)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Tax</p>
              <p className="text-2xl font-bold">{formatCurrency(taxResult.totalTax)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Marginal Rate</p>
              <p className="text-xl font-semibold">{formatPercent(marginalRate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Effective Rate</p>
              <p className="text-xl font-semibold">{formatPercent(effectiveRate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductions Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="h-5 w-5 text-green-500" />
                Deductions
              </CardTitle>
              <CardDescription>
                Add work-related deductions to reduce your tax
              </CardDescription>
            </div>
            <Dialog open={showAddDeduction} onOpenChange={setShowAddDeduction}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Deduction</DialogTitle>
                  <DialogDescription>
                    Enter details for your work-related deduction
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {formErrors.length > 0 && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {formErrors.map((error, i) => (
                        <p key={i}>{error}</p>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="deduction-desc">Description</Label>
                    <Input
                      id="deduction-desc"
                      value={newDeduction.description}
                      onChange={(e) =>
                        setNewDeduction((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="e.g., Home office equipment"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deduction-category">Category</Label>
                    <Select
                      value={newDeduction.category}
                      onValueChange={(value) =>
                        setNewDeduction((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEDUCTION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <cat.icon className="h-4 w-4" />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deduction-amount">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="deduction-amount"
                        type="number"
                        min={0}
                        step={10}
                        value={newDeduction.amount || ''}
                        onChange={(e) =>
                          setNewDeduction((prev) => ({ ...prev, amount: Number(e.target.value) }))
                        }
                        className="pl-7"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deduction-method">Method</Label>
                    <Select
                      value={newDeduction.method}
                      onValueChange={(value: 'immediate' | 'depreciation') =>
                        setNewDeduction((prev) => ({ ...prev, method: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate Deduction</SelectItem>
                        <SelectItem value="depreciation">Depreciation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newDeduction.method === 'depreciation' && (
                    <div className="space-y-2">
                      <Label htmlFor="depreciation-years">Depreciation Years</Label>
                      <Input
                        id="depreciation-years"
                        type="number"
                        min={1}
                        max={20}
                        value={newDeduction.depreciationYears}
                        onChange={(e) =>
                          setNewDeduction((prev) => ({
                            ...prev,
                            depreciationYears: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDeduction(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddDeduction}>Add Deduction</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {currentScenario.deductions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No deductions added yet</p>
              <p className="text-sm">Add deductions to see your tax savings</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentScenario.deductions.map((deduction) => (
                <div
                  key={deduction.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedDeductionId === deduction.id
                      ? 'bg-primary/5 border-primary/30'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => selectDeduction(deduction.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      {getCategoryIcon(deduction.category)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{deduction.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{DEDUCTION_CATEGORIES.find(c => c.value === deduction.category)?.label}</span>
                        <span>•</span>
                        <Badge variant={deduction.method === 'immediate' ? 'default' : 'secondary'} className="text-xs">
                          {deduction.method === 'immediate' ? 'Immediate' : 'Depreciation'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(deduction.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDeduction(deduction.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Separator className="my-3" />
              <div className="flex items-center justify-between p-3">
                <span className="font-semibold">Total Deductions</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={saveCurrentScenario} variant="outline" className="flex-1">
          <Sparkles className="h-4 w-4 mr-2" />
          Save Scenario
        </Button>
        <Button onClick={resetScenario} variant="outline" className="flex-1">
          Reset
        </Button>
      </div>

      {/* Saved Scenarios */}
      {savedScenarios.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Saved Scenarios</CardTitle>
            <CardDescription>
              {savedScenarios.length} scenario{savedScenarios.length !== 1 ? 's' : ''} saved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => loadScenario(scenario.id)}
                >
                  <div>
                    <p className="font-medium">{scenario.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(scenario.taxableIncome)} income • {scenario.deductions.length} deductions
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadScenario(scenario.id);
                    }}
                  >
                    Load
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
