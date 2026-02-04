import { useState } from 'react';
import { 
  Settings, 
  Bell, 
  Mail, 
  Smartphone,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { DocumentType } from '@/lib/upload-patterns';
import type { ReminderSettingsState } from '@/hooks/useUploadReminders';

interface ReminderSettingsPanelProps {
  settings: ReminderSettingsState[];
  onUpdate: (
    documentType: DocumentType,
    updates: Partial<Omit<ReminderSettingsState, 'documentType'>>
  ) => Promise<void>;
}

const documentTypeLabels: Record<DocumentType, string> = {
  bank_statement: 'Bank Statements',
  dividend_statement: 'Dividend Statements',
  payg_summary: 'PAYG Summaries',
  other: 'Other Documents',
};

const documentTypeDescriptions: Record<DocumentType, string> = {
  bank_statement: 'Monthly statements from your bank accounts',
  dividend_statement: 'Quarterly or half-yearly dividend payments',
  payg_summary: 'Annual PAYG payment summaries from employers',
  other: 'Other tax-related documents',
};

export function ReminderSettingsPanel({ settings, onUpdate }: ReminderSettingsPanelProps) {
  const [expanded, setExpanded] = useState<DocumentType | null>(null);
  const [updating, setUpdating] = useState<DocumentType | null>(null);

  const handleToggle = async (type: DocumentType, enabled: boolean) => {
    setUpdating(type);
    await onUpdate(type, { enabled });
    setUpdating(null);
  };

  const handleDaysChange = async (
    type: DocumentType,
    field: 'reminderDaysBefore' | 'reminderDaysAfter',
    value: number
  ) => {
    setUpdating(type);
    await onUpdate(type, { [field]: value });
    setUpdating(null);
  };

  const handleNotificationToggle = async (
    type: DocumentType,
    field: 'emailNotifications' | 'pushNotifications',
    value: boolean
  ) => {
    setUpdating(type);
    await onUpdate(type, { [field]: value });
    setUpdating(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Reminder Settings
        </CardTitle>
        <CardDescription>
          Configure when and how you want to be reminded about missing documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.map((setting) => {
          const isExpanded = expanded === setting.documentType;
          const isUpdating = updating === setting.documentType;

          return (
            <div
              key={setting.documentType}
              className="border rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : setting.documentType)}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={setting.enabled}
                    disabled={isUpdating}
                    onCheckedChange={(checked) => handleToggle(setting.documentType, checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <p className="font-medium">{documentTypeLabels[setting.documentType]}</p>
                    <p className="text-xs text-muted-foreground">
                      {documentTypeDescriptions[setting.documentType]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!setting.enabled && (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t bg-muted/30">
                  <div className="pt-4 space-y-6">
                    {/* Reminder Timing */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Reminder Timing
                      </h4>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label className="text-sm">Days before expected date</Label>
                            <span className="text-sm font-medium">{setting.reminderDaysBefore} days</span>
                          </div>
                          <Slider
                            value={[setting.reminderDaysBefore]}
                            onValueChange={([value]) => 
                              handleDaysChange(setting.documentType, 'reminderDaysBefore', value)
                            }
                            min={1}
                            max={30}
                            step={1}
                            disabled={!setting.enabled || isUpdating}
                          />
                          <p className="text-xs text-muted-foreground">
                            Remind me this many days before the document is expected
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label className="text-sm">Days after expected date</Label>
                            <span className="text-sm font-medium">{setting.reminderDaysAfter} days</span>
                          </div>
                          <Slider
                            value={[setting.reminderDaysAfter]}
                            onValueChange={([value]) => 
                              handleDaysChange(setting.documentType, 'reminderDaysAfter', value)
                            }
                            min={1}
                            max={30}
                            step={1}
                            disabled={!setting.enabled || isUpdating}
                          />
                          <p className="text-xs text-muted-foreground">
                            Start reminding me again if the document is this many days late
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Notification Channels */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Notification Channels
                      </h4>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">In-App Notifications</p>
                              <p className="text-xs text-muted-foreground">Show reminders in the app</p>
                            </div>
                          </div>
                          <Switch
                            checked={true}
                            disabled
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Email Notifications</p>
                              <p className="text-xs text-muted-foreground">Send reminders via email</p>
                            </div>
                          </div>
                          <Switch
                            checked={setting.emailNotifications}
                            onCheckedChange={(checked) => 
                              handleNotificationToggle(setting.documentType, 'emailNotifications', checked)
                            }
                            disabled={!setting.enabled || isUpdating}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Push Notifications</p>
                              <p className="text-xs text-muted-foreground">Send push notifications to your device</p>
                            </div>
                          </div>
                          <Switch
                            checked={setting.pushNotifications}
                            onCheckedChange={(checked) => 
                              handleNotificationToggle(setting.documentType, 'pushNotifications', checked)
                            }
                            disabled={!setting.enabled || isUpdating}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Info */}
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>
                        These settings apply to all {documentTypeLabels[setting.documentType].toLowerCase()}. 
                        You can dismiss individual reminders without affecting these defaults.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}