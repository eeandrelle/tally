/**
 * Tax Optimization Dashboard Component
 * 
 * Displays optimization opportunities and allows users to track progress.
 * 
 * @example
 * ```tsx
 * <TaxOptimizationDashboard 
 *   profile={userProfile}
 *   expenseHistory={currentYearExpenses}
 * />
 * ```
 */

import React, { useEffect } from 'react';
import { useTaxOptimization, useOpportunityTracker, useOpportunityFilter } from '../hooks/useTaxOptimization';
import type { UserProfile, ExpenseHistory } from '../lib/tax-optimization';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { 
  Lightbulb, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface TaxOptimizationDashboardProps {
  profile: UserProfile;
  expenseHistory: ExpenseHistory;
  onExport?: (report: string) => void;
}

const priorityColors = {
  critical: 'bg-red-500 hover:bg-red-600',
  high: 'bg-orange-500 hover:bg-orange-600',
  medium: 'bg-yellow-500 hover:bg-yellow-600',
  low: 'bg-blue-500 hover:bg-blue-600'
};

const priorityIcons = {
  critical: AlertCircle,
  high: AlertCircle,
  medium: Lightbulb,
  low: Lightbulb
};

export function TaxOptimizationDashboard({ 
  profile, 
  expenseHistory,
  onExport 
}: TaxOptimizationDashboardProps) {
  const {
    result,
    isAnalyzing,
    error,
    runAnalysis,
    opportunities,
    totalSavings,
    criticalOpportunities,
    highOpportunities,
    mediumOpportunities,
    lowOpportunities,
    exportReport,
    hasOpportunities
  } = useTaxOptimization();

  const {
    filteredOpportunities,
    categories,
    types,
    filterCategory,
    setFilterCategory,
    filterPriority,
    setFilterPriority,
    sortBy,
    setSortBy,
    clearFilters,
    hasActiveFilters
  } = useOpportunityFilter(opportunities);

  // Run analysis on mount
  useEffect(() => {
    runAnalysis(profile, expenseHistory);
  }, [profile, expenseHistory]);

  const handleExport = () => {
    const report = exportReport();
    onExport?.(report);
    
    // Download as file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-optimization-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to analyze tax optimization opportunities. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tax Optimization</h2>
          <p className="text-muted-foreground">
            AI-powered detection of missing deductions and savings opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => runAnalysis(profile, expenseHistory)}
            disabled={isAnalyzing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!hasOpportunities}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Potential Savings</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              ${totalSavings.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Estimated tax savings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {criticalOpportunities.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              High-impact opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Priority</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {highOpportunities.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Significant savings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Opportunities</CardDescription>
            <CardTitle className="text-3xl">
              {opportunities.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All detected patterns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {hasOpportunities && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <select
              className="border rounded px-3 py-2"
              value={filterCategory || ''}
              onChange={(e) => setFilterCategory(e.target.value || null)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              className="border rounded px-3 py-2"
              value={filterPriority || ''}
              onChange={(e) => setFilterPriority(e.target.value as any || null)}
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              className="border rounded px-3 py-2"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="priority">Sort by Priority</option>
              <option value="savings">Sort by Savings</option>
              <option value="confidence">Sort by Confidence</option>
            </select>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Opportunities List */}
      <div className="space-y-4">
        {isAnalyzing ? (
          <Card>
            <CardContent className="py-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Analyzing your tax profile...</p>
            </CardContent>
          </Card>
        ) : filteredOpportunities.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No optimization opportunities detected. Your tax profile looks great.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOpportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))
        )}
      </div>
    </div>
  );
}

interface OpportunityCardProps {
  opportunity: import('../lib/tax-optimization').OptimizationOpportunity;
}

function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const { completedActions, toggleAction, progress } = useOpportunityTracker(opportunity);
  const Icon = priorityIcons[opportunity.priority];
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${priorityColors[opportunity.priority].split(' ')[0]}`} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${priorityColors[opportunity.priority]} text-white`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{opportunity.title}</CardTitle>
              <CardDescription>{opportunity.description}</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-green-600 font-semibold">
              <DollarSign className="h-4 w-4" />
              {opportunity.estimatedSavings.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">potential savings</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={opportunity.priority === 'critical' ? 'destructive' : 'default'}>
            {opportunity.priority.toUpperCase()}
          </Badge>
          <Badge variant="outline">{opportunity.type.replace('_', ' ')}</Badge>
          <Badge variant="outline">{opportunity.confidence} confidence</Badge>
          {opportunity.aTOReference && (
            <Badge variant="outline" className="text-blue-600">
              ATO: {opportunity.aTOReference}
            </Badge>
          )}
        </div>

        {/* Tax Impact */}
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tax Impact
          </p>
          <p className="text-sm text-muted-foreground mt-1">{opportunity.taxImpact}</p>
        </div>

        {/* Action Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Action Items</p>
            <p className="text-xs text-muted-foreground">{progress}% complete</p>
          </div>
          <Progress value={progress} className="mb-3" />
          
          <ul className="space-y-2">
            {opportunity.actionItems.map((action, index) => (
              <li key={index} className="flex items-start gap-2">
                <button
                  onClick={() => toggleAction(action)}
                  className="mt-0.5"
                >
                  <CheckCircle2 
                    className={`h-4 w-4 ${
                      completedActions.includes(action) 
                        ? 'text-green-500' 
                        : 'text-gray-300'
                    }`} 
                  />
                </button>
                <span className={`text-sm ${
                  completedActions.includes(action) ? 'line-through text-muted-foreground' : ''
                }`}>
                  {action}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default TaxOptimizationDashboard;
