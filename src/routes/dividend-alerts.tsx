/**
 * Dividend Alerts Page
 * 
 * Main page for managing dividend payment alerts
 * Route: /dividend-alerts
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Bell,
  BellRing,
  RefreshCw,
  Settings,
  Download,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Brain,
} from 'lucide-react';
import { toast } from 'sonner';

import { AlertList } from '@/components/dividends/AlertList';
import { AlertCard } from '@/components/dividends/AlertCard';
import { AlertSettingsPanel } from '@/components/dividends/AlertSettingsPanel';
import { AlertDetailDialog } from '@/components/dividends/AlertDetailDialog';
import { 
  useDividendAlerts, 
  useAlertGenerator,
  useAlertDashboard,
} from '@/hooks/useDividendAlerts';
import type { DividendAlert } from '@/lib/dividend-alerts';

// ============================================================================
// STATS CARD COMPONENT
// ============================================================================

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  description,
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType;
  color: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '500').replace('400', '500')}/10`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

function DashboardStats() {
  const { summary, isLoading, refresh } = useAlertDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-8 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total Active"
        value={summary.totalActive}
        icon={BellRing}
        color="text-primary"
        description="Alerts requiring attention"
      />
      <StatsCard
        title="Critical"
        value={summary.criticalCount}
        icon={AlertCircle}
        color="text-red-600 dark:text-red-400"
        description={summary.criticalCount > 0 ? 'Requires immediate action' : 'No critical alerts'}
      />
      <StatsCard
        title="Warning"
        value={summary.warningCount}
        icon={AlertTriangle}
        color="text-amber-600 dark:text-amber-400"
        description="Review recommended"
      />
      <StatsCard
        title="Info"
        value={summary.infoCount}
        icon={Info}
        color="text-blue-600 dark:text-blue-400"
        description="For your information"
      />
    </div>
  );
}

// ============================================================================
// GENERATION PANEL
// ============================================================================

function AlertGenerationPanel() {
  const {
    isGenerating,
    progress,
    lastResult,
    generateAlerts,
    deviations,
    frequencyChanges,
    anomalies,
  } = useAlertGenerator();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Alert Generation
            </CardTitle>
            <CardDescription>
              Run automated detection to generate new alerts
            </CardDescription>
          </div>
          <Button
            onClick={generateAlerts}
            disabled={isGenerating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate Alerts'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Analyzing patterns and payments...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Last run results */}
        {lastResult && !isGenerating && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Last Run Results
              </h4>
              <span className="text-xs text-muted-foreground">
                {new Date(lastResult.generatedAt).toLocaleString()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-background rounded">
                <p className="text-2xl font-bold">{lastResult.totalGenerated}</p>
                <p className="text-xs text-muted-foreground">Total Alerts</p>
              </div>
              <div className="p-3 bg-background rounded">
                <p className="text-2xl font-bold text-red-600">{deviations.length}</p>
                <p className="text-xs text-muted-foreground">Missed Payments</p>
              </div>
              <div className="p-3 bg-background rounded">
                <p className="text-2xl font-bold text-amber-600">{frequencyChanges.length}</p>
                <p className="text-xs text-muted-foreground">Freq Changes</p>
              </div>
              <div className="p-3 bg-background rounded">
                <p className="text-2xl font-bold text-blue-600">{anomalies.length}</p>
                <p className="text-xs text-muted-foreground">Anomalies</p>
              </div>
            </div>

            <div className="flex gap-2">
              {lastResult.bySeverity.critical > 0 && (
                <Badge variant="destructive">{lastResult.bySeverity.critical} Critical</Badge>
              )}
              {lastResult.bySeverity.warning > 0 && (
                <Badge variant="default">{lastResult.bySeverity.warning} Warning</Badge>
              )}
              {lastResult.bySeverity.info > 0 && (
                <Badge variant="outline">{lastResult.bySeverity.info} Info</Badge>
              )}
            </div>
          </div>
        )}

        {/* Detection summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-2">Pattern Deviation</h4>
              <p className="text-xs text-muted-foreground">
                Detects missed dividend payments based on historical patterns
              </p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-2">Frequency Changes</h4>
              <p className="text-xs text-muted-foreground">
                Identifies when companies change their payment schedules
              </p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-2">Payment Anomalies</h4>
              <p className="text-xs text-muted-foreground">
                Flags unusual payment amounts or unexpected timing
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export const Route = createFileRoute('/dividend-alerts')({
  component: DividendAlertsPage,
});

function DividendAlertsPage() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [selectedAlert, setSelectedAlert] = useState<DividendAlert | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const {
    alerts,
    filteredAlerts,
    activeAlerts,
    activeCount,
    criticalCount,
    isLoading,
    isProcessing,
    filters,
    setFilters,
    clearFilters,
    refreshAlerts,
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    deleteAlert,
    exportToJSON,
    exportToCSV,
  } = useDividendAlerts({ autoLoad: true });

  const handleSelectAlert = (alert: DividendAlert) => {
    setSelectedAlert(alert);
    setIsDetailOpen(true);
  };

  const handleExportJSON = async () => {
    const json = await exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dividend-alerts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Alerts exported to JSON');
  };

  const handleExportCSV = async () => {
    const csv = await exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dividend-alerts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Alerts exported to CSV');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Dividend Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage dividend payment alerts and notifications
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshAlerts} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <DashboardStats />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto">
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            <span>All Alerts</span>
            {activeCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {activeCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-2">
            <Brain className="h-4 w-4" />
            <span>Generate</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <AlertList
            alerts={alerts}
            isLoading={isLoading}
            onAcknowledge={acknowledgeAlert}
            onResolve={resolveAlert}
            onDismiss={dismissAlert}
            onDelete={deleteAlert}
            onRefresh={refreshAlerts}
            onExport={handleExportJSON}
            onSelectAlert={handleSelectAlert}
          />
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <AlertGenerationPanel />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <AlertSettingsPanel />
        </TabsContent>
      </Tabs>

      {/* Alert Detail Dialog */}
      <AlertDetailDialog
        alert={selectedAlert}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onAcknowledge={() => {
          if (selectedAlert) {
            acknowledgeAlert(selectedAlert.id);
            setIsDetailOpen(false);
          }
        }}
        onResolve={(notes) => {
          if (selectedAlert) {
            resolveAlert(selectedAlert.id, notes);
            setIsDetailOpen(false);
          }
        }}
        onDismiss={(notes) => {
          if (selectedAlert) {
            dismissAlert(selectedAlert.id, notes);
            setIsDetailOpen(false);
          }
        }}
      />
    </div>
  );
}

export default DividendAlertsPage;
