import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Send,
  Mail,
  Phone,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  FileText,
  MoreHorizontal,
  Search,
  Plus,
  User,
} from 'lucide-react';

export interface Message {
  id: string;
  clientId: string;
  clientName: string;
  content: string;
  type: 'text' | 'document_request' | 'reminder' | 'system';
  sender: 'accountant' | 'client' | 'system';
  timestamp: string;
  read: boolean;
  attachments?: { name: string; url: string }[];
  relatedDocumentId?: string;
}

interface ClientCommunicationProps {
  messages: Message[];
  clients: { id: string; name: string }[];
  onSendMessage: (clientId: string, content: string, type?: Message['type']) => void;
  onMarkRead: (messageId: string) => void;
  selectedClientId?: string;
}

export function ClientCommunication({
  messages,
  clients,
  onSendMessage,
  onMarkRead,
  selectedClientId,
}: ClientCommunicationProps) {
  const [activeClient, setActiveClient] = useState<string | 'all'>(selectedClientId || 'all');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('');

  const filteredMessages = messages.filter((msg) => {
    const matchesClient = activeClient === 'all' || msg.clientId === activeClient;
    const matchesSearch =
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClient && matchesSearch;
  });

  const groupedMessages = filteredMessages.reduce((acc, msg) => {
    const date = new Date(msg.timestamp).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  const clientMessages = clients.map((client) => ({
    ...client,
    unreadCount: messages.filter((m) => m.clientId === client.id && !m.read && m.sender === 'client').length,
    lastMessage: messages
      .filter((m) => m.clientId === client.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],
  }));

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const targetClient = activeClient === 'all' ? selectedRecipient : activeClient;
    if (targetClient && targetClient !== 'all') {
      onSendMessage(targetClient, newMessage, 'text');
      setNewMessage('');
      setShowNewMessageDialog(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'document_request':
        return <FileText className="h-4 w-4" />;
      case 'reminder':
        return <Clock className="h-4 w-4" />;
      case 'system':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Client List Sidebar */}
      <div className="w-72 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Messages</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowNewMessageDialog(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            <button
              onClick={() => setActiveClient('all')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                activeClient === 'all' ? 'bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">All Messages</p>
                <p className="text-xs text-muted-foreground truncate">
                  {messages.filter((m) => !m.read && m.sender === 'client').length} unread
                </p>
              </div>
            </button>

            <Separator className="my-2" />

            {clientMessages.map((client) => (
              <button
                key={client.id}
                onClick={() => setActiveClient(client.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  activeClient === client.id ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm bg-primary/10 text-primary">
                    {client.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{client.name}</p>
                    {client.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {client.unreadCount}
                      </Badge>
                    )}
                  </div>
                  {client.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate">
                      {client.lastMessage.content.slice(0, 40)}...
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeClient !== 'all' ? (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {clients.find((c) => c.id === activeClient)?.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {clients.find((c) => c.id === activeClient)?.name}
                  </p>
                </div>
              </>
            ) : (
              <>
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <p className="font-medium">All Messages</p>
              </>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowNewMessageDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Message
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {Object.entries(groupedMessages).length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start a conversation with your client</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex items-center justify-center mb-4">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {msgs.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender === 'accountant' ? 'justify-end' : 'justify-start'
                        }`}
                        onClick={() => !msg.read && onMarkRead(msg.id)}
                      >
                        <div
                          className={`max-w-[70%] ${
                            msg.sender === 'accountant'
                              ? 'bg-primary text-primary-foreground'
                              : msg.sender === 'system'
                              ? 'bg-muted'
                              : 'bg-muted'
                          } rounded-lg p-3`}
                        >
                          {msg.sender !== 'accountant' && (
                            <div className="flex items-center gap-2 mb-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px]">
                                  {msg.clientName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">{msg.clientName}</span>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-2">
                            {getMessageIcon(msg.type)}
                            <p className="text-sm">{msg.content}</p>
                          </div>

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((att) => (
                                <a
                                  key={att.name}
                                  href={att.url}
                                  className="flex items-center gap-2 text-xs underline opacity-80"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <FileText className="h-3 w-3" />
                                  {att.name}
                                </a>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] opacity-70">{formatTime(msg.timestamp)}</span>
                            {msg.sender === 'accountant' && (
                              <>
                                {msg.read ? (
                                  <CheckCheck className="h-3 w-3 opacity-70" />
                                ) : (
                                  <Check className="h-3 w-3 opacity-70" />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                activeClient === 'all'
                  ? 'Select a client to message...'
                  : 'Type your message...'
              }
              disabled={activeClient === 'all'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || activeClient === 'all'}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Send a message to a client</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full p-3 text-sm border rounded-md resize-none h-32"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewMessageDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedRecipient || !newMessage.trim()}
              onClick={handleSend}
            >
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
