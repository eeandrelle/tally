import { useState } from 'react';
import {
  Download,
  Trees,
  HelpCircle,
  Info,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Calculator,
  Leaf,
  Building2,
  BadgeCheck,
  FileWarning,
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
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils';
import { AtoCategoryBadge } from '@/components/ato/AtoCategoryBadge';
import { useForestryMIS, type ForestryInvestmentType } from '@/hooks/useForestryMIS';

const INVESTMENT_TYPES: { value: ForestryInvestmentType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'establishment', 
    label: 'Establishment Costs', 
    icon: <Trees className="h-4 w-4" />,
    description: 'Initial planting and forest establishment'
  },
  { 
    value: 'management', 
    label: 'Management Fees', 
    icon: <Building2 className="h-4 w-4" />,
    description: 'Ongoing scheme management costs'
  },
  { 
    value: 'maintenance', 
    label: 'Maintenance', 
    icon: <Leaf className="h-4 w-4" />,
    description: 'Forest maintenance and silviculture'
  },
  { 
    value: 'environmental', 
    label: 'Environmental', 
    icon: <BadgeCheck className="h-4 w-4" />,
    description: 'Environmental and sustainability costs'
  },
];

export function D14ForestryWorkpaper() {
  const { entries, addEntry, deleteEntry, getTotalInvestment, getTotalManagementFees, getTotalDeduction } = useForestryMIS();
  const [activeTab, setActiveTab] = useState('entries');
  const [newEntry, setNewEntry] = useState<{
    schemeName: string;
    schemeManager: string;
    abn: string;
    investmentType: ForestryInvestmentType;
    amount: number;
    managementFee: number;
    date: string;
    isRegistered: boolean;
  }>({
    schemeName: '',
    schemeManager: '',
    abn: '',
    investmentType: 'establishment',
    amount: 0,
    managementFee: 0,
    date: new Date().toISOString().split('T')[0],
    isRegistered: true,
  });

  const handleAddEntry = () => {
    if (newEntry.schemeName && newEntry.amount > 0) {
      addEntry({
        schemeName: newEntry.schemeName,
        schemeManager: newEntry.schemeManager,
        abn: newEntry.abn || undefined,
        investmentType: newEntry.investmentType,
        amount: newEntry.amount,
        date: newEntry.date || new Date().toISOString().split('T')[0],
        managementFee: newEntry.managementFee || 0,
        isRegistered: newEntry.isRegistered,
      });
      setNewEntry({
        schemeName: '',
        schemeManager: '',
        abn: '',
        investmentType: 'establishment',
        amount: 0,
        managementFee: 0,
        date: new Date().toISOString().split('T')[0],
        isRegistered: true,
      });
    }
  };

  const handleExport = () => {
    const data = {
      category: 'D14',
      totalInvestment: getTotalInvestment(),
      totalManagementFees: getTotalManagementFees(),
      totalDeduction: getTotalDeduction(),
      entries: entries,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `D14-forestry-mis-${new Date().getFullYear()}.json`;
    a.click();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AtoCategoryBadge code="D14" size="lg" />
              <h2 className="text-2xl font-bold">Forestry Managed Investment Scheme</h2>
            </div>
            <p className="text-muted-foreground">
              Claim deductions for forestry managed investment scheme expenses (D14)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setActiveTab('entries')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Investment
            </Button>
          </div>
        </div>

        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Only investments in <strong>registered</strong> forestry managed 
            investment schemes are deductible. Unregistered schemes do not qualify for tax deductions.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deduction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(getTotalDeduction())}</div>
              <p className="text-xs text-muted-foreground">D14 Claim Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Investment Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(getTotalInvestment())}</div>
              <p className="text-xs text-muted-foreground">Forestry investments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Management Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(getTotalManagementFees())}</div>
              <p className="text-xs text-muted-foreground">Also deductible</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Schemes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{entries.length}</div>
                {entries.every(e => e.isRegistered) && entries.length > 0 && (
                  <Badge className="bg-green-500">All Registered</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Active investments</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entries">Investments</TabsTrigger>
            <TabsTrigger value="guide">ATO Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-4">
            {/* Add New Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Forestry Investment</CardTitle>
                <CardDescription>Record investment in a forestry managed investment scheme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Scheme Name</Label>
                    <Input
                      placeholder="e.g., Australian Timber Plantations"
                      value={newEntry.schemeName}
                      onChange={(e) => setNewEntry({ ...newEntry, schemeName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Scheme Manager</Label>
                    <Input
                      placeholder="e.g., Forestry Investment Management Ltd"
                      value={newEntry.schemeManager}
                      onChange={(e) => setNewEntry({ ...newEntry, schemeManager: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Scheme Manager ABN</Label>
                    <Input
                      placeholder="e.g., 12 345 678 901"
                      value={newEntry.abn}
                      onChange={(e) => setNewEntry({ ...newEntry, abn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Investment Date</Label>
                    <Input
                      type="date"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Investment Type</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={newEntry.investmentType}
                    onChange={(e) => setNewEntry({ ...newEntry, investmentType: e.target.value as ForestryInvestmentType })}
                  >
                    {INVESTMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} - {t.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Investment Amount ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newEntry.amount || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Management Fee ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newEntry.managementFee || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, managementFee: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="font-medium">Registered Scheme</Label>
                      <p className="text-xs text-muted-foreground">Scheme is registered with the ATO</p>
                    </div>
                  </div>
                  <Switch
                    checked={newEntry.isRegistered}
                    onCheckedChange={(checked) => setNewEntry({ ...newEntry, isRegistered: checked })}
                  />
                </div>
                {!newEntry.isRegistered && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Non-registered forestry schemes are generally not tax deductible. 
                      Verify registration at the ATO website before investing.
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  onClick={handleAddEntry} 
                  className="w-full"
                  disabled={!newEntry.schemeName || newEntry.amount <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Investment
                </Button>
              </CardContent>
            </Card>

            {/* Entries List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Forestry Investments</CardTitle>
                <CardDescription>{entries.length} investments recorded</CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trees className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No forestry investments recorded</p>
                    <p className="text-sm">Add your first forestry investment above</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scheme</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Investment</TableHead>
                        <TableHead className="text-right">Fees</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{entry.schemeName}</p>
                              <p className="text-xs text-muted-foreground">{entry.schemeManager}</p>
                              {entry.abn && <p className="text-xs text-muted-foreground">ABN: {entry.abn}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {INVESTMENT_TYPES.find(t => t.value === entry.investmentType)?.icon}
                              <span className="text-sm">
                                {INVESTMENT_TYPES.find(t => t.value === entry.investmentType)?.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{entry.date}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(entry.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.managementFee ? formatCurrency(entry.managementFee) : '-'}
                          </TableCell>
                          <TableCell>
                            {entry.isRegistered ? (
                              <Badge className="bg-green-500">Registered</Badge>
                            ) : (
                              <Badge variant="destructive">Unregistered</Badge>
                            )}
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
                <CardTitle>ATO Guidelines - D14</CardTitle>
                <CardDescription>Forestry managed investment scheme deduction</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">What is a Forestry MIS?</h4>
                  <p className="text-sm text-muted-foreground">
                    A forestry managed investment scheme (MIS) is an arrangement where you invest 
                    in an afforestation or reforestation project. Investors typically contribute 
                    to the establishment and maintenance of forestry plantations and share in the 
                    proceeds from harvested timber.
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Deduction Eligibility</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>The scheme must be registered with the ATO</li>
                    <li>You must hold your interest in the scheme as a revenue asset</li>
                    <li>Both initial investment and ongoing management fees are deductible</li>
                    <li>Deductions are claimed in the year the expenses are incurred</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">What Can Be Claimed</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Tree planting and establishment costs</li>
                    <li>Fertilizers, pesticides, and herbicides</li>
                    <li>Fire protection and prevention</li>
                    <li>Pruning and thinning costs</li>
                    <li>Lease or license fees for land</li>
                    <li>Scheme management fees</li>
                    <li>Insurance premiums</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Scheme Registration</h4>
                  <p className="text-sm text-muted-foreground">
                    Only investments in <strong>registered</strong> forestry MIS are tax deductible. 
                    The scheme manager should provide you with an annual statement showing your 
                    deductible amounts. Keep this with your tax records.
                  </p>
                </div>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important Warning:</strong> Be cautious of schemes that appear to be 
                    primarily tax-driven rather than genuine commercial forestry operations. 
                    The ATO closely scrutinizes forestry MIS arrangements.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>ATO Ruling:</strong> The ATO may apply Part IVA (general anti-avoidance) 
                    provisions if the scheme is entered into primarily for tax benefits rather than 
                    commercial purposes.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Trees className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Harvest Proceeds:</strong> When the timber is harvested, the proceeds 
                    are assessable income. Keep records of your investment costs as they form the 
                    cost base for capital gains calculations.
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
