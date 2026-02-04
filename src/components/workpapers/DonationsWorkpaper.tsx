import { useState } from 'react';
import {
  Download,
  Heart,
  HelpCircle,
  Info,
  Landmark,
  Plus,
  Receipt,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Gift,
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
import { useDonations, type Donation, type DonationType } from '@/hooks/useDonations';

const DONATION_TYPES: { value: DonationType; label: string }[] = [
  { value: 'cash', label: 'Cash Donation' },
  { value: 'regular', label: 'Regular Giving' },
  { value: 'workplace', label: 'Workplace Giving' },
  { value: 'property', label: 'Property/Asset' },
  { value: 'shares', label: 'Shares' },
  { value: 'cultural', label: 'Cultural Gift' },
  { value: 'bequest', label: 'Bequest' },
  { value: 'political', label: 'Political Donation' },
];

export function DonationsWorkpaper() {
  const { donations, addDonation, deleteDonation, getTotalDonations, getDeductibleTotal } = useDonations();
  const [activeTab, setActiveTab] = useState('donations');
  const [newDonation, setNewDonation] = useState<Partial<Donation>>({
    type: 'cash',
    organization: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    dgrStatus: true,
  });

  const handleAddDonation = () => {
    if (newDonation.organization && newDonation.amount && newDonation.amount >= 2) {
      addDonation({
        type: newDonation.type as DonationType,
        organization: newDonation.organization,
        amount: newDonation.amount,
        date: newDonation.date || new Date().toISOString().split('T')[0],
        dgrStatus: newDonation.dgrStatus ?? true,
        receiptNumber: newDonation.receiptNumber,
        description: newDonation.description,
      });
      setNewDonation({
        type: 'cash',
        organization: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        dgrStatus: true,
      });
    }
  };

  const handleExport = () => {
    const data = {
      category: 'D8',
      totalDonations: getTotalDonations(),
      deductibleAmount: getDeductibleTotal(),
      donations: donations,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `D8-donations-${new Date().getFullYear()}.json`;
    a.click();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AtoCategoryBadge code="D8" size="lg" />
              <h2 className="text-2xl font-bold">Gifts & Donations</h2>
            </div>
            <p className="text-muted-foreground">
              Claim donations of $2 or more to Deductible Gift Recipients (DGRs)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setActiveTab('donations')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Donation
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Donations must be $2 or more to a Deductible Gift Recipient (DGR). 
            The donation must be a genuine gift with no material benefit received in return.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deductible Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(getDeductibleTotal())}</div>
              <p className="text-xs text-muted-foreground">D8 Claim Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(getTotalDonations())}</div>
              <p className="text-xs text-muted-foreground">Across {donations.length} donations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">DGR Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {donations.every(d => d.dgrStatus) ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">All Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-medium">
                      {donations.filter(d => !d.dgrStatus).length} Non-DGR
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Check DGR status at ABN Lookup
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="donations">Donations</TabsTrigger>
            <TabsTrigger value="guide">ATO Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="donations" className="space-y-4">
            {/* Add New Donation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Donation</CardTitle>
                <CardDescription>Record donations to deductible gift recipients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Donation Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                      value={newDonation.type}
                      onChange={(e) => setNewDonation({ ...newDonation, type: e.target.value as DonationType })}
                    >
                      {DONATION_TYPES.map((t) => (
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
                      value={newDonation.date}
                      onChange={(e) => setNewDonation({ ...newDonation, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input
                    placeholder="e.g., Australian Red Cross"
                    value={newDonation.organization}
                    onChange={(e) => setNewDonation({ ...newDonation, organization: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input
                      type="number"
                      min="2"
                      step="0.01"
                      placeholder="0.00"
                      value={newDonation.amount || ''}
                      onChange={(e) => setNewDonation({ ...newDonation, amount: parseFloat(e.target.value) })}
                    />
                    {newDonation.amount && newDonation.amount < 2 && (
                      <p className="text-xs text-destructive">Minimum donation is $2</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt Number (Optional)</Label>
                    <Input
                      placeholder="e.g., RCP-2024-001"
                      value={newDonation.receiptNumber || ''}
                      onChange={(e) => setNewDonation({ ...newDonation, receiptNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="e.g., Emergency appeal, Monthly donation"
                    value={newDonation.description || ''}
                    onChange={(e) => setNewDonation({ ...newDonation, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="font-medium">DGR Status Confirmed</Label>
                      <p className="text-xs text-muted-foreground">Organization is a Deductible Gift Recipient</p>
                    </div>
                  </div>
                  <Switch
                    checked={newDonation.dgrStatus}
                    onCheckedChange={(checked) => setNewDonation({ ...newDonation, dgrStatus: checked })}
                  />
                </div>
                {!newDonation.dgrStatus && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Non-DGR donations are generally not tax deductible. Verify at ABN Lookup.
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  onClick={handleAddDonation} 
                  className="w-full"
                  disabled={!newDonation.organization || !newDonation.amount || newDonation.amount < 2}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Donation
                </Button>
              </CardContent>
            </Card>

            {/* Donations List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Donations History</CardTitle>
                <CardDescription>{donations.length} donations recorded</CardDescription>
              </CardHeader>
              <CardContent>
                {donations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No donations recorded yet</p>
                    <p className="text-sm">Add your first donation above</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donations.map((donation) => (
                        <TableRow key={donation.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{donation.organization}</p>
                              {donation.description && (
                                <p className="text-xs text-muted-foreground">{donation.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {DONATION_TYPES.find(t => t.value === donation.type)?.label}
                          </TableCell>
                          <TableCell>{donation.date}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(donation.amount)}
                          </TableCell>
                          <TableCell>
                            {donation.dgrStatus ? (
                              <Badge variant="default" className="bg-green-500">DGR ✓</Badge>
                            ) : (
                              <Badge variant="destructive">Non-DGR</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDonation(donation.id)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>What You Can Claim</CardTitle>
                  <CardDescription>Genuine gifts to DGR organizations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">Cash donations of $2 or more</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">Regular giving programs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">Workplace giving through payroll</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">Property and shares (special rules)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">Cultural gifts program</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">Bequests and testamentary gifts</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>What You Cannot Claim</CardTitle>
                  <CardDescription>Not deductible</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <span className="text-sm">Raffle or lottery tickets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <span className="text-sm">Charity auction purchases</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <span className="text-sm">Volunteering time and services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <span className="text-sm">Donations to non-DGR organizations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <span className="text-sm">Merchandise purchased from charity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <span className="text-sm">Donations where you received a benefit</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Important Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Minimum $2:</strong> Only donations of $2 or more are tax deductible.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Landmark className="h-4 w-4" />
                  <AlertDescription>
                    <strong>DGR Status:</strong> Always check that the organization is a Deductible Gift Recipient. 
                    You can verify this at the{' '}
                    <a 
                      href="https://abr.business.gov.au/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      ABN Lookup
                    </a>{' '}
                    website.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Receipt className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Receipts:</strong> Keep receipts for all donations. Many charities provide annual 
                    summaries which you can use instead of individual receipts.
                  </AlertDescription>
                </Alert>
                <Separator />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Political Donations</p>
                  <p>
                    Political donations have different rules and limits. They may not be deductible 
                    in the same way as charitable donations. Check with the ATO or your tax agent 
                    for specific advice on political contributions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
