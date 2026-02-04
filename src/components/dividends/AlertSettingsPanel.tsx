/**
 * AlertSettingsPanel Component
 * 
 * Configure dividend alert preferences and thresholds
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Bell,
  Clock,
  DollarSign,
  Calendar,
  RotateCcw,
  Save,
  Info,
} from 'lucide-react';
import { useAlertSettings } from '@/hooks/useDividendAlerts';
import type { AlertSettings, AlertSeverity } from '@/lib/dividend-alerts';

// ============================================================================
// TYPES
// ============================================================================

interface AlertSettingsPanelProps {
  onSave?: () => void;
}

// ============================================================================
// SETTING ROW COMPONENT
// ============================================================================

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
  enabled,
  onToggle,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children?: React.ReactNode;
  enabled?: boolean;
  onToggle?: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-4">
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`h-5 w-5 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{title}</h4>
            {onToggle && (
              <Switch
                checked={enabled}
                onCheckedChange={onToggle}
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          {enabled && children && (
            <div className="mt-4 space-y-3">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SEVERITY SELECTOR
// ============================================================================

function SeveritySelect({
  value,
  onChange,
}: {
  value: AlertSeverity;
  onChange: (value: AlertSeverity) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="info">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Info
          </span>
        </SelectItem>
        <SelectItem value="warning">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Warning
          </span>
        </SelectItem>
        <SelectItem value="critical">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Critical
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AlertSettingsPanel({ onSave }: AlertSettingsPanelProps) {
  const { settings, isLoading, isSaving, updateSettings, resetSettings } = useAlertSettings();

  if (isLoading || !settings) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Settings
            </CardTitle>
            <CardDescription>
              Configure when and how you receive dividend alerts
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetSettings}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-0">
        {/* Master toggle */}
        <SettingRow
          icon={Bell}
          title="Enable Alerts"
          description="Receive notifications about dividend payment issues and anomalies"
          enabled={settings.enabled}
          onToggle={(enabled) => updateSettings({ enabled })}
        />

        <Separator />

        {/* Missed payment detection */}
        <SettingRow
          icon={Calendar}
          title="Missed Payment Detection"
          description="Alert when an expected dividend payment doesn't arrive on time"
          enabled={settings.enabled}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Alert Threshold (days after expected)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[settings.missedPaymentThresholdDays]}
                  onValueChange={([value]) => updateSettings({ missedPaymentThresholdDays: value })}
                  min={1}
                  max={30}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {settings.missedPaymentThresholdDays}d
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Default Severity</Label>
              <SeveritySelect
                value={settings.missedPaymentSeverity}
                onChange={(missedPaymentSeverity) => updateSettings({ missedPaymentSeverity })}
              />
            </div>
          </div>
        </SettingRow>

        <Separator />

        {/* Frequency change detection */}
        <SettingRow
          icon={Clock}
          title="Frequency Change Detection"
          description="Alert when a company changes their dividend payment schedule"
          enabled={settings.detectFrequencyChanges}
          onToggle={(detectFrequencyChanges) => updateSettings({ detectFrequencyChanges })}
        >
          <div className="space-y-2">
            <Label className="text-xs">Default Severity</Label>
            <SeveritySelect
              value={settings.frequencyChangeSeverity}
              onChange={(frequencyChangeSeverity) => updateSettings({ frequencyChangeSeverity })}
            />
          </div>
        </SettingRow>

        <Separator />

        {/* Amount anomaly detection */}
        <SettingRow
          icon={DollarSign}
          title="Amount Anomaly Detection"
          description="Alert when dividend amounts differ significantly from historical patterns"
          enabled={settings.detectAmountAnomalies}
          onToggle={(detectAmountAnomalies) => updateSettings({ detectAmountAnomalies })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Deviation Threshold (%)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[settings.amountAnomalyThreshold]}
                  onValueChange={([value]) => updateSettings({ amountAnomalyThreshold: value })}
                  min={10}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {settings.amountAnomalyThreshold}%
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Default Severity</Label>
              <SeveritySelect
                value={settings.amountAnomalySeverity}
                onChange={(amountAnomalySeverity) => updateSettings({ amountAnomalySeverity })}
              />
            </div>
          </div>
        </SettingRow>

        <Separator />

        {/* Timing deviation detection */}
        <SettingRow
          icon={Clock}
          title="Timing Deviation Detection"
          description="Alert when dividends arrive earlier or later than expected"
          enabled={settings.detectTimingDeviations}
          onToggle={(detectTimingDeviations) => updateSettings({ detectTimingDeviations })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Deviation Threshold (days)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[settings.timingDeviationThresholdDays]}
                  onValueChange={([value]) => updateSettings({ timingDeviationThresholdDays: value })}
                  min={1}
                  max={21}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {settings.timingDeviationThresholdDays}d
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Default Severity</Label>
              <SeveritySelect
                value={settings.timingDeviationSeverity}
                onChange={(timingDeviationSeverity) => updateSettings({ timingDeviationSeverity })}
              />
            </div>
          </div>
        </SettingRow>

        <Separator />

        {/* Upcoming payment reminders */}
        <SettingRow
          icon={Calendar}
          title="Upcoming Payment Reminders"
          description="Receive notifications before expected dividend payments"
          enabled={settings.upcomingPaymentReminders}
          onToggle={(upcomingPaymentReminders) => updateSettings({ upcomingPaymentReminders })}
        >
          <div className="space-y-2">
            <Label className="text-xs">Days in advance</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.upcomingPaymentDays]}
                onValueChange={([value]) => updateSettings({ upcomingPaymentDays: value })}
                min={1}
                max={14}
                step={1}
                className="max-w-[200px]"
              />
              <span className="text-sm font-medium">
                {settings.upcomingPaymentDays} days
              </span>
            </div>
          </div>
        </SettingRow>

        <Separator />

        {/* Low confidence alerts */}
        <SettingRow
          icon={Info}
          title="Low Confidence Pattern Alerts"
          description="Generate alerts even when pattern detection has low confidence"
          enabled={settings.alertOnLowConfidence}
          onToggle={(alertOnLowConfidence) => updateSettings({ alertOnLowConfidence })}
        />

        <Separator />

        {/* Quiet hours */}
        <SettingRow
          icon={Clock}
          title="Quiet Hours"
          description="Don't generate new alerts during specified hours"
          enabled={settings.quietHoursEnabled}
          onToggle={(quietHoursEnabled) => updateSettings({ quietHoursEnabled })}
        >
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Start</Label>
              <Input
                type="time"
                value={settings.quietHoursStart || '22:00'}
                onChange={(e) => updateSettings({ quietHoursStart: e.target.value })}
                className="w-24"
              />
            </div>
            <span className="text-muted-foreground pt-6">to</span>
            <div className="space-y-2">
              <Label className="text-xs">End</Label>
              <Input
                type="time"
                value={settings.quietHoursEnd || '08:00'}
                onChange={(e) => updateSettings({ quietHoursEnd: e.target.value })}
                className="w-24"
              />
            </div>
          </div>
        </SettingRow>
      </CardContent>
    </Card>
  );
}

export default AlertSettingsPanel;
