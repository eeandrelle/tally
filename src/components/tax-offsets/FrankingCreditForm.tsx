import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Building2, DollarSign, Percent, Calendar } from 'lucide-react';
import { calculateFrankingCreditFromPercentage, formatCurrency } from '@/lib/tax-offsets';
import type { FrankingCredit } from '@/lib/tax-offsets';

interface FrankingCreditFormProps {
  credits: (FrankingCredit & { id?: number })[];
  onAdd: (credit: Omit<FrankingCredit, 'frankingCredit'>) => void;
  onRemove?: (id: number) => void;
  readOnly?: boolean;
}

export function FrankingCreditForm({ credits, onAdd, onRemove, readOnly = false }: FrankingCreditFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    dividendAmount: '',
    frankingPercentage: '100',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dividendAmount = parseFloat(formData.dividendAmount);
    const frankingPercentage = parseFloat(formData.frankingPercentage);
    
    if (!formData.companyName || isNaN(dividendAmount) || dividendAmount <= 0) {
      return;
    }
    
    onAdd({
      companyName: formData.companyName,
      dividendAmount,
      frankedAmount: dividendAmount * (frankingPercentage / 100),
      frankingPercentage,
      paymentDate: new Date(formData.paymentDate)
    });
    
    // Reset form
    setFormData({
      companyName: '',
      dividendAmount: '',
      frankingPercentage: '100',
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setIsOpen(false);
  };

  const totalCredits = credits.reduce((sum, c) => sum + c.frankingCredit, 0);
  const totalDividends = credits.reduce((sum, c) => sum + c.dividendAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Franking Credits</h3>
          <p className="text-sm text-muted-foreground">
            {credits.length} dividend payment{credits.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        {!readOnly && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Dividend
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Dividend Payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    <Building2 className="h-4 w-4 inline mr-2" />
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g., Commonwealth Bank"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dividendAmount">
                      <DollarSign className="h-4 w-4 inline mr-2" />
                      Dividend Amount
                    </Label>
                    <Input
                      id="dividendAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.dividendAmount}
                      onChange={(e) => setFormData({ ...formData, dividendAmount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="frankingPercentage">
                      <Percent className="h-4 w-4 inline mr-2" />
                      Franking %
                    </Label>
                    <Input
                      id="frankingPercentage"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={formData.frankingPercentage}
                      onChange={(e) => setFormData({ ...formData, frankingPercentage: e.target.value })}
                      placeholder="100"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Payment Date
                  </Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    required
                  />
                </div>
                
                {formData.dividendAmount && formData.frankingPercentage && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Calculated Franking Credit: </span>
                      {formatCurrency(
                        calculateFrankingCreditFromPercentage(
                          parseFloat(formData.dividendAmount),
                          parseFloat(formData.frankingPercentage)
                        )
                      )}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Dividend</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {credits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No dividend payments recorded</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add dividends to calculate your franking credits
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-2">
            {credits.map((credit, index) => (
              <Card key={credit.id || index} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{credit.companyName}</span>
                        <span className="text-xs text-muted-foreground">
                          {credit.paymentDate ? new Date(credit.paymentDate).toLocaleDateString('en-AU') : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span>Dividend: {formatCurrency(credit.dividendAmount)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>Franking: {credit.frankingPercentage}%</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-green-600 font-medium">
                          Credit: {formatCurrency(credit.frankingCredit)}
                        </span>
                      </div>
                    </div>
                    {!readOnly && onRemove && credit.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(credit.id!)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Dividends</p>
                  <p className="text-lg font-semibold">{formatCurrency(totalDividends)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Franking Credits</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalCredits)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Franking credits can be refunded if they exceed your tax liability
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default FrankingCreditForm;
