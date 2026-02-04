import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/tax-offsets';
import type { TaxOffsetResult } from '@/lib/tax-offsets';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Wallet, 
  Heart, 
  Users, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface TaxOffsetCardProps {
  offset: TaxOffsetResult;
  showDetails?: boolean;
}

const offsetIcons: Record<string, React.ReactNode> = {
  'LITO': <Wallet className="h-5 w-5" />,
  'LMITO': <Wallet className="h-5 w-5" />,
  'SAPTO': <Users className="h-5 w-5" />,
  'PHI_Rebate': <Heart className="h-5 w-5" />,
  'Franking': <TrendingUp className="h-5 w-5" />
};

const offsetColors: Record<string, string> = {
  'LITO': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'LMITO': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  'SAPTO': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'PHI_Rebate': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Franking': 'bg-amber-500/10 text-amber-500 border-amber-500/20'
};

export function TaxOffsetCard({ offset, showDetails = true }: TaxOffsetCardProps) {
  const Icon = offsetIcons[offset.offsetType] || <HelpCircle className="h-5 w-5" />;
  const colorClass = offsetColors[offset.offsetType] || 'bg-gray-500/10 text-gray-500';
  
  const isLMITOEnded = offset.offsetType === 'LMITO';
  
  return (
    <Card className={`${offset.amount > 0 ? 'border-l-4 border-l-green-500' : ''} ${isLMITOEnded ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              {Icon}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {offset.description}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {offset.offsetType}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">
              {formatCurrency(offset.amount)}
            </div>
            {offset.eligibilityMet ? (
              <Badge variant="default" className="bg-green-500/20 text-green-600 hover:bg-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Eligible
              </Badge>
            ) : (
              <Badge variant="secondary">
                {isLMITOEnded ? (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Ended 2021-22
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Eligible
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      {showDetails && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {offset.calculationDetails}
          </p>
          
          {offset.amount > 0 && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium text-green-600">
                Tax Saving: {formatCurrency(offset.amount)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This offset reduces your tax payable dollar-for-dollar
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default TaxOffsetCard;
