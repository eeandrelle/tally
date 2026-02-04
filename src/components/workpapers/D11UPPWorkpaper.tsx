import { useState } from 'react';
import {
  Download,
  Globe,
  HelpCircle,
  Info,
  Landmark,
  Plus,
  Receipt,
  Trash2,
  AlertCircle,
  CheckCircle,
  Calculator,
  Briefcase,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';
import { AtoCategoryBadge } from '@/components/ato/AtoCategoryBadge';
import { useUPPDeductions, type UPPType } from '@/hooks/useUPPDeductions';

const UPP_TYPES: { value: UPPType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'foreign_pension', 
    label: 'Foreign Pension', 
    icon: <Globe className="h-4 w-4" />,
    description: 'Pension payments from overseas governments'
  },
  { 
    value: 'foreign_annuity', 
    label: 'Foreign Annuity', 
    icon: <Landmark className="h-4 w-4" />,
    description: 'Annuity payments from foreign sources'
  },
  { 
    value: 'domestic_annuity', 
    label: 'Domestic Annuity', 
    icon: <Briefcase className="h-4 w-4" />,
    description: 'Annuity from Australian sources'
  },
  { 
    value: 'super_income_stream', 
    label: 'Super Income Stream', 
    icon: <Calculator className="h-4 w-4" />,
    description: 'Untaxed superannuation income stream'
  },
];

export function D11UPPWorkpaper() {
  const { entries, addEntry, deleteEntry, getTotalDeductible, getTotalGross } = useUPPDeductions();
  const [activeTab, setActiveTab] = useState('entries');
  const [newEntry, setNewEntry] = useState<{
    type: UPPType;
    description: string;
    payerName: string;
    grossPayment: number;
    deductibleAmount: number;
    date: string;
    taxWithheld: number;
  }>({
    type: 'foreign_pension',
    description: '',
    payerName: '',
    grossPayment: 0,
    deductibleAmount: 0,
    date: new Date().toISOString().split('T')[0],
    taxWithheld: 0,
  });

  const handleAddEntry = () => {
    if (newEntry.payerName && newEntry.grossPayment > 0 && newEntry.deductibleAmount > 0) {
      addEntry({
        type: newEntry.type,
        description: newEntry.description || UPP_TYPES.find(t => t.value === newEntry.type)?.label || '',
        payerName: newEntry.payerName,
        grossPayment: newEntry.grossPayment,
        deductibleAmount: newEntry.deductibleAmount,
        date: newEntry.date || new Date().toISOString().split('T')[0],
        taxWithheld: newEntry.taxWithheld || 0,
      });
      setNewEntry({
        type: 'foreign_pension',
        description: '',
        payerName: '',
        grossPayment: 0,
        deductibleAmount: 0,
        date: new Date().toISOString().split('T')[0],
        taxWithheld: 0,
      });
    }
  };

  const handleExport = () => {
    const data = {
      category: 'D11',
      totalDeductible: getTotalDeductible(),
      totalGross: getTotalGross(),
      entries: entries,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `D11-upp-deductions-${new Date().getFullYear()}.json`;
    a.click();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AtoCategoryBadge code="D11" size="lg" />
              <h2 className="text-2xl font-bold">Deductible Amount from UPP</h2>
            </div>
            <p className="text-muted-foreground">
              Claim deductible amounts from untaxed plan or annuity payments (D11)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setActiveTab('entries')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            UPP (Untaxed Plan or Annuity) deductions apply to income from foreign pensions, 
            annuities, and certain superannuation income streams where a tax-free component 
            can be claimed.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deductible Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(getTotalDeductible())}</div>
              <p className="text-xs text-muted-foreground">D11 Claim Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gross Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(getTotalGross())}</div>
              <p className="text-xs text-muted-foreground">Total income received</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entries.length}</div>
              <p className="text-xs text-muted-foreground">UPP/annuity payments</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entries">Entries</TabsTrigger>
            <TabsTrigger value="guide">ATO Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-4">
            {/* Add New Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add UPP/Annuity Payment</CardTitle>
                <CardDescription>Record deductible amounts from untaxed plans or annuities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                      value={newEntry.type}
                      onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as UPPType })}
                    >
                      {UPP_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payer/Scheme Name</Label>
                  <Input
                    placeholder="e.g., UK State Pension, Overseas Super Fund"
                    value={newEntry.payerName}
                    onChange={(e) => setNewEntry({ ...newEntry, payerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g., Monthly pension payment"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Gross Payment ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newEntry.grossPayment || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, grossPayment: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deductible Amount ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newEntry.deductibleAmount || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, deductibleAmount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Withheld ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newEntry.taxWithheld || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, taxWithheld: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddEntry} 
                  className="w-full"
                  disabled={!newEntry.payerName || newEntry.grossPayment <= 0 || newEntry.deductibleAmount <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </CardContent>
            </Card>

            {/* Entries List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">UPP/Annuity Entries</CardTitle>
                <CardDescription>{entries.length} entries recorded</CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No entries recorded yet</p>
                    <p className="text-sm">Add your first UPP or annuity payment above</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Payer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Deductible</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {UPP_TYPES.find(t => t.value === entry.type)?.icon}
                              <span className="text-sm">
                                {UPP_TYPES.find(t => t.value === entry.type)?.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{entry.payerName}</p>
                              <p className="text-xs text-muted-foreground">{entry.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>{entry.date}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.grossPayment)}</TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            {formatCurrency(entry.deductibleAmount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guide">
            <Card>
              <CardHeader>
                <CardTitle>ATO Guidelines - D11</CardTitle>
                <CardDescription>Deductible amount of undeducted purchase price of a foreign pension or annuity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">What You Can Claim</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Deductible amount of undeducted purchase price (UPP) of a foreign pension</li>
                    <li>Deductible amount from an annuity payment</li>
                    <li>Tax-free component of certain superannuation income streams</li>
                    <li>Amounts relating to the return of your original contribution</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">UPP Calculation</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    The deductible amount is generally calculated as:
                  </p>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <p>Deductible amount = UPP ÷ Term of pension/annuity (in years)</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    For lifetime pensions, the term is based on life expectancy factors from actuarial tables.
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Record Keeping</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Keep original purchase documents showing the UPP amount</li>
                    <li>Maintain payment statements from the payer</li>
                    <li>Keep ATO correspondence confirming deductible amounts</li>
                    <li>Retain records for 5 years after the pension/annuity ends</li>
                  </ul>
                </div>
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Foreign Pensions:</strong> If you receive a foreign pension, the payer may 
                    provide a statement showing the deductible amount. If not, you may need to calculate 
                    it yourself or seek tax agent assistance.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Tax Offsets:</strong> You may also be eligible for a foreign income tax offset 
                    if tax was withheld from your foreign pension or annuity payments.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
