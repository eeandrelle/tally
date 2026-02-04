/**
 * Company Card Component
 * 
 * Displays a summary card for a dividend-paying company with:
 * - Company name and ASX code
 * - Total dividends received
 * - Franking credits
 * - Payment frequency badge
 * - Last payment date
 * - Estimated next payment
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  TrendingUp, 
  Calendar, 
  Clock,
  ChevronRight,
  Wallet,
  Receipt
} from 'lucide-react';
import type { CompanyDividendSummary, PaymentFrequency } from '@/lib/dividend-tracker';
import { formatCurrency, getFrequencyLabel, getFrequencyColor } from '@/lib/dividend-tracker';

// ============================================================================
// FREQUENCY BADGE COMPONENT
// ============================================================================

interface FrequencyBadgeProps {
  frequency: PaymentFrequency;
  pattern?: string;
}

function FrequencyBadge({ frequency, pattern }: FrequencyBadgeProps) {
  const colors: Record<PaymentFrequency, string> = {
    monthly: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
    quarterly: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300',
    'half-yearly': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
    yearly: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
    irregular: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <Badge variant="outline" className={`${colors[frequency]} text-xs`}>
      {pattern || getFrequencyLabel(frequency)}
    </Badge>
  );
}

// ============================================================================
// COMPANY CARD COMPONENT
// ============================================================================

interface CompanyCardProps {
  company: CompanyDividendSummary;
  onClick?: () => void;
  isSelected?: boolean;
}

export function CompanyCard({ company, onClick, isSelected }: CompanyCardProps) {
  const hasFrankingCredits = company.totalFrankingCredits > 0;
  const hasUpcomingPayment = company.nextExpectedPayment && company.nextExpectedPayment.estimatedDate;
  
  // Format dates
  const lastPaymentDate = new Date(company.lastPaymentDate).toLocaleDateString('en-AU', {
    month: 'short',
    year: 'numeric',
  });
  
  const nextPaymentDate = hasUpcomingPayment 
    ? new Date(company.nextExpectedPayment!.estimatedDate).toLocaleDateString('en-AU', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Card 
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-md
        ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''}
      `}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Company Logo Placeholder */}
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {company.asxCode ? (
                <span className="text-sm font-bold text-primary">{company.asxCode}</span>
              ) : (
                <Building2 className="h-5 w-5 text-primary" />
              )}
            </div>
            
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">
                {company.companyName}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <FrequencyBadge 
                  frequency={company.paymentFrequency} 
                  pattern={company.paymentPattern}
                />
                {company.dividendCount > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {company.dividendCount} payments
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              Total Dividends
            </p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(company.totalDividends)}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              Franking Credits
            </p>
            <p className={`text-lg font-bold ${hasFrankingCredits ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
              {formatCurrency(company.totalFrankingCredits)}
            </p>
          </div>
        </div>
        
        {/* Additional Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Last: {lastPaymentDate}
          </div>
          
          {company.currentSharesHeld > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {company.currentSharesHeld.toLocaleString()} shares
            </div>
          )}
        </div>
        
        {/* Upcoming Payment */}
        {hasUpcomingPayment && (
          <div className="bg-primary/5 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Expected Next Payment</span>
              <Badge 
                variant="outline" 
                className="text-[10px] h-5 ml-auto"
              >
                {company.nextExpectedPayment!.confidence} confidence
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Estimated: {nextPaymentDate}
              </span>
              <span className="text-sm font-semibold">
                ~{formatCurrency(company.nextExpectedPayment!.estimatedAmount)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPANY CARD SKELETON
// ============================================================================

export function CompanyCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
        </div>
        <div className="h-4 bg-muted rounded w-1/2" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPANY LIST COMPONENT
// ============================================================================

interface CompanyListProps {
  companies: CompanyDividendSummary[];
  selectedCompanyId?: string | null;
  onSelectCompany: (companyId: string) => void;
  isLoading?: boolean;
  searchQuery?: string;
}

export function CompanyList({ 
  companies, 
  selectedCompanyId, 
  onSelectCompany, 
  isLoading,
  searchQuery 
}: CompanyListProps) {
  // Filter companies by search
  const filteredCompanies = searchQuery
    ? companies.filter(c => 
        c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.asxCode?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : companies;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CompanyCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (filteredCompanies.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          {searchQuery 
            ? 'No companies match your search'
            : 'No dividend-paying companies found'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {filteredCompanies.map((company) => (
        <CompanyCard
          key={company.id}
          company={company}
          onClick={() => onSelectCompany(company.id)}
          isSelected={selectedCompanyId === company.id}
        />
      ))}
    </div>
  );
}

export default CompanyCard;
