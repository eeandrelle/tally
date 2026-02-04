/**
 * ReminderSettings Component
 * 
 * User preferences panel for proactive reminders
 */

import { useState } from 'react';
import type { ReminderType, ReminderPriority, ReminderDisplayType } from '@/lib/proactive-reminders';
import { DEFAULT_REMINDER_PREFERENCES } from '@/lib/proactive-reminders';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertCircle,
  Bell,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Lightbulb,
  Mail,
  Receipt,
  RefreshCcw,
  Save,
  Smartphone,
} from 'lucide-react';

interface ReminderSettingsProps {
  preferences: {
    enabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    maxRemindersPerDay: number;
    batchSimilarReminders: boolean;
    types: Record<ReminderType, {
      enabled: boolean;
      priority: ReminderPriority;
      advanceNoticeDays: number;
      displayTypes: ReminderDisplayType[];
      maxPerWeek: number;
    }>;
    channels: {
      inApp: boolean;
      email: boolean;
      push: boolean;
    };
    snoozeDefaults: {
      '1hour': boolean;
      '4hours': boolean;
      '1day': boolean;
      '1week': boolean;
    };
  };
  onSave: (preferences: ReminderSettingsProps['preferences']) => void;
  onReset: () => void;
  isSaving?: boolean;
  className?: string;
}

const typeConfig: Record<ReminderType, { icon: typeof Calendar; label: string; description: string }> = {
  eofy_countdown: {
    icon: Calendar,
    label: 'EOFY Countdown',
    description: 'Reminders as the end of financial year approaches',
  },
  missing_document: {
    icon: FileText,
    label: 'Missing Documents',
    description: 'Alerts for expected documents that haven\'t been uploaded',
  },
  expected_dividend: {
    icon: DollarSign,
    label: 'Expected Dividends',
    description: 'Notifications when dividend payments are expected',
  },
  optimization_opportunity: {
    icon: Lightbulb,
    label: 'Optimization Opportunities',
    description: 'Suggestions for potential tax savings and optimizations',
  },
  deadline_approaching: {
    icon: AlertCircle,
    label: 'Deadline Approaching',
    description: 'Warnings about upcoming ATO deadlines and lodgment dates',
  },
  receipt_upload: {
    icon: Receipt,
    label: 'Receipt Upload Nudges',
    description: 'Gentle reminders to upload receipts for recent expenses',
  },
};

const priorityOptions: { value: ReminderPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'low', label: 'Low', color: 'text-blue-600' },
];

export function ReminderSettings({
  preferences,
  onSave,
  onReset,
  isSaving = false,
  className,
}: ReminderSettingsProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  const updateGlobalSetting = <K extends keyof typeof localPrefs>(
    key: K,
    value: (typeof localPrefs)[K]
  ) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateTypeSetting = (
    type: ReminderType,
    updates: Partial<(typeof localPrefs.types)[ReminderType]>
  ) => {
    setLocalPrefs(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: { ...prev.types[type], ...updates },
      },
    }));
    setHasChanges(true);
  };

  const updateChannelSetting = (
    channel: keyof typeof localPrefs.channels,
    enabled: boolean
  ) => {
    setLocalPrefs(prev => ({
      ...prev,
      channels: { ...prev.channels, [channel]: enabled },
    }));
    setHasChanges(true);
  };

  const updateSnoozeSetting = (
    duration: keyof typeof localPrefs.snoozeDefaults,
    enabled: boolean
  ) => {
    setLocalPrefs(prev => ({
      ...prev,
      snoozeDefaults: { ...prev.snoozeDefaults, [duration]: enabled },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(localPrefs);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalPrefs(DEFAULT_REMINDER_PREFERENCES);
    onReset();
    setHasChanges(false);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reminder Settings</h2>
          <p className="text-muted-foreground">
            Customize how and when you receive proactive reminders
          </p>
        </div>
        
        {hasChanges && (
          <Badge variant="default" className="animate-pulse">
            Unsaved changes
          </Badge>
        )}
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Global Settings
          </CardTitle>
          <CardDescription>
            General settings that apply to all reminder types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="master-toggle" className="text-base">
                Enable Proactive Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn all reminders on or off
              </p>
            </div>
            <Switch
              id="master-toggle"
              checked={localPrefs.enabled}
              onCheckedChange={(checked) => updateGlobalSetting('enabled', checked)}
            />
          </div>

          <Separator />

          {/* Max reminders per day */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-reminders">
                Max Reminders Per Day: {localPrefs.maxRemindersPerDay}
              </Label>
            </div>
            <Slider
              id="max-reminders"
              value={[localPrefs.maxRemindersPerDay]}
              onValueChange={([value]) => updateGlobalSetting('maxRemindersPerDay', value)}
              min={1}
              max={20}
              step={1}
              disabled={!localPrefs.enabled}
            />
            <p className="text-sm text-muted-foreground">
              Limit the number of reminders shown each day to avoid overwhelm
            </p>
          </div>

          <Separator />

          {/* Batch similar reminders */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="batch-toggle" className="text-base">
                Batch Similar Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Group related reminders together for cleaner display
              </p>
            </div>
            <Switch
              id="batch-toggle"
              checked={localPrefs.batchSimilarReminders}
              onCheckedChange={(checked) => updateGlobalSetting('batchSimilarReminders', checked)}
              disabled={!localPrefs.enabled}
            />
          </div>

          <Separator />

          {/* Quiet hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="quiet-hours-toggle" className="text-base">
                  Quiet Hours
                </Label>
                <p className="text-sm text-muted-foreground">
                  Pause reminders during specific hours
                </p>
              </div>
              <Switch
                id="quiet-hours-toggle"
                checked={localPrefs.quietHoursEnabled}
                onCheckedChange={(checked) => updateGlobalSetting('quietHoursEnabled', checked)}
                disabled={!localPrefs.enabled}
              />
            </div>

            {localPrefs.quietHoursEnabled && (
              <div className="flex items-center gap-4 pl-4">
                <div className="space-y-1">
                  <Label className="text-sm">Start</Label>
                  <input
                    type="time"
                    value={localPrefs.quietHoursStart}
                    onChange={(e) => updateGlobalSetting('quietHoursStart', e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                    disabled={!localPrefs.enabled}
                  />
                </div>
                <span className="text-muted-foreground pt-6">to</span>
                <div className="space-y-1">
                  <Label className="text-sm">End</Label>
                  <input
                    type="time"
                    value={localPrefs.quietHoursEnd}
                    onChange={(e) => updateGlobalSetting('quietHoursEnd', e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                    disabled={!localPrefs.enabled}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* In-app */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label className="text-base">In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show reminders within the app
                  </p>
                </div>
              </div>
              <Switch
                checked={localPrefs.channels.inApp}
                onCheckedChange={(checked) => updateChannelSetting('inApp', checked)}
                disabled={!localPrefs.enabled}
              />
            </div>

            {/* Email */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders to your email address
                  </p>
                </div>
              </div>
              <Switch
                checked={localPrefs.channels.email}
                onCheckedChange={(checked) => updateChannelSetting('email', checked)}
                disabled={!localPrefs.enabled}
              />
            </div>

            {/* Push */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label className="text-base">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send push notifications to your devices
                  </p>
                </div>
              </div>
              <Switch
                checked={localPrefs.channels.push}
                onCheckedChange={(checked) => updateChannelSetting('push', checked)}
                disabled={!localPrefs.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snooze Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Snooze Options
          </CardTitle>
          <CardDescription>
            Which snooze durations to offer for reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {(Object.entries(localPrefs.snoozeDefaults) as [keyof typeof localPrefs.snoozeDefaults, boolean][]).map(([duration, enabled]) => {
              const labels: Record<keyof typeof localPrefs.snoozeDefaults, string> = {
                '1hour': '1 Hour',
                '4hours': '4 Hours',
                '1day': '1 Day',
                '1week': '1 Week',
              };
              
              return (
                <div key={duration} className="flex items-center space-x-2">
                  <Checkbox
                    id={`snooze-${duration}`}
                    checked={enabled}
                    onCheckedChange={(checked) => updateSnoozeSetting(duration, checked as boolean)}
                    disabled={!localPrefs.enabled}
                  />
                  <Label htmlFor={`snooze-${duration}`}>{labels[duration]}</Label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Type-Specific Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder Type Settings</CardTitle>
          <CardDescription>
            Customize settings for each type of reminder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {(Object.entries(typeConfig) as [ReminderType, typeof typeConfig[ReminderType]][]).map(([type, config]) => {
              const typePrefs = localPrefs.types[type];
              const TypeIcon = config.icon;
              
              return (
                <AccordionItem key={type} value={type} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 flex-1">
                      <TypeIcon className="h-5 w-5 text-muted-foreground" />
                      <div className="text-left">
                        <span className="font-medium">{config.label}</span>
                        <p className="text-xs text-muted-foreground font-normal">
                          {config.description}
                        </p>
                      </div>
                      <Badge 
                        variant={typePrefs.enabled ? 'default' : 'secondary'}
                        className="ml-auto mr-4"
                      >
                        {typePrefs.enabled ? 'On' : 'Off'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="pb-4 space-y-4">
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                      <Label>Enable {config.label}</Label>
                      <Switch
                        checked={typePrefs.enabled}
                        onCheckedChange={(checked) => updateTypeSetting(type, { enabled: checked })}
                        disabled={!localPrefs.enabled}
                      />
                    </div>

                    {typePrefs.enabled && localPrefs.enabled && (
                      <>
                        <Separator />

                        {/* Priority threshold */}
                        <div className="space-y-2">
                          <Label>Minimum Priority</Label>
                          <Select
                            value={typePrefs.priority}
                            onValueChange={(v) => updateTypeSetting(type, { priority: v as ReminderPriority })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {priorityOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <span className={opt.color}>{opt.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Only show reminders with this priority or higher
                          </p>
                        </div>

                        {/* Advance notice */}
                        <div className="space-y-2">
                          <Label>Advance Notice: {typePrefs.advanceNoticeDays} days</Label>
                          <Slider
                            value={[typePrefs.advanceNoticeDays]}
                            onValueChange={([value]) => updateTypeSetting(type, { advanceNoticeDays: value })}
                            min={1}
                            max={90}
                            step={1}
                          />
                        </div>

                        {/* Max per week */}
                        <div className="space-y-2">
                          <Label>Max Per Week: {typePrefs.maxPerWeek}</Label>
                          <Slider
                            value={[typePrefs.maxPerWeek]}
                            onValueChange={([value]) => updateTypeSetting(type, { maxPerWeek: value })}
                            min={1}
                            max={20}
                            step={1}
                          />
                        </div>

                        {/* Display types */}
                        <div className="space-y-2">
                          <Label>Show As</Label>
                          <div className="flex flex-wrap gap-2">
                            {(['card', 'banner', 'toast'] as ReminderDisplayType[]).map((displayType) => (
                              <Badge
                                key={displayType}
                                variant={typePrefs.displayTypes.includes(displayType) ? 'default' : 'outline'}
                                className="cursor-pointer capitalize"
                                onClick={() => {
                                  const newDisplayTypes = typePrefs.displayTypes.includes(displayType)
                                    ? typePrefs.displayTypes.filter(dt => dt !== displayType)
                                    : [...typePrefs.displayTypes, displayType];
                                  updateTypeSetting(type, { displayTypes: newDisplayTypes });
                                }}
                              >
                                {displayType}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
