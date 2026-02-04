import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { SuggestionCard, SuggestionMiniCard } from './SuggestionCard';
import { TaxImpactSummary } from './TaxImpactBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  EyeOff,
  Clock,
  Sparkles,
  Download,
  Check,
  Loader2,
  List,
  LayoutGrid,
} from 'lucide-react';
import type { CategorizationSuggestion, SuggestionStatus, SuggestionType } from '@/lib/categorization-suggestions';

export interface SuggestionListProps {
  suggestions: CategorizationSuggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onIgnore: (id: string) => void;
  onReset: (id: string) => void;
  onAcceptAll: () => void;
  onAcceptHighConfidence: () => void;
  onExport: () => void;
  isGenerating?: boolean;
  className?: string;
  viewMode?: 'card' | 'compact';
}

const statusFilters: { value: SuggestionStatus | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <List size={14} /> },
  { value: 'pending', label: 'Pending', icon: <Clock size={14} /> },
  { value: 'accepted', label: 'Accepted', icon: <CheckCircle2 size={14} /> },
  { value: 'rejected', label: 'Rejected', icon: <XCircle size={14} /> },
  { value: 'ignored', label: 'Ignored', icon: <EyeOff size={14} /> },
];

const typeFilters: { value: SuggestionType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'd5_to_d6', label: 'Low-Value Pool' },
  { value: 'immediate_to_depreciation', label: 'Depreciation Setup' },
  { value: 'depreciation_to_immediate', label: 'Immediate Deduction' },
  { value: 'wrong_category', label: 'Better Category' },
  { value: 'missing_depreciation', label: 'Missing Depreciation' },
  { value: 'home_office_method', label: 'Home Office' },
  { value: 'vehicle_method', label: 'Vehicle Method' },
  { value: 'split_expense', label: 'Split Expense' },
];

/**
 * SuggestionList - Displays a list of categorization suggestions with filtering
 */
export function SuggestionList({
  suggestions,
  onAccept,
  onReject,
  onIgnore,
  onReset,
  onAcceptAll,
  onAcceptHighConfidence,
  onExport,
  isGenerating = false,
  className,
  viewMode: initialViewMode = 'card',
}: SuggestionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<SuggestionType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'compact'>(initialViewMode);

  // Calculate stats
  const stats = {
    total: suggestions.length,
    pending: suggestions.filter(s => s.status === 'pending').length,
    accepted: suggestions.filter(s => s.status === 'accepted').length,
    rejected: suggestions.filter(s => s.status === 'rejected').length,
    ignored: suggestions.filter(s => s.status === 'ignored').length,
    highConfidence: suggestions.filter(s => s.confidence === 'high' && s.status === 'pending').length,
  };

  const totalSavings = suggestions.reduce((sum, s) => sum + Math.max(0, s.taxImpact), 0);
  const acceptedSavings = suggestions
    .filter(s => s.status === 'accepted')
    .reduce((sum, s) => sum + Math.max(0, s.taxImpact), 0);
  const pendingSavings = suggestions
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + Math.max(0, s.taxImpact), 0);

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (typeFilter !== 'all' && s.suggestionType !== typeFilter) return false;
    if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        s.itemDescription.toLowerCase().includes(query) ||
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.currentCategory.toLowerCase().includes(query) ||
        s.suggestedCategory.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Sort by priority then tax impact
  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.taxImpact - a.taxImpact;
  });

  const hasActiveFilters = statusFilter !== 'pending' || typeFilter !== 'all' || priorityFilter !== 'all' || searchQuery;

  const clearFilters = () => {
    setStatusFilter('pending');
    setTypeFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
  };

  if (isGenerating) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        <Loader2 size={48} className="animate-spin text-primary mb-4" />
        <h3 className="text-lg font-medium">Analyzing your expenses...</h3>
        <p className="text-muted-foreground">Looking for optimization opportunities</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-medium">No suggestions found</h3>
        <p className="text-muted-foreground max-w-md mt-2">
          Your categorizations look good! We couldn't find any optimization opportunities at this time.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tax Impact Summary */}
      <TaxImpactSummary
        totalSavings={totalSavings}
        acceptedSavings={acceptedSavings}
        pendingSavings={pendingSavings}
      />

      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Clock size={12} />
          {stats.pending} Pending
        </Badge>
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 size={12} />
          {stats.accepted} Accepted
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <XCircle size={12} />
          {stats.rejected} Rejected
        </Badge>
        {stats.highConfidence > 0 && (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
            <Sparkles size={12} />
            {stats.highConfidence} High Confidence
          </Badge>
        )}
      </div>

      {/* Bulk Actions */}
      {stats.pending > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium mr-2">Bulk Actions:</span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onAcceptHighConfidence}
            disabled={stats.highConfidence === 0}
          >
            <Sparkles size={14} className="mr-2" />
            Accept High Confidence ({stats.highConfidence})
          </Button>
          <Button 
            size="sm" 
            variant="default"
            onClick={onAcceptAll}
          >
            <Check size={14} className="mr-2" />
            Accept All Pending ({stats.pending})
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="ml-auto"
            onClick={onExport}
          >
            <Download size={14} className="mr-2" />
            Export Report
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search suggestions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SuggestionStatus | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map(f => (
                <SelectItem key={f.value} value={f.value}>
                  <span className="flex items-center gap-2">
                    {f.icon}
                    {f.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as SuggestionType | 'all')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {typeFilters.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-none rounded-l-md"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid size={16} />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-none rounded-r-md"
              onClick={() => setViewMode('compact')}
            >
              <List size={16} />
            </Button>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          Showing {sortedSuggestions.length} of {suggestions.length} suggestions
        </div>
      </div>

      {/* Suggestions List */}
      {sortedSuggestions.length === 0 ? (
        <div className="text-center py-12">
          <Filter size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No suggestions match your filters</h3>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      ) : viewMode === 'card' ? (
        <div className="space-y-4">
          {sortedSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={onAccept}
              onReject={onReject}
              onIgnore={onIgnore}
              onReset={onReset}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={onAccept}
              onReject={onReject}
              onIgnore={onIgnore}
              onReset={onReset}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Tabbed view of suggestions by status
 */
export function SuggestionListTabs({
  suggestions,
  onAccept,
  onReject,
  onIgnore,
  onReset,
  onAcceptAll,
  onAcceptHighConfidence,
  onExport,
  className,
}: SuggestionListProps) {
  const [activeTab, setActiveTab] = useState('pending');

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const acceptedSuggestions = suggestions.filter(s => s.status === 'accepted');
  const rejectedSuggestions = suggestions.filter(s => s.status === 'rejected');
  const ignoredSuggestions = suggestions.filter(s => s.status === 'ignored');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={cn('space-y-6', className)}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="pending" className="gap-2">
          <Clock size={14} />
          Pending
          {pendingSuggestions.length > 0 && (
            <Badge variant="secondary" className="ml-1">{pendingSuggestions.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="accepted" className="gap-2">
          <CheckCircle2 size={14} />
          Accepted
          {acceptedSuggestions.length > 0 && (
            <Badge variant="default" className="ml-1 bg-green-600">{acceptedSuggestions.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="rejected" className="gap-2">
          <XCircle size={14} />
          Rejected
          {rejectedSuggestions.length > 0 && (
            <Badge variant="secondary" className="ml-1">{rejectedSuggestions.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="ignored" className="gap-2">
          <EyeOff size={14} />
          Ignored
          {ignoredSuggestions.length > 0 && (
            <Badge variant="secondary" className="ml-1">{ignoredSuggestions.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-4">
        <SuggestionList
          suggestions={pendingSuggestions}
          onAccept={onAccept}
          onReject={onReject}
          onIgnore={onIgnore}
          onReset={onReset}
          onAcceptAll={onAcceptAll}
          onAcceptHighConfidence={onAcceptHighConfidence}
          onExport={onExport}
        />
      </TabsContent>

      <TabsContent value="accepted" className="space-y-4">
        <SuggestionList
          suggestions={acceptedSuggestions}
          onAccept={onAccept}
          onReject={onReject}
          onIgnore={onIgnore}
          onReset={onReset}
          onAcceptAll={() => {}}
          onAcceptHighConfidence={() => {}}
          onExport={onExport}
        />
      </TabsContent>

      <TabsContent value="rejected" className="space-y-4">
        <SuggestionList
          suggestions={rejectedSuggestions}
          onAccept={onAccept}
          onReject={onReject}
          onIgnore={onIgnore}
          onReset={onReset}
          onAcceptAll={() => {}}
          onAcceptHighConfidence={() => {}}
          onExport={onExport}
        />
      </TabsContent>

      <TabsContent value="ignored" className="space-y-4">
        <SuggestionList
          suggestions={ignoredSuggestions}
          onAccept={onAccept}
          onReject={onReject}
          onIgnore={onIgnore}
          onReset={onReset}
          onAcceptAll={() => {}}
          onAcceptHighConfidence={() => {}}
          onExport={onExport}
        />
      </TabsContent>
    </Tabs>
  );
}

export default SuggestionList;