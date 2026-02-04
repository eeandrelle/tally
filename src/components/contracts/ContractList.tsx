import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
  Search,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Link,
  Download,
  Filter,
  Plus,
  Building2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Contract } from "@/lib/contracts";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";

interface ContractListProps {
  contracts: Contract[];
  isLoading?: boolean;
  onView: (contract: Contract) => void;
  onApprove: (id: number) => void;
  onDelete: (id: number) => void;
  onExport: (format: "json" | "csv") => void;
  onUploadClick: () => void;
}

export function ContractList({
  contracts,
  isLoading = false,
  onView,
  onApprove,
  onDelete,
  onExport,
  onUploadClick,
}: ContractListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Contract["status"] | "all">("all");

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      searchQuery === "" ||
      contract.contract_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contract_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: Contract["status"]) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "draft":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "linked":
        return <Link className="h-4 w-4 text-purple-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: Contract["status"]) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "draft":
        return "outline";
      case "linked":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getPartyCount = (contract: Contract) => {
    if (!contract.parties_json) return 0;
    try {
      return JSON.parse(contract.parties_json).length;
    } catch {
      return 0;
    }
  };

  const getAssetCount = (contract: Contract) => {
    if (!contract.depreciation_assets_json) return 0;
    try {
      return JSON.parse(contract.depreciation_assets_json).length;
    } catch {
      return 0;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contracts
              <Badge variant="secondary">{contracts.length}</Badge>
            </CardTitle>
            <CardDescription>
              Manage and review parsed contract documents
            </CardDescription>
          </div>
          <Button onClick={onUploadClick}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Contract
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="h-4 w-4 mr-2" />
                {statusFilter === "all" ? "All Status" : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("draft")}>
                Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("approved")}>
                Approved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("linked")}>
                Linked
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>
                Rejected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport("json")}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("csv")}>
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contract List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading contracts...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No contracts found</p>
            <p className="text-muted-foreground">
              {contracts.length === 0
                ? "Upload your first contract to get started"
                : "Try adjusting your filters"}
            </p>
            {contracts.length === 0 && (
              <Button className="mt-4" onClick={onUploadClick}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Contract
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract</TableHead>
                  <TableHead>Parties</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {contract.contract_type || "Unknown Type"}
                          </p>
                          {contract.contract_number && (
                            <p className="text-sm text-muted-foreground">
                              {contract.contract_number}
                            </p>
                          )}
                          {contract.contract_date && (
                            <p className="text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {contract.contract_date}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{getPartyCount(contract)}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {contract.total_value ? (
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>{formatCurrency(contract.total_value)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {getAssetCount(contract) > 0 ? (
                        <Badge variant="outline">
                          {getAssetCount(contract)} assets
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(contract.status)}
                        className="capitalize flex items-center gap-1 w-fit"
                      >
                        {getStatusIcon(contract.status)}
                        {contract.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <ConfidenceIndicator
                        confidence={contract.confidence_score}
                        size="sm"
                      />
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(contract)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {contract.status === "draft" && (
                            <DropdownMenuItem onClick={() => contract.id && onApprove(contract.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => contract.id && onDelete(contract.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
