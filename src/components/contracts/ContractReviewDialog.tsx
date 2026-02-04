import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Users,
  Calendar,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  Building2,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type {
  ExtractedContract,
  ContractValidationResult,
  ContractParty,
  KeyDate,
  PaymentSchedule,
  DepreciationInfo,
  ContractClause,
} from "@/lib/contracts";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";

interface ContractReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedContract: ExtractedContract | null;
  validationResult: ContractValidationResult | null;
  onApprove: (contract: ExtractedContract, notes: string) => Promise<void>;
  onReject: () => void;
  isProcessing?: boolean;
}

export function ContractReviewDialog({
  open,
  onOpenChange,
  extractedContract,
  validationResult,
  onApprove,
  onReject,
  isProcessing = false,
}: ContractReviewDialogProps) {
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  if (!extractedContract) return null;

  const handleApprove = async () => {
    await onApprove(extractedContract, notes);
    setNotes("");
  };

  const handleClose = () => {
    if (!isProcessing) {
      setNotes("");
      onOpenChange(false);
    }
  };

  const getStatusColor = (action: ContractValidationResult["suggested_action"]) => {
    switch (action) {
      case "accept":
        return "bg-green-500";
      case "review":
        return "bg-yellow-500";
      case "manual_entry":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (action: ContractValidationResult["suggested_action"]) => {
    switch (action) {
      case "accept":
        return "Ready to Save";
      case "review":
        return "Review Recommended";
      case "manual_entry":
        return "Manual Entry Required";
      default:
        return "Unknown";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle>Review Parsed Contract</DialogTitle>
                <DialogDescription>
                  Review and verify the extracted contract information
                </DialogDescription>
              </div>
            </div>
            {validationResult && (
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1.5",
                  validationResult.suggested_action === "accept" && "border-green-500 text-green-600",
                  validationResult.suggested_action === "review" && "border-yellow-500 text-yellow-600",
                  validationResult.suggested_action === "manual_entry" && "border-red-500 text-red-600"
                )}
              >
                {validationResult.suggested_action === "accept" ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {getStatusText(validationResult.suggested_action)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parties">
              Parties
              {extractedContract.parties.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {extractedContract.parties.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="dates">
              Dates
              {extractedContract.key_dates.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {extractedContract.key_dates.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments">
              Payments
              {extractedContract.payment_schedules.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {extractedContract.payment_schedules.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="assets">
              Assets
              {extractedContract.depreciation_assets.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {extractedContract.depreciation_assets.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 flex-1 overflow-y-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Contract Type</span>
                  </div>
                  <p className="font-medium">
                    {extractedContract.contract_type?.value || "Not detected"}
                  </p>
                  {extractedContract.contract_type && (
                    <ConfidenceIndicator 
                      confidence={extractedContract.contract_type.confidence} 
                      size="sm"
                    />
                  )}
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Contract Number</span>
                  </div>
                  <p className="font-medium">
                    {extractedContract.contract_number?.value || "Not detected"}
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Total Value</span>
                  </div>
                  <p className="font-medium">
                    {extractedContract.total_value
                      ? formatCurrency(extractedContract.total_value.value)
                      : "Not detected"}
                  </p>
                  {extractedContract.total_value && (
                    <ConfidenceIndicator 
                      confidence={extractedContract.total_value.confidence} 
                      size="sm"
                    />
                  )}
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Overall Confidence</span>
                  </div>
                  <p className="font-medium">
                    {Math.round(extractedContract.overall_confidence * 100)}%
                  </p>
                  <ConfidenceIndicator 
                    confidence={extractedContract.overall_confidence} 
                    size="sm"
                  />
                </div>
              </div>

              {validationResult && validationResult.warnings.length > 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Warnings</span>
                  </div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {validationResult.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult && validationResult.missing_fields.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">Missing Fields</p>
                  <div className="flex flex-wrap gap-2">
                    {validationResult.missing_fields.map((field) => (
                      <Badge key={field} variant="outline">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Parties Tab */}
            <TabsContent value="parties">
              <PartyList parties={extractedContract.parties} />
            </TabsContent>

            {/* Dates Tab */}
            <TabsContent value="dates">
              <DateList dates={extractedContract.key_dates} />
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <PaymentList payments={extractedContract.payment_schedules} />
            </TabsContent>

            {/* Assets Tab */}
            <TabsContent value="assets">
              <AssetList assets={extractedContract.depreciation_assets} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Notes */}
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any additional notes about this contract..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isProcessing}
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onReject} disabled={isProcessing}>
            Reject
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={isProcessing}
          >
            {isProcessing ? "Saving..." : "Save Contract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sub-components

function PartyList({ parties }: { parties: ContractParty[] }) {
  if (parties.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="mx-auto h-10 w-10 mb-2 opacity-50" />
        <p>No parties detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {parties.map((party, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{party.name}</p>
                <Badge variant="secondary" className="capitalize">
                  {party.role}
                </Badge>
              </div>
            </div>
            <ConfidenceIndicator confidence={party.confidence} size="sm" />
          </div>
          {(party.abn || party.acn) && (
            <div className="mt-3 pt-3 border-t text-sm space-y-1">
              {party.abn && (
                <p className="text-muted-foreground">
                  ABN: <span className="font-mono">{party.abn}</span>
                </p>
              )}
              {party.acn && (
                <p className="text-muted-foreground">
                  ACN: <span className="font-mono">{party.acn}</span>
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DateList({ dates }: { dates: KeyDate[] }) {
  if (dates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="mx-auto h-10 w-10 mb-2 opacity-50" />
        <p>No dates detected</p>
      </div>
    );
  }

  const getDateTypeColor = (type: KeyDate["date_type"]) => {
    switch (type) {
      case "commencement":
        return "bg-green-500";
      case "completion":
        return "bg-blue-500";
      case "milestone":
        return "bg-purple-500";
      case "review":
        return "bg-yellow-500";
      case "termination":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-2">
      {dates.map((date, index) => (
        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={cn("h-3 w-3 rounded-full", getDateTypeColor(date.date_type))} />
            <div>
              <p className="font-medium">{formatDate(date.date)}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{date.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {date.date_type}
            </Badge>
            <ConfidenceIndicator confidence={date.confidence} size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentList({ payments }: { payments: PaymentSchedule[] }) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <DollarSign className="mx-auto h-10 w-10 mb-2 opacity-50" />
        <p>No payment schedules detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((payment, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium line-clamp-1">{payment.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={payment.is_milestone ? "default" : "secondary"}>
                  {payment.is_milestone ? "Milestone" : "Payment"}
                </Badge>
                {payment.percentage && (
                  <Badge variant="outline">{payment.percentage}%</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatCurrency(payment.amount)}</p>
              {payment.due_date && (
                <p className="text-sm text-muted-foreground">
                  Due: {formatDate(payment.due_date)}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssetList({ assets }: { assets: DepreciationInfo[] }) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="mx-auto h-10 w-10 mb-2 opacity-50" />
        <p>No depreciation assets detected</p>
      </div>
    );
  }

  const totalValue = assets.reduce((sum, a) => sum + a.asset_value, 0);
  const immediateCount = assets.filter(a => a.is_immediate_deduction).length;
  const poolCount = assets.filter(a => a.is_low_value_pool).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-muted rounded-lg text-center">
          <p className="text-2xl font-bold">{assets.length}</p>
          <p className="text-xs text-muted-foreground">Total Assets</p>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{immediateCount}</p>
          <p className="text-xs text-green-600">Immediate Deduction</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{poolCount}</p>
          <p className="text-xs text-blue-600">Low Value Pool</p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Treatment</TableHead>
            <TableHead>Life (years)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium line-clamp-1">
                {asset.asset_description}
              </TableCell>
              <TableCell>{formatCurrency(asset.asset_value)}</TableCell>
              <TableCell>
                {asset.is_immediate_deduction ? (
                  <Badge className="bg-green-500">Immediate</Badge>
                ) : asset.is_low_value_pool ? (
                  <Badge className="bg-blue-500">Pool</Badge>
                ) : (
                  <Badge variant="outline">Depreciate</Badge>
                )}
              </TableCell>
              <TableCell>{asset.effective_life_years || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
        <span className="font-medium">Total Asset Value</span>
        <span className="text-xl font-bold">{formatCurrency(totalValue)}</span>
      </div>
    </div>
  );
}
