import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Settings,
  Bell,
  Tag,
  Globe,
  User,
  Trash2,
  AlertTriangle,
  Check,
  Save,
} from "lucide-react";
import { atoCategories } from "@/lib/ato-categories";

// Settings types
interface AppSettings {
  currency: string;
  dateFormat: string;
  defaultCategory: string;
  notifications: {
    email: boolean;
    push: boolean;
    weeklyDigest: boolean;
    deadlineReminders: boolean;
    uploadReminders: boolean;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  currency: "AUD",
  dateFormat: "DD/MM/YYYY",
  defaultCategory: "D5",
  notifications: {
    email: true,
    push: true,
    weeklyDigest: true,
    deadlineReminders: true,
    uploadReminders: true,
  },
};

const CURRENCIES = [
  { value: "AUD", label: "Australian Dollar (AUD)", symbol: "$" },
  { value: "USD", label: "US Dollar (USD)", symbol: "$" },
  { value: "EUR", label: "Euro (EUR)", symbol: "€" },
  { value: "GBP", label: "British Pound (GBP)", symbol: "£" },
  { value: "NZD", label: "New Zealand Dollar (NZD)", symbol: "$" },
  { value: "CAD", label: "Canadian Dollar (CAD)", symbol: "$" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" },
  { value: "DD MMM YYYY", label: "DD MMM YYYY (31 Dec 2024)" },
];

export function AppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem("tally-settings");
        if (saved) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Auto-save when settings change
  useEffect(() => {
    if (!isLoading && hasChanges) {
      const timeout = setTimeout(() => {
        saveSettings();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [settings, hasChanges, isLoading]);

  const saveSettings = () => {
    try {
      localStorage.setItem("tally-settings", JSON.stringify(settings));
      toast.success("Settings saved", {
        description: "Your preferences have been updated",
        icon: <Check className="h-4 w-4" />,
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateNotification = (key: keyof AppSettings["notifications"], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
    setHasChanges(true);
  };

  const handleClearAllData = () => {
    toast.error("Clear all data is not yet implemented", {
      description: "This will be available in a future update",
    });
  };

  const handleExportData = () => {
    toast.success("Export data is not yet implemented", {
      description: "This will be available in a future update",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your app preferences and account settings</p>
        </div>
        {hasChanges && (
          <Button onClick={saveSettings} size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Regional Settings
              </CardTitle>
              <CardDescription>Configure your currency and date format preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(value) => updateSetting("currency", value)}
                >
                  <SelectTrigger id="currency" className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.symbol} {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This will be used for all monetary values throughout the app
                </p>
              </div>

              <Separator />

              {/* Date Format */}
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={settings.dateFormat}
                  onValueChange={(value) => updateSetting("dateFormat", value)}
                >
                  <SelectTrigger id="dateFormat" className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How dates will be displayed throughout the app
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Settings */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Default Category
              </CardTitle>
              <CardDescription>
                Set your preferred default category for new receipts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="defaultCategory">Default Category for New Receipts</Label>
                <Select
                  value={settings.defaultCategory}
                  onValueChange={(value) => updateSetting("defaultCategory", value)}
                >
                  <SelectTrigger id="defaultCategory" className="w-full sm:w-[400px]">
                    <SelectValue placeholder="Select default category" />
                  </SelectTrigger>
                  <SelectContent>
                    {atoCategories.map((category) => (
                      <SelectItem key={category.code} value={category.code}>
                        {category.code} - {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This category will be pre-selected when adding new receipts
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Category Suggestions</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically suggest categories based on receipt content
                  </p>
                </div>
                <Switch
                  checked={true}
                  disabled
                  aria-label="Category suggestions (coming soon)"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose which notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive important updates via email
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) => updateNotification("email", checked)}
                />
              </div>

              <Separator />

              {/* Push Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) => updateNotification("push", checked)}
                />
              </div>

              <Separator />

              {/* Weekly Digest */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Digest</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive a weekly summary of your tax progress
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.weeklyDigest}
                  onCheckedChange={(checked) => updateNotification("weeklyDigest", checked)}
                />
              </div>

              <Separator />

              {/* Deadline Reminders */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Deadline Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified about upcoming ATO deadlines
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.deadlineReminders}
                  onCheckedChange={(checked) => updateNotification("deadlineReminders", checked)}
                />
              </div>

              <Separator />

              {/* Upload Reminders */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Upload Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Reminders for missing documents based on your patterns
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.uploadReminders}
                  onCheckedChange={(checked) => updateNotification("uploadReminders", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Management
              </CardTitle>
              <CardDescription>Manage your account data and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Data */}
              <div className="space-y-2">
                <Label>Export Your Data</Label>
                <p className="text-xs text-muted-foreground">
                  Download a copy of all your receipts and tax data
                </p>
                <Button variant="outline" onClick={handleExportData}>
                  Export Data
                </Button>
              </div>

              <Separator />

              {/* Clear Data - Danger Zone */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <Label className="text-destructive">Danger Zone</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Permanently delete all your data from this device. This action cannot be undone.
                </p>
                <Button variant="destructive" onClick={handleClearAllData}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
