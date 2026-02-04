import { useState } from 'react';
import {
  Download,
  MoreHorizontal,
  HelpCircle,
  Info,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Receipt,
  Vote,
  HeartPulse,
  Briefcase,
  Users,
  PiggyBank,
  FileQuestion,
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
import { useOtherDeductions, type OtherDeductionType } from '@/hooks/useOtherDeductions';

const DEDUCTION_TYPES: { value: OtherDeductionType; label: string; icon: React.ReactNode; description: string; requiresDocs: boolean }[] = [
  { 
    value: 'election_expenses', 
    label: 'Election Expenses', 
    icon: <Vote className="h-4 w-4" />,
    description: 'Costs of contesting local, state, or federal elections',
    requiresDocs: true
  },
  { 
    value: 'foreign_pension', 
    label: 'Foreign Pension', 
    icon: <PiggyBank className="h-4 w-4" />,
    description: 'Deductible amounts from foreign pension funds',
    requiresDocs: true
  },
  { 
    value: 'personal_super', 
    label: 'Personal Super', 
    icon: <Briefcase className="h-4 w-4" />,
    description: 'Personal superannuation contributions (if not claimed elsewhere)',
    requiresDocs: true
  },
  { 
    value: 'sunset_industry', 
    label: 'Sunset Industry', 
    icon: <Users className="h-4 w-4" />,
    description: 'Deductions specific to declining industries',
    requiresDocs: true
  },
  { 
    value: 'income_protection', 
    label: 'Income Protection', 
    icon: <HeartPulse className="h-4 w-4" />,
    description: 'Insurance premiums for income protection',
    requiresDocs: true
  },
  { 
    value: 'crowdfunding', 
    label: 'Crowdfunding', 
    icon: <Users className="h-4 w-4" />,
    description: 'Amounts paid to crowdfunds raising money for registered DGRs',
    requiresDocs: true
  },
  { 
    value: 'other', 
    label: 'Other Deduction', 
    icon: <FileQuestion className="h-4 w-4" />,
    description: 'Other deductible expenses not covered elsewhere',
    requiresDocs: true
  },
];

export function D15OtherDeductionsWorkpaper() {
  const { deductions, addDeduction, deleteDeduction, getTotalDeductions, getDeductionsNeedingDocumentation } = useOtherDeductions();
  const [activeTab, setActiveTab] = useState('deductions');
  const [newDeduction, setNewDeduction] = useState<{
    type: OtherDeductionType;
    description: string;
    amount: number;
    date: string;
    notes: string;
    requiresDocumentation: boolean;
  }>({
    type: 'other',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    requiresDocumentation: true,
  });

  const handleAddDeduction = () => {
    if (newDeduction.description && newDeduction.amount > 0) {
      addDeduction({
        type: newDeduction.type,
        description: newDeduction.description,
        amount: newDeduction.amount,
        date: newDeduction.date || new Date().toISOString().split('T')[0],
        notes: newDeduction.notes,
        requiresDocumentation: newDeduction.requiresDocumentation,
      });
      setNewDeduction({
        type: 'other',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: '',
        requiresDocumentation: true,
      });
    }
  };

  const handleExport = () => {
    const data = {
      category: 'D15',
      totalDeductions: getTotalDeductions(),
      deductionsNeedingDocs: getDeductionsNeedingDocumentation().length,
      deductions: deductions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `D15-other-deductions-${new Date().getFullYear()}.json`;
    a.click();
  };

  const needsDocumentation = getDeductionsNeedingDocumentation();

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AtoCategoryBadge code="D15" size="lg" />
              <h2 className="text-2xl font-bold">Other Deductions</h2>
            </div>
            <p className="text-muted-foreground">
              Claim other tax deductions not covered in D1-D14 (D15)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setActiveTab('deductions')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Deduction
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            D15 is for deductions that don't fit into categories D1-D14. Ensure you have proper 
            documentation for all deductions claimed here, as the ATO may request evidence.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(getTotalDeductions())}</div>
              <p className="text-xs text-muted-foreground">D15 Claim Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deductions.length}</div>
              <p className="text-xs text-muted-foreground">Items claimed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {needsDocumentation.length === 0 ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">All Documented</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-medium">{needsDocumentation.length} Need Docs</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Receipts required
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Review Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {deductions.length === 0 ? (
                  <>
                    <Info className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">No Deductions</span>
                  </>
                ) : (
                  <>
                    <FileQuestion className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">Review Required</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Verify eligibility
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
            <TabsTrigger value="guide">ATO Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="deductions" className="space-y-4">
            {/* Add New Deduction */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Other Deduction</CardTitle>
                <CardDescription>Record deductions that don't fit in other categories</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deduction Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                      value={newDeduction.type}
                      onChange={(e) => {
                        const type = e.target.value as OtherDeductionType;
                        const typeInfo = DEDUCTION_TYPES.find(t => t.value === type);
                        setNewDeduction({ 
                          ...newDeduction, 
                          type,
                          requiresDocumentation: typeInfo?.requiresDocs ?? true
                        });
                      }}
                    >
                      {DEDUCTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newDeduction.date}
                      onChange={(e) => setNewDeduction({ ...newDeduction, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g., Election campaign expenses, Income protection insurance"
                    value={newDeduction.description}
                    onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newDeduction.amount || ''}
                      onChange={(e) => setNewDeduction({ ...newDeduction, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input
                      placeholder="Additional details"
                      value={newDeduction.notes}
                      onChange={(e) => setNewDeduction({ ...newDeduction, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="font-medium">Documentation Required</Label>
                      <p className="text-xs text-muted-foreground">I have receipts or documentation for this deduction</p>
                    </div>
                  </div>
                  <Switch
                    checked={newDeduction.requiresDocumentation}
                    onCheckedChange={(checked) => setNewDeduction({ ...newDeduction, requiresDocumentation: checked })}
                  />
                </div>
                {!newDeduction.requiresDocumentation && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You should keep receipts or other documentation for all deductions. 
                      The ATO may request evidence to support your claims.
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  onClick={handleAddDeduction} 
                  className="w-full"
                  disabled={!newDeduction.description || newDeduction.amount <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deduction
                </Button>
              </CardContent>
            </Card>

            {/* Deductions List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Other Deductions</CardTitle>
                <CardDescription>{deductions.length} deductions recorded</CardDescription>
              </CardHeader>
              <CardContent>
                {deductions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MoreHorizontal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No deductions recorded</p>
                    <p className="text-sm">Add your first deduction above</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Docs</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deductions.map((deduction) => (
                        <TableRow key={deduction.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {DEDUCTION_TYPES.find(t => t.value === deduction.type)?.icon}
                              <span className="text-sm">
                                {DEDUCTION_TYPES.find(t => t.value === deduction.type)?.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{deduction.description}</p>
                              {deduction.notes && (
                                <p className="text-xs text-muted-foreground">{deduction.notes}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{deduction.date}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(deduction.amount)}
                          </TableCell>
                          <TableCell>
                            {deduction.requiresDocumentation ? (
                              <Badge variant="outline" className="bg-amber-50">
                                <Receipt className="h-3 w-3 mr-1" />
                                Needed
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Ready
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDeduction(deduction.id)}
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
                <CardTitle>ATO Guidelines - D15</CardTitle>
                <CardDescription>Other deductions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">When to Use D15</h4>
                  <p className="text-sm text-muted-foreground">
                    Use D15 only for deductions that don't fit into categories D1 through D14. 
                    Common items claimed here include election expenses, some foreign pension 
                    deductions, and other specific deductions allowed under tax law.
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Common D15 Deductions</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li><strong>Election expenses:</strong> Costs of contesting local, state, or federal elections</li>
                    <li><strong>Foreign pension deductions:</strong> Certain deductible amounts from foreign pensions</li>
                    <li><strong>Crowdfunding:</strong> Donations to registered DGRs via crowdfunding platforms</li>
                    <li><strong>Income protection:</strong> Insurance premiums for income protection (if work-related)</li>
                    <li><strong>Sunset industry payments:</strong> Specific deductions for declining industries</li>
                    <li><strong>Certain superannuation amounts:</strong> Deductions not claimed elsewhere</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">What You Cannot Claim</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Private or domestic expenses</li>
                    <li>Expenses that should be claimed in D1-D14</li>
                    <li>Capital expenses (unless specific provisions apply)</li>
                    <li>Expenses with no connection to earning income</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Record Keeping</h4>
                  <p className="text-sm text-muted-foreground">
                    Given that D15 is a catch-all category, it's especially important to maintain 
                    thorough documentation. Keep all receipts, invoices, and supporting evidence 
                    for at least 5 years. The ATO may request additional information for unusual 
                    or large deductions claimed in this category.
                  </p>
                </div>
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Seek Advice:</strong> If you're unsure whether an expense should be 
                    claimed in D15, consult a registered tax agent or the ATO. Incorrect claims 
                    can result in penalties and interest charges.
                  </AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Audit Risk:</strong> The ATO pays close attention to D15 claims as 
                    this category can be used to claim non-deductible expenses. Ensure you have 
                    a clear basis in tax law for any deduction claimed here.
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
