/**
 * DividendWithFrankingRow Component
 * 
 * Table row component for displaying dividend information with franking details.
 * Designed for use in dividend lists, transaction tables, and tax reports.
 */

import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Building2, Calendar, FileText, Edit2, Trash2, MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FrankingCreditBadgeCompact } from './FrankingCreditBadge';
import { calculateTaxImpactForIncome, formatCurrency, type DividendEntry } from '@/lib/franking-credits';

interface DividendWithFrankingRowProps {
  /** The dividend entry to display */
  entry: DividendEntry;
  /** Whether the row is selected */
  selected?: boolean;
  /** Callback when selection changes */
  onSelect?: (id: number, selected: boolean) => void;
  /** Callback to edit the entry */
  onEdit?: (entry: DividendEntry) => void;
  /** Callback to delete the entry */
  onDelete?: (id: number) => void;
  /** User's taxable income for tax impact calculation (optional) */
  taxableIncome?: number;
  /** Whether to show the tax impact column */
  showTaxImpact?: boolean;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Whether to show checkbox for selection */
  showCheckbox?: boolean;
}

export function DividendWithFrankingRow({
  entry,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  taxableIncome,
  showTaxImpact = false,
  showActions = true,
  showCheckbox = true,
}: DividendWithFrankingRowProps) {
  // Calculate tax impact if taxable income provided
  const taxImpact = taxableIncome 
    ? calculateTaxImpactForIncome(entry.grossedUpDividend, entry.frankingCredit, taxableIncome)
    : null;

  const handleSelect = (checked: boolean) => {
    onSelect?.(entry.id!, checked);
  };

  return (
    <TableRow className="group hover:bg-muted/50">
      {/* Checkbox */}
      {showCheckbox && (
        <TableCell className="w-10">
          <Checkbox
            checked={selected}
            onCheckedChange={handleSelect}
            aria-label={`Select ${entry.companyName}`}
          />
        </TableCell>
      )}

      {/* Company */}
      <TableCell>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div>
            <span className="font-medium block">{entry.companyName}</span>
            {entry.notes && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <FileText className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{entry.notes}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </TableCell>

      {/* Date */}
      <TableCell>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(entry.dateReceived).toLocaleDateString('en-AU')}
        </div>
      </TableCell>

      {/* Dividend Amount */}
      <TableCell className="text-right">
        <span className="font-medium">{formatCurrency(entry.dividendAmount)}</span>
      </TableCell>

      {/* Franking Percentage */}
      <TableCell className="text-right">
        <FrankingCreditBadgeCompact
          dividendAmount={entry.dividendAmount}
          frankingPercentage={entry.frankingPercentage}
        />
      </TableCell>

      {/* Franking Credit */}
      <TableCell className="text-right">
        <span className="font-medium text-green-600">
          {formatCurrency(entry.frankingCredit)}
        </span>
      </TableCell>

      {/* Grossed-Up */}
      <TableCell className="text-right">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-medium cursor-help border-b border-dotted border-muted-foreground">
                {formatCurrency(entry.grossedUpDividend)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm space-y-1">
                <p className="font-medium">Grossed-Up Dividend Calculation</p>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Cash Dividend:</span>
                  <span>{formatCurrency(entry.dividendAmount)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">+ Franking Credit:</span>
                  <span>{formatCurrency(entry.frankingCredit)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                  <span className="font-medium">= Grossed-Up:</span>
                  <span className="font-medium">{formatCurrency(entry.grossedUpDividend)}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Amount to declare on tax return
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Tax Impact (optional) */}
      {showTaxImpact && (
        <TableCell className="text-right">
          {taxImpact ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                    taxImpact.netTaxPosition < 0 
                      ? 'bg-green-100 text-green-800' 
                      : taxImpact.netTaxPosition > 0 
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {taxImpact.netTaxPosition < 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3" />
                        Refund {formatCurrency(Math.abs(taxImpact.netTaxPosition))}
                      </>
                    ) : taxImpact.netTaxPosition > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        Pay {formatCurrency(taxImpact.netTaxPosition)}
                      </>
                    ) : (
                      'Break-even'
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Tax Impact at {(taxImpact.marginalRate * 100).toFixed(0)}% Rate</p>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Tax on grossed-up:</span>
                      <span>{formatCurrency(taxImpact.taxOnGrossedUp)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">- Credit offset:</span>
                      <span className="text-green-600">-{formatCurrency(taxImpact.frankingCreditOffset)}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                      <span className="font-medium">Net position:</span>
                      <span className={taxImpact.netTaxPosition < 0 ? 'text-green-600' : taxImpact.netTaxPosition > 0 ? 'text-orange-600' : ''}>
                        {taxImpact.netTaxPosition < 0 ? 'Refund' : taxImpact.netTaxPosition > 0 ? 'Payable' : 'Break-even'} {formatCurrency(Math.abs(taxImpact.netTaxPosition))}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </TableCell>
      )}

      {/* Actions */}
      {showActions && (
        <TableCell className="w-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(entry)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(entry.id!)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}

/**
 * Header row for the DividendWithFrankingRow table
 */
export function DividendWithFrankingHeader({
  showTaxImpact = false,
  showActions = true,
  showCheckbox = true,
  allSelected = false,
  onSelectAll,
}: {
  showTaxImpact?: boolean;
  showActions?: boolean;
  showCheckbox?: boolean;
  allSelected?: boolean;
  onSelectAll?: (selected: boolean) => void;
}) {
  return (
    <TableRow>
      {showCheckbox && (
        <TableHead className="w-10">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
            aria-label="Select all dividends"
          />
        </TableHead>
      )}
      <TableHead>Company</TableHead>
      <TableHead>Date</TableHead>
      <TableHead className="text-right">Dividend</TableHead>
      <TableHead className="text-right">Franking %</TableHead>
      <TableHead className="text-right">Franking Credit</TableHead>
      <TableHead className="text-right">Grossed-Up</TableHead>
      {showTaxImpact && <TableHead className="text-right">Tax Impact</TableHead>}
      {showActions && <TableHead className="w-10"></TableHead>}
    </TableRow>
  );
}

import { TableHead } from '@/components/ui/table';
