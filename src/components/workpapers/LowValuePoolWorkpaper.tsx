import { useState, useMemo } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  Package,
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowRight,
  Info,
  X,
  ExternalLink,
  FileText,
  Wallet,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLowValuePool } from '@/hooks/useLowValuePool';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ATO_D6_GUIDANCE,
  LOW_VALUE_POOL_FIRST_YEAR_RATE,
  LOW_VALUE_POOL_SUBSEQUENT_RATE,
  LOW_VALUE_POOL_THRESHOLD,
  type DisposalType,
} from '@/lib/low-value-pool';

interface LowValuePoolWorkpaperProps {
  taxYear?: string;
}

export default function LowValuePoolWorkpaper({ taxYear }: LowValuePoolWorkpaperProps) {
  const lowValuePool = useLowValuePool({ taxYear });
  const {
    workpaper,
    addAsset,
    removeAsset,
    disposeAsset,
    setOpeningBalance,
    exportData,
    validation,
    stats,
    reset,
    isEligible,
  } = lowValuePool;

  const [activeTab, setActiveTab] = useState('summary');
  const [showAddAssetDialog, setShowAddAssetDialog] = useState(false);
  const [showDisposalDialog, setShowDisposalDialog] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Form states
  const [assetForm, setAssetForm] = useState({
    description: '',
    cost: '',
    acquisitionDate: '',
    isFirstYear: true,
    openingBalance: '',
  });

  const [disposalForm, setDisposalForm] = useState({
    date: '',
    type: 'sale' as DisposalType,
    salePrice: '',
    terminationValue: '',
  });

  const [openingBalanceForm, setOpeningBalanceForm] = useState(
    workpaper.priorYearClosingBalance?.toString() || ''
  );

  const handleAddAsset = () => {
    const cost = parseFloat(assetForm.cost);
    if (!assetForm.description || !cost || !assetForm.acquisitionDate) return;

    if (!isEligible(cost)) {
      return;
    }

    addAsset({
      description: assetForm.description,
      cost,
      acquisitionDate: assetForm.acquisitionDate,
      isFirstYear: assetForm.isFirstYear,
      openingBalance: assetForm.isFirstYear ? undefined : parseFloat(assetForm.openingBalance) || undefined,
    });

    setAssetForm({
      description: '',
      cost: '',
      acquisitionDate: '',
      isFirstYear: true,
      openingBalance: '',
    });
    setShowAddAssetDialog(false);
  };

  const handleDisposeAsset = () => {
    if (!selectedAssetId || !disposalForm.date) return;

    const disposal: {
      date: string;
      type: DisposalType;
      salePrice?: number;
      terminationValue?: number;
    } = {
      date: disposalForm.date,
      type: disposalForm.type,
    };

    if (disposalForm.type === 'sale') {
      disposal.salePrice = parseFloat(disposalForm.salePrice) || 0;
    } else {
      disposal.terminationValue = parseFloat(disposalForm.terminationValue) || 0;
    }

    disposeAsset(selectedAssetId, disposal);

    setDisposalForm({
      date: '',
      type: 'sale',
      salePrice: '',
      terminationValue: '',
    });
    setSelectedAssetId(null);
    setShowDisposalDialog(false);
  };

  const handleSetOpeningBalance = () => {
    const balance = parseFloat(openingBalanceForm) || 0;
    setOpeningBalance(balance);
  };

  const handleExport = () => {
    if (!exportData) return;
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `D6-low-value-pool-${workpaper.taxYear}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openDisposalDialog = (assetId: string) => {
    setSelectedAssetId(assetId);
    setShowDisposalDialog(true);
  };

  const activeAssets = workpaper.assets.filter(a => a.status !== 'disposed');
  const disposedAssets = workpaper.assets.filter(a => a.status === 'disposed');

  // Calculate pool utilization percentage
  const poolUtilization = useMemo(() => {
    if (stats.totalAssets === 0) return 0;
    const maxAssets = 20; // Arbitrary maximum for visual purposes
    return Math.min((stats.totalAssets / maxAssets) * 100, 100);
  }, [stats.totalAssets]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">D6 Low-Value Pool</h1>
          <p className="text-muted-foreground mt-2">
            Tax Year {workpaper.taxYear} • Depreciating assets under $1,000
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!exportData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Validation Alerts */}
      {!validation.isValid && validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {validation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Notices</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pool Assets</CardDescription>
            <CardTitle className="text-3xl">{stats.activeAssets}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{stats.firstYearAssets} new, {stats.subsequentYearAssets} existing</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Asset Cost</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(stats.totalCost)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Active assets only</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Decline in Value</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(workpaper.summary.totalDeclineInValue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              <span>This tax year</span>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.isComplete ? "bg-primary/5 border-primary/20" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>D6 Deduction</CardDescription>
            <CardTitle className="text-3xl text-primary">{formatCurrency(workpaper.summary.deductibleAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Claimable amount</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pool Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Pool Balance Overview
          </CardTitle>
          <CardDescription>Track your low-value pool balance through the tax year</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pool Utilization</span>
              <span className="font-medium">{stats.activeAssets} assets</span>
            </div>
            <Progress value={poolUtilization} className="h-2" />
          </div>

          {/* Balance Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Opening Balance</p>
              <p className="text-2xl font-semibold">{formatCurrency(workpaper.summary.openingBalance)}</p>
              <p className="text-xs text-muted-foreground">From prior year</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">New Assets</p>
              <p className="text-2xl font-semibold text-green-600">+{formatCurrency(workpaper.summary.newAssetsCost)}</p>
              <p className="text-xs text-muted-foreground">Added this year</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Disposals</p>
              <p className="text-2xl font-semibold text-red-600">
                -{formatCurrency(workpaper.summary.disposalsTerminationValue)}
              </p>
              <p className="text-xs text-muted-foreground">Termination value</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Closing Balance</p>
              <p className="text-2xl font-semibold text-primary">{formatCurrency(workpaper.summary.closingBalance)}</p>
              <p className="text-xs text-muted-foreground">Carried forward</p>
            </div>
          </div>

          {/* Opening Balance Input */}
          <div className="flex items-end gap-4 pt-4 border-t">
            <div className="flex-1 space-y-2">
              <Label htmlFor="openingBalance">Prior Year Closing Balance (Optional)</Label>
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={openingBalanceForm}
                onChange={(e) => setOpeningBalanceForm(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter your closing balance from last year's tax return
              </p>
            </div>
            <Button onClick={handleSetOpeningBalance}>
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Pool Summary</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="disposals">Disposals</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        {/* Pool Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>D6 Low-Value Pool Calculation</CardTitle>
              <CardDescription>Detailed breakdown of your pool calculation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calculation Steps */}
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Opening Balance (prior year)</span>
                  <span className="font-medium">{formatCurrency(workpaper.summary.openingBalance)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Add: New assets this year</span>
                  <span className="font-medium text-green-600">+{formatCurrency(workpaper.summary.newAssetsCost)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Less: Disposals (termination value)</span>
                  <span className="font-medium text-red-600">-{formatCurrency(workpaper.summary.disposalsTerminationValue)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">Pool Balance Before Depreciation</span>
                  <span className="font-medium">
                    {formatCurrency(workpaper.summary.openingBalance + workpaper.summary.newAssetsCost - workpaper.summary.disposalsTerminationValue)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Less: Decline in Value</span>
                  <div className="text-right">
                    <span className="font-medium text-red-600">-{formatCurrency(workpaper.summary.totalDeclineInValue)}</span>
                    <p className="text-xs text-muted-foreground">
                      {stats.firstYearAssets > 0 && `${stats.firstYearAssets} × 18.75%`}
                      {stats.firstYearAssets > 0 && stats.subsequentYearAssets > 0 && ' + '}
                      {stats.subsequentYearAssets > 0 && `${stats.subsequentYearAssets} × 37.5%`}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center py-3 text-lg font-semibold bg-primary/5 rounded-lg px-4 -mx-4">
                  <span>Closing Balance</span>
                  <span className="text-primary">{formatCurrency(workpaper.summary.closingBalance)}</span>
                </div>
              </div>

              <Separator />

              {/* Deduction Summary */}
              <div className="flex justify-between items-center py-3 text-xl font-bold">
                <span>D6 Deduction Amount</span>
                <span className="text-primary">{formatCurrency(workpaper.summary.deductibleAmount)}</span>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This amount should be entered at Item D6 on your tax return. Keep all receipts and records for at least 5 years.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Asset Summary by Year */}
          {stats.firstYearAssets > 0 && stats.subsequentYearAssets > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Asset Breakdown by Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Percent className="h-4 w-4 text-primary" />
                      <span className="font-medium">18.75% Rate (First Year)</span>
                    </div>
                    <p className="text-2xl font-semibold">
                      {stats.firstYearAssets} asset{stats.firstYearAssets !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      For assets acquired during this tax year
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Percent className="h-4 w-4 text-primary" />
                      <span className="font-medium">37.5% Rate (Subsequent)</span>
                    </div>
                    <p className="text-2xl font-semibold">
                      {stats.subsequentYearAssets} asset{stats.subsequentYearAssets !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      For assets from prior tax years
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Pool Assets</h2>
              <p className="text-sm text-muted-foreground">
                Assets must cost less than {formatCurrency(LOW_VALUE_POOL_THRESHOLD)}
              </p>
            </div>
            <Button onClick={() => setShowAddAssetDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>

          {activeAssets.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No assets in the pool</h3>
              <p className="text-muted-foreground mb-4">
                Add your first low-value asset to start calculating depreciation
              </p>
              <Button onClick={() => setShowAddAssetDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-center">Rate</TableHead>
                      <TableHead className="text-right">Decline</TableHead>
                      <TableHead className="text-right">Closing</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{asset.description}</p>
                            {asset.status === 'fully_depreciated' && (
                              <Badge variant="secondary" className="text-xs">Fully Depreciated</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(asset.acquisitionDate)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(asset.cost)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={asset.isFirstYear ? "default" : "secondary"}>
                            {asset.isFirstYear ? '18.75%' : '37.5%'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          -{formatCurrency(asset.declineInValue || 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(asset.closingBalance || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDisposalDialog(asset.id)}
                            >
                              Sell/Dispose
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAsset(asset.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>

        {/* Disposals Tab */}
        <TabsContent value="disposals" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Asset Disposals</h2>
              <p className="text-sm text-muted-foreground">
                Track assets that have been sold, scrapped, or no longer used
              </p>
            </div>
          </div>

          {disposedAssets.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No disposals recorded</h3>
              <p className="text-muted-foreground mb-4">
                Dispose of assets from the Assets tab when you sell or scrap them
              </p>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Disposal Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Written Down Value</TableHead>
                      <TableHead className="text-right">Termination Value</TableHead>
                      <TableHead className="text-right">Adjustment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disposedAssets.map((asset) => {
                      const writtenDownValue = asset.isFirstYear
                        ? asset.cost - (asset.declineInValue || 0)
                        : (asset.openingBalance || 0) - (asset.declineInValue || 0);
                      
                      const terminationValue = asset.disposal?.terminationValue || asset.disposal?.salePrice || 0;
                      const adjustment = (asset.disposal?.balancingAdjustment || 0);

                      return (
                        <TableRow key={asset.id}>
                          <TableCell>
                            <p className="font-medium">{asset.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Original cost: {formatCurrency(asset.cost)}
                            </p>
                          </TableCell>
                          <TableCell>
                            {asset.disposal ? formatDate(asset.disposal.date) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {asset.disposal?.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(writtenDownValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(terminationValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={adjustment > 0 ? 'text-red-600' : adjustment < 0 ? 'text-green-600' : ''}>
                              {adjustment > 0 ? '+' : ''}{formatCurrency(adjustment)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}

          {disposedAssets.length > 0 && (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Balancing Adjustment:</strong> If the termination value exceeds the written-down value, 
                the difference is assessable income. If it's less, you may have an additional deduction.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About Low-Value Pools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Eligible Assets</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {ATO_D6_GUIDANCE.eligibleAssets.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Ineligible Assets</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {ATO_D6_GUIDANCE.ineligibleAssets.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Depreciation Rates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium text-lg">18.75%</p>
                    <p className="text-sm text-muted-foreground">For assets acquired during the current tax year</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium text-lg">37.5%</p>
                    <p className="text-sm text-muted-foreground">For assets already in the pool from prior years</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Record Keeping Requirements</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {ATO_D6_GUIDANCE.recordKeeping.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  For more information, visit the{' '}
                  <a
                    href={ATO_D6_GUIDANCE.reference}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ATO website
                  </a>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Asset Dialog */}
      <Dialog open={showAddAssetDialog} onOpenChange={setShowAddAssetDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Asset to Pool</DialogTitle>
            <DialogDescription>
              Add a low-value asset (costing less than {formatCurrency(LOW_VALUE_POOL_THRESHOLD)})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Office chair, Printer, etc."
                value={assetForm.description}
                onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={assetForm.cost}
                  onChange={(e) => setAssetForm({ ...assetForm, cost: e.target.value })}
                />
                {assetForm.cost && !isEligible(parseFloat(assetForm.cost)) && (
                  <p className="text-xs text-destructive">
                    Must be less than {formatCurrency(LOW_VALUE_POOL_THRESHOLD)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="acquisitionDate">Acquisition Date</Label>
                <Input
                  id="acquisitionDate"
                  type="date"
                  value={assetForm.acquisitionDate}
                  onChange={(e) => setAssetForm({ ...assetForm, acquisitionDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="isFirstYear" className="cursor-pointer">
                Acquired in current tax year
              </Label>
              <Switch
                id="isFirstYear"
                checked={assetForm.isFirstYear}
                onCheckedChange={(checked) => setAssetForm({ ...assetForm, isFirstYear: checked })}
              />
            </div>

            {!assetForm.isFirstYear && (
              <div className="space-y-2">
                <Label htmlFor="openingBalance">Opening Balance (written down value)</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={assetForm.openingBalance}
                  onChange={(e) => setAssetForm({ ...assetForm, openingBalance: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  The depreciated value from prior years
                </p>
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Percent className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {assetForm.isFirstYear ? '18.75%' : '37.5%'} depreciation rate
                </span>
              </div>
              <p className="text-muted-foreground">
                {assetForm.isFirstYear
                  ? 'First year assets use 18.75% rate'
                  : 'Subsequent year assets use 37.5% rate'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAssetDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddAsset}
              disabled={
                !assetForm.description ||
                !assetForm.cost ||
                !assetForm.acquisitionDate ||
                !isEligible(parseFloat(assetForm.cost))
              }
            >
              Add Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disposal Dialog */}
      <Dialog open={showDisposalDialog} onOpenChange={setShowDisposalDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispose of Asset</DialogTitle>
            <DialogDescription>
              Record the disposal of an asset from the pool
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disposalDate">Disposal Date</Label>
              <Input
                id="disposalDate"
                type="date"
                value={disposalForm.date}
                onChange={(e) => setDisposalForm({ ...disposalForm, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disposalType">Disposal Type</Label>
              <Select
                value={disposalForm.type}
                onValueChange={(value: DisposalType) => 
                  setDisposalForm({ ...disposalForm, type: value })
                }
              >
                <SelectTrigger id="disposalType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="scrapped">Scrapped</SelectItem>
                  <SelectItem value="no_longer_used">No Longer Used</SelectItem>
                  <SelectItem value="lost_stolen">Lost or Stolen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {disposalForm.type === 'sale' ? (
              <div className="space-y-2">
                <Label htmlFor="salePrice">Sale Price</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={disposalForm.salePrice}
                  onChange={(e) => setDisposalForm({ ...disposalForm, salePrice: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="terminationValue">Termination Value</Label>
                <Input
                  id="terminationValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={disposalForm.terminationValue}
                  onChange={(e) => setDisposalForm({ ...disposalForm, terminationValue: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Estimated value if scrapped, or insurance payout if lost/stolen
                </p>
              </div>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The balancing adjustment will be calculated automatically based on the 
                difference between the written-down value and the termination value.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisposalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDisposeAsset} disabled={!disposalForm.date}>
              Record Disposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
