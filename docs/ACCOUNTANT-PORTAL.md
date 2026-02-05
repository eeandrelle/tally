# Tally Accountant Portal

A comprehensive, professional-grade portal for accountants to manage client tax information, review documents, and communicate with clients.

## Features

### 1. Client List View
- **Client Management Dashboard**: Overview of all clients with key metrics
- **Smart Filtering**: Filter by status, search by name/email/company/ABN
- **Bulk Actions**: Select multiple clients for batch operations
- **Status Tracking**: Visual indicators for Active, Pending, Review, and Completed statuses
- **Quick Stats**: Total deductions, receipt counts, and pending reviews at a glance

### 2. Document Browser
- **Grid Layout**: Visual thumbnail grid for quick document scanning
- **Advanced Filtering**: Filter by type (receipt, invoice, statement, contract), status, and search
- **Document Viewer**: Full-featured viewer with zoom, rotate, and annotation capabilities
- **Review Workflow**: Approve, reject, or flag documents for review
- **Annotation System**: Add notes and comments directly on documents
- **Status Tracking**: Pending, Approved, Rejected, and In Review states

### 3. Client Communication
- **Unified Inbox**: All client messages in one place
- **Real-time Chat**: Send and receive messages with clients
- **Message Types**: Text, document requests, reminders, and system notifications
- **Read Receipts**: Know when clients have read your messages
- **Client Context**: Messages organized by client with quick switching

### 4. Security & Access Control
- **Secure Token-based Access**: Each client share uses a unique secure token
- **Read-only Mode**: Accountants view data without modifying source records
- **Expiration Control**: Share links can have optional expiration dates
- **Access Logging**: Track when accountants access client data

## Components

### ClientListView
```tsx
<ClientListView
  clients={clients}
  onSelectClient={(client) => handleSelect(client)}
  onRefresh={() => refreshData()}
/>
```

### DocumentBrowser
```tsx
<DocumentBrowser
  documents={documents}
  onApprove={(docId) => handleApprove(docId)}
  onReject={(docId, reason) => handleReject(docId, reason)}
  onAddAnnotation={(docId, annotation) => handleAnnotation(docId, annotation)}
  onDownload={(doc) => handleDownload(doc)}
/>
```

### ClientCommunication
```tsx
<ClientCommunication
  messages={messages}
  clients={clients}
  onSendMessage={(clientId, content, type) => handleSend(clientId, content, type)}
  onMarkRead={(messageId) => handleMarkRead(messageId)}
/>
```

## Routes

- `/accountant-portal` - Main accountant dashboard
- `/portal/$token` - Client-specific shared portal (read-only access)

## Design System

The Accountant Portal uses Tally's design system with:
- **Colors**: Professional blue/gray palette suitable for financial applications
- **Typography**: Clean, readable fonts optimized for data-heavy interfaces
- **Spacing**: Consistent 8px grid system
- **Components**: Built on shadcn/ui with custom styling

## Data Models

### Client
```typescript
interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  abn?: string;
  taxYear: number;
  status: 'active' | 'pending' | 'completed' | 'review';
  lastAccessed: string;
  totalDeductions: number;
  receiptCount: number;
  pendingReviews: number;
  shareToken: string;
  notes?: string;
  tags: string[];
}
```

### Document
```typescript
interface Document {
  id: string;
  name: string;
  type: 'receipt' | 'invoice' | 'statement' | 'contract' | 'other';
  category: string;
  amount?: number;
  date: string;
  vendor?: string;
  status: 'pending' | 'approved' | 'rejected' | 'review';
  url: string;
  annotations: Annotation[];
  tags: string[];
  clientId: string;
  clientName: string;
}
```

### Annotation
```typescript
interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}
```

## Future Enhancements

- [ ] Real-time collaboration with multiple accountants
- [ ] Bulk document approval workflows
- [ ] Export to tax preparation software (Xero, MYOB)
- [ ] Automated document classification with AI
- [ ] Video/voice call integration for client meetings
- [ ] Calendar integration for tax deadline tracking
