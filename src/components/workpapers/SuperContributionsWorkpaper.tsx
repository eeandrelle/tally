import { useState } from 'react';
import {
  Calculator,
  Download,
  FileCheck,
  HelpCircle,
  Info,
  Landmark,
  PiggyBank,
  Plus,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Percent,
  TrendingUp,
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
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { AtoCategoryBadge } from '@/components/ato/AtoCategoryBadge';
import { useSuperContributions, type SuperContribution } from '@/hooks/useSuperContributions';

const CONCESSIONAL_CAP = 30000; // 2024-25 cap

export function SuperContributionsWorkpaper() {
  const { contributions, addContribution, deleteContribution, getTotalContributions } = useSuperContributions();
  const [activeTab, setActiveTab] = useState('contributions');
  const [newContribution, setNewContribution] = useState<Partial<SuperContribution>>({
    fundName: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    noticeSubmitted: false,
    acknowledgmentReceived: false,
  });

  const handleAddContribution = () => {
    if (newContribution.fundName && newContribution.amount && newContribution.amount > 0) {
      addContribution({
        fundName: newContribution.fundName,
        amount: newContribution.amount,
        date: newContribution.date || new Date().toISOString().split('T')[0],
        noticeSubmitted: newContribution.noticeSubmitted ?? false,
        acknowledgmentReceived: newContribution.acknowledgmentReceived ?? false,
        noticeDate: newContribution.noticeDate,
        abn: newContribution.abn,
      });
      setNewContribution({
        fundName: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        noticeSubmitted: false,
        acknowledgmentReceived: false,
      });
    }
  };

  const handleExport = () => {
    const data = {
      category: 'D10',
      totalContributions: getTotalContributions(),
      concessionalCap: CONCESSIONAL_CAP,
      remainingCap: Math.max(0, CONCESSIONAL_CAP - getTotalContributions()),
      contributions: contributions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `D10-super-contributions-${new Date().getFullYear()}.json`;
    a.click();
  };

  const totalContributed = getTotalContributions();
  const capPercentage = Math.min((totalContributed / CONCESSIONAL_CAP) * 100, 100);
  const capRemaining = Math.max(0, CONCESSIONAL_CAP - totalContributed);
  const allAcknowledged = contributions.length > 0 && contributions.every(c => c.acknowledgmentReceived);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AtoCategoryBadge code="D10" size="lg" />
              <h2 className="text-2xl font-bold">Personal Super Contributions</h2>
            </div>
            <p className="text-muted-foreground">
              Claim personal (after-tax) contributions to your superannuation fund (D10)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setActiveTab('contributions')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contribution
            </Button>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> You must give your super fund a notice of intent to claim 
            AND receive acknowledgment BEFORE claiming. Without acknowledgment, the deduction is not valid.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Claimed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalContributed)}</div>
              <p className="text-xs text-muted-foreground">D10 Deduction Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Concessional Cap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(CONCESSIONAL_CAP)}</div>
              <p className="text-xs text-muted-foreground">2024-25 Annual Limit</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cap Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${capRemaining === 0 ? 'text-destructive' : 'text-green-500'}`}>
                {formatCurrency(capRemaining)}
              </div>
              <Progress value={capPercentage} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {allAcknowledged ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">All Valid</span>
                  </>
                ) : contributions.some(c => !c.acknowledgmentReceived) ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-medium">
                      {contributions.filter(c => !c.acknowledgmentReceived).length} Pending
                    </span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">No Contributions</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Acknowledgment required
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="guide">ATO Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="contributions" className="space-y-4">
            {/* Add New Contribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Super Contribution</CardTitle>
                <CardDescription>Record personal after-tax contributions to super</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Super Fund Name</Label>
                    <Input
                      placeholder="e.g., AustralianSuper"
                      value={newContribution.fundName}
                      onChange={(e) => setNewContribution({ ...newContribution, fundName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fund ABN (Optional)</Label>
                    <Input
                      placeholder="e.g., 90 794 984 288"
                      value={newContribution.abn || ''}
                      onChange={(e) => setNewContribution({ ...newContribution, abn: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contribution Date</Label>
                    <Input
                      type="date"
                      value={newContribution.date}
                      onChange={(e) => setNewContribution({ ...newContribution, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newContribution.amount || ''}
                      onChange={(e) => setNewContribution({ ...newContribution, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <Label className="font-semibold">Notice of Intent Status</Label>
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Notice Submitted to Fund</p>
                        <p className="text-xs text-muted-foreground">Section 290-170 notice provided</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={newContribution.noticeSubmitted}
                      onChange={(e) => setNewContribution({ ...newContribution, noticeSubmitted: e.target.checked })}
                      className="h-5 w-5"
                    />
                  </div>
                  {newContribution.noticeSubmitted && (
                    <div className="space-y-2">
                      <Label>Date Notice Submitted</Label>
                      <Input
                        type="date"
                        value={newContribution.noticeDate || ''}
                        onChange={(e) => setNewContribution({ ...newContribution, noticeDate: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Acknowledgment Received</p>
                        <p className="text-xs text-muted-foreground">Required BEFORE claiming deduction</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={newContribution.acknowledgmentReceived}
                      onChange={(e) => setNewContribution({ ...newContribution, acknowledgmentReceived: e.target.checked })}
                      className="h-5 w-5"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddContribution} 
                  className="w-full"
                  disabled={!newContribution.fundName || !newContribution.amount || newContribution.amount <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contribution
                </Button>
              </CardContent>
            </Card>

            {/* Contributions List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Super Contributions</CardTitle>
                <CardDescription>{contributions.length} contributions recorded</CardDescription>
              </CardHeader>
              <CardContent>
                {contributions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No contributions recorded yet</p>
                    <p className="text-sm">Add your first super contribution above</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fund</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Notice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contributions.map((contribution) => (
                        <TableRow key={contribution.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{contribution.fundName}</p>
                              {contribution.abn && (
                                <p className="text-xs text-muted-foreground">ABN: {contribution.abn}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{contribution.date}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(contribution.amount)}
                          </TableCell>
                          <TableCell>
                            {contribution.noticeSubmitted ? (
                              <Badge variant="outline" className="bg-blue-50">
                                Submitted
                              </Badge>
                            ) : (
                              <Badge variant="outline">Not Submitted</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {contribution.acknowledgmentReceived ? (
                              <Badge className="bg-green-500">Valid ✓</Badge>
                            ) : (
                              <Badge variant="destructive">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteContribution(contribution.id)}
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
                <CardTitle>ATO Guidelines - D10</CardTitle>
                <CardDescription>Personal superannuation contributions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Eligibility</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>You made personal (after-tax) contributions to super</li>
                    <li>Your fund is a complying super fund or RSA</li>
                    <li>You submitted a notice of intent to claim to your fund</li>
                    <li>You received acknowledgment from your fund (REQUIRED)</li>
                    <li>You are under 75 years old (some exceptions apply)</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Concessional Contributions Cap</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    The concessional contributions cap for 2024-25 is $30,000. This includes:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Employer super guarantee contributions</li>
                    <li>Salary sacrifice contributions</li>
                    <li>Personal contributions you claim as a tax deduction</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Contributions Tax</h4>
                  <p className="text-sm text-muted-foreground">
                    When you claim a deduction for personal super contributions, your super fund 
                    will deduct 15% contributions tax from the amount. This means your net benefit 
                    is your marginal tax rate minus 15%.
                  </p>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Timing:</strong> You must submit your notice of intent to claim by the 
                    earlier of: (a) when you lodge your tax return, or (b) the end of the next income year.
                  </AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical:</strong> You cannot claim a deduction without acknowledgment 
                    from your super fund. Keep the acknowledgment letter with your tax records permanently.
                  </AlertDescription>
                </Alert>
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Tax Savings Example
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    If your marginal tax rate is 32.5% and you contribute $10,000:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Tax deduction: $10,000 × 32.5% = $3,250 tax refund</li>
                    <li>• Contributions tax: $10,000 × 15% = $1,500</li>
                    <li>• Net benefit: $3,250 - $1,500 = $1,750</li>
                    <li>• Effective tax saving: 17.5%</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
