/**
 * ReminderSettingsPanel
 * 
 * Configure notification preferences for tax calendar events.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Building2, 
  User, 
  FileText, 
  Calendar,
  Clock,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useReminderSettings } from '@/hooks/useTaxCalendar';
import { type ReminderAdvance } from '@/lib/tax-calendar';

const ADVANCE_OPTIONS: { value: ReminderAdvance; label: string }[] = [
  { value: 7, label: '1 week before' },
  { value: 14, label: '2 weeks before' },
  { value: 30, label: '1 month before' },
  { value: 60, label: '2 months before' },
];

export function ReminderSettingsPanel() {
  const {
    settings,
    isLoading,
    error,
    toggleEnabled,
    toggleType,
    addAdvanceDay,
    removeAdvanceDay,
  } = useReminderSettings();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminder Settings
          </CardTitle>
          <CardDescription>
            Configure when and how you receive deadline reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (error || !settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminder Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Failed to load settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const isAdvanceDaySelected = (day: ReminderAdvance) => {
    return settings.advanceDays.includes(day);
  };
  
  const toggleAdvanceDay = (day: ReminderAdvance) => {
    if (isAdvanceDaySelected(day)) {
      removeAdvanceDay(day);
    } else {
      addAdvanceDay(day);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Reminder Settings
        </CardTitle>
        <CardDescription>
          Configure when and how you receive deadline reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="reminders-enabled" className="text-base font-medium">
              Enable Reminders
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications for upcoming tax deadlines
            </p>
          </div>
          <Switch
            id="reminders-enabled"
            checked={settings.enabled}
            onCheckedChange={toggleEnabled}
          />
        </div>
        
        <Separator />
        
        {/* Advance Notice Settings */}
        <div className={settings.enabled ? '' : 'opacity-50 pointer-events-none'}>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Advance Notice
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Select when you want to be notified before each deadline
          </p>
          <div className="flex flex-wrap gap-2">
            {ADVANCE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={isAdvanceDaySelected(option.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleAdvanceDay(option.value)}
                className="text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
          {settings.advanceDays.length === 0 && (
            <p className="text-sm text-amber-600 mt-2">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Select at least one advance notice option
            </p>
          )}
        </div>
        
        <Separator />
        
        {/* Notification Types */}
        <div className={settings.enabled ? '' : 'opacity-50 pointer-events-none'}>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Deadline Types
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Choose which types of deadlines to receive reminders for
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <Label htmlFor="notify-bas" className="font-medium">
                    BAS (Business Activity Statement)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Quarterly business tax reporting
                  </p>
                </div>
              </div>
              <Switch
                id="notify-bas"
                checked={settings.notifyBAS}
                onCheckedChange={() => toggleType('BAS')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <Label htmlFor="notify-payg" className="font-medium">
                    PAYG Payment Summaries
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Employee payment reporting
                  </p>
                </div>
              </div>
              <Switch
                id="notify-payg"
                checked={settings.notifyPAYG}
                onCheckedChange={() => toggleType('PAYG')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <Label htmlFor="notify-tax-return" className="font-medium">
                    Tax Returns
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Annual tax return lodgment
                  </p>
                </div>
              </div>
              <Switch
                id="notify-tax-return"
                checked={settings.notifyTaxReturn}
                onCheckedChange={() => toggleType('TAX_RETURN')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <Label htmlFor="notify-custom" className="font-medium">
                    Custom Deadlines
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Your own custom deadline reminders
                  </p>
                </div>
              </div>
              <Switch
                id="notify-custom"
                checked={settings.notifyCustom}
                onCheckedChange={() => toggleType('CUSTOM')}
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Notification Methods */}
        <div className={settings.enabled ? '' : 'opacity-50 pointer-events-none'}>
          <h4 className="text-sm font-medium mb-3">Notification Methods</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="push-notifications" className="font-medium cursor-pointer">
                  In-App
                </Label>
              </div>
              <Switch
                id="push-notifications"
                checked={settings.pushNotifications}
                disabled
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-notifications" className="font-medium cursor-pointer">
                  Email
                </Label>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.emailNotifications}
                disabled
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <Info className="h-3 w-3 inline mr-1" />
            Email notifications coming soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
