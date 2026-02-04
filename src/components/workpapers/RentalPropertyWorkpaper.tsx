import { useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Save,
  Download,
  RotateCcw,
  DollarSign,
  Receipt,
  Calculator,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Link2,
  Unlink,
  Copy,
  FileText,
  Wrench,
  Search,
  HelpCircle,
  Home,
  TrendingUp,
  TrendingDown,
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getReceiptsByDateRange, type Receipt as DbReceipt } from '@/lib/db';
import { useRentalProperty } from '@/hooks/useRentalProperty';
import {
  EXPENSE_CATEGORIES,
  RentalExpenseCategory,
  getCapitalWorksRate,
  formatAddress,
} from '@/lib/rental-property';

interface ReceiptLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (receiptId: string, receiptUrl?: string) => void;
  itemType: 'income' | 'expense';
  itemDate?: string;
}

function ReceiptLinkDialog({ isOpen, onClose, onLink, itemType, itemDate }: ReceiptLinkDialogProps) {
  const [receipts, setReceipts] = useState<DbReceipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  if (isOpen && receipts.length === 0 && !isLoading) {
    loadReceipts();
  }

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = !searchQuery ||
      r.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !itemDate || r.date === itemDate;
    return matchesSearch && matchesDate;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Receipt</DialogTitle>
          <DialogDescription>
            Select a receipt to link to this {itemType} item
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

interface RentalPropertyWorkpaperProps {
  taxYear?: string;
}

export function RentalPropertyWorkpaper({ taxYear = new Date().getFullYear().toString() }: RentalPropertyWorkpaperProps) {
  const {
    workpaper,
    totals,
    selectedPropertyId,
    addProperty,
    updateProperty,
    deleteProperty,
    selectProperty,
    getSelectedProperty,
    addIncome,
    deleteIncome,
    getIncomeByProperty,
    addExpense,
    deleteExpense,
    getExpensesByProperty,
    addPlantEquipment,
    deletePlantEquipment,
    getPlantEquipmentByProperty,
    addCapitalWorks,
    getCapitalWorksByProperty,
    getPropertySummary,
    linkIncomeReceipt,
    unlinkIncomeReceipt,
    linkExpenseReceipt,
    unlinkExpenseReceipt,
    updateNotes,
    reset,
    exportData,
    save,
    duplicateProperty,
  } = useRentalProperty(taxYear);

  const [activeTab, setActiveTab] = useState('properties');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showAddPropertyDialog, setShowAddPropertyDialog] = useState(false);
  const [showDeletePropertyDialog, setShowDeletePropertyDialog] = useState(false);

  // Form states
  const [newProperty, setNewProperty] = useState({
    street: '',
    suburb: '',
    state: 'NSW' as const,
    postcode: '',
    dateAcquired: '',
    purchasePrice: '',
    ownershipPercentage: '100',
    ownershipType: 'sole' as const,
    propertyType: 'house' as const,
    constructionDate: '',
    capitalWorksCostBase: '',
  });

  const [newIncome, setNewIncome] = useState({
    dateReceived: '',
    description: '',
    amount: '',
    tenantName: '',
  });

  const [newExpense, setNewExpense] = useState({
    date: '',
    description: '',
    category: 'repairs-maintenance' as RentalExpenseCategory,
    amount: '',
    vendor: '',
  });

  const [newAsset, setNewAsset] = useState({
    name: '',
    datePurchased: '',
    cost: '',
    effectiveLife: '',
    method: 'diminishing-value' as const,
    privateUsePercent: '0',
  });

  const [newCapitalWorks, setNewCapitalWorks] = useState({
    description: '',
    constructionDate: '',
    cost: '',
  });

  // Receipt linking state
  const [receiptDialog, setReceiptDialog] = useState<{
    isOpen: boolean;
    itemType: 'income' | 'expense';
    itemId: string;
    itemDate?: string;
  }>({
    isOpen: false,
    itemType: 'income',
    itemId: '',
  });

  const selectedProperty = getSelectedProperty();
  const propertyIncome = selectedProperty ? getIncomeByProperty(selectedProperty.id) : [];
  const propertyExpenses = selectedProperty ? getExpensesByProperty(selectedProperty.id) : [];
  const propertyAssets = selectedProperty ? getPlantEquipmentByProperty(selectedProperty.id) : [];
  const propertyCapitalWorks = selectedProperty ? getCapitalWorksByProperty(selectedProperty.id) : [];
  const propertySummary = selectedProperty ? getPropertySummary(selectedProperty.id) : null;

  const handleAddProperty = () => {
    if (newProperty.street && newProperty.purchasePrice) {
      addProperty({
        address: {
          street: newProperty.street,
          suburb: newProperty.suburb,
          state: newProperty.state,
          postcode: newProperty.postcode,
          country: 'Australia',
        },
        dateAcquired: newProperty.dateAcquired,
        purchasePrice: parseFloat(newProperty.purchasePrice),
        ownershipPercentage: parseFloat(newProperty.ownershipPercentage),
        ownershipType: newProperty.ownershipType,
        propertyType: newProperty.propertyType,
        isNewConstruction: false,
        constructionDate: newProperty.constructionDate || undefined,
        capitalWorksRate: newProperty.constructionDate ? getCapitalWorksRate(newProperty.constructionDate) : 2.5,
        capitalWorksCostBase: newProperty.capitalWorksCostBase ? parseFloat(newProperty.capitalWorksCostBase) : 0,
      });
      setNewProperty({
        street: '',
        suburb: '',
        state: 'NSW',
        postcode: '',
        dateAcquired: '',
        purchasePrice: '',
        ownershipPercentage: '100',
        ownershipType: 'sole',
        propertyType: 'house',
        constructionDate: '',
        capitalWorksCostBase: '',
      });
      setShowAddPropertyDialog(false);
    }
  };

  const handleAddIncome = () => {
    if (selectedProperty && newIncome.description && newIncome.amount) {
      addIncome({
        propertyId: selectedProperty.id,
        dateReceived: newIncome.dateReceived,
        description: newIncome.description,
        amount: parseFloat(newIncome.amount),
        tenantName: newIncome.tenantName || undefined,
      });
      setNewIncome({ dateReceived: '', description: '', amount: '', tenantName: '' });
    }
  };

  const handleAddExpense = () => {
    if (selectedProperty && newExpense.description && newExpense.amount) {
      addExpense({
        propertyId: selectedProperty.id,
        date: newExpense.date,
        category: newExpense.category,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        vendor: newExpense.vendor || undefined,
        isDeductible: true,
      });
      setNewExpense({ date: '', description: '', category: 'repairs-maintenance', amount: '', vendor: '' });
    }
  };

  const handleAddAsset = () => {
    if (selectedProperty && newAsset.name && newAsset.cost && newAsset.effectiveLife) {
      const cost = parseFloat(newAsset.cost);
      addPlantEquipment({
        propertyId: selectedProperty.id,
        name: newAsset.name,
        datePurchased: newAsset.datePurchased,
        cost,
        effectiveLife: parseFloat(newAsset.effectiveLife),
        method: newAsset.method,
        openingAdjustableValue: cost,
        privateUsePercent: parseFloat(newAsset.privateUsePercent),
      });
      setNewAsset({
        name: '',
        datePurchased: '',
        cost: '',
        effectiveLife: '',
        method: 'diminishing-value',
        privateUsePercent: '0',
      });
    }
  };

  const handleAddCapitalWorks = () => {
    if (selectedProperty && newCapitalWorks.description && newCapitalWorks.cost && newCapitalWorks.constructionDate) {
      const cost = parseFloat(newCapitalWorks.cost);
      const rate = getCapitalWorksRate(newCapitalWorks.constructionDate);
      const deductionAmount = cost * (rate / 100);
      addCapitalWorks({
        propertyId: selectedProperty.id,
        description: newCapitalWorks.description,
        constructionType: 'residential',
        constructionDate: newCapitalWorks.constructionDate,
        cost,
        rate,
        deductionAmount,
        accumulatedDeductions: deductionAmount,
        remainingValue: cost - deductionAmount,
      });
      setNewCapitalWorks({ description: '', constructionDate: '', cost: '' });
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rental-property-${taxYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate validation
  const validation = {
    valid: workpaper.properties.length > 0,
    errors: [] as string[],
    warnings: [] as string[],
  };

  if (workpaper.properties.length === 0) {
    validation.errors.push('At least one property is required');
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rental Property Schedule</h1>
            <p className="text-muted-foreground">
              Rental income and expense claims for {taxYear}
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
            <Button onClick={handleExport} disabled={!validation.valid}>
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

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Rental Income</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.grandTotal.taxableIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(Math.abs(totals.grandTotal.taxableIncome))}
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.grandTotal.taxableIncome >= 0 ? 'Profit' : 'Loss'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.grandTotal.income)}</div>
              <p className="text-xs text-muted-foreground">
                {workpaper.income.length} income items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.grandTotal.expenses)}</div>
              <p className="text-xs text-muted-foreground">
                {workpaper.expenses.length} expense items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workpaper.properties.length}</div>
              <p className="text-xs text-muted-foreground">
                Rental properties
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="properties" className="gap-2">
              <Building2 className="h-4 w-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="income" disabled={!selectedProperty} className="gap-2">
              <DollarSign className="h-4 w-4" />
              Income
            </TabsTrigger>
            <TabsTrigger value="expenses" disabled={!selectedProperty} className="gap-2">
              <Receipt className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="depreciation" disabled={!selectedProperty} className="gap-2">
              <Calculator className="h-4 w-4" />
              Depreciation
            </TabsTrigger>
            <TabsTrigger value="summary" disabled={workpaper.properties.length === 0} className="gap-2">
              <FileText className="h-4 w-4" />
              Summary
            </TabsTrigger>
          </TabsList>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Your Rental Properties</h2>
              <Button onClick={() => setShowAddPropertyDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </div>

            {workpaper.properties.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Home className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No properties added yet</p>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    Add your rental properties to start tracking income, expenses, and depreciation
                  </p>
                  <Button onClick={() => setShowAddPropertyDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Property
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workpaper.properties.map((property) => {
                  const summary = getPropertySummary(property.id);
                  const isSelected = selectedPropertyId === property.id;
                  return (
                    <Card 
                      key={property.id} 
                      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
                      onClick={() => selectProperty(property.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{formatAddress(property.address)}</CardTitle>
                            <CardDescription>
                              {property.ownershipPercentage}% ownership • {property.propertyType}
                            </CardDescription>
                          </div>
                          {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Purchase Price</p>
                            <p className="font-medium">{formatCurrency(property.purchasePrice)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Acquired</p>
                            <p className="font-medium">{property.dateAcquired ? formatDate(property.dateAcquired) : '-'}</p>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Net Income</span>
                          <span className={`font-semibold ${(summary?.netIncome || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(summary?.netIncome || 0)}
                          </span>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateProperty(property.id);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectProperty(property.id);
                              setShowDeletePropertyDialog(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-4">
            {selectedProperty && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Add Rental Income</CardTitle>
                    <CardDescription>Record income for {formatAddress(selectedProperty.address)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <Label>Date Received</Label>
                        <Input
                          type="date"
                          value={newIncome.dateReceived}
                          onChange={(e) => setNewIncome({ ...newIncome, dateReceived: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Input
                          placeholder="e.g., Monthly rent payment"
                          value={newIncome.description}
                          onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Amount ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={newIncome.amount}
                          onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                        />
                      </div>
                    </div>

                    <Button onClick={handleAddIncome} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Income
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Rental Income</CardTitle>
                    <CardDescription>
                      {propertyIncome.length} item(s) totaling {formatCurrency(propertySummary?.totalIncome || 0)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {propertyIncome.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No income recorded yet</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {propertyIncome.map((income) => (
                            <TableRow key={income.id}>
                              <TableCell>{income.dateReceived ? formatDate(income.dateReceived) : '-'}</TableCell>
                              <TableCell>{income.description}</TableCell>
                              <TableCell className="text-right">{formatCurrency(income.amount)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {income.receiptUrl ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => unlinkIncomeReceipt(income.id)}
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
                                        itemType: 'income',
                                        itemId: income.id,
                                        itemDate: income.dateReceived,
                                      })}
                                      title="Link receipt"
                                    >
                                      <Link2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteIncome(income.id)}
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
              </>
            )}
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            {selectedProperty && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Add Expense</CardTitle>
                    <CardDescription>Record rental expenses for {formatAddress(selectedProperty.address)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-5">
                      <div className="md:col-span-1">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Input
                          placeholder="e.g., Plumbing repairs"
                          value={newExpense.description}
                          onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Label>Category</Label>
                        <Select
                          value={newExpense.category}
                          onValueChange={(value) => setNewExpense({ ...newExpense, category: value as RentalExpenseCategory })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(EXPENSE_CATEGORIES).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-1">
                        <Label>Amount ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* ATO Guidance for selected category */}
                    <Alert className="bg-blue-500/5 border-blue-500/20">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                      <AlertDescription className="text-sm">
                        <span className="font-medium">{EXPENSE_CATEGORIES[newExpense.category].label}: </span>
                        {EXPENSE_CATEGORIES[newExpense.category].helpText}
                      </AlertDescription>
                    </Alert>

                    <Button onClick={handleAddExpense} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Expense Summary by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {propertySummary && Object.entries(propertySummary.expensesByCategory).map(([key, amount]) => {
                        if (amount === 0) return null;
                        return (
                          <div key={key} className="flex justify-between items-center p-2 rounded-lg bg-muted">
                            <span className="text-sm">{EXPENSE_CATEGORIES[key as RentalExpenseCategory]?.label || key}</span>
                            <span className="font-medium">{formatCurrency(amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {propertyExpenses.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No expenses recorded yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>All Expenses</CardTitle>
                    <CardDescription>
                      {propertyExpenses.length} expense(s) totaling {formatCurrency(propertySummary?.totalExpenses || 0)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {propertyExpenses.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No expenses recorded yet</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {propertyExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>{expense.date ? formatDate(expense.date) : '-'}</TableCell>
                              <TableCell>{expense.description}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {EXPENSE_CATEGORIES[expense.category]?.label || expense.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {expense.receiptUrl ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => unlinkExpenseReceipt(expense.id)}
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
                                        itemType: 'expense',
                                        itemId: expense.id,
                                        itemDate: expense.date,
                                      })}
                                      title="Link receipt"
                                    >
                                      <Link2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteExpense(expense.id)}
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
              </>
            )}
          </TabsContent>

          {/* Depreciation Tab */}
          <TabsContent value="depreciation" className="space-y-4">
            {selectedProperty && (
              <>
                {/* Division 43 - Capital Works */}
                <Card>
                  <CardHeader>
                    <CardTitle>Division 43 - Capital Works Deduction (Building)</CardTitle>
                    <CardDescription>
                      Building write-off for {formatAddress(selectedProperty.address)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Input
                          placeholder="e.g., Building construction"
                          value={newCapitalWorks.description}
                          onChange={(e) => setNewCapitalWorks({ ...newCapitalWorks, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Construction Date</Label>
                        <Input
                          type="date"
                          value={newCapitalWorks.constructionDate}
                          onChange={(e) => setNewCapitalWorks({ ...newCapitalWorks, constructionDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Cost ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={newCapitalWorks.cost}
                          onChange={(e) => setNewCapitalWorks({ ...newCapitalWorks, cost: e.target.value })}
                        />
                      </div>
                    </div>

                    <Button onClick={handleAddCapitalWorks} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Capital Works
                    </Button>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Division 43 allows deduction for construction costs. Rate is 2.5% for construction after 17 July 1985, 
                        or 4% for construction between 22 August 1979 and 17 July 1985.
                      </AlertDescription>
                    </Alert>

                    {propertyCapitalWorks.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Construction Date</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead className="text-right">Deduction</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {propertyCapitalWorks.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{entry.description}</TableCell>
                              <TableCell>{formatDate(entry.constructionDate)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(entry.cost)}</TableCell>
                              <TableCell>{entry.rate}%</TableCell>
                              <TableCell className="text-right">{formatCurrency(entry.deductionAmount)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {}}
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

                {/* Division 40 - Plant & Equipment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Division 40 - Plant & Equipment Depreciation</CardTitle>
                    <CardDescription>Depreciating assets within the property</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-6">
                      <div className="md:col-span-2">
                        <Label>Name</Label>
                        <Input
                          placeholder="e.g., Air conditioner"
                          value={newAsset.name}
                          onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Label>Date Purchased</Label>
                        <Input
                          type="date"
                          value={newAsset.datePurchased}
                          onChange={(e) => setNewAsset({ ...newAsset, datePurchased: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Label>Cost ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={newAsset.cost}
                          onChange={(e) => setNewAsset({ ...newAsset, cost: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Label>Effective Life (yrs)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="1"
                          placeholder="10"
                          value={newAsset.effectiveLife}
                          onChange={(e) => setNewAsset({ ...newAsset, effectiveLife: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Label>Method</Label>
                        <Select
                          value={newAsset.method}
                          onValueChange={(value) => setNewAsset({ ...newAsset, method: value as typeof newAsset.method })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="diminishing-value">Diminishing Value</SelectItem>
                            <SelectItem value="prime-cost">Prime Cost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={handleAddAsset} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Asset
                    </Button>

                    <Alert className="bg-yellow-500/5 border-yellow-500/20">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertDescription className="text-sm">
                        Note: From 1 July 2017, depreciation deductions for second-hand plant and equipment in residential rental properties are limited. 
                        Only new assets or assets in new properties qualify.
                      </AlertDescription>
                    </Alert>

                    {propertyAssets.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">This Year</TableHead>
                            <TableHead className="text-right">Closing</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {propertyAssets.map((asset) => (
                            <TableRow key={asset.id}>
                              <TableCell>{asset.name}</TableCell>
                              <TableCell>{formatDate(asset.datePurchased)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(asset.cost)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {asset.method === 'diminishing-value' ? 'DV' : 'PC'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(asset.currentYearDeduction)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(asset.closingAdjustableValue)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deletePlantEquipment(asset.id)}
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
              </>
            )}
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rental Property Schedule Summary</CardTitle>
                <CardDescription>
                  Tax year {taxYear} • {workpaper.properties.length} propert{workpaper.properties.length === 1 ? 'y' : 'ies'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Properties Summary */}
                {totals.properties.map((summary) => {
                  const property = workpaper.properties.find(p => p.id === summary.propertyId);
                  if (!property) return null;
                  
                  return (
                    <div key={summary.propertyId} className="rounded-lg border p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{summary.propertyAddress}</h3>
                          <p className="text-sm text-muted-foreground">
                            {summary.ownershipPercentage}% ownership
                          </p>
                        </div>
                        <Badge variant={summary.netIncome >= 0 ? "default" : "destructive"}>
                          {summary.netIncome >= 0 ? 'Profit' : 'Loss'}
                        </Badge>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Gross Income</p>
                          <p className="font-semibold">{formatCurrency(summary.totalIncome)}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <p className="font-semibold">{formatCurrency(summary.totalExpenses)}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Depreciation</p>
                          <p className="font-semibold">{formatCurrency(summary.totalDepreciation)}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Taxable Income</p>
                          <p className={`font-semibold ${summary.taxableIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(summary.taxableIncome)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Separator />

                {/* Grand Totals */}
                <div className="space-y-4">
                  <p className="font-medium text-lg">Total Schedule</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Gross Income</span>
                    <span className="font-semibold">{formatCurrency(totals.grandTotal.income)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Expenses</span>
                    <span className="font-semibold">{formatCurrency(totals.grandTotal.expenses)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Depreciation</span>
                    <span className="font-semibold">{formatCurrency(totals.grandTotal.depreciation)}</span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-xl font-bold">
                    <span>Net Rental Income</span>
                    <span className={totals.grandTotal.taxableIncome >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatCurrency(totals.grandTotal.taxableIncome)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information about this rental property schedule..."
                    value={workpaper.notes || ''}
                    onChange={(e) => updateNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                  <Button 
                    onClick={handleExport} 
                    disabled={!validation.valid}
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
                This will clear all data for this rental property schedule. This action cannot be undone.
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

        {/* Add Property Dialog */}
        <Dialog open={showAddPropertyDialog} onOpenChange={setShowAddPropertyDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Rental Property</DialogTitle>
              <DialogDescription>
                Enter the details of your rental property
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    placeholder="e.g., 123 Main Street"
                    value={newProperty.street}
                    onChange={(e) => setNewProperty({ ...newProperty, street: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="suburb">Suburb</Label>
                    <Input
                      id="suburb"
                      placeholder="e.g., Sydney"
                      value={newProperty.suburb}
                      onChange={(e) => setNewProperty({ ...newProperty, suburb: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={newProperty.state}
                      onValueChange={(value) => setNewProperty({ ...newProperty, state: value as typeof newProperty.state })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NSW">NSW</SelectItem>
                        <SelectItem value="VIC">VIC</SelectItem>
                        <SelectItem value="QLD">QLD</SelectItem>
                        <SelectItem value="WA">WA</SelectItem>
                        <SelectItem value="SA">SA</SelectItem>
                        <SelectItem value="TAS">TAS</SelectItem>
                        <SelectItem value="ACT">ACT</SelectItem>
                        <SelectItem value="NT">NT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      placeholder="2000"
                      value={newProperty.postcode}
                      onChange={(e) => setNewProperty({ ...newProperty, postcode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dateAcquired">Date Acquired</Label>
                    <Input
                      id="dateAcquired"
                      type="date"
                      value={newProperty.dateAcquired}
                      onChange={(e) => setNewProperty({ ...newProperty, dateAcquired: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchasePrice">Purchase Price ($) *</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newProperty.purchasePrice}
                      onChange={(e) => setNewProperty({ ...newProperty, purchasePrice: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ownershipPercentage">Your Ownership %</Label>
                    <Input
                      id="ownershipPercentage"
                      type="number"
                      min="1"
                      max="100"
                      value={newProperty.ownershipPercentage}
                      onChange={(e) => setNewProperty({ ...newProperty, ownershipPercentage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownershipType">Ownership Type</Label>
                    <Select
                      value={newProperty.ownershipType}
                      onValueChange={(value) => setNewProperty({ ...newProperty, ownershipType: value as typeof newProperty.ownershipType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sole">Sole</SelectItem>
                        <SelectItem value="joint">Joint</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="trust">Trust</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select
                    value={newProperty.propertyType}
                    onValueChange={(value) => setNewProperty({ ...newProperty, propertyType: value as typeof newProperty.propertyType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="unit">Unit</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="land">Land</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="constructionDate">Construction Date</Label>
                    <Input
                      id="constructionDate"
                      type="date"
                      value={newProperty.constructionDate}
                      onChange={(e) => setNewProperty({ ...newProperty, constructionDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capitalWorksCostBase">Construction Cost ($)</Label>
                    <Input
                      id="capitalWorksCostBase"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newProperty.capitalWorksCostBase}
                      onChange={(e) => setNewProperty({ ...newProperty, capitalWorksCostBase: e.target.value })}
                    />
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Construction date determines the capital works deduction rate (2.5% or 4% per year).
                  </AlertDescription>
                </Alert>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddPropertyDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddProperty} disabled={!newProperty.street || !newProperty.purchasePrice}>
                Add Property
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Property Dialog */}
        <Dialog open={showDeletePropertyDialog} onOpenChange={setShowDeletePropertyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Property?</DialogTitle>
              <DialogDescription>
                This will permanently delete {selectedProperty && formatAddress(selectedProperty.address)} and all associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeletePropertyDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (selectedProperty) {
                    deleteProperty(selectedProperty.id);
                  }
                  setShowDeletePropertyDialog(false);
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Receipt Link Dialog */}
        <ReceiptLinkDialog
          isOpen={receiptDialog.isOpen}
          onClose={() => setReceiptDialog({ ...receiptDialog, isOpen: false })}
          onLink={(receiptId, receiptUrl) => {
            if (receiptDialog.itemType === 'income') {
              linkIncomeReceipt(receiptDialog.itemId, receiptId, receiptUrl);
            } else {
              linkExpenseReceipt(receiptDialog.itemId, receiptId, receiptUrl);
            }
          }}
          itemType={receiptDialog.itemType}
          itemDate={receiptDialog.itemDate}
        />
      </div>
    </TooltipProvider>
  );
}
