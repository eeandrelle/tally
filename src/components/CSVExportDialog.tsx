import { useState, useEffect, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileSpreadsheet, Download, Receipt, DollarSign, Calendar, Filter } from "lucide-react";
import {
  exportReceiptsToCSV,
  exportIncomeToCSV,
  downloadCSV,
  getReceiptCount,
  getTotalIncome,
  getFinancialYearDates,
  getCurrentFinancialYear,
} from "@/lib/db";
import type { Income } from "@/lib/db";

interface CSVExportDialogProps {
  trigger?: React.ReactNode;
}

export function CSVExportDialog({ trigger }: CSVExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Export options
  const [exportReceipts, setExportReceipts] = useState(true);
  const [exportIncome, setExportIncome] = useState(true);
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedFY, setSelectedFY] = useState(getCurrentFinancialYear());
  
  // Preview stats
  const [stats, setStats] = useState({
    receipts: 0,
    income: 0,
  });

  const currentFY = getCurrentFinancialYear();
  const availableFYs = Array.from({ length: 5 }, (_, i) => currentFY - i);

  const loadStats = useCallback(async () => {
    try {
      let start: string | undefined;
      let end: string | undefined;

      if (useDateRange && startDate && endDate) {
        start = startDate;
        end = endDate;
      } else if (!useDateRange) {
        const dates = getFinancialYearDates(selectedFY);
        start = dates.startDate;
        end = dates.endDate;
      }

      const [receiptCount, incomeTotal] = await Promise.all([
        getReceiptCount(start, end),
        getTotalIncome(start, end),
      ]);

      setStats({
        receipts: receiptCount,
        income: incomeTotal,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, [useDateRange, startDate, endDate, selectedFY]);

  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open, loadStats]);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      let start: string | undefined;
      let end: string | undefined;

      if (useDateRange) {
        if (!startDate || !endDate) {
          toast.error("Please select both start and end dates");
          return;
        }
        start = startDate;
        end = endDate;
      } else {
        const dates = getFinancialYearDates(selectedFY);
        start = dates.startDate;
        end = dates.endDate;
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const files: string[] = [];

      if (exportReceipts) {
        const csv = await exportReceiptsToCSV(start, end);
        if (csv) {
          const filename = `Tally_Receipts_${selectedFY}_${timestamp}.csv`;
          downloadCSV(csv, filename);
          files.push(filename);
        }
      }

      if (exportIncome) {
        const csv = await exportIncomeToCSV(start, end);
        if (csv) {
          const filename = `Tally_Income_${selectedFY}_${timestamp}.csv`;
          downloadCSV(csv, filename);
          files.push(filename);
        }
      }

      if (files.length > 0) {
        toast.success("CSV files exported successfully!", {
          description: `Downloaded: ${files.join(", ")}`,
        });
        setOpen(false);
      } else {
        toast.error("No data to export");
      }
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV files");
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export CSV Data
          </DialogTitle>
          <DialogDescription>
            Download your data as CSV files for use in Excel or other applications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Data to Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <Receipt className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="export-receipts" className="cursor-pointer">
                      Receipts
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {stats.receipts} records
                    </p>
                  </div>
                </div>
                <Switch
                  id="export-receipts"
                  checked={exportReceipts}
                  onCheckedChange={setExportReceipts}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="export-income" className="cursor-pointer">
                      Income
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(stats.income)} total
                    </p>
                  </div>
                </div>
                <Switch
                  id="export-income"
                  checked={exportIncome}
                  onCheckedChange={setExportIncome}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Date Range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="use-range" className="cursor-pointer">
                      Custom Date Range
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {useDateRange ? "Select specific dates" : "Use financial year"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="use-range"
                  checked={useDateRange}
                  onCheckedChange={setUseDateRange}
                />
              </div>

              {useDateRange ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">Financial Year</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedFY}
                    onChange={(e) => setSelectedFY(parseInt(e.target.value))}
                  >
                    {availableFYs.map((fy) => (
                      <option key={fy} value={fy}>
                        FY {fy}-{fy + 1} (Jul {fy} - Jun {fy + 1})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Export Summary</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {exportReceipts && (
                <Badge variant="secondary">
                  {stats.receipts} receipts
                </Badge>
              )}
              {exportIncome && (
                <Badge variant="secondary">
                  {formatCurrency(stats.income)} income
                </Badge>
              )}
              <Badge variant="outline">
                {useDateRange 
                  ? `${startDate || "..."} to ${endDate || "..."}`
                  : `FY ${selectedFY}-${selectedFY + 1}`
                }
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || (!exportReceipts && !exportIncome)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Download CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CSVExportDialog;
