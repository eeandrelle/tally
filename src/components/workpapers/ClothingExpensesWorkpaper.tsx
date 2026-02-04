import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  Download,
  FileText,
  HelpCircle,
  Link2,
  Paintbrush,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  Search,
  Shirt,
  ShoppingBag,
  Trash2,
  Unlink,
  User,
  WashingMachine,
  AlertTriangle,
  Info,
  CheckCircle2,
  BadgeInfo,
  Shield,
  HardHat,
  ChefHat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getReceiptsByDateRange, type Receipt as DbReceipt } from '@/lib/db';
import { useClothingExpenses } from '@/hooks/useClothingExpenses';
import { CLOTHING_TYPES, LAUNDRY_METHODS, ClothingType } from '@/lib/clothing-expenses';

interface ReceiptLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (receiptId: string, receiptUrl?: string) => void;
  expenseType: 'clothing' | 'laundry';
  expenseDate?: string;
}

function ReceiptLinkDialog({ isOpen, onClose, onLink, expenseType, expenseDate }: ReceiptLinkDialogProps) {
  const [receipts, setReceipts] = useState<DbReceipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadReceipts();
    }
  }, [isOpen, expenseDate]);

  const loadReceipts = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const data = await getReceiptsByDateRange(startDate, endDate);
      setReceipts(data);
    } catch (error) {
      console.error('Failed to load receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = !searchQuery ||
      r.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !expenseDate || r.date === expenseDate;
    return matchesSearch && matchesDate;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Receipt</DialogTitle>
          <DialogDescription>
            Select a receipt to link to this {expenseType} expense
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search receipts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading receipts...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-50" />
              <p>No receipts found</p>
              <p className="text-sm">Try adjusting your search or date filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReceipts.map((receipt) => (
                <button
                  key={receipt.id}
                  onClick={() => {
                    onLink(String(receipt.id), receipt.image_path);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{receipt.vendor || 'Unknown Vendor'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(receipt.date)} • {formatCurrency(receipt.amount)}
                      </p>
                      {receipt.notes && (
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {receipt.notes}
                        </p>
                      )}
                    </div>
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ClothingExpensesWorkpaperProps {
  taxYear?: string;
}

const CLOTHING_TYPE_ICONS: Record<ClothingType, React.ReactNode> = {
  'compulsory-uniform': <Shirt className="h-4 w-4" />,
  'occupation-specific': <ChefHat className="h-4 w-4" />,
  'protective': <HardHat className="h-4 w-4" />,
  'non-claimable': <BadgeInfo className="h-4 w-4" />,
};

const LAUNDRY_METHOD_ICONS: Record<string, React.ReactNode> = {
  'home': <WashingMachine className="h-4 w-4" />,
  'laundromat': <WashingMachine className="h-4 w-4" />,
  'dry-cleaner': <Paintbrush className="h-4 w-4" />,
};

export function ClothingExpensesWorkpaper({ taxYear = new Date().getFullYear().toString() }: ClothingExpensesWorkpaperProps) {
  const {
    workpaper,
    totals,
    validation,
    updateEmployeeInfo,
    setUseReasonableLaundryRate,
    addClothingExpense,
    updateClothingExpense,
    deleteClothingExpense,
    linkClothingReceipt,
    unlinkClothingReceipt,
    addLaundryExpense,
    updateLaundryExpense,
    deleteLaundryExpense,
    linkLaundryReceipt,
    unlinkLaundryReceipt,
    updateNotes,
    reset,
    exportData,
    save,
    reasonableLaundryRates,
  } = useClothingExpenses(taxYear);

  const [activeTab, setActiveTab] = useState('employee');
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Receipt linking state
  const [receiptDialog, setReceiptDialog] = useState<{
    isOpen: boolean;
    expenseType: 'clothing' | 'laundry';
    expenseId: string;
    expenseDate?: string;
  }>({
    isOpen: false,
    expenseType: 'clothing',
    expenseId: '',
  });

  // Form states
  const [newClothing, setNewClothing] = useState({
    date: '',
    description: '',
    type: 'compulsory-uniform' as ClothingType,
    amount: '',
    vendor: '',
    isLaundry: false,
  });

  const [newLaundry, setNewLaundry] = useState({
    date: '',
    description: '',
    method: 'home' as const,
    amount: '',
    loads: '',
    vendor: '',
  });

  const handleAddClothing = () => {
    if (newClothing.description && newClothing.amount) {
      addClothingExpense({
        date: newClothing.date,
        description: newClothing.description,
        type: newClothing.type,
        amount: parseFloat(newClothing.amount),
        vendor: newClothing.vendor || undefined,
        isLaundry: newClothing.isLaundry,
      });
      setNewClothing({ date: '', description: '', type: 'compulsory-uniform', amount: '', vendor: '', isLaundry: false });
    }
  };

  const handleAddLaundry = () => {
    if (newLaundry.description && newLaundry.amount) {
      let amount = parseFloat(newLaundry.amount);
      
      // If using reasonable rate and home laundry, calculate from loads
      if (workpaper.useReasonableLaundryRate && newLaundry.method === 'home' && newLaundry.loads) {
        amount = parseInt(newLaundry.loads) * reasonableLaundryRates.home;
      }
      
      addLaundryExpense({
        date: newLaundry.date,
        description: newLaundry.description,
        method: newLaundry.method,
        amount,
        loads: newLaundry.loads ? parseInt(newLaundry.loads) : undefined,
        vendor: newLaundry.vendor || undefined,
      });
      setNewLaundry({ date: '', description: '', method: 'home', amount: '', loads: '', vendor: '' });
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clothing-expenses-${workpaper.employeeName || 'export'}-${taxYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Info cards for clothing types
  const ClothingTypeInfo = ({ type }: { type: ClothingType }) => {
    const info = CLOTHING_TYPES[type];
    return (
      <div className="text-sm space-y-2">
        <p className="text-muted-foreground">{info.description}</p>
        <div>
          <p className="font-medium text-xs">Examples:</p>
          <ul className="text-xs text-muted-foreground list-disc list-inside">
            {info.examples.slice(0, 3).map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">D3 Clothing & Laundry Workpaper</h1>
            <p className="text-muted-foreground">
              Work-related clothing and laundry expense claims for {taxYear}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowResetDialog(true)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" onClick={save}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleExport} disabled={!validation.valid || totals.claimableTotal === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Validation alerts */}
        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation.warnings.length > 0 && (
          <Alert className="bg-yellow-500/10 border-yellow-500/50">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validation.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation.info.length > 0 && (
          <Alert className="bg-blue-500/10 border-blue-500/50">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validation.info.map((info, i) => (
                  <li key={i}>{info}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation.valid && totals.claimableTotal > 0 && validation.warnings.length === 0 && (
          <Alert className="bg-green-500/10 border-green-500/50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Workpaper complete. Total claimable amount: {formatCurrency(totals.claimableTotal)}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Claim</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.claimableTotal)}</div>
              <p className="text-xs text-muted-foreground">Claimable amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clothing</CardTitle>
              <Shirt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totals.clothing['compulsory-uniform'] + totals.clothing['occupation-specific'] + totals.clothing.protective)}
              </div>
              <p className="text-xs text-muted-foreground">
                {workpaper.clothingExpenses.filter(e => e.type !== 'non-claimable').length} claimable items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Laundry</CardTitle>
              <WashingMachine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.laundry.total)}</div>
              <p className="text-xs text-muted-foreground">
                {workpaper.laundryExpenses.length} expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receipt Coverage</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {(() => {
                const totalItems = workpaper.clothingExpenses.length + workpaper.laundryExpenses.length;
                const withReceipts = 
                  workpaper.clothingExpenses.filter(e => e.receiptUrl).length +
                  workpaper.laundryExpenses.filter(e => e.receiptUrl).length;
                const coverage = totalItems > 0 ? Math.round((withReceipts / totalItems) * 100) : 0;
                
                return (
                  <>
                    <div className={`text-2xl font-bold ${coverage === 100 ? 'text-green-500' : coverage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {coverage}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {withReceipts} of {totalItems} items have receipts
                    </p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="employee">Employee Info</TabsTrigger>
            <TabsTrigger value="clothing">Clothing</TabsTrigger>
            <TabsTrigger value="laundry">Laundry</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Employee Info Tab */}
          <TabsContent value="employee" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Employee Information</CardTitle>
                <CardDescription>
                  Enter your employment details for this clothing expense claim
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="employeeName">Employee Name *</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="employeeName"
                        placeholder="Your full name"
                        value={workpaper.employeeName}
                        onChange={(e) => updateEmployeeInfo({
                          employeeName: e.target.value,
                          employerName: workpaper.employerName,
                          employerRequiresUniform: workpaper.employerRequiresUniform,
                          uniformDescription: workpaper.uniformDescription,
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employerName">Employer Name *</Label>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="employerName"
                        placeholder="Company name"
                        value={workpaper.employerName}
                        onChange={(e) => updateEmployeeInfo({
                          employeeName: workpaper.employeeName,
                          employerName: e.target.value,
                          employerRequiresUniform: workpaper.employerRequiresUniform,
                          uniformDescription: workpaper.uniformDescription,
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="requiresUniform"
                    checked={workpaper.employerRequiresUniform}
                    onCheckedChange={(checked) => updateEmployeeInfo({
                      employeeName: workpaper.employeeName,
                      employerName: workpaper.employerName,
                      employerRequiresUniform: checked,
                      uniformDescription: workpaper.uniformDescription,
                    })}
                  />
                  <Label htmlFor="requiresUniform">
                    My employer requires me to wear a specific uniform
                  </Label>
                </div>

                {workpaper.employerRequiresUniform && (
                  <div className="space-y-2">
                    <Label htmlFor="uniformDescription">Uniform Description</Label>
                    <Textarea
                      id="uniformDescription"
                      placeholder="Describe the required uniform (e.g., 'Navy blue polo shirt with company logo, black pants')"
                      value={workpaper.uniformDescription || ''}
                      onChange={(e) => updateEmployeeInfo({
                        employeeName: workpaper.employeeName,
                        employerName: workpaper.employerName,
                        employerRequiresUniform: workpaper.employerRequiresUniform,
                        uniformDescription: e.target.value,
                      })}
                      rows={3}
                    />
                  </div>
                )}

                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription>
                    You can claim clothing expenses if you purchase uniforms your employer requires you to wear,
                    occupation-specific clothing (like chef's pants), or protective clothing (like hi-vis vests).
                    You cannot claim conventional clothing like suits or dress shirts, even if required for work.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clothing Tab */}
          <TabsContent value="clothing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Clothing Item</CardTitle>
                <CardDescription>Record work-related clothing purchases</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-6">
                  <div className="md:col-span-1">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newClothing.date}
                      onChange={(e) => setNewClothing({ ...newClothing, date: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="e.g., Company branded polo shirts (pack of 3)"
                      value={newClothing.description}
                      onChange={(e) => setNewClothing({ ...newClothing, description: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Type</Label>
                    <Select
                      value={newClothing.type}
                      onValueChange={(value) => setNewClothing({ ...newClothing, type: value as ClothingType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CLOTHING_TYPES).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1">
                    <Label>Vendor</Label>
                    <Input
                      placeholder="e.g., Uniforms R Us"
                      value={newClothing.vendor}
                      onChange={(e) => setNewClothing({ ...newClothing, vendor: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newClothing.amount}
                      onChange={(e) => setNewClothing({ ...newClothing, amount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Clothing type info */}
                <ClothingTypeInfo type={newClothing.type} />

                <Button onClick={handleAddClothing} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Clothing Item
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clothing Expenses</CardTitle>
                <CardDescription>
                  {workpaper.clothingExpenses.length} item(s) totaling {formatCurrency(totals.clothing.total)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workpaper.clothingExpenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shirt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No clothing expenses added yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workpaper.clothingExpenses.map((exp) => (
                        <TableRow key={exp.id} className={exp.type === 'non-claimable' ? 'opacity-50' : ''}>
                          <TableCell>{exp.date ? formatDate(exp.date) : '-'}</TableCell>
                          <TableCell>{exp.description}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {CLOTHING_TYPE_ICONS[exp.type]}
                              <span className={exp.type === 'non-claimable' ? 'text-destructive' : ''}>
                                {CLOTHING_TYPES[exp.type].label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{exp.vendor || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {exp.receiptUrl ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => unlinkClothingReceipt(exp.id)}
                                  title="Unlink receipt"
                                >
                                  <Unlink className="h-4 w-4 text-green-500" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setReceiptDialog({
                                    isOpen: true,
                                    expenseType: 'clothing',
                                    expenseId: exp.id,
                                    expenseDate: exp.date,
                                  })}
                                  title="Link receipt"
                                >
                                  <Link2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteClothingExpense(exp.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Laundry Tab */}
          <TabsContent value="laundry" className="space-y-4">
            {/* Reasonable Rate Setting */}
            <Card>
              <CardHeader>
                <CardTitle>Laundry Calculation Method</CardTitle>
                <CardDescription>
                  Choose how to calculate your laundry expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Use ATO Reasonable Laundry Rates</Label>
                    <p className="text-sm text-muted-foreground">
                      ATO allows $1 per load for home laundry without receipts (under $150 total claim)
                    </p>
                  </div>
                  <Switch
                    checked={workpaper.useReasonableLaundryRate}
                    onCheckedChange={setUseReasonableLaundryRate}
                  />
                </div>

                {workpaper.useReasonableLaundryRate && (
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-muted p-3">
                      <p className="font-medium">Home Laundry</p>
                      <p className="text-2xl font-bold">${reasonableLaundryRates.home}</p>
                      <p className="text-xs text-muted-foreground">per load</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="font-medium">Laundromat</p>
                      <p className="text-2xl font-bold">${reasonableLaundryRates.laundromat}</p>
                      <p className="text-xs text-muted-foreground">per load</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="font-medium">Dry Cleaning</p>
                      <p className="text-sm text-muted-foreground">Actual receipts required</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Laundry Expense</CardTitle>
                <CardDescription>Record laundry and dry cleaning costs for work clothing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-6">
                  <div className="md:col-span-1">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newLaundry.date}
                      onChange={(e) => setNewLaundry({ ...newLaundry, date: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="e.g., Weekly work uniform washing"
                      value={newLaundry.description}
                      onChange={(e) => setNewLaundry({ ...newLaundry, description: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Method</Label>
                    <Select
                      value={newLaundry.method}
                      onValueChange={(value) => setNewLaundry({ ...newLaundry, method: value as typeof newLaundry.method })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LAUNDRY_METHODS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {workpaper.useReasonableLaundryRate && newLaundry.method === 'home' ? (
                    <div className="md:col-span-1">
                      <Label>Loads</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Number of loads"
                        value={newLaundry.loads}
                        onChange={(e) => {
                          const loads = e.target.value;
                          const amount = loads ? parseInt(loads) * reasonableLaundryRates.home : '';
                          setNewLaundry({ ...newLaundry, loads, amount: amount.toString() });
                        }}
                      />
                    </div>
                  ) : (
                    <div className="md:col-span-1">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newLaundry.amount}
                        onChange={(e) => setNewLaundry({ ...newLaundry, amount: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="md:col-span-1">
                    <Label>Vendor</Label>
                    <Input
                      placeholder="e.g., Sparkle Cleaners"
                      value={newLaundry.vendor}
                      onChange={(e) => setNewLaundry({ ...newLaundry, vendor: e.target.value })}
                    />
                  </div>
                </div>

                {workpaper.useReasonableLaundryRate && newLaundry.method === 'home' && newLaundry.loads && (
                  <div className="rounded-lg bg-primary/5 p-3 text-sm">
                    <p>
                      <span className="font-medium">Calculated amount: </span>
                      {newLaundry.loads} loads × ${reasonableLaundryRates.home} = {formatCurrency(parseInt(newLaundry.loads) * reasonableLaundryRates.home)}
                    </p>
                  </div>
                )}

                <Button onClick={handleAddLaundry} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Laundry Expense
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Laundry Expenses</CardTitle>
                <CardDescription>
                  {workpaper.laundryExpenses.length} expense(s) totaling {formatCurrency(totals.laundry.total)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workpaper.laundryExpenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <WashingMachine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No laundry expenses added yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workpaper.laundryExpenses.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell>{exp.date ? formatDate(exp.date) : '-'}</TableCell>
                          <TableCell>{exp.description}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {LAUNDRY_METHOD_ICONS[exp.method]}
                              <span>{LAUNDRY_METHODS[exp.method].label}</span>
                              {exp.loads && exp.method === 'home' && (
                                <span className="text-xs text-muted-foreground">({exp.loads} loads)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{exp.vendor || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {exp.receiptUrl ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => unlinkLaundryReceipt(exp.id)}
                                  title="Unlink receipt"
                                >
                                  <Unlink className="h-4 w-4 text-green-500" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setReceiptDialog({
                                    isOpen: true,
                                    expenseType: 'laundry',
                                    expenseId: exp.id,
                                    expenseDate: exp.date,
                                  })}
                                  title="Link receipt"
                                >
                                  <Link2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteLaundryExpense(exp.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workpaper Summary</CardTitle>
                <CardDescription>
                  Review your D3 clothing and laundry claim
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Employee Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Employee</p>
                    <p className="font-medium">{workpaper.employeeName || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employer</p>
                    <p className="font-medium">{workpaper.employerName || 'Not provided'}</p>
                  </div>
                </div>

                {workpaper.employerRequiresUniform && workpaper.uniformDescription && (
                  <div>
                    <p className="text-sm text-muted-foreground">Required Uniform</p>
                    <p className="font-medium">{workpaper.uniformDescription}</p>
                  </div>
                )}

                <Separator />

                {/* Claim Breakdown */}
                <div className="space-y-4">
                  <p className="font-medium">Claim Breakdown</p>

                  {/* Clothing breakdown */}
                  {totals.clothing['compulsory-uniform'] > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Compulsory Uniforms</span>
                      <span>{formatCurrency(totals.clothing['compulsory-uniform'])}</span>
                    </div>
                  )}
                  {totals.clothing['occupation-specific'] > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Occupation-Specific</span>
                      <span>{formatCurrency(totals.clothing['occupation-specific'])}</span>
                    </div>
                  )}
                  {totals.clothing['protective'] > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Protective Clothing</span>
                      <span>{formatCurrency(totals.clothing['protective'])}</span>
                    </div>
                  )}

                  {/* Laundry breakdown */}
                  {totals.laundry.total > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Laundry & Dry Cleaning</span>
                      <span>{formatCurrency(totals.laundry.total)}</span>
                    </div>
                  )}

                  {/* Non-claimable warning */}
                  {totals.clothing['non-claimable'] > 0 && (
                    <div className="flex items-center justify-between text-destructive">
                      <span>Non-Claimable Items (excluded)</span>
                      <span>{formatCurrency(totals.clothing['non-claimable'])}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Total Claimable Amount</span>
                    <span className="text-primary">{formatCurrency(totals.claimableTotal)}</span>
                  </div>
                </div>

                <Separator />

                {/* Item Counts */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm text-muted-foreground">Clothing Items</p>
                    <p className="text-2xl font-bold">
                      {workpaper.clothingExpenses.filter(e => e.type !== 'non-claimable').length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm text-muted-foreground">Laundry Expenses</p>
                    <p className="text-2xl font-bold">{workpaper.laundryExpenses.length}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm text-muted-foreground">Receipt Coverage</p>
                    {(() => {
                      const totalItems = workpaper.clothingExpenses.length + workpaper.laundryExpenses.length;
                      const withReceipts = 
                        workpaper.clothingExpenses.filter(e => e.receiptUrl).length +
                        workpaper.laundryExpenses.filter(e => e.receiptUrl).length;
                      const coverage = totalItems > 0 ? Math.round((withReceipts / totalItems) * 100) : 0;
                      
                      return (
                        <p className={`text-2xl font-bold ${coverage === 100 ? 'text-green-500' : coverage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {coverage}%
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information about this claim..."
                    value={workpaper.notes || ''}
                    onChange={(e) => updateNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Status */}
                {!validation.valid && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please complete all required fields before exporting.
                    </AlertDescription>
                  </Alert>
                )}

                {validation.valid && totals.claimableTotal > 0 && (
                  <Alert className="bg-green-500/10 border-green-500/50">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      Workpaper is complete and ready for export.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action buttons */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                  <Button 
                    onClick={handleExport} 
                    disabled={!validation.valid || totals.claimableTotal === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export for Tax Return
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reset Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Workpaper?</DialogTitle>
              <DialogDescription>
                This will clear all data for this clothing expenses workpaper. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => { reset(); setShowResetDialog(false); }}>
                Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Receipt Link Dialog */}
        <ReceiptLinkDialog
          isOpen={receiptDialog.isOpen}
          onClose={() => setReceiptDialog({ ...receiptDialog, isOpen: false })}
          onLink={(receiptId, receiptUrl) => {
            if (receiptDialog.expenseType === 'clothing') {
              linkClothingReceipt(receiptDialog.expenseId, receiptId, receiptUrl);
            } else if (receiptDialog.expenseType === 'laundry') {
              linkLaundryReceipt(receiptDialog.expenseId, receiptId, receiptUrl);
            }
          }}
          expenseType={receiptDialog.expenseType}
          expenseDate={receiptDialog.expenseDate}
        />
      </div>
    </TooltipProvider>
  );
}
