import { useState } from 'react';
import {
  Download,
  FolderKanban,
  HelpCircle,
  Info,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Calculator,
  Calendar,
  TrendingDown,
  Building2,
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
import { useProjectPool, type ProjectPoolEntry } from '@/hooks/useProjectPool';

export function D13ProjectPoolWorkpaper() {
  const { entries, addEntry, deleteEntry, getTotalDeduction, getTotalPoolValue, DEFAULT_DEDUCTION_RATE } = useProjectPool();
  const [activeTab, setActiveTab] = useState('entries');
  const [newEntry, setNewEntry] = useState<{
    projectName: string;
    projectDescription: string;
    startDate: string;
    totalCost: number;
    deductionRate: number;
  }>({
    projectName: '',
    projectDescription: '',
    startDate: new Date().toISOString().split('T')[0],
    totalCost: 0,
    deductionRate: DEFAULT_DEDUCTION_RATE,
  });

  const handleAddEntry = () => {
    if (newEntry.projectName && newEntry.totalCost > 0) {
      addEntry({
        projectName: newEntry.projectName,
        projectDescription: newEntry.projectDescription,
        startDate: newEntry.startDate || new Date().toISOString().split('T')[0],
        totalCost: newEntry.totalCost,
        deductionRate: newEntry.deductionRate || DEFAULT_DEDUCTION_RATE,
      });
      setNewEntry({
        projectName: '',
        projectDescription: '',
        startDate: new Date().toISOString().split('T')[0],
        totalCost: 0,
        deductionRate: DEFAULT_DEDUCTION_RATE,
      });
    }
  };

  const handleExport = () => {
    const data = {
      category: 'D13',
      totalDeduction: getTotalDeduction(),
      totalPoolValue: getTotalPoolValue(),
      entries: entries,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `D13-project-pool-${new Date().getFullYear()}.json`;
    a.click();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AtoCategoryBadge code="D13" size="lg" />
              <h2 className="text-2xl font-bold">Project Pool Deduction</h2>
            </div>
            <p className="text-muted-foreground">
              Claim deduction for project pool expenditure over time (D13)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setActiveTab('entries')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Project pool deductions allow you to claim capital expenditure on projects that 
            are in progress, over the life of the project. The standard deduction rate is 5% per annum.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Annual Deduction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(getTotalDeduction())}</div>
              <p className="text-xs text-muted-foreground">D13 Claim Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pool Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(getTotalPoolValue())}</div>
              <p className="text-xs text-muted-foreground">Capital expenditure</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entries.length}</div>
              <p className="text-xs text-muted-foreground">Active project pools</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deduction Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{DEFAULT_DEDUCTION_RATE}%</div>
              <p className="text-xs text-muted-foreground">Per annum</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entries">Projects</TabsTrigger>
            <TabsTrigger value="guide">ATO Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-4">
            {/* Add New Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Project to Pool</CardTitle>
                <CardDescription>Record capital expenditure for a project pool</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    placeholder="e.g., New Website Development"
                    value={newEntry.projectName}
                    onChange={(e) => setNewEntry({ ...newEntry, projectName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project Description</Label>
                  <Input
                    placeholder="e.g., E-commerce platform development and deployment"
                    value={newEntry.projectDescription}
                    onChange={(e) => setNewEntry({ ...newEntry, projectDescription: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Project Start Date</Label>
                    <Input
                      type="date"
                      value={newEntry.startDate}
                      onChange={(e) => setNewEntry({ ...newEntry, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Cost ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newEntry.totalCost || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, totalCost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deduction Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={newEntry.deductionRate || DEFAULT_DEDUCTION_RATE}
                      onChange={(e) => setNewEntry({ ...newEntry, deductionRate: parseFloat(e.target.value) || DEFAULT_DEDUCTION_RATE })}
                    />
                  </div>
                </div>
                {newEntry.totalCost > 0 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Year Deduction:</span>
                      <span className="text-lg font-semibold text-primary">
                        {formatCurrency((newEntry.totalCost * (newEntry.deductionRate || DEFAULT_DEDUCTION_RATE)) / 100)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-muted-foreground">Written Down Value:</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(newEntry.totalCost - ((newEntry.totalCost * (newEntry.deductionRate || DEFAULT_DEDUCTION_RATE)) / 100))}
                      </span>
                    </div>
                  </div>
                )}
                <Button 
                  onClick={handleAddEntry} 
                  className="w-full"
                  disabled={!newEntry.projectName || newEntry.totalCost <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project to Pool
                </Button>
              </CardContent>
            </Card>

            {/* Entries List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Pool Entries</CardTitle>
                <CardDescription>{entries.length} projects in pool</CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No projects in pool yet</p>
                    <p className="text-sm">Add your first project pool entry above</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Deduction</TableHead>
                        <TableHead className="text-right">WDV</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{entry.projectName}</p>
                              <p className="text-xs text-muted-foreground">{entry.projectDescription}</p>
                            </div>
                          </TableCell>
                          <TableCell>{entry.startDate}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.totalCost)}</TableCell>
                          <TableCell className="text-right">{entry.deductionRate}%</TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            {formatCurrency(entry.currentYearDeduction)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(entry.writtenDownValue)}
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
                <CardTitle>ATO Guidelines - D13</CardTitle>
                <CardDescription>Capital allowances for project pools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">What is a Project Pool?</h4>
                  <p className="text-sm text-muted-foreground">
                    A project pool allows you to claim a deduction for capital expenditure allocated 
                    to a project that is being carried on, or is proposed to be carried on, for a 
                    taxable purpose. This includes business development, research, and infrastructure projects.
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Eligible Expenditure</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Project investigation costs</li>
                    <li>Site preparation for a project</li>
                    <li>Feasibility studies</li>
                    <li>Project management costs</li>
                    <li>Design and engineering for specific projects</li>
                    <li>Software development projects</li>
                    <li>Marketing campaigns for specific product launches</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Deduction Rate</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    The standard deduction rate is <strong>5% per annum</strong> of the project pool value. 
                    This is calculated using the diminishing value method based on the pool value at the 
                    end of each income year.
                  </p>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <p className="font-medium">Calculation:</p>
                    <p>Annual Deduction = Opening Pool Value × 5%</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Record Keeping</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Detailed description of each project</li>
                    <li>Date project commenced</li>
                    <li>All capital expenditure receipts and invoices</li>
                    <li>Annual pool balance calculations</li>
                    <li>Project completion/abandonment dates</li>
                  </ul>
                </div>
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Project Completion:</strong> When a project is completed or abandoned, 
                    any remaining pool balance can be deducted in that income year.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Building2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Business Use:</strong> The project must be for a taxable purpose. 
                    Private or domestic projects cannot be included in a project pool.
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
