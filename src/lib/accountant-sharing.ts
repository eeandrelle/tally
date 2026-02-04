/**
 * Accountant Sharing Library
 * Manages share links, permissions, and access control for accountant collaboration
 */

export interface ShareLink {
  id: string;
  token: string;
  taxYear: number;
  createdAt: string;
  expiresAt: string | null;
  accessLevel: 'readonly' | 'full';
  accountantName: string | null;
  accountantEmail: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
  isActive: boolean;
}

export interface PortalSummary {
  taxYear: number;
  totalDeductions: number;
  totalIncome: number;
  taxableIncome: number;
  estimatedTax: number;
  receiptCount: number;
  categories: { category: string; total: number }[];
  topDeductions: { vendor: string; amount: number; category: string }[];
  reviewItems: { count: number; urgent: number };
  workpapers: { code: string; description: string; amount: number }[];
}

export interface AccessLog {
  id: string;
  shareLinkId: string;
  accessedAt: string;
  action: 'view_summary' | 'view_receipts' | 'view_workpapers' | 'export';
  ipAddress: string | null;
}

// Generate a secure random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create a new share link
export function createShareLink(params: {
  taxYear: number;
  expiresInDays?: number | null;
  accessLevel?: 'readonly' | 'full';
  accountantName?: string;
  accountantEmail?: string;
}): ShareLink {
  const now = new Date();
  const expiresAt = params.expiresInDays 
    ? new Date(now.getTime() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const shareLink: ShareLink = {
    id: `share_${Date.now()}`,
    token: generateToken(),
    taxYear: params.taxYear,
    createdAt: now.toISOString(),
    expiresAt,
    accessLevel: params.accessLevel || 'readonly',
    accountantName: params.accountantName || null,
    accountantEmail: params.accountantEmail || null,
    lastAccessedAt: null,
    accessCount: 0,
    isActive: true,
  };

  // Store in localStorage for persistence
  const existing = getShareLinks();
  existing.push(shareLink);
  localStorage.setItem('tally_accountant_shares', JSON.stringify(existing));

  return shareLink;
}

// Get all share links
export function getShareLinks(): ShareLink[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('tally_accountant_shares');
  if (!stored) return [];
  
  try {
    const links = JSON.parse(stored) as ShareLink[];
    // Filter out expired links
    const now = new Date().toISOString();
    return links.filter(link => {
      if (!link.isActive) return false;
      if (link.expiresAt && link.expiresAt < now) return false;
      return true;
    });
  } catch {
    return [];
  }
}

// Revoke a share link
export function revokeShareLink(shareId: string): boolean {
  const links = getShareLinks();
  const link = links.find(l => l.id === shareId);
  if (!link) return false;
  
  link.isActive = false;
  localStorage.setItem('tally_accountant_shares', JSON.stringify(links));
  return true;
}

// Get share link by token
export function getShareLinkByToken(token: string): ShareLink | null {
  const links = getShareLinks();
  return links.find(l => l.token === token) || null;
}

// Record access
export function recordAccess(shareLinkId: string, action: AccessLog['action']): void {
  const log: AccessLog = {
    id: `log_${Date.now()}`,
    shareLinkId,
    accessedAt: new Date().toISOString(),
    action,
    ipAddress: null,
  };

  const logs = getAccessLogs();
  logs.push(log);
  localStorage.setItem('tally_access_logs', JSON.stringify(logs.slice(-1000))); // Keep last 1000

  // Update share link access stats
  const links = getShareLinks();
  const link = links.find(l => l.id === shareLinkId);
  if (link) {
    link.lastAccessedAt = log.accessedAt;
    link.accessCount++;
    localStorage.setItem('tally_accountant_shares', JSON.stringify(links));
  }
}

// Get access logs
export function getAccessLogs(): AccessLog[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('tally_access_logs');
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as AccessLog[];
  } catch {
    return [];
  }
}

// Get portal URL for a share link
export function getPortalUrl(token: string): string {
  return `/portal/${token}`;
}

// Format expiration date
export function formatExpiration(dateStr: string | null): string {
  if (!dateStr) return 'Never expires';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Expires today';
  if (diffDays === 1) return 'Expires tomorrow';
  if (diffDays <= 7) return `Expires in ${diffDays} days`;
  return `Expires ${date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// Validate share link
export function validateShareLink(token: string): { valid: boolean; reason?: string } {
  const link = getShareLinkByToken(token);
  
  if (!link) {
    return { valid: false, reason: 'Invalid link' };
  }
  
  if (!link.isActive) {
    return { valid: false, reason: 'Link has been revoked' };
  }
  
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { valid: false, reason: 'Link has expired' };
  }
  
  return { valid: true };
}
