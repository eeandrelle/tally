import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  MessageCircle,
  Calendar,
  DollarSign,
  User,
  Tag,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Paperclip,
  AlertCircle,
  Clock,
} from 'lucide-react';

export interface Document {
  id: string;
  name: string;
  type: 'receipt' | 'invoice' | 'statement' | 'contract' | 'other';
  category: string;
  amount?: number;
  date: string;
  vendor?: string;
  status: 'pending' | 'approved' | 'rejected' | 'review';
  url: string;
  thumbnailUrl?: string;
  annotations: Annotation[];
  tags: string[];
  notes?: string;
  uploadedAt: string;
  clientId: string;
  clientName: string;
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

interface DocumentBrowserProps {
  documents: Document[];
  onApprove: (docId: string) => void;
  onReject: (docId: string, reason: string) => void;
  onAddAnnotation: (docId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  onDownload: (doc: Document) => void;
  clientFilter?: string;
}

export function DocumentBrowser({
  documents,
  onApprove,
  onReject,
  onAddAnnotation,
  onDownload,
  clientFilter,
}: DocumentBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesClient = !clientFilter || doc.clientId === clientFilter;
    return matchesSearch && matchesType && matchesStatus && matchesClient;
  });

  const stats = {
    total: documents.length,
    pending: documents.filter((d) => d.status === 'pending').length,
    approved: documents.filter((d) => d.status === 'approved').length,
    rejected: documents.filter((d) => d.status === 'rejected').length,
    review: documents.filter((d) => d.status === 'review').length,
    totalAmount: documents
      .filter((d) => d.status !== 'rejected')
      .reduce((sum, d) => sum + (d.amount || 0), 0),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'review':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'receipt':
        return <FileText className="h-4 w-4" />;
      case 'invoice':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'statement':
        return <FileText className="h-4 w-4" />;
      case 'contract':
        return <File className="h-4 w-4" />;
      default:
        return <Paperclip className="h-4 w-4" />;
    }
  };

  const openViewer = (doc: Document) => {
    setSelectedDoc(doc);
    setViewerOpen(true);
    setZoom(100);
    setRotation(0);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase text-amber-600">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase text-purple-600">In Review</p>
            <p className="text-2xl font-bold text-purple-600">{stats.review}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase text-green-600">Approved</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase text-red-600">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Valid Amount</p>
            <p className="text-xl font-bold">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="receipt">Receipts</SelectItem>
            <SelectItem value="invoice">Invoices</SelectItem>
            <SelectItem value="statement">Statements</SelectItem>
            <SelectItem value="contract">Contracts</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDocs.map((doc) => (
          <Card
            key={doc.id}
            className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden group"
            onClick={() => openViewer(doc)}
          >
            <div className="aspect-video bg-muted relative overflow-hidden">
              {doc.thumbnailUrl ? (
                <img
                  src={doc.thumbnailUrl}
                  alt={doc.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getTypeIcon(doc.type)}
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className={getStatusColor(doc.status)}>
                  {doc.status}
                </Badge>
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
              {doc.annotations.length > 0 && (
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {doc.annotations.length}
                  </Badge>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(doc.type)}
                  <span className="font-medium truncate max-w-[150px]">{doc.name}</span>
                </div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {doc.vendor && <p>{doc.vendor}</p>}
                {doc.amount !== undefined && (
                  <p className="font-medium text-foreground">{formatCurrency(doc.amount)}</p>
                )}
                <div className="flex items-center justify-between">
                  <span>{formatDate(doc.date)}</span>
                  <Badge variant="outline" className="text-xs">
                    {doc.category}
                  </Badge>
                </div>
                {!clientFilter && (
                  <p className="text-xs">{doc.clientName}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters
          </p>
        </div>
      )}

      {/* Document Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          {selectedDoc && (
            <DocumentViewer
              document={selectedDoc}
              zoom={zoom}
              rotation={rotation}
              onZoomIn={() => setZoom((z) => Math.min(z + 25, 200))}
              onZoomOut={() => setZoom((z) => Math.max(z - 25, 50))}
              onRotate={() => setRotation((r) => (r + 90) % 360)}
              onApprove={() => {
                onApprove(selectedDoc.id);
                setSelectedDoc({ ...selectedDoc, status: 'approved' });
              }}
              onReject={(reason) => {
                onReject(selectedDoc.id, reason);
                setSelectedDoc({ ...selectedDoc, status: 'rejected' });
              }}
              onAddAnnotation={(annotation) => onAddAnnotation(selectedDoc.id, annotation)}
              onDownload={() => onDownload(selectedDoc)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DocumentViewerProps {
  document: Document;
  zoom: number;
  rotation: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onAddAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  onDownload: () => void;
}

function DocumentViewer({
  document,
  zoom,
  rotation,
  onZoomIn,
  onZoomOut,
  onRotate,
  onApprove,
  onReject,
  onAddAnnotation,
  onDownload,
}: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState('document');
  const [newAnnotation, setNewAnnotation] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  return (
    <div className="flex h-[85vh]">
      {/* Document Preview */}
      <div className="flex-1 flex flex-col bg-muted/30">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b bg-background">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-16 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" onClick={onZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-2" />
            <Button variant="ghost" size="icon" onClick={onRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Document */}
        <ScrollArea className="flex-1">
          <div className="p-8 flex items-center justify-center min-h-full">
            <div
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
              }}
              className="bg-white shadow-lg max-w-full"
            >
              {document.url.endsWith('.pdf') ? (
                <iframe
                  src={document.url}
                  className="w-[800px] h-[1000px]"
                  title={document.name}
                />
              ) : (
                <img
                  src={document.url}
                  alt={document.name}
                  className="max-w-[800px] max-h-[1000px]"
                />
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l bg-background flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="document" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="annotations" className="flex-1">
              Notes
              {document.annotations.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {document.annotations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="document" className="flex-1 p-4 space-y-4 m-0">
            <div>
              <h3 className="font-semibold mb-1">{document.name}</h3>
              <p className="text-sm text-muted-foreground">{document.type}</p>
            </div>

            <Separator />

            <div className="space-y-3">
              {document.amount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatCurrency(document.amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(document.date).toLocaleDateString('en-AU')}</span>
              </div>
              {document.vendor && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span>{document.vendor}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="outline">{document.category}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={
                  document.status === 'approved' ? 'bg-green-500/10 text-green-600' :
                  document.status === 'rejected' ? 'bg-red-500/10 text-red-600' :
                  document.status === 'review' ? 'bg-purple-500/10 text-purple-600' :
                  'bg-amber-500/10 text-amber-600'
                }>
                  {document.status}
                </Badge>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {document.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {document.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{document.notes}</p>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="annotations" className="flex-1 flex flex-col m-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {document.annotations.map((annotation) => (
                  <Card key={annotation.id} className={annotation.resolved ? 'opacity-50' : ''}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {annotation.author[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{annotation.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(annotation.createdAt).toLocaleDateString('en-AU')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {document.annotations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notes yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <textarea
                value={newAnnotation}
                onChange={(e) => setNewAnnotation(e.target.value)}
                placeholder="Add a note..."
                className="w-full p-2 text-sm border rounded-md resize-none h-20"
              />
              <Button
                className="w-full mt-2"
                size="sm"
                disabled={!newAnnotation.trim()}
                onClick={() => {
                  onAddAnnotation({
                    x: 0,
                    y: 0,
                    text: newAnnotation,
                    author: 'Accountant',
                    resolved: false,
                  });
                  setNewAnnotation('');
                }}
              >
                Add Note
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="p-4 border-t space-y-2">
          <Button
            className="w-full"
            onClick={onApprove}
            disabled={document.status === 'approved'}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowRejectDialog(true)}
            disabled={document.status === 'rejected'}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="w-full p-2 text-sm border rounded-md resize-none h-24"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => {
                onReject(rejectReason);
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
