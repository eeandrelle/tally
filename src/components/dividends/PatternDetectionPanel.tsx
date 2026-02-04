/**
 * PatternDetectionPanel Component
 * 
 * Trigger analysis and view pattern detection results
 * Provides controls for running detection and displaying results
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  useDividendPatterns, 
  usePatternDetection, 
  usePatternHistory,
  getFrequencyLabel,
  getConfidenceColor,
} from '@/hooks/useDividendPatterns';
import { PaymentPatternBadge, PatternConfidenceBadge } from './PaymentPatternBadge';
import type { DividendPattern, PaymentFrequency, PatternConfidence } from '@/lib/dividend-patterns';
import {
  Play,
  RefreshCw,
  Database,
  Brain,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  History,
  ChevronRight,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface PatternDetectionPanelProps {
  onPatternSelect?: (pattern: DividendPattern) => void;
  className?: string;
}

export function PatternDetectionPanel({ onPatternSelect, className }: PatternDetectionPanelProps) {
  const [activeTab, setActiveTab] = useState('patterns');
  
  const {
    patterns,
    statistics,
    isLoading,
    isAnalyzing,
    syncFromEntries,
    analyzeAll,
  } = useDividendPatterns({ autoLoad: true });

  const {
    isDetecting,
    progress,
    currentHolding,
    runDetectionFromDatabase,
  } = usePatternDetection();

  const {
    analysisHistory,
  } = usePatternHistory();

  const handleRunAnalysis = useCallback(async () => {
    await runDetectionFromDatabase();
  }, [runDetectionFromDatabase]);

  const handleSyncAndAnalyze = useCallback(async () => {
    await syncFromEntries();
    await analyzeAll();
  }, [syncFromEntries, analyzeAll]);

  const isProcessing = isLoading || isAnalyzing || isDetecting;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          label="Total Holdings"
          value={statistics?.totalHoldings || 0}
          isLoading={isLoading}
        />
        <StatCard
          icon={Brain}
          label="Patterns Detected"
          value={patterns.length}
          isLoading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Confidence"
          value={`${statistics?.averageConfidence || 0}%`}
          isLoading={isLoading}
        />
        <StatCard
          icon={Calendar}
          label="Upcoming (90d)"
          value={statistics?.upcomingPaymentsCount || 0}
          isLoading={isLoading}
        />
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Run Pattern Detection
            </CardTitle>
            <CardDescription>
              Analyze all dividend history to detect payment patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDetecting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Analyzing patterns...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentHolding && (
                  <p className="text-xs text-muted-foreground">
                    Processing: {currentHolding}
                  </p>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={handleRunAnalysis}
                disabled={isProcessing}
                className="flex-1"
              >
                {isDetecting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isDetecting ? 'Analyzing...' : 'Run Analysis'}
              </Button>
              <Button
                variant="outline"
                onClick={handleSyncAndAnalyze}
                disabled={isProcessing}
              >
                <Database className="h-4 w-4 mr-2" />
                Sync & Analyze
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pattern Distribution
            </CardTitle>
            <CardDescription>
              Breakdown by payment frequency
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-20 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : statistics ? (
              <div className="grid grid-cols-3 gap-2">
                <FrequencyCount 
                  frequency="monthly" 
                  count={statistics.byFrequency.monthly} 
                />
                <FrequencyCount 
                  frequency="quarterly" 
                  count={statistics.byFrequency.quarterly} 
                />
                <FrequencyCount 
                  frequency="half-yearly" 
                  count={statistics.byFrequency['half-yearly']} 
                />
                <FrequencyCount 
                  frequency="yearly" 
                  count={statistics.byFrequency.yearly} 
                />
                <FrequencyCount 
                  frequency="irregular" 
                  count={statistics.byFrequency.irregular} 
                />
                <FrequencyCount 
                  frequency="unknown" 
                  count={statistics.byFrequency.unknown} 
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patterns" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="confidence" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Confidence
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="mt-4">
          <PatternList 
            patterns={patterns} 
            isLoading={isLoading}
            onSelect={onPatternSelect}
          />
        </TabsContent>

        <TabsContent value="confidence" className="mt-4">
          <ConfidenceBreakdown statistics={statistics} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <AnalysisHistory history={analysisHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  isLoading?: boolean;
}

function StatCard({ icon: Icon, label, value, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {isLoading ? (
              <div className="h-6 w-16 bg-muted animate-pulse rounded mt-0.5" />
            ) : (
              <p className="text-xl font-bold">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FrequencyCountProps {
  frequency: PaymentFrequency;
  count: number;
}

function FrequencyCount({ frequency, count }: FrequencyCountProps) {
  if (count === 0) return null;
  
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
      <span className="text-xs font-medium">{getFrequencyLabel(frequency)}</span>
      <Badge variant="secondary" className="text-xs">
        {count}
      </Badge>
    </div>
  );
}

interface PatternListProps {
  patterns: DividendPattern[];
  isLoading: boolean;
  onSelect?: (pattern: DividendPattern) => void;
}

function PatternList({ patterns, isLoading, onSelect }: PatternListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading patterns...</p>
        </CardContent>
      </Card>
    );
  }

  if (patterns.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No patterns detected yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run pattern detection to analyze your dividend history
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by confidence score descending
  const sortedPatterns = [...patterns].sort((a, b) => b.confidenceScore - a.confidenceScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Detected Patterns ({patterns.length})
        </CardTitle>
        <CardDescription>
          Click on a pattern to view details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] -mx-6 px-6">
          <div className="space-y-2">
            {sortedPatterns.map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => onSelect?.(pattern)}
                className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {pattern.companyName}
                      </span>
                      {pattern.asxCode && (
                        <Badge variant="outline" className="text-xs">
                          {pattern.asxCode}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {pattern.paymentsAnalyzed} payments • Last: {new Date(pattern.dateRange.end).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <PaymentPatternBadge
                      frequency={pattern.frequency}
                      confidence={pattern.confidence}
                      confidenceScore={pattern.confidenceScore}
                      showScore={false}
                      showTooltip={false}
                      size="sm"
                    />
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface ConfidenceBreakdownProps {
  statistics: { 
    byConfidence: Record<PatternConfidence, number>;
    averageConfidence: number;
  } | null;
  isLoading: boolean;
}

function ConfidenceBreakdown({ statistics, isLoading }: ConfidenceBreakdownProps) {
  if (isLoading || !statistics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading statistics...</p>
        </CardContent>
      </Card>
    );
  }

  const total = Object.values(statistics.byConfidence).reduce((a, b) => a + b, 0);
  const confidenceOrder: PatternConfidence[] = ['high', 'medium', 'low', 'uncertain'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Confidence Breakdown</CardTitle>
        <CardDescription>
          Average confidence: {statistics.averageConfidence}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {confidenceOrder.map((confidence) => {
            const count = statistics.byConfidence[confidence];
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            return (
              <div key={confidence} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <PatternConfidenceBadge confidence={confidence} size="sm" />
                  <span className="text-muted-foreground">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', getConfidenceColor(confidence).split(' ')[0])}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface AnalysisHistoryProps {
  history: Array<{
    id: string;
    analysisDate: string;
    totalHoldings: number;
    patternsDetected: number;
    analysisDurationMs: number;
    status: 'completed' | 'running' | 'failed';
    errorLog: string[];
    notes: string | null;
  }>;
}

function AnalysisHistory({ history }: AnalysisHistoryProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No analysis history yet</p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analysis History</CardTitle>
        <CardDescription>
          Recent pattern detection runs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] -mx-6 px-6">
          <div className="space-y-3">
            {history.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={run.status === 'completed' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {run.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(run.analysisDate).toLocaleString('en-AU')}
                    </span>
                  </div>
                  <p className="text-sm mt-1">
                    {run.patternsDetected} patterns from {run.totalHoldings} holdings
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 inline mr-1" />
                  {formatDuration(run.analysisDurationMs)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default PatternDetectionPanel;
