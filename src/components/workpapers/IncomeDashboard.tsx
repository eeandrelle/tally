import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useIncomeDashboard } from '@/hooks/useIncomeDashboard';
import { IncomeType, INCOME_TYPE_METADATA } from '@/lib/income-dashboard';
import { 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Briefcase,
  Home,
  Landmark,
  User,
  BarChart3,
  Building2,
  MoreHorizontal,
  Download,
  Trash2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const typeIcons: Record<IncomeType, React.ReactNode> = {
  salary: <Briefcase className="w-4 h-4" />,
  dividends: <TrendingUp className="w-4 h-4" />,
  interest: <Landmark className="w-4 h-4" />,
  rental: <Home className="w-4 h-4" />,
  freelance: <User className="w-4 h-4" />,
  capital_gains: <BarChart3 className="w-4 h-4" />,
  government: <Building2 className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

export function IncomeDashboard() {
  const income = useIncomeDashboard();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddEntry, setShowAddEntry] = useState(false);
  
  // Form state
  const [entryForm, setEntryForm] = useState({
    type: 'salary' as IncomeType,
    source: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    frequency: 'monthly' as const,
    isProjected: false,
    notes: '',
  });
  
  const handleAddEntry = () => {
    if (entryForm.source && entryForm.amount) {
      income.addEntry({
        type: entryForm.type,
        source: entryForm.source,
        amount: parseFloat(entryForm.amount),
        date: entryForm.date,
        taxYear: income.taxYear,
        frequency: entryForm.frequency,
        isProjected: entryForm.isProjected,
        notes: entryForm.notes,
      });
      setEntryForm({
        type: 'salary',
        source: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        frequency: 'monthly',
        isProjected: false,
        notes: '',
      });
      setShowAddEntry(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Prepare chart data
  const pieData = Object.entries(income.summary.byType)
    .filter(([_, data]) => data.total > 0)
    .map(([type, data]) => ({
      name: INCOME_TYPE_METADATA[type as IncomeType].label,
      value: data.total,
      color: INCOME_TYPE_METADATA[type as IncomeType].color,
    }));
  
  const monthlyChartData = income.monthlyData.map(m => ({
    month: new Date(m.month + '-01').toLocaleDateString('en-AU', { month: 'short' }),
    total: m.total,
  }));
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Income Dashboard</h1>
          <p className="text-muted-foreground">
            Track all income sources throughout the tax year
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={income.taxYear} onValueChange={income.setTaxYear}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {income.availableTaxYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddEntry(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Income
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(income.summary.totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tax year {income.taxYear}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxable Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(income.summary.taxableIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {income.summary.totalIncome > 0 
                ? `${Math.round((income.summary.taxableIncome / income.summary.totalIncome) * 100)}% of total`
                : '0% of total'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected Annual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(income.summary.projectedAnnual)}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={income.summary.ytdProgress} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">{income.summary.ytdProgress.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{income.sources.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {income.sources.filter(s => s.isActive).length} active
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-type">By Type</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Income Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Income Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No income data yet
                  </div>
                )}
                <div className="space-y-2 mt-4">
                  {pieData.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis 
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="total" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No monthly data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Income */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Income</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {income.recentEntries(5).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No income entries yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    income.recentEntries(5).map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {typeIcons[entry.type]}
                            <span className="text-sm">{INCOME_TYPE_METADATA[entry.type].label}</span>
                          </div>
                        </TableCell>
                        <TableCell>{entry.source}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => income.deleteEntry(entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* By Type Tab */}
        <TabsContent value="by-type">
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.entries(INCOME_TYPE_METADATA) as [IncomeType, typeof INCOME_TYPE_METADATA[IncomeType]][]).map(([type, meta]) => {
              const typeData = income.summary.byType[type];
              const typeEntries = income.entriesByType(type);
              
              return (
                <Card key={type}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${meta.color}20` }}
                        >
                          {typeIcons[type]}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{meta.label}</CardTitle>
                          <CardDescription>{meta.description}</CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{formatCurrency(typeData.total)}</div>
                        <div className="text-sm text-muted-foreground">{typeData.count} entries</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {typeEntries.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {typeEntries.slice(0, 10).map(entry => (
                            <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                              <div>
                                <div className="font-medium">{entry.source}</div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(entry.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="font-medium">{formatCurrency(entry.amount)}</div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm">
                        No {meta.label.toLowerCase()} entries
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Income Timeline</CardTitle>
              <CardDescription>All income entries for {income.taxYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {income.entries
                    .filter(e => e.taxYear === income.taxYear)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(entry => (
                      <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg border">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${INCOME_TYPE_METADATA[entry.type].color}20` }}
                        >
                          {typeIcons[entry.type]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.source}</span>
                            {entry.isProjected && (
                              <Badge variant="secondary">Projected</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {INCOME_TYPE_METADATA[entry.type].label} • {new Date(entry.date).toLocaleDateString()}
                          </div>
                          {entry.notes && (
                            <div className="text-sm mt-1">{entry.notes}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(entry.amount)}</div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => income.deleteEntry(entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sources Tab */}
        <TabsContent value="sources">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Income Sources</CardTitle>
                <CardDescription>Active income streams</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {income.sources.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No income sources yet
                      </div>
                    ) : (
                      income.sources.map(source => (
                        <div key={source.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div 
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: `${INCOME_TYPE_METADATA[source.type].color}20` }}
                            >
                              {typeIcons[source.type]}
                            </div>
                            <div>
                              <div className="font-medium">{source.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {INCOME_TYPE_METADATA[source.type].label}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(source.totalReceived)}</div>
                            {source.lastPaymentDate && (
                              <div className="text-xs text-muted-foreground">
                                Last: {new Date(source.lastPaymentDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>Expected income based on frequency</CardDescription>
              </CardHeader>
              <CardContent>
                {income.upcomingPayments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No upcoming payments projected
                  </div>
                ) : (
                  <div className="space-y-3">
                    {income.upcomingPayments.slice(0, 5).map(source => (
                      <div key={source.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100">
                            <Clock className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{source.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Expected: {source.nextExpectedDate}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {source.expectedAmount && (
                            <div className="font-bold">{formatCurrency(source.expectedAmount)}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {source.expectedFrequency}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add Entry Dialog */}
      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Income Entry</DialogTitle>
            <DialogDescription>
              Record a new income payment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Income Type</Label>
                <Select 
                  value={entryForm.type} 
                  onValueChange={(v: IncomeType) => setEntryForm({ ...entryForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(INCOME_TYPE_METADATA) as [IncomeType, typeof INCOME_TYPE_METADATA[IncomeType]][]).map(([type, meta]) => (
                      <SelectItem key={type} value={type}>{meta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={entryForm.date}
                  onChange={e => setEntryForm({ ...entryForm, date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Source *</Label>
              <Input
                placeholder="e.g., Employer name, Bank name"
                value={entryForm.source}
                onChange={e => setEntryForm({ ...entryForm, source: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={entryForm.amount}
                  onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select 
                  value={entryForm.frequency} 
                  onValueChange={(v: typeof entryForm.frequency) => setEntryForm({ ...entryForm, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                    <SelectItem value="one-time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Any additional details"
                value={entryForm.notes}
                onChange={e => setEntryForm({ ...entryForm, notes: e.target.value })}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="projected"
                checked={entryForm.isProjected}
                onChange={e => setEntryForm({ ...entryForm, isProjected: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="projected" className="text-sm font-normal">
                This is a projected/expected income
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEntry(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEntry} disabled={!entryForm.source || !entryForm.amount}>
              Add Income
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
