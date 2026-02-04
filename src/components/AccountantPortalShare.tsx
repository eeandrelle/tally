import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  UserPlus,
  Link as LinkIcon,
  Copy,
  Check,
  Clock,
  Eye,
  Trash2,
  Shield,
  User,
  Mail,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTaxYear } from '@/contexts/TaxYearContext';
import {
  createShareLink,
  revokeShareLink,
  getShareLinks,
  formatExpiration,
  getPortalUrl,
  type ShareLink,
} from '@/lib/accountant-sharing';

interface AccountantPortalShareProps {
  trigger?: React.ReactNode;
}

export function AccountantPortalShare({ trigger }: AccountantPortalShareProps) {
  const { selectedYear } = useTaxYear();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  
  // Form state
  const [accountantName, setAccountantName] = useState('');
  const [accountantEmail, setAccountantEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('30');
  const [accessLevel, setAccessLevel] = useState<'readonly' | 'full'>('readonly');
  const [isCreating, setIsCreating] = useState(false);
  
  // Share links state
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Load share links
  const loadShareLinks = () => {
    setShareLinks(getShareLinks());
  };
  
  useEffect(() => {
    if (open) {
      loadShareLinks();
    }
  }, [open]);
  
  // Create share link
  const handleCreate = async () => {
    if (!accountantName.trim()) {
      toast.error('Please enter accountant name');
      return;
    }
    
    setIsCreating(true);
    try {
      const link = createShareLink({
        taxYear: selectedYear,
        expiresInDays: expiresInDays === 'never' ? null : parseInt(expiresInDays),
        accessLevel,
        accountantName: accountantName.trim(),
        accountantEmail: accountantEmail.trim() || undefined,
      });
      
      toast.success('Share link created successfully');
      setActiveTab('manage');
      loadShareLinks();
      
      // Reset form
      setAccountantName('');
      setAccountantEmail('');
      setExpiresInDays('30');
      setAccessLevel('readonly');
    } catch (error) {
      toast.error('Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };
  
  // Revoke share link
  const handleRevoke = (shareId: string) => {
    if (confirm('Are you sure you want to revoke this share link? The accountant will no longer have access.')) {
      revokeShareLink(shareId);
      loadShareLinks();
      toast.success('Share link revoked');
    }
  };
  
  // Copy link to clipboard
  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}${getPortalUrl(token)}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedToken(null), 2000);
  };
  
  // Copy token only
  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast.success('Access code copied');
    setTimeout(() => setCopiedToken(null), 2000);
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Share with Accountant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Share with Accountant
          </DialogTitle>
          <DialogDescription>
            Create secure share links for your accountant to access your tax information.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Create Link
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-2">
              <Shield className="h-4 w-4" />
              Manage Access
              {shareLinks.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {shareLinks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Create Link Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Accountant Details</CardTitle>
                <CardDescription>
                  Enter your accountant's information for this share link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountantName">
                    Accountant Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="accountantName"
                      placeholder="e.g., Jane Smith"
                      value={accountantName}
                      onChange={(e) => setAccountantName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accountantEmail">Email (optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="accountantEmail"
                      type="email"
                      placeholder="accountant@example.com"
                      value={accountantEmail}
                      onChange={(e) => setAccountantEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Access Settings</CardTitle>
                <CardDescription>
                  Configure what your accountant can see and for how long.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={accessLevel}
                    onValueChange={(value: 'readonly' | 'full') => setAccessLevel(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="readonly">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Read-only (View only)
                        </div>
                      </SelectItem>
                      <SelectItem value="full">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Full (View & Export)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {accessLevel === 'readonly' 
                      ? 'Accountant can view summaries and receipts but cannot export data.'
                      : 'Accountant can view all data and export reports.'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Link Expiration</Label>
                  <Select
                    value={expiresInDays}
                    onValueChange={setExpiresInDays}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="never">Never expires</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      Security Notice
                    </p>
                    <p className="text-muted-foreground">
                      This link provides access to your tax data for FY {selectedYear}-{String(selectedYear + 1).slice(-2)}. 
                      Share it securely with your accountant only.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !accountantName.trim()}
                className="gap-2"
              >
                {isCreating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
                Create Share Link
              </Button>
            </DialogFooter>
          </TabsContent>
          
          {/* Manage Access Tab */}
          <TabsContent value="manage" className="space-y-4">
            {shareLinks.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No active share links</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a share link to give your accountant access to your tax data.
                </p>
                <Button onClick={() => setActiveTab('create')} variant="outline">
                  Create First Link
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {shareLinks.length} active share {shareLinks.length === 1 ? 'link' : 'links'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadShareLinks}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {shareLinks.map((link) => (
                    <Card key={link.id} className="overflow-hidden">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{link.accountantName}</h4>
                            {link.accountantEmail && (
                              <p className="text-sm text-muted-foreground">
                                {link.accountantEmail}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={link.accessLevel === 'full' ? 'default' : 'secondary'}>
                                {link.accessLevel === 'full' ? 'Full Access' : 'Read-only'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                FY {link.taxYear}-{String(link.taxYear + 1).slice(-2)}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatExpiration(link.expiresAt)}
                            </div>
                            {link.accessCount > 0 && (
                              <p className="mt-1">
                                Accessed {link.accessCount} {link.accessCount === 1 ? 'time' : 'times'}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">Share URL</Label>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={`${window.location.origin}${getPortalUrl(link.token)}`}
                              className="font-mono text-xs"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(link.token)}
                            >
                              {copiedToken === link.token ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">Access Code</Label>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={link.token}
                              className="font-mono text-xs"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => copyToken(link.token)}
                            >
                              {copiedToken === link.token ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            Created {formatDate(link.createdAt)}
                            {link.lastAccessedAt && (
                              <> • Last accessed {formatDate(link.lastAccessedAt)}</>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevoke(link.id)}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Revoke
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
