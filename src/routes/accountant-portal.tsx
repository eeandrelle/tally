import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building,
  Users,
  FileText,
  MessageSquare,
  LogOut,
  Menu,
  Bell,
  Settings,
  Search,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { ClientListView, type Client } from '@/components/accountant/ClientListView';
import { DocumentBrowser, type Document, type Annotation } from '@/components/accountant/DocumentBrowser';
import { ClientCommunication, type Message } from '@/components/accountant/ClientCommunication';
import { toast } from 'sonner';

export const Route = createFileRoute('/accountant-portal')({
  component: AccountantPortal,
});

// Mock data - in production, this would come from an API
const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '+61 412 345 678',
    company: 'Johnson Consulting',
    abn: '12 345 678 901',
    taxYear: 2024,
    status: 'active',
    lastAccessed: '2026-02-04T10:30:00Z',
    totalDeductions: 15234.56,
    receiptCount: 47,
    pendingReviews: 3,
    shareToken: 'token_123',
    tags: ['small-business', 'consulting'],
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'm.chen@example.com',
    taxYear: 2024,
    status: 'review',
    lastAccessed: '2026-02-03T15:45:00Z',
    totalDeductions: 8750.0,
    receiptCount: 23,
    pendingReviews: 5,
    shareToken: 'token_456',
    tags: ['individual'],
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.r@example.com',
    company: 'Rodriguez Design Studio',
    abn: '98 765 432 109',
    taxYear: 2024,
    status: 'completed',
    lastAccessed: '2026-02-01T09:00:00Z',
    totalDeductions: 23100.8,
    receiptCount: 89,
    pendingReviews: 0,
    shareToken: 'token_789',
    notes: 'Tax return filed 15 Jan 2026',
    tags: ['creative', 'gst-registered'],
  },
  {
    id: '4',
    name: 'David Park',
    email: 'david.park@example.com',
    taxYear: 2024,
    status: 'pending',
    lastAccessed: '2026-02-04T08:15:00Z',
    totalDeductions: 3200.5,
    receiptCount: 12,
    pendingReviews: 2,
    shareToken: 'token_abc',
    tags: ['individual', 'first-time'],
  },
  {
    id: '5',
    name: 'Amanda Foster',
    email: 'amanda.f@example.com',
    phone: '+61 423 456 789',
    company: 'Foster & Associates',
    taxYear: 2024,
    status: 'active',
    lastAccessed: '2026-02-02T14:20:00Z',
    totalDeductions: 18900.25,
    receiptCount: 56,
    pendingReviews: 1,
    shareToken: 'token_def',
    tags: ['small-business'],
  },
];

const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc1',
    name: 'Office Supplies Receipt.pdf',
    type: 'receipt',
    category: 'Office Expenses',
    amount: 234.56,
    date: '2025-08-15',
    vendor: 'Officeworks',
    status: 'approved',
    url: '/receipts/doc1.pdf',
    annotations: [],
    tags: ['office', 'stationery'],
    uploadedAt: '2025-08-16T10:00:00Z',
    clientId: '1',
    clientName: 'Sarah Johnson',
  },
  {
    id: 'doc2',
    name: 'Client Lunch Invoice.pdf',
    type: 'invoice',
    category: 'Meals & Entertainment',
    amount: 125.0,
    date: '2025-09-03',
    vendor: 'The Steakhouse',
    status: 'pending',
    url: '/receipts/doc2.pdf',
    annotations: [
      {
        id: 'ann1',
        x: 100,
        y: 200,
        text: 'Please confirm this was a business meeting',
        author: 'Accountant',
        createdAt: '2026-02-04T11:00:00Z',
        resolved: false,
      },
    ],
    tags: ['client-meeting'],
    uploadedAt: '2025-09-04T09:30:00Z',
    clientId: '1',
    clientName: 'Sarah Johnson',
  },
  {
    id: 'doc3',
    name: 'Software License.pdf',
    type: 'invoice',
    category: 'Software',
    amount: 599.0,
    date: '2025-07-20',
    vendor: 'Adobe',
    status: 'approved',
    url: '/receipts/doc3.pdf',
    annotations: [],
    tags: ['subscription', 'annual'],
    uploadedAt: '2025-07-21T08:00:00Z',
    clientId: '2',
    clientName: 'Michael Chen',
  },
  {
    id: 'doc4',
    name: 'Fuel Receipt.jpg',
    type: 'receipt',
    category: 'Vehicle Expenses',
    amount: 78.45,
    date: '2025-10-12',
    vendor: 'Shell',
    status: 'review',
    url: '/receipts/doc4.jpg',
    annotations: [],
    tags: ['fuel', 'vehicle'],
    notes: 'Business trip to Melbourne',
    uploadedAt: '2025-10-13T16:00:00Z',
    clientId: '2',
    clientName: 'Michael Chen',
  },
  {
    id: 'doc5',
    name: 'Bank Statement Aug.pdf',
    type: 'statement',
    category: 'Banking',
    status: 'approved',
    url: '/statements/aug.pdf',
    annotations: [],
    tags: ['bank', 'monthly'],
    uploadedAt: '2025-09-05T10:00:00Z',
    clientId: '3',
    clientName: 'Emily Rodriguez',
  },
  {
    id: 'doc6',
    name: 'Equipment Purchase.pdf',
    type: 'invoice',
    category: 'Equipment',
    amount: 2499.0,
    date: '2025-06-18',
    vendor: 'Apple Store',
    status: 'pending',
    url: '/receipts/doc6.pdf',
    annotations: [
      {
        id: 'ann2',
        x: 150,
        y: 300,
        text: 'Verify this is >50% business use',
        author: 'Accountant',
        createdAt: '2026-02-03T14:00:00Z',
        resolved: false,
      },
    ],
    tags: ['equipment', 'depreciable'],
    uploadedAt: '2025-06-20T11:00:00Z',
    clientId: '4',
    clientName: 'David Park',
  },
  {
    id: 'doc7',
    name: 'Professional Membership.pdf',
    type: 'invoice',
    category: 'Professional Fees',
    amount: 450.0,
    date: '2025-11-01',
    vendor: 'CPA Australia',
    status: 'approved',
    url: '/receipts/doc7.pdf',
    annotations: [],
    tags: ['membership', 'annual'],
    uploadedAt: '2025-11-02T09:00:00Z',
    clientId: '5',
    clientName: 'Amanda Foster',
  },
  {
    id: 'doc8',
    name: 'Office Rent Invoice.pdf',
    type: 'invoice',
    category: 'Rent',
    amount: 2200.0,
    date: '2025-12-01',
    vendor: 'Commercial Properties Ltd',
    status: 'approved',
    url: '/receipts/doc8.pdf',
    annotations: [],
    tags: ['rent', 'monthly'],
    uploadedAt: '2025-12-02T10:00:00Z',
    clientId: '1',
    clientName: 'Sarah Johnson',
  },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg1',
    clientId: '1',
    clientName: 'Sarah Johnson',
    content: 'Hi, I\'ve uploaded some new receipts for last month. Could you please review them?',
    type: 'text',
    sender: 'client',
    timestamp: '2026-02-04T10:30:00Z',
    read: false,
  },
  {
    id: 'msg2',
    clientId: '2',
    clientName: 'Michael Chen',
    content: 'Thanks for the reminder. I\'ll upload the missing documents by Friday.',
    type: 'text',
    sender: 'client',
    timestamp: '2026-02-03T16:00:00Z',
    read: true,
  },
  {
    id: 'msg3',
    clientId: '1',
    clientName: 'Sarah Johnson',
    content: 'Could you clarify if the client lunch on Sept 3 was business related?',
    type: 'document_request',
    sender: 'accountant',
    timestamp: '2026-02-04T11:00:00Z',
    read: true,
  },
  {
    id: 'msg4',
    clientId: '3',
    clientName: 'Emily Rodriguez',
    content: 'Your tax return has been successfully lodged with the ATO.',
    type: 'system',
    sender: 'system',
    timestamp: '2026-01-15T14:00:00Z',
    read: true,
  },
];

function AccountantPortal() {
  const [activeTab, setActiveTab] = useState('clients');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Calculate stats
  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter((c) => c.status === 'active').length,
    totalDocuments: documents.length,
    pendingReviews: documents.filter((d) => d.status === 'pending').length,
    unreadMessages: messages.filter((m) => !m.read && m.sender === 'client').length,
    totalDeductions: clients.reduce((sum, c) => sum + c.totalDeductions, 0),
  };

  const handleApproveDocument = (docId: string) => {
    setDocuments((docs) =>
      docs.map((d) => (d.id === docId ? { ...d, status: 'approved' as const } : d))
    );
    toast.success('Document approved');
  };

  const handleRejectDocument = (docId: string, reason: string) => {
    setDocuments((docs) =>
      docs.map((d) => (d.id === docId ? { ...d, status: 'rejected' as const } : d))
    );
    toast.success('Document rejected');
  };

  const handleAddAnnotation = (
    docId: string,
    annotation: Omit<Annotation, 'id' | 'createdAt'>
  ) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: `ann_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setDocuments((docs) =>
      docs.map((d) =>
        d.id === docId ? { ...d, annotations: [...d.annotations, newAnnotation] } : d
      )
    );
    toast.success('Note added');
  };

  const handleSendMessage = (clientId: string, content: string, type: Message['type'] = 'text') => {
    const client = clients.find((c) => c.id === clientId);
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      clientId,
      clientName: client?.name || 'Unknown',
      content,
      type,
      sender: 'accountant',
      timestamp: new Date().toISOString(),
      read: true,
    };
    setMessages((msgs) => [...msgs, newMessage]);
    toast.success('Message sent');
  };

  const handleMarkMessageRead = (messageId: string) => {
    setMessages((msgs) => msgs.map((m) => (m.id === messageId ? { ...m, read: true } : m)));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Tally Accountant Portal</h1>
                <p className="text-xs text-muted-foreground">Professional Tax Management</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Secure Connection</span>
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {stats.unreadMessages > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 bg-white dark:bg-neutral-900 border-r min-h-[calc(100vh-64px)] hidden lg:block">
            <nav className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab('clients')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'clients'
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                <Users className="h-5 w-5" />
                <span>Clients</span>
                <Badge variant="secondary" className="ml-auto">
                  {stats.totalClients}
                </Badge>
              </button>

              <button
                onClick={() => setActiveTab('documents')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'documents'
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span>Documents</span>
                {stats.pendingReviews > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {stats.pendingReviews}
                  </Badge>
                )}
              </button>

              <button
                onClick={() => setActiveTab('messages')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <span>Messages</span>
                {stats.unreadMessages > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {stats.unreadMessages}
                  </Badge>
                )}
              </button>

              <Separator className="my-4" />

              <div className="px-3 py-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Overview</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active Clients</span>
                    <span className="font-medium">{stats.activeClients}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Documents</span>
                    <span className="font-medium">{stats.totalDocuments}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pending Reviews</span>
                    <span className="font-medium text-amber-600">{stats.pendingReviews}</span>
                  </div>
                </div>
              </div>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Client Management</h2>
                  <p className="text-muted-foreground">
                    Manage your clients and their tax information
                  </p>
                </div>
              </div>
              <ClientListView
                clients={clients}
                onSelectClient={(client) => {
                  setSelectedClient(client);
                  setActiveTab('documents');
                }}
                onRefresh={() => toast.success('Client list refreshed')}
              />
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Document Browser</h2>
                  <p className="text-muted-foreground">
                    Review and approve client documents
                  </p>
                </div>
                {selectedClient && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedClient(null)}
                  >
                    View All Clients
                  </Button>
                )}
              </div>
              <DocumentBrowser
                documents={documents}
                onApprove={handleApproveDocument}
                onReject={handleRejectDocument}
                onAddAnnotation={handleAddAnnotation}
                onDownload={(doc) => toast.success(`Downloading ${doc.name}`)}
                clientFilter={selectedClient?.id}
              />
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Client Communication</h2>
                  <p className="text-muted-foreground">
                    Stay connected with your clients
                  </p>
                </div>
              </div>
              <ClientCommunication
                messages={messages}
                clients={clients.map((c) => ({ id: c.id, name: c.name }))}
                onSendMessage={handleSendMessage}
                onMarkRead={handleMarkMessageRead}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
