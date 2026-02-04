import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  User, 
  FileText, 
  Layout, 
  Save, 
  RotateCcw,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { ReportSection, TaxReportConfig, ClientInfo } from "@/lib/tax-report-pdf";
import { useTaxYear } from "@/contexts/TaxYearContext";
import { toast } from "sonner";

interface ReportSettingsPanelProps {
  initialConfig?: Partial<TaxReportConfig>;
  onSave?: (config: TaxReportConfig) => void;
  onReset?: () => void;
  className?: string;
}

const ALL_SECTIONS: { id: ReportSection; label: string; description: string }[] = [
  { id: "cover", label: "Cover Page", description: "Client info and summary totals" },
  { id: "tableOfContents", label: "Table of Contents", description: "Section navigation" },
  { id: "incomeSummary", label: "Income Summary", description: "Breakdown of all income sources" },
  { id: "deductionsSummary", label: "Deductions Summary", description: "Totals by ATO category D1-D15" },
  { id: "detailedDeductions", label: "Detailed Deductions", description: "Itemized deductions by category" },
  { id: "taxOffsets", label: "Tax Offsets", description: "Applicable tax offsets and credits" },
  { id: "taxCalculation", label: "Tax Calculation", description: "Step-by-step tax calculation" },
  { id: "documentIndex", label: "Document Index", description: "Supporting documents list" },
  { id: "appendix", label: "Appendix", description: "Raw data tables" },
];

export function ReportSettingsPanel({
  initialConfig,
  onSave,
  onReset,
  className,
}: ReportSettingsPanelProps) {
  const { selectedYear } = useTaxYear();
  const [activeTab, setActiveTab] = useState<"general" | "sections" | "client">("general");
  const [hasChanges, setHasChanges] = useState(false);

  // Client info state
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: "",
    address: "",
    phone: "",
    email: "",
    tfn: "",
    abn: "",
  });

  // Report options state
  const [mode, setMode] = useState<"summary" | "full">("full");
  const [includeSourceDocuments, setIncludeSourceDocuments] = useState(false);
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>(
    ALL_SECTIONS.map(s => s.id)
  );
  const [accountantNotes, setAccountantNotes] = useState("");

  // Load initial config
  useEffect(() => {
    if (initialConfig) {
      if (initialConfig.clientInfo) {
        setClientInfo(prev => ({ ...prev, ...initialConfig.clientInfo }));
      }
      if (initialConfig.mode) setMode(initialConfig.mode);
      if (initialConfig.includeSourceDocuments !== undefined) {
        setIncludeSourceDocuments(initialConfig.includeSourceDocuments);
      }
      if (initialConfig.includeSections) {
        setSelectedSections(initialConfig.includeSections);
      }
      if (initialConfig.accountantNotes) {
        setAccountantNotes(initialConfig.accountantNotes);
      }
    }
  }, [initialConfig]);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [clientInfo, mode, includeSourceDocuments, selectedSections, accountantNotes]);

  const handleSectionToggle = (sectionId: ReportSection) => {
    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSelectAllSections = () => {
    setSelectedSections(ALL_SECTIONS.map(s => s.id));
  };

  const handleDeselectAllSections = () => {
    setSelectedSections([]);
  };

  const handleSave = () => {
    const config: TaxReportConfig = {
      taxYear: selectedYear,
      clientInfo,
      reportDate: new Date(),
      includeSections: selectedSections,
      mode,
      includeSourceDocuments,
      accountantNotes: accountantNotes || undefined,
    };

    onSave?.(config);
    setHasChanges(false);
    toast.success("Report settings saved");
  };

  const handleReset = () => {
    setClientInfo({
      name: "",
      address: "",
      phone: "",
      email: "",
      tfn: "",
      abn: "",
    });
    setMode("full");
    setIncludeSourceDocuments(false);
    setSelectedSections(ALL_SECTIONS.map(s => s.id));
    setAccountantNotes("");
    setHasChanges(false);
    onReset?.();
    toast.info("Settings reset to defaults");
  };

  const handleLoadClientInfo = () => {
    // Try to load from local storage
    const saved = localStorage.getItem("tally_client_info");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setClientInfo(prev => ({ ...prev, ...parsed }));
        toast.success("Client info loaded");
      } catch {
        toast.error("Failed to load client info");
      }
    } else {
      toast.info("No saved client info found");
    }
  };

  const handleSaveClientInfo = () => {
    localStorage.setItem("tally_client_info", JSON.stringify(clientInfo));
    toast.success("Client info saved for future reports");
  };

  const isSectionValid = selectedSections.length > 0 && clientInfo.name.trim().length > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Report Settings</CardTitle>
          </div>
          {hasChanges && (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Unsaved changes
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure your tax report content and layout
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {[
            { id: "general", label: "General", icon: FileText },
            { id: "sections", label: "Sections", icon: Layout },
            { id: "client", label: "Client Info", icon: User },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Report Mode</Label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                  mode === "summary" ? "border-primary bg-primary/5" : "hover:bg-muted"
                }`}>
                  <input
                    type="radio"
                    name="mode"
                    className="sr-only"
                    checked={mode === "summary"}
                    onChange={() => setMode("summary")}
                  />
                  <span className="font-medium">Summary Only</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    5-7 pages with key totals
                  </span>
                </label>
                <label className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                  mode === "full" ? "border-primary bg-primary/5" : "hover:bg-muted"
                }`}>
                  <input
                    type="radio"
                    name="mode"
                    className="sr-only"
                    checked={mode === "full"}
                    onChange={() => setMode("full")}
                  />
                  <span className="font-medium">Full Report</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Complete details (20+ pages)
                  </span>
                </label>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-docs">Include Source Documents</Label>
                <p className="text-xs text-muted-foreground">
                  Embed receipt images in appendix
                </p>
              </div>
              <Switch
                id="include-docs"
                checked={includeSourceDocuments}
                onCheckedChange={setIncludeSourceDocuments}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="notes">Accountant Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes for your accountant..."
                value={accountantNotes}
                onChange={(e) => setAccountantNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                These notes will appear in the table of contents section
              </p>
            </div>
          </div>
        )}

        {/* Sections Tab */}
        {activeTab === "sections" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Included Sections</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAllSections}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAllSections}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {ALL_SECTIONS.map((section) => (
                <label
                  key={section.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedSections.includes(section.id)}
                    onCheckedChange={() => handleSectionToggle(section.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span>{selectedSections.length} of {ALL_SECTIONS.length} sections selected</span>
            </div>
          </div>
        )}

        {/* Client Tab */}
        {activeTab === "client" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleLoadClientInfo}>
                Load Saved
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveClientInfo}>
                Save for Later
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="client-name">Full Name *</Label>
                <Input
                  id="client-name"
                  placeholder="John Smith"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client-address">Address</Label>
                <Input
                  id="client-address"
                  placeholder="123 Main St, Sydney NSW 2000"
                  value={clientInfo.address}
                  onChange={(e) => setClientInfo({ ...clientInfo, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="client-phone">Phone</Label>
                  <Input
                    id="client-phone"
                    placeholder="0412 345 678"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="john@example.com"
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="client-tfn">Tax File Number</Label>
                  <Input
                    id="client-tfn"
                    placeholder="XXX XXX XXX"
                    value={clientInfo.tfn}
                    onChange={(e) => setClientInfo({ ...clientInfo, tfn: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Will be masked in report</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client-abn">ABN (if applicable)</Label>
                  <Input
                    id="client-abn"
                    placeholder="12 345 678 901"
                    value={clientInfo.abn}
                    onChange={(e) => setClientInfo({ ...clientInfo, abn: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <Separator />
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={!isSectionValid}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        {!isSectionValid && (
          <p className="text-xs text-destructive text-center">
            Please select at least one section and enter a client name
          </p>
        )}
      </CardContent>
    </Card>
  );
}
