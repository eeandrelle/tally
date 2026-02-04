/**
 * ChecklistSection Component
 * 
 * Expandable checklist section for displaying income sources, deductions,
 * missing documents, and optimization opportunities.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  MinusCircle,
  ChevronDown, 
  ChevronUp,
  Upload,
  FileText,
  ExternalLink,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChecklistItem, ChecklistStatus } from '@/lib/completeness-checker';

// ============= TYPES =============

export interface ChecklistSectionProps {
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** Checklist items */
  items: ChecklistItem[];
  /** Section icon */
  icon?: React.ElementType;
  /** Whether the section is initially expanded */
  defaultExpanded?: boolean;
  /** Callback when an item action is clicked */
  onItemAction?: (item: ChecklistItem) => void;
  /** Callback when item is marked complete */
  onMarkComplete?: (itemId: string) => void;
  /** Additional class name */
  className?: string;
  /** Item type for styling variations */
  itemType?: 'income' | 'deduction' | 'document' | 'optimization';
}

// ============= MAIN COMPONENT =============

export function ChecklistSection({
  title,
  description,
  items,
  icon: SectionIcon = FileText,
  defaultExpanded = false,
  onItemAction,
  onMarkComplete,
  className,
  itemType = 'income'
}: ChecklistSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate progress
  const completeCount = items.filter(i => i.status === 'complete').length;
  const progress = items.length > 0 ? (completeCount / items.length) * 100 : 0;

  // Count by status
  const counts = {
    complete: items.filter(i => i.status === 'complete').length,
    partial: items.filter(i => i.status === 'partial').length,
    missing: items.filter(i => i.status === 'missing').length,
    notApplicable: items.filter(i => i.status === 'not_applicable').length
  };

  // Get status color
  const getSectionStatus = () => {
    if (counts.missing > 0 && items.some(i => i.required && i.status === 'missing')) return 'red';
    if (counts.missing > 0 || counts.partial > 0) return 'amber';
    return 'green';
  };

  const status = getSectionStatus();

  return (
    <Card className={className}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  status === 'green' ? "bg-green-100 text-green-600" :
                  status === 'amber' ? "bg-amber-100 text-amber-600" :
                  "bg-red-100 text-red-600"
                )}>
                  <SectionIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {title}
                    <StatusBadge status={status} />
                  </CardTitle>
                  {description && (
                    <CardDescription>{description}</CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {completeCount}/{items.length}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
            <Progress value={progress} className="h-1.5 mt-3" />
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-2 mt-4">
              {items.length === 0 ? (
                <EmptyState type={itemType} />
              ) : (
                items.map(item => (
                  <ChecklistItemRow
                    key={item.id}
                    item={item}
                    onAction={() => onItemAction?.(item)}
                    onMarkComplete={() => onMarkComplete?.(item.id)}
                    type={itemType}
                  />
                ))
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============= CHECKLIST ITEM ROW =============

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onAction?: () => void;
  onMarkComplete?: () => void;
  type: 'income' | 'deduction' | 'document' | 'optimization';
}

function ChecklistItemRow({ item, onAction, onMarkComplete, type }: ChecklistItemRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Note: ItemIcon can be used for custom item icons if needed
  // const ItemIcon = item.icon ? (iconMap[item.icon] || HelpCircle) : HelpCircle;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all",
        item.status === 'complete' ? "bg-muted/30 border-transparent" :
        item.status === 'not_applicable' ? "bg-muted/10 border-transparent opacity-60" :
        item.required ? "bg-red-50/50 border-red-200" :
        "bg-white border-border hover:border-muted-foreground/30",
        isHovered && "shadow-sm"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Icon */}
      <div className="mt-0.5">
        <StatusIcon status={item.status} required={item.required} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "font-medium",
              item.status === 'complete' && "text-muted-foreground line-through"
            )}>
              {item.title}
            </span>
            {item.required && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
            {(item as any).prefillAvailable && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                Prefill
              </Badge>
            )}
          </div>
          
          {/* Amounts for income/deductions */}
          {(type === 'income' || type === 'deduction') && item.claimedAmount !== undefined && (
            <div className="text-right">
              <span className={cn(
                "font-medium",
                item.claimedAmount > 0 ? "text-foreground" : "text-muted-foreground"
              )}>
                ${item.claimedAmount.toLocaleString()}
              </span>
              {'potentialAmount' in item && item.potentialAmount && item.potentialAmount > item.claimedAmount && (
                <p className="text-xs text-green-600">
                  Potential: ${item.potentialAmount.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Tax savings for optimization */}
          {type === 'optimization' && 'estimatedTaxSavings' in item && (
            <div className="text-right">
              <span className="font-medium text-green-600">
                +${(item as any).estimatedTaxSavings.toLocaleString()}
              </span>
              <p className="text-xs text-muted-foreground">tax savings</p>
            </div>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {item.description}
          </p>
        )}

        {/* Action needed */}
        {item.actionNeeded && item.status !== 'complete' && (
          <div className="flex items-center gap-2 mt-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-sm text-amber-700">{item.actionNeeded}</span>
          </div>
        )}

        {/* Receipts indicator */}
        {item.receiptsRequired > 0 && (
          <div className="flex items-center gap-2 mt-2 text-sm">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={cn(
              item.receiptsAttached >= item.receiptsRequired ? "text-green-600" : "text-muted-foreground"
            )}>
              {item.receiptsAttached}/{item.receiptsRequired} documents
            </span>
          </div>
        )}

        {/* Help text */}
        {item.helpText && (
          <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
            {item.helpText}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          {item.status !== 'complete' && item.actionLink && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={onAction}
            >
              {type === 'document' ? (
                <><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload</>
              ) : type === 'optimization' ? (
                <><Lightbulb className="h-3.5 w-3.5 mr-1.5" /> Review</>
              ) : (
                <><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> {item.actionNeeded || 'Complete'}</>
              )}
            </Button>
          )}
          
          {item.status !== 'complete' && onMarkComplete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={onMarkComplete}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Mark Complete
            </Button>
          )}

          {item.atoReference && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-muted-foreground"
              onClick={() => window.open(item.atoReference, '_blank')}
            >
              ATO Info
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= HELPER COMPONENTS =============

interface StatusBadgeProps {
  status: 'red' | 'amber' | 'green';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    green: { label: 'Complete', className: 'bg-green-100 text-green-700 border-green-200' },
    amber: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    red: { label: 'Action Needed', className: 'bg-red-100 text-red-700 border-red-200' }
  };

  const c = config[status];

  return (
    <Badge variant="outline" className={cn("text-xs", c.className)}>
      {c.label}
    </Badge>
  );
}

interface StatusIconProps {
  status: ChecklistStatus;
  required: boolean;
}

function StatusIcon({ status, required }: StatusIconProps) {
  const config = {
    complete: { icon: CheckCircle2, color: 'text-green-500' },
    partial: { icon: AlertTriangle, color: 'text-amber-500' },
    missing: { icon: required ? AlertCircle : MinusCircle, color: required ? 'text-red-500' : 'text-gray-400' },
    not_applicable: { icon: MinusCircle, color: 'text-gray-300' }
  };

  const c = config[status];
  const Icon = c.icon;

  return <Icon className={cn("h-5 w-5", c.color)} />;
}

function EmptyState({ type }: { type: 'income' | 'deduction' | 'document' | 'optimization' }) {
  const messages = {
    income: "No income sources to display",
    deduction: "No deduction categories to display",
    document: "No missing documents detected",
    optimization: "No optimization opportunities found"
  };

  return (
    <div className="text-center py-8 text-muted-foreground">
      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>{messages[type]}</p>
    </div>
  );
}

// ============= SPECIALIZED SECTIONS =============

export interface MissingDocumentsSectionProps {
  documents: Array<{
    id: string;
    documentType: string;
    description: string;
    expectedSource: string;
    priority: 'high' | 'medium' | 'low';
    patternBased: boolean;
    detectionReason: string;
    icon: string;
  }>;
  onUpload?: (documentId: string) => void;
  className?: string;
}

export function MissingDocumentsSection({ 
  documents, 
  onUpload,
  className 
}: MissingDocumentsSectionProps) {
  // Convert to checklist items
  const items: ChecklistItem[] = documents.map(doc => ({
    id: doc.id,
    title: doc.documentType,
    description: doc.description,
    status: 'missing',
    required: doc.priority === 'high',
    category: 'Documents',
    actionNeeded: `Upload from ${doc.expectedSource}`,
    actionLink: '/upload',
    receiptsAttached: 0,
    receiptsRequired: 1,
    icon: doc.icon,
    helpText: doc.detectionReason
  }));

  return (
    <ChecklistSection
      title="Missing Documents"
      description={documents.length > 0 ? `${documents.length} documents detected as missing` : 'All required documents appear to be present'}
      items={items}
      icon={FileText}
      defaultExpanded={documents.some(d => d.priority === 'high')}
      onItemAction={(item) => onUpload?.(item.id)}
      itemType="document"
      className={className}
    />
  );
}

export interface OptimizationSectionProps {
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    estimatedTaxSavings: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    actionText: string;
    actionLink?: string;
    implemented: boolean;
  }>;
  onImplement?: (suggestionId: string) => void;
  className?: string;
}

export function OptimizationSection({ 
  suggestions, 
  onImplement,
  className 
}: OptimizationSectionProps) {
  // Convert to checklist items
  const items: ChecklistItem[] = suggestions.map(sugg => ({
    id: sugg.id,
    title: sugg.title,
    description: sugg.description,
    status: sugg.implemented ? 'complete' : 'missing',
    required: sugg.priority === 'critical',
    category: 'Optimization',
    actionNeeded: sugg.implemented ? undefined : sugg.actionText,
    actionLink: sugg.actionLink,
    receiptsAttached: sugg.implemented ? 1 : 0,
    receiptsRequired: 1,
    icon: 'lightbulb'
  }));

  const totalSavings = suggestions
    .filter(s => !s.implemented)
    .reduce((sum, s) => sum + s.estimatedTaxSavings, 0);

  return (
    <ChecklistSection
      title="Optimization Opportunities"
      description={totalSavings > 0 
        ? `Potential additional tax savings: $${totalSavings.toLocaleString()}`
        : 'No unimplemented optimization opportunities'
      }
      items={items}
      icon={Lightbulb}
      defaultExpanded={suggestions.some(s => s.priority === 'critical' && !s.implemented)}
      onItemAction={(item) => onImplement?.(item.id)}
      itemType="optimization"
      className={className}
    />
  );
}

export default ChecklistSection;