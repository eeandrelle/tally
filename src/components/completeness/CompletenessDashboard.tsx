/**
 * CompletenessDashboard Component
 * 
 * Main dashboard for the Tax Year Completeness Checker feature.
 * Displays overall score, checklist sections, missing documents,
 * optimization opportunities, and risk assessment.
 */

import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  RefreshCw,
  Download,
  Printer,
  ArrowRight,
  Shield,
  Clock,
  DollarSign,
  Briefcase,
  Receipt,
  FileText,
  Lightbulb,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

import { ScoreCard } from './ScoreCard';
import { ChecklistSection, MissingDocumentsSection, OptimizationSection } from './ChecklistSection';
import { useCompletenessChecker } from '@/hooks/useCompletenessChecker';
import type { UserTaxProfile, RiskAssessment } from '@/lib/completeness-checker';
import type { OptimizationOpportunity } from '@/lib/tax-optimization';
import type { IncomeCategoryCode } from '@/lib/income-categories';
import type { AtoCategoryCode } from '@/lib/ato-categories';

// ============= PROPS =============

export interface CompletenessDashboardProps {
  /** User tax profile */
  profile?: UserTaxProfile;
  /** Income data */
  incomeData?: Partial<Record<IncomeCategoryCode, { amount: number; documents: number; lastYearAmount?: number }>>;
  /** Deduction data */
  deductionData?: Partial<Record<AtoCategoryCode, { amount: number; workpaperComplete: boolean; receipts: number }>>;
  /** Optimization opportunities */
  opportunities?: OptimizationOpportunity[];
  /** Tax withheld amount */
  taxWithheld?: number;
  /** Additional class name */
  className?: string;
}

// ============= MAIN COMPONENT =============

export function CompletenessDashboard({
  profile: propProfile,
  incomeData: propIncomeData,
  deductionData: propDeductionData,
  opportunities: propOpportunities,
  taxWithheld: propTaxWithheld,
  className
}: CompletenessDashboardProps) {
  const navigate = useNavigate();
  
  // Default/demo data if props not provided
  const defaultProfile: UserTaxProfile = {
    taxYear: 2024,
    taxableIncome: 85000,
    occupation: 'Software Developer',
    employmentType: 'full-time',
    hasInvestments: true,
    investmentTypes: ['shares'],
    hasRentalProperty: false,
    workArrangement: 'hybrid',
    hasVehicle: false,
    isStudying: false,
    state: 'NSW',
    age: 32,
    hasPrivateHealthInsurance: true,
    previousYearLodged: true
  };

  const profile = propProfile || defaultProfile;
  const incomeData = propIncomeData || {
    SALARY: { amount: 85000, documents: 1 },
    DIVIDENDS: { amount: 1200, documents: 0, lastYearAmount: 1500 },
    INTEREST: { amount: 450, documents: 1 }
  };
  const deductionData = propDeductionData || {
    D1: { amount: 0, workpaperComplete: false, receipts: 0 },
    D2: { amount: 800, workpaperComplete: true, receipts: 3 },
    D3: { amount: 250, workpaperComplete: false, receipts: 1 },
    D4: { amount: 0, workpaperComplete: false, receipts: 0 },
    D5: { amount: 1200, workpaperComplete: true, receipts: 4 },
    D8: { amount: 200, workpaperComplete: true, receipts: 1 },
    D9: { amount: 150, workpaperComplete: true, receipts: 1 }
  };
  const opportunities = propOpportunities || [];
  const taxWithheld = propTaxWithheld || 19500;

  // Use the completeness checker hook
  const {
    report,
    isLoading,
    isGenerating,
    error,
    score,
    incomeChecks,
    deductionChecks,
    missingDocuments,
    optimizationSuggestions,
    taxEstimate,
    riskAssessment,
    estimatedCompletionTime,
    refreshReport,
    implementSuggestion,
    markItemComplete,
    exportChecklist,
    exportAccountantSummary,
    isReadyForLodgment,
    hasCriticalIssues,
    getNextAction
  } = useCompletenessChecker({
    profile,
    incomeData,
    deductionData,
    opportunities,
    taxWithheld,
    autoGenerate: true
  });

  // Handle export
  const handleExport = useCallback((type: 'checklist' | 'summary' | 'accountant') => {
    try {
      const content = type === 'checklist' 
        ? exportChecklist() 
        : exportAccountantSummary();
      const filename = type === 'checklist' 
        ? `tax-completeness-checklist-${profile.taxYear}.txt`
        : `tax-summary-accountant-${profile.taxYear}.txt`;
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const typeLabel = type === 'checklist' ? 'Checklist' : 'Accountant Summary';
      toast.success(`${typeLabel} exported successfully`);
    } catch (err) {
      toast.error('Failed to export');
    }
  }, [exportChecklist, exportAccountantSummary, profile.taxYear]);

  // Handle print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Handle item action
  const handleItemAction = useCallback((item: any) => {
    if (item.actionLink) {
      navigate({ to: item.actionLink });
    }
  }, [navigate]);

  // Get next action
  const nextAction = getNextAction();

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load completeness report. Please try refreshing.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Tax Return Completeness Check</h1>
                <p className="text-sm text-muted-foreground">
                  FY {profile.taxYear}-{String(profile.taxYear + 1).slice(-2)} • Pre-lodgment Review
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('checklist')}
                disabled={!report}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading state */}
        {isGenerating && !report ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing your tax return...</p>
          </div>
        ) : report && score ? (
          <div className="space-y-8">
            {/* Score Card */}
            <ScoreCard
              score={score.overall}
              colorStatus={score.colorStatus}
              sectionScores={{
                income: score.incomeScore,
                deductions: score.deductionsScore,
                documents: score.documentsScore,
                optimization: score.optimizationScore
              }}
              missingItemsCount={score.missingItemsCount}
              taxEstimate={taxEstimate ? {
                estimatedRefund: taxEstimate.estimatedRefund,
                estimatedTaxOwing: taxEstimate.estimatedTaxOwing
              } : undefined}
              estimatedCompletionTime={estimatedCompletionTime}
              isLoading={isLoading}
              onRefresh={refreshReport}
              onExport={() => handleExport('summary')}
            />

            {/* Status Alert */}
            {hasCriticalIssues() ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Critical Issues Found</AlertTitle>
                <AlertDescription>
                  Your tax return has critical issues that must be resolved before lodgment.
                  Please review the missing items below.
                </AlertDescription>
              </Alert>
            ) : isReadyForLodgment() ? (
              <Alert className="bg-green-50 border-green-200 text-green-900">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Ready for Lodgment</AlertTitle>
                <AlertDescription className="text-green-800">
                  Your tax return is complete and ready to lodge. Review the summary below and proceed when ready.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-amber-50 border-amber-200 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle>In Progress</AlertTitle>
                <AlertDescription className="text-amber-800">
                  Complete the remaining {score.missingItemsCount} items to finalize your tax return.
                </AlertDescription>
              </Alert>
            )}

            {/* Next Action Card */}
            {nextAction && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <ArrowRight className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Recommended Next Step</p>
                        <p className="text-sm text-muted-foreground">{nextAction.description}</p>
                      </div>
                    </div>
                    {nextAction.link && (
                      <Button onClick={() => navigate({ to: nextAction.link! })}>
                        {nextAction.title}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="checklist" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
                <TabsTrigger value="checklist">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="optimization">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Optimization
                </TabsTrigger>
                <TabsTrigger value="summary">
                  <Receipt className="h-4 w-4 mr-2" />
                  Summary
                </TabsTrigger>
              </TabsList>

              {/* Checklist Tab */}
              <TabsContent value="checklist" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <ChecklistSection
                    title="Income Sources"
                    description="Verify all income sources are reported with supporting documentation"
                    items={incomeChecks}
                    icon={Briefcase}
                    defaultExpanded={incomeChecks.some(i => i.status === 'missing' || i.status === 'partial')}
                    onItemAction={handleItemAction}
                    onMarkComplete={markItemComplete}
                    itemType="income"
                  />
                  <ChecklistSection
                    title="Deduction Categories"
                    description="Review deduction categories D1-D15 for completeness"
                    items={deductionChecks}
                    icon={Receipt}
                    defaultExpanded={deductionChecks.some(d => d.status === 'missing' || d.status === 'partial')}
                    onItemAction={handleItemAction}
                    onMarkComplete={markItemComplete}
                    itemType="deduction"
                  />
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-6">
                <MissingDocumentsSection
                  documents={missingDocuments.map(doc => ({
                    ...doc,
                    onUpload: () => navigate({ to: '/upload' })
                  }))}
                  onUpload={() => navigate({ to: '/upload' })}
                />
                
                {missingDocuments.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <h3 className="text-lg font-medium mb-2">All Documents Present</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        No missing documents detected. All required documentation appears to be in place for your tax return.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Optimization Tab */}
              <TabsContent value="optimization" className="space-y-6">
                <OptimizationSection
                  suggestions={optimizationSuggestions}
                  onImplement={implementSuggestion}
                />
                
                {optimizationSuggestions.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Opportunities Found</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        No additional optimization opportunities detected at this time. Your tax position looks well-optimized.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Tax Estimate Card */}
                  {taxEstimate && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Tax Estimate
                        </CardTitle>
                        <CardDescription>Based on current data</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Taxable Income</span>
                          <span className="font-medium">${taxEstimate.taxableIncome.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Total Deductions</span>
                          <span className="font-medium text-green-600">-${taxEstimate.totalDeductions.toLocaleString()}</span>
                        </div>
                        {'medicareLevy' in taxEstimate && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Medicare Levy</span>
                            <span className="font-medium">${(taxEstimate as any).medicareLevy.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-2">
                          <span className="font-medium">Estimated {taxEstimate.estimatedRefund > 0 ? 'Refund' : 'Tax Owing'}</span>
                          <span className={cn(
                            "text-xl font-bold",
                            taxEstimate.estimatedRefund > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            ${Math.abs(taxEstimate.estimatedRefund > 0 ? taxEstimate.estimatedRefund : taxEstimate.estimatedTaxOwing).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Risk Assessment Card */}
                  {riskAssessment && (
                    <RiskAssessmentCard assessment={riskAssessment} />
                  )}

                  {/* Completion Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Completion Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Income Sources</span>
                        <Badge variant={score.incomeScore >= 80 ? 'default' : score.incomeScore >= 50 ? 'secondary' : 'destructive'}>
                          {score.incomeScore}%
                        </Badge>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Deductions</span>
                        <Badge variant={score.deductionsScore >= 80 ? 'default' : score.deductionsScore >= 50 ? 'secondary' : 'destructive'}>
                          {score.deductionsScore}%
                        </Badge>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Documents</span>
                        <Badge variant={score.documentsScore >= 80 ? 'default' : score.documentsScore >= 50 ? 'secondary' : 'destructive'}>
                          {score.documentsScore}%
                        </Badge>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="font-medium">Overall Score</span>
                        <span className={cn(
                          "text-xl font-bold",
                          score.colorStatus === 'green' ? "text-green-600" :
                          score.colorStatus === 'amber' ? "text-amber-600" : "text-red-600"
                        )}>
                          {score.overall}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Estimated Completion */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Time Estimate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {estimatedCompletionTime > 0 ? (
                        <>
                          <p className="text-3xl font-bold mb-2">~{estimatedCompletionTime} minutes</p>
                          <p className="text-muted-foreground">
                            Estimated time to complete {score.missingItemsCount} remaining items
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-green-600 mb-2">Complete!</p>
                          <p className="text-muted-foreground">
                            All items have been addressed. Your tax return is ready.
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Last updated: {report?.generatedAt.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport('accountant')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export for Accountant
                </Button>
                <Button
                  disabled={!isReadyForLodgment()}
                  onClick={() => toast.info('Lodgment feature coming soon')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Proceed to Lodge
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

// ============= SUBCOMPONENTS =============

interface RiskAssessmentCardProps {
  assessment: RiskAssessment;
}

function RiskAssessmentCard({ assessment }: RiskAssessmentCardProps) {
  const levelConfig = {
    low: { 
      color: 'text-green-600', 
      bgColor: 'bg-green-50', 
      borderColor: 'border-green-200',
      icon: CheckCircle2 
    },
    medium: { 
      color: 'text-amber-600', 
      bgColor: 'bg-amber-50', 
      borderColor: 'border-amber-200',
      icon: AlertTriangle 
    },
    high: { 
      color: 'text-red-600', 
      bgColor: 'bg-red-50', 
      borderColor: 'border-red-200',
      icon: AlertCircle 
    }
  };

  const config = levelConfig[assessment.level];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Assessment
        </CardTitle>
        <CardDescription>ATO review likelihood</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-lg border",
          config.bgColor,
          config.borderColor
        )}>
          <Icon className={cn("h-8 w-8", config.color)} />
          <div>
            <p className={cn("font-medium", config.color)}>
              {assessment.level.charAt(0).toUpperCase() + assessment.level.slice(1)} Risk
            </p>
            <p className="text-sm text-muted-foreground">{assessment.atoReviewLikelihood}</p>
          </div>
        </div>

        {assessment.factors.length > 0 && (
          <div>
            <p className="font-medium mb-2">Risk Factors</p>
            <ul className="space-y-2">
              {assessment.factors.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className={cn(
                    "w-2 h-2 rounded-full mt-1.5",
                    factor.impact === 'positive' ? "bg-green-500" :
                    factor.impact === 'negative' ? "bg-red-500" : "bg-gray-400"
                  )} />
                  <span>
                    <span className="font-medium">{factor.factor}:</span>{' '}
                    {factor.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {assessment.recommendations.length > 0 && (
          <div>
            <p className="font-medium mb-2">Recommendations</p>
            <ul className="space-y-1">
              {assessment.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============= UTILITIES =============

import { cn } from '@/lib/utils';

// ============= EXPORT =============

export default CompletenessDashboard;