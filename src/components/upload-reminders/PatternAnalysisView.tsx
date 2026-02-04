import { useState } from 'react';
import { 
  FileText, 
  Banknote, 
  Receipt, 
  File,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DocumentPattern, DocumentType, PatternFrequency } from '@/lib/upload-patterns';

interface PatternAnalysisViewProps {
  patterns: DocumentPattern[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const documentTypeIcons: Record<DocumentType, typeof FileText> = {
  bank_statement: Banknote,
  dividend_statement: Receipt,
  payg_summary: FileText,
  other: File,
};

const documentTypeLabels: Record<DocumentType, string> = {
  bank_statement: 'Bank Statements',
  dividend_statement: 'Dividend Statements',
  payg_summary: 'PAYG Summaries',
  other: 'Other Documents',
};

const frequencyLabels: Record<PatternFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-Yearly',
  yearly: 'Yearly',
  irregular: 'Irregular',
  unknown: 'Unknown',
};

const stabilityIcons = {
  stable: CheckCircle2,
  changing: AlertTriangle,
  volatile: TrendingDown,
};

const stabilityColors = {
  stable: 'text-green-500',
  changing: 'text-yellow-500',
  volatile: 'text-red-500',
};

const confidenceColors = {
  high: 'bg-green-500',
  medium: 'bg-yellow-500',
  low: 'bg-orange-500',
  uncertain: 'bg-gray-400',
};

export function PatternAnalysisView({ 
  patterns, 
  isLoading,
  onRefresh 
}: PatternAnalysisViewProps) {
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all');

  const filteredPatterns = selectedType === 'all' 
    ? patterns 
    : patterns.filter(p => p.documentType === selectedType);

  // Statistics
  const stats = {
    total: patterns.length,
    byType: {
      bank_statement: patterns.filter(p => p.documentType === 'bank_statement').length,
      dividend_statement: patterns.filter(p => p.documentType === 'dividend_statement').length,
      payg_summary: patterns.filter(p => p.documentType === 'payg_summary').length,
      other: patterns.filter(p => p.documentType === 'other').length,
    },
    byConfidence: {
      high: patterns.filter(p => p.confidence === 'high').length,
      medium: patterns.filter(p => p.confidence === 'medium').length,
      low: patterns.filter(p => p.confidence === 'low').length,
      uncertain: patterns.filter(p => p.confidence === 'uncertain').length,
    },
    stable: patterns.filter(p => p.patternStability === 'stable').length,
  };

  const patternsBySource = filteredPatterns.reduce((acc, pattern) => {
    if (!acc[pattern.source]) {
      acc[pattern.source] = [];
    }
    acc[pattern.source].push(pattern);
    return acc;
  }, {} as Record<string, DocumentPattern[]>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (patterns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Upload Pattern Analysis
          </CardTitle>
          <CardDescription>
            No patterns detected yet. Upload more documents to establish patterns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As you upload documents, we&apos;ll analyze your patterns and predict when future documents are expected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Upload Pattern Analysis
            </CardTitle>
            <CardDescription>
              {stats.total} pattern{stats.total === 1 ? '' : 's'} detected across your document sources
            </CardDescription>
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="High Confidence"
            value={stats.byConfidence.high}
            total={stats.total}
            color="bg-green-500"
          />
          <StatCard
            label="Medium Confidence"
            value={stats.byConfidence.medium}
            total={stats.total}
            color="bg-yellow-500"
          />
          <StatCard
            label="Low Confidence"
            value={stats.byConfidence.low + stats.byConfidence.uncertain}
            total={stats.total}
            color="bg-orange-500"
          />
          <StatCard
            label="Stable Patterns"
            value={stats.stable}
            total={stats.total}
            color="bg-blue-500"
          />
        </div>

        {/* Type Filter */}
        <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as DocumentType | 'all')}>
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="bank_statement">Bank</TabsTrigger>
            <TabsTrigger value="dividend_statement">Dividend</TabsTrigger>
            <TabsTrigger value="payg_summary">PAYG</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedType} className="mt-4">
            <div className="space-y-3">
              {Object.entries(patternsBySource).map(([source, sourcePatterns]) => (
                <SourcePatternCard 
                  key={source} 
                  source={source} 
                  patterns={sourcePatterns} 
                />
              ))}

              {filteredPatterns.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No patterns found for this document type
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  label, 
  value, 
  total, 
  color 
}: { 
  label: string; 
  value: number; 
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="border rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        <Progress value={percentage} className={`h-1.5 ${color}`} />
        <span className="text-xs text-muted-foreground">{percentage}%</span>
      </div>
    </div>
  );
}

function SourcePatternCard({ 
  source, 
  patterns 
}: { 
  source: string; 
  patterns: DocumentPattern[];
}) {
  const primaryPattern = patterns[0];
  const Icon = documentTypeIcons[primaryPattern.documentType];
  const StabilityIcon = stabilityIcons[primaryPattern.patternStability];
  const stabilityColor = stabilityColors[primaryPattern.patternStability];
  const confidenceColor = confidenceColors[primaryPattern.confidence];

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-medium">{source}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {documentTypeLabels[primaryPattern.documentType]}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {frequencyLabels[primaryPattern.frequency]}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" title={`${primaryPattern.confidence} confidence`}>
            <div className={`w-2 h-2 rounded-full ${confidenceColor}`} />
            <span className="text-xs text-muted-foreground capitalize">{primaryPattern.confidence}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Uploads Analyzed</p>
          <p className="font-medium">{primaryPattern.uploadsAnalyzed}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg Interval</p>
          <p className="font-medium">{primaryPattern.statistics.averageIntervalDays} days</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Next Expected</p>
          <p className="font-medium">
            {primaryPattern.nextExpectedDate 
              ? formatDate(primaryPattern.nextExpectedDate)
              : 'Unknown'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <StabilityIcon className={`h-3 w-3 ${stabilityColor}`} />
        <span className="text-muted-foreground capitalize">
          {primaryPattern.patternStability} pattern
        </span>
        {primaryPattern.patternChanges.length > 0 && (
          <span className="text-muted-foreground">
            • {primaryPattern.patternChanges.length} change{primaryPattern.patternChanges.length === 1 ? '' : 's'} detected
          </span>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays <= 7) return `In ${diffDays} days`;

  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}