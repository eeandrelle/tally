import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { WorkflowPage, StepSummary } from '@/components/workflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  DollarSign, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle2,
  Download,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/bas-workflow')({
  component: BASWorkflowPage,
});

// Mock data for demonstration
const mockSalesData = [
  { id: 1, date: '2025-01-15', description: 'Invoice #1042', amount: 5500.00, gst: 500.00, status: 'verified' },
  { id: 2, date: '2025-01-22', description: 'Invoice #1043', amount: 3300.00, gst: 300.00, status: 'verified' },
  { id: 3, date: '2025-02-05', description: 'Invoice #1044', amount: 8800.00, gst: 800.00, status: 'pending' },
  { id: 4, date: '2025-02-18', description: 'Invoice #1045', amount: 2200.00, gst: 200.00, status: 'verified' },
  { id: 5, date: '2025-03-01', description: 'Invoice #1046', amount: 4400.00, gst: 400.00, status: 'verified' },
];

const mockPurchasesData = [
  { id: 1, date: '2025-01-10', vendor: 'Office Supplies Co', amount: 550.00, gst: 50.00, category: 'Office' },
  { id: 2, date: '2025-01-25', vendor: 'Tech Solutions', amount: 2200.00, gst: 200.00, category: 'Equipment' },
  { id: 3, date: '2025-02-12', vendor: 'Professional Services', amount: 1100.00, gst: 100.00, category: 'Services' },
  { id: 4, date: '2025-02-28', vendor: 'Marketing Agency', amount: 3300.00, gst: 300.00, category: 'Marketing' },
  { id: 5, date: '2025-03-10', vendor: 'Insurance Provider', amount: 880.00, gst: 80.00, category: 'Insurance' },
];

function BASWorkflowPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    period: 'Q3 2025',
    salesReviewed: false,
    purchasesReviewed: false,
    adjustmentsComplete: false,
    declaration: false,
  });

  // Calculate totals
  const totalSales = mockSalesData.reduce((sum, row) => sum + row.amount, 0);
  const totalGstCollected = mockSalesData.reduce((sum, row) => sum + row.gst, 0);
  const totalPurchases = mockPurchasesData.reduce((sum, row) => sum + row.amount, 0);
  const totalGstPaid = mockPurchasesData.reduce((sum, row) => sum + row.gst, 0);
  const netGst = totalGstCollected - totalGstPaid;

  // Step 1: Select Period
  const Step1Content = (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {['Q1 2025', 'Q2 2025', 'Q3 2025'].map((period) => (
          <Card
            key={period}
            className={cn(
              'cursor-pointer transition-all',
              formData.period === period
                ? 'border-primary bg-primary/5'
                : 'hover:border-primary/50'
            )}
            onClick={() => setFormData({ ...formData, period })}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {period}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {period === 'Q1 2025' && 'Jul - Sep 2024'}
                {period === 'Q2 2025' && 'Oct - Dec 2024'}
                {period === 'Q3 2025' && 'Jan - Mar 2025'}
              </p>
              {formData.period === period && (
                <Badge className="mt-2">Selected</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h4 className="font-medium text-blue-400 mb-1">Quick Summary</h4>
        <p className="text-sm text-muted-foreground">
          You have 5 sales invoices and 5 purchase receipts for this period ready for review.
        </p>
      </div>
    </div>
  );

  // Step 2: Review Sales
  const Step2Content = (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalSales.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">GST Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">${totalGstCollected.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">GST</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockSalesData.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.date}</TableCell>
              <TableCell>{row.description}</TableCell>
              <TableCell className="text-right">${row.amount.toFixed(2)}</TableCell>
              <TableCell className="text-right">${row.gst.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={row.status === 'verified' ? 'default' : 'secondary'}>
                  {row.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center gap-2">
        <Checkbox
          id="salesReviewed"
          checked={formData.salesReviewed}
          onCheckedChange={(checked) => 
            setFormData({ ...formData, salesReviewed: checked as boolean })
          }
        />
        <Label htmlFor="salesReviewed">
          I have reviewed all sales and confirm the GST collected is correct
        </Label>
      </div>
    </div>
  );

  // Step 3: Review Purchases
  const Step3Content = (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalPurchases.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">GST Paid (Claimable)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">${totalGstPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">GST</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockPurchasesData.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.date}</TableCell>
              <TableCell>{row.vendor}</TableCell>
              <TableCell>
                <Badge variant="outline">{row.category}</Badge>
              </TableCell>
              <TableCell className="text-right">${row.amount.toFixed(2)}</TableCell>
              <TableCell className="text-right">${row.gst.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center gap-2">
        <Checkbox
          id="purchasesReviewed"
          checked={formData.purchasesReviewed}
          onCheckedChange={(checked) => 
            setFormData({ ...formData, purchasesReviewed: checked as boolean })
          }
        />
        <Label htmlFor="purchasesReviewed">
          I have reviewed all purchases and confirm the GST credits are valid
        </Label>
      </div>
    </div>
  );

  // Step 4: Adjustments
  const Step4Content = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>GST Adjustments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="badDebts">Bad Debts Written Off</Label>
              <Input id="badDebts" type="number" placeholder="0.00" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">GST on debts that will never be recovered</p>
            </div>
            <div>
              <Label htmlFor="privateUse">Private Use Adjustment</Label>
              <Input id="privateUse" type="number" placeholder="0.00" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">GST for personal use of business items</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priorErrors">Prior Period Errors</Label>
              <Input id="priorErrors" type="number" placeholder="0.00" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Corrections from previous BAS periods</p>
            </div>
            <div>
              <Label htmlFor="other">Other Adjustments</Label>
              <Input id="other" type="number" placeholder="0.00" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Any other GST adjustments required</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Checkbox
          id="adjustmentsComplete"
          checked={formData.adjustmentsComplete}
          onCheckedChange={(checked) => 
            setFormData({ ...formData, adjustmentsComplete: checked as boolean })
          }
        />
        <Label htmlFor="adjustmentsComplete">
          No adjustments required, or I have entered all necessary adjustments
        </Label>
      </div>
    </div>
  );

  // Step 5: Review & Submit
  const Step5Content = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            BAS Summary - {formData.period}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <StepSummary 
              label="Total Sales (G1)" 
              value={`$${totalSales.toLocaleString()}`}
              status="complete"
            />
            <StepSummary 
              label="GST on Sales (1A)" 
              value={`$${totalGstCollected.toLocaleString()}`}
              status="complete"
            />
            <StepSummary 
              label="Total Purchases (G10)" 
              value={`$${totalPurchases.toLocaleString()}`}
              status="complete"
            />
            <StepSummary 
              label="GST on Purchases (1B)" 
              value={`$${totalGstPaid.toLocaleString()}`}
              status="complete"
            />
            <div className="border-t border-border mt-4 pt-4">
              <StepSummary 
                label="Net GST Payable" 
                value={
                  <span className={netGst >= 0 ? 'text-red-400' : 'text-green-400'}>
                    ${Math.abs(netGst).toLocaleString()}
                    {netGst < 0 && ' (refund)'}
                  </span>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Declaration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2">
            <Checkbox
              id="declaration"
              checked={formData.declaration}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, declaration: checked as boolean })
              }
            />
            <Label htmlFor="declaration" className="leading-relaxed">
              I declare that the information I have provided in this statement is true and correct. 
              I understand that giving false or misleading information is a serious offence.
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" className="flex-1 gap-2">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        <Button 
          className="flex-1 gap-2" 
          disabled={!formData.declaration}
        >
          <Send className="w-4 h-4" />
          Submit to ATO
        </Button>
      </div>
    </div>
  );

  const steps = [
    {
      id: 'period',
      label: 'Select Period',
      description: 'Choose the quarter to report',
      content: Step1Content,
      isComplete: () => !!formData.period,
    },
    {
      id: 'sales',
      label: 'Review Sales',
      description: 'Verify GST collected on sales',
      content: Step2Content,
      isComplete: () => formData.salesReviewed,
    },
    {
      id: 'purchases',
      label: 'Review Purchases',
      description: 'Verify GST paid on purchases',
      content: Step3Content,
      isComplete: () => formData.purchasesReviewed,
    },
    {
      id: 'adjustments',
      label: 'Adjustments',
      description: 'Add any required adjustments',
      content: Step4Content,
      isComplete: () => formData.adjustmentsComplete,
      optional: true,
    },
    {
      id: 'submit',
      label: 'Review & Submit',
      description: 'Generate and lodge your BAS',
      content: Step5Content,
      isComplete: () => formData.declaration,
    },
  ];

  return (
    <WorkflowPage
      workflowId="bas-q3-2025"
      mode="bas"
      title="BAS Statement"
      subtitle="Quarter 3, 2025 (Jan - Mar)"
      steps={steps}
      exitRoute="/gst-summary"
      completionRoute="/gst-summary"
      onComplete={() => {
        console.log('BAS workflow completed!');
      }}
    />
  );
}
