import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { DollarSign, Plus, Edit2, Trash2, TrendingUp, Briefcase, Building2, Wallet } from "lucide-react";
import { useTaxYear } from "@/contexts/TaxYearContext";
import {
  createIncome,
  getIncomeByDateRange,
  updateIncome,
  deleteIncome,
  getTotalIncome,
  getTotalTaxWithheld,
  type Income,
} from "@/lib/db";

const incomeTypes = [
  { value: "salary", label: "Salary/Wages", icon: Briefcase },
  { value: "freelance", label: "Freelance", icon: Wallet },
  { value: "business", label: "Business Income", icon: Building2 },
  { value: "investment", label: "Investment", icon: TrendingUp },
  { value: "other", label: "Other", icon: DollarSign },
] as const;

interface IncomeManagerProps {
  onIncomeChange?: () => void;
}

export function IncomeManager({ onIncomeChange }: IncomeManagerProps) {
  const { selectedYear, getYearDates } = useTaxYear();
  const [income, setIncome] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [stats, setStats] = useState({ total: 0, taxWithheld: 0 });

  // Form state
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<Income["type"]>("salary");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [taxWithheld, setTaxWithheld] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { startDate, endDate } = getYearDates();
      
      const [incomeData, total, tax] = await Promise.all([
        getIncomeByDateRange(startDate, endDate),
        getTotalIncome(startDate, endDate),
        getTotalTaxWithheld(startDate, endDate),
      ]);
      setIncome(incomeData);
      setStats({ total, taxWithheld: tax });
    } catch (error) {
      console.error("Error loading income:", error);
      toast.error("Failed to load income data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]); // Reload when tax year changes

  const resetForm = () => {
    setSource("");
    setAmount("");
    setType("salary");
    setDate(new Date().toISOString().split("T")[0]);
    setTaxWithheld("");
    setNotes("");
    setEditingIncome(null);
  };

  const handleEdit = (item: Income) => {
    setEditingIncome(item);
    setSource(item.source);
    setAmount(item.amount.toString());
    setType(item.type);
    setDate(item.date);
    setTaxWithheld(item.tax_withheld?.toString() || "");
    setNotes(item.notes || "");
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this income entry?")) return;
    
    try {
      await deleteIncome(id);
      toast.success("Income deleted");
      await loadData();
      onIncomeChange?.();
    } catch (error) {
      console.error("Error deleting income:", error);
      toast.error("Failed to delete income");
    }
  };

  const handleSubmit = async () => {
    if (!source.trim() || !amount || !date) {
      toast.error("Please fill in all required fields");
      return;
    }

    const incomeData: Income = {
      source: source.trim(),
      amount: parseFloat(amount),
      type,
      date,
      tax_withheld: taxWithheld ? parseFloat(taxWithheld) : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (editingIncome?.id) {
        await updateIncome(editingIncome.id, incomeData);
        toast.success("Income updated");
      } else {
        await createIncome(incomeData);
        toast.success("Income added");
      }
      
      setDialogOpen(false);
      resetForm();
      await loadData();
      onIncomeChange?.();
    } catch (error) {
      console.error("Error saving income:", error);
      toast.error("Failed to save income");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = incomeTypes.find((t) => t.value === type);
    const Icon = typeConfig?.icon || DollarSign;
    return <Icon className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    return incomeTypes.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tax Withheld
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.taxWithheld)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Income
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIncome ? "Edit Income" : "Add Income"}</DialogTitle>
            <DialogDescription>
              Record your income sources for tax reporting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source *</Label>
              <Input
                id="source"
                placeholder="e.g., ABC Company"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Income Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Income["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {incomeTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax">Tax Withheld (optional)</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={taxWithheld}
                onChange={(e) => setTaxWithheld(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Any additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingIncome ? "Update" : "Add"} Income
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Income List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Income Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : income.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No income entries yet</p>
              <p className="text-xs">Add your first income source above</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {income.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-1.5 rounded-md">
                        {getTypeIcon(item.type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.source}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(item.date)} • {getTypeLabel(item.type)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(item.amount)}
                        </p>
                        {item.tax_withheld ? (
                          <p className="text-xs text-muted-foreground">
                            Tax: {formatCurrency(item.tax_withheld)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => item.id && handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default IncomeManager;
