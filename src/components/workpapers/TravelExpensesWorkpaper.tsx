import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Bed,
  Briefcase,
  Bus,
  Calendar,
  Car,
  CarFront,
  CheckCircle,
  CircleDot,
  CircleParking,
  Coffee,
  Cookie,
  Download,
  FileText,
  Fuel,
  Globe,
  Home,
  Hotel,
  Link2,
  MapPin,
  Moon,
  MoreHorizontal,
  Plane,
  Plus,
  Receipt,
  RotateCcw,
  Route,
  Save,
  Search,
  Sun,
  Trash2,
  Train,
  Unlink,
  Utensils,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getReceiptsByDateRange, type Receipt as DbReceipt } from '@/lib/db';
import { useTravelExpenses } from '@/hooks/useTravelExpenses';
import { TRIP_PURPOSES, TRANSPORT_TYPES, REASONABLE_MEAL_AMOUNTS, TravelType, TripPurpose } from '@/lib/travel-expenses';

interface ReceiptLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (receiptId: string, receiptUrl?: string) => void;
  expenseType: 'accommodation' | 'meal' | 'transport';
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
      // Get receipts from the last year
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

interface TravelExpensesWorkpaperProps {
  taxYear: string;
}

const TRANSPORT_ICONS: Record<string, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  train: <Train className="h-4 w-4" />,
  bus: <Bus className="h-4 w-4" />,
  taxi: <CircleDot className="h-4 w-4" />,
  rideshare: <Car className="h-4 w-4" />,
  'car-hire': <CarFront className="h-4 w-4" />,
  parking: <CircleParking className="h-4 w-4" />,
  toll: <Route className="h-4 w-4" />,
  fuel: <Fuel className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="h-4 w-4" />,
  lunch: <Sun className="h-4 w-4" />,
  dinner: <Moon className="h-4 w-4" />,
  snacks: <Cookie className="h-4 w-4" />,
};

export function TravelExpensesWorkpaper({ taxYear }: TravelExpensesWorkpaperProps) {
  const {
    workpaper,
    summary,
    validation,
    updateTripName,
    updateTripDetails,
    addAccommodation,
    updateAccommodation,
    deleteAccommodation,
    linkAccommodationReceipt,
    unlinkAccommodationReceipt,
    addMeal,
    updateMeal,
    deleteMeal,
    linkMealReceipt,
    unlinkMealReceipt,
    addTransport,
    updateTransport,
    deleteTransport,
    linkTransportReceipt,
    unlinkTransportReceipt,
    updateNotes,
    reset,
    exportData,
    save,
  } = useTravelExpenses(taxYear);

  const [activeTab, setActiveTab] = useState('details');
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Receipt linking state
  const [receiptDialog, setReceiptDialog] = useState<{
    isOpen: boolean;
    expenseType: 'accommodation' | 'meal' | 'transport';
    expenseId: string;
    expenseDate?: string;
  }>({
    isOpen: false,
    expenseType: 'accommodation',
    expenseId: '',
  });
  
  // Form states for adding expenses
  const [newAccommodation, setNewAccommodation] = useState({
    date: '',
    provider: '',
    location: '',
    amount: '',
    nights: '1',
  });
  
  const [newMeal, setNewMeal] = useState({
    date: '',
    type: 'dinner' as const,
    description: '',
    amount: '',
    location: '',
  });
  
  const [newTransport, setNewTransport] = useState({
    date: '',
    type: 'flight' as const,
    description: '',
    fromLocation: '',
    toLocation: '',
    amount: '',
    returnJourney: false,
  });
  
  const handleAddAccommodation = () => {
    if (newAccommodation.provider && newAccommodation.amount) {
      addAccommodation({
        date: newAccommodation.date,
        provider: newAccommodation.provider,
        location: newAccommodation.location,
        amount: parseFloat(newAccommodation.amount),
        nights: parseInt(newAccommodation.nights) || 1,
      });
      setNewAccommodation({ date: '', provider: '', location: '', amount: '', nights: '1' });
    }
  };
  
  const handleAddMeal = () => {
    if (newMeal.description && newMeal.amount) {
      addMeal({
        date: newMeal.date,
        type: newMeal.type,
        description: newMeal.description,
        amount: parseFloat(newMeal.amount),
        location: newMeal.location || undefined,
      });
      setNewMeal({ date: '', type: 'dinner', description: '', amount: '', location: '' });
    }
  };
  
  const handleAddTransport = () => {
    if (newTransport.description && newTransport.amount) {
      addTransport({
        date: newTransport.date,
        type: newTransport.type,
        description: newTransport.description,
        fromLocation: newTransport.fromLocation || undefined,
        toLocation: newTransport.toLocation || undefined,
        amount: parseFloat(newTransport.amount),
        returnJourney: newTransport.returnJourney,
      });
      setNewTransport({ date: '', type: 'flight', description: '', fromLocation: '', toLocation: '', amount: '', returnJourney: false });
    }
  };
  
  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-expenses-${workpaper.tripName || 'export'}-${taxYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const reasonableAmounts = workpaper.tripDetails.travelType === 'international' 
    ? REASONABLE_MEAL_AMOUNTS.international 
    : REASONABLE_MEAL_AMOUNTS.domestic;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">D2 Travel Expenses Workpaper</h1>
          <p className="text-muted-foreground">
            Record overnight work-related travel expenses for {taxYear}
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
      
      {validation.warnings.length > 0 && (
        <Alert className="bg-yellow-500/10 border-yellow-500/50">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {validation.valid && validation.warnings.length === 0 && summary.grandTotal > 0 && (
        <Alert className="bg-green-500/10 border-green-500/50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Workpaper complete and ready for export. Total claim: {formatCurrency(summary.grandTotal)}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claim</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.grandTotal)}</div>
            <p className="text-xs text-muted-foreground">All travel expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accommodation</CardTitle>
            <Hotel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.accommodation.total)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.accommodation.nights} night{summary.accommodation.nights !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meals</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.meals.total)}</div>
            <p className="text-xs text-muted-foreground">{summary.meals.count} expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transport</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.transport.total)}</div>
            <p className="text-xs text-muted-foreground">{summary.transport.count} expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Receipt Coverage */}
      {(() => {
        const totalExpenses = workpaper.accommodation.length + workpaper.meals.length + workpaper.transport.length;
        const linkedExpenses = workpaper.accommodation.filter(e => e.receiptId).length +
                               workpaper.meals.filter(e => e.receiptId).length +
                               workpaper.transport.filter(e => e.receiptId).length;
        const coverage = totalExpenses > 0 ? Math.round((linkedExpenses / totalExpenses) * 100) : 0;

        if (totalExpenses === 0) return null;

        return (
          <Card className={coverage === 100 ? 'border-green-500/50 bg-green-500/5' : coverage >= 75 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-red-500/50 bg-red-500/5'}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className={coverage === 100 ? 'h-5 w-5 text-green-500' : coverage >= 75 ? 'h-5 w-5 text-yellow-500' : 'h-5 w-5 text-red-500'} />
                  <div>
                    <p className="font-medium">Receipt Coverage</p>
                    <p className="text-sm text-muted-foreground">
                      {linkedExpenses} of {totalExpenses} expenses have linked receipts
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={coverage === 100 ? 'text-2xl font-bold text-green-500' : coverage >= 75 ? 'text-2xl font-bold text-yellow-500' : 'text-2xl font-bold text-red-500'}>{coverage}%</p>
                  {coverage < 100 && (
                    <p className="text-xs text-muted-foreground">Link receipts for better ATO compliance</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Trip Details</TabsTrigger>
          <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
          <TabsTrigger value="meals">Meals</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
        </TabsList>
        
        {/* Trip Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trip Information</CardTitle>
              <CardDescription>
                Enter the details of your work-related travel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tripName">Trip Name</Label>
                  <Input
                    id="tripName"
                    placeholder="e.g., Sydney Conference March 2024"
                    value={workpaper.tripName}
                    onChange={(e) => updateTripName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="destination"
                      placeholder="e.g., Sydney, NSW"
                      value={workpaper.tripDetails.destination}
                      onChange={(e) => updateTripDetails({ destination: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Travel Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={workpaper.tripDetails.travelType === 'domestic' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => updateTripDetails({ travelType: 'domestic' as TravelType })}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Domestic
                    </Button>
                    <Button
                      type="button"
                      variant={workpaper.tripDetails.travelType === 'international' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => updateTripDetails({ travelType: 'international' as TravelType })}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      International
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Select
                    value={workpaper.tripDetails.purpose}
                    onValueChange={(value) => updateTripDetails({ purpose: value as TripPurpose })}
                  >
                    <SelectTrigger id="purpose">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIP_PURPOSES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="departureDate">Departure Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="departureDate"
                      type="date"
                      value={workpaper.tripDetails.departureDate}
                      onChange={(e) => updateTripDetails({ departureDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="returnDate">Return Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="returnDate"
                      type="date"
                      value={workpaper.tripDetails.returnDate}
                      onChange={(e) => updateTripDetails({ returnDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Nights Away</Label>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{workpaper.tripDetails.nightsAway}</span>
                    <span className="text-muted-foreground">night{workpaper.tripDetails.nightsAway !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional details about this trip..."
                  value={workpaper.notes || ''}
                  onChange={(e) => updateNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Accommodation Tab */}
        <TabsContent value="accommodation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Accommodation</CardTitle>
              <CardDescription>Record hotel stays and other accommodation expenses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-6">
                <div className="md:col-span-1">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newAccommodation.date}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, date: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Provider</Label>
                  <Input
                    placeholder="e.g., Hilton Hotel"
                    value={newAccommodation.provider}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, provider: e.target.value })}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Sydney CBD"
                    value={newAccommodation.location}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, location: e.target.value })}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label>Nights</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newAccommodation.nights}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, nights: e.target.value })}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newAccommodation.amount}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, amount: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleAddAccommodation} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Accommodation
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Accommodation Expenses</CardTitle>
              <CardDescription>
                {summary.accommodation.count} expense{summary.accommodation.count !== 1 ? 's' : ''} totaling {formatCurrency(summary.accommodation.total)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workpaper.accommodation.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Hotel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No accommodation expenses added yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Nights</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workpaper.accommodation.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>{exp.date ? formatDate(exp.date) : '-'}</TableCell>
                        <TableCell>{exp.provider}</TableCell>
                        <TableCell>{exp.location || '-'}</TableCell>
                        <TableCell>{exp.nights}</TableCell>
                        <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {exp.receiptId ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => unlinkAccommodationReceipt(exp.id)}
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
                                  expenseType: 'accommodation',
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
                              onClick={() => deleteAccommodation(exp.id)}
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
        
        {/* Meals Tab */}
        <TabsContent value="meals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Meal</CardTitle>
              <CardDescription>Record meal expenses during your travel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-5">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newMeal.date}
                    onChange={(e) => setNewMeal({ ...newMeal, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newMeal.type}
                    onValueChange={(value) => setNewMeal({ ...newMeal, type: value as typeof newMeal.type })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snacks">Snacks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g., Business dinner with client"
                    value={newMeal.description}
                    onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newMeal.amount}
                    onChange={(e) => setNewMeal({ ...newMeal, amount: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleAddMeal} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Meal
              </Button>
              
              {/* Reasonable amounts info */}
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium mb-2">ATO Reasonable Amounts ({workpaper.tripDetails.travelType === 'international' ? 'International' : 'Domestic'})</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>Breakfast: {formatCurrency(reasonableAmounts.breakfast)}</div>
                  <div>Lunch: {formatCurrency(reasonableAmounts.lunch)}</div>
                  <div>Dinner: {formatCurrency(reasonableAmounts.dinner)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Meal Expenses</CardTitle>
              <CardDescription>
                {summary.meals.count} expense{summary.meals.count !== 1 ? 's' : ''} totaling {formatCurrency(summary.meals.total)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workpaper.meals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No meal expenses added yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workpaper.meals.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>{exp.date ? formatDate(exp.date) : '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {MEAL_ICONS[exp.type]}
                            <span className="capitalize">{exp.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{exp.description}</TableCell>
                        <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {exp.receiptId ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => unlinkMealReceipt(exp.id)}
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
                                  expenseType: 'meal',
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
                              onClick={() => deleteMeal(exp.id)}
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
        
        {/* Transport Tab */}
        <TabsContent value="transport" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Transport</CardTitle>
              <CardDescription>Record flights, trains, taxis, and other transport costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-6">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newTransport.date}
                    onChange={(e) => setNewTransport({ ...newTransport, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newTransport.type}
                    onValueChange={(value) => setNewTransport({ ...newTransport, type: value as typeof newTransport.type })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRANSPORT_TYPES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g., Return flight Sydney-Melbourne"
                    value={newTransport.description}
                    onChange={(e) => setNewTransport({ ...newTransport, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newTransport.amount}
                    onChange={(e) => setNewTransport({ ...newTransport, amount: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTransport.returnJourney}
                      onChange={(e) => setNewTransport({ ...newTransport, returnJourney: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Return</span>
                  </label>
                </div>
              </div>
              <Button onClick={handleAddTransport} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Transport
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Transport Expenses</CardTitle>
              <CardDescription>
                {summary.transport.count} expense{summary.transport.count !== 1 ? 's' : ''} totaling {formatCurrency(summary.transport.total)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workpaper.transport.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transport expenses added yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Return</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workpaper.transport.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>{exp.date ? formatDate(exp.date) : '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {TRANSPORT_ICONS[exp.type]}
                            <span>{TRANSPORT_TYPES[exp.type as keyof typeof TRANSPORT_TYPES]?.label || exp.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{exp.description}</TableCell>
                        <TableCell>{exp.returnJourney ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {exp.receiptId ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => unlinkTransportReceipt(exp.id)}
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
                                  expenseType: 'transport',
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
                              onClick={() => deleteTransport(exp.id)}
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
      </Tabs>
      
      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Workpaper?</DialogTitle>
            <DialogDescription>
              This will clear all data for this travel expenses workpaper. This action cannot be undone.
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
          if (receiptDialog.expenseType === 'accommodation') {
            linkAccommodationReceipt(receiptDialog.expenseId, receiptId, receiptUrl);
          } else if (receiptDialog.expenseType === 'meal') {
            linkMealReceipt(receiptDialog.expenseId, receiptId, receiptUrl);
          } else if (receiptDialog.expenseType === 'transport') {
            linkTransportReceipt(receiptDialog.expenseId, receiptId, receiptUrl);
          }
        }}
        expenseType={receiptDialog.expenseType}
        expenseDate={receiptDialog.expenseDate}
      />
    </div>
  );
}
