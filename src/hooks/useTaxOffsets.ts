/**
 * Tax Offset React Hooks
 * 
 * React hooks for integrating tax offset calculations into the UI
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { 
  TaxPayerProfile, 
  FrankingCredit, 
  TaxOffsetSummary, 
  TaxOffsetResult,
  CalculateTaxOffsetsInput 
} from '../lib/tax-offsets';
import { 
  calculateAllTaxOffsets,
  calculateLITO,
  calculateLMITO,
  calculateSAPTO,
  calculateFrankingCredits,
  calculateFrankingCreditFromPercentage,
  calculatePHIRebate,
  determinePHITier,
  formatCurrency,
  getFinancialYear
} from '../lib/tax-offsets';
import {
  TaxProfileInput,
  calculateAndSaveTaxOffsets,
  getTaxOffsetSummary,
  getTaxProfile,
  addFrankingCredit,
  getFrankingCredits,
  getTaxOffsetCalculations
} from '../lib/db-tax-offsets';

// ============= HOOK: useTaxOffsets =============

interface UseTaxOffsetsOptions {
  profileId?: string;
  taxYear?: string;
  autoCalculate?: boolean;
}

export function useTaxOffsets(options: UseTaxOffsetsOptions = {}) {
  const { profileId, taxYear = getFinancialYear(), autoCalculate = true } = options;
  
  const [summary, setSummary] = useState<TaxOffsetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [profile, setProfile] = useState<TaxProfileInput | null>(null);
  const [frankingCredits, setFrankingCredits] = useState<any[]>([]);

  // Load existing profile
  useEffect(() => {
    if (profileId) {
      try {
        const existingProfile = getTaxProfile(profileId);
        if (existingProfile) {
          setProfile(existingProfile);
        }
        
        const existingCredits = getFrankingCredits(profileId, taxYear);
        setFrankingCredits(existingCredits);
        
        const calculations = getTaxOffsetCalculations(profileId, taxYear);
        if (calculations.length > 0) {
          // Reconstruct summary from saved calculations
          const savedSummary = getTaxOffsetSummary(profileId, taxYear);
          setSummary({
            totalOffsets: savedSummary.totalLITO + savedSummary.totalSAPTO + savedSummary.totalPHIRebate,
            breakdown: calculations.map(c => ({
              offsetType: c.offset_type,
              description: getOffsetDescription(c.offset_type),
              amount: c.amount,
              calculationDetails: c.calculation_details,
              eligibilityMet: c.amount > 0
            })),
            frankingCredits: {
              totalCredits: savedSummary.totalFrankingCredits,
              credits: existingCredits.map(c => ({
                companyName: c.company_name,
                dividendAmount: c.dividend_amount,
                frankedAmount: c.franked_amount,
                frankingCredit: c.franking_credit,
                frankingPercentage: c.franking_percentage,
                paymentDate: new Date(c.payment_date)
              }))
            },
            netTaxPosition: 0
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load tax offset data'));
      }
    }
  }, [profileId, taxYear]);

  // Calculate offsets
  const calculate = useCallback((input: TaxProfileInput, credits: any[] = []) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = calculateAndSaveTaxOffsets(input, credits);
      setSummary(result);
      setProfile(input);
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Calculation failed'));
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Refresh calculations
  const refresh = useCallback(() => {
    if (profile) {
      calculate(profile, frankingCredits);
    }
  }, [profile, frankingCredits, calculate]);

  // Add franking credit
  const addFrankingCreditEntry = useCallback((credit: Omit<FrankingCredit, 'frankingCredit'> & { id?: number }) => {
    if (!profileId) throw new Error('Profile ID required');
    
    const frankingCredit = credit.frankingPercentage === 100
      ? calculateFrankingCreditFromPercentage(credit.dividendAmount, 100)
      : calculateFrankingCreditFromPercentage(credit.dividendAmount, credit.frankingPercentage);
    
    const creditInput = {
      profileId,
      taxYear,
      companyName: credit.companyName,
      dividendAmount: credit.dividendAmount,
      frankedAmount: credit.dividendAmount * (credit.frankingPercentage / 100),
      frankingCredit,
      frankingPercentage: credit.frankingPercentage,
      paymentDate: credit.paymentDate?.toISOString().split('T')[0]
    };
    
    const id = addFrankingCredit(creditInput);
    
    const newCredit = {
      id,
      ...credit,
      frankingCredit
    };
    
    setFrankingCredits(prev => [...prev, newCredit]);
    
    // Recalculate
    if (profile) {
      calculate(profile, [...frankingCredits, newCredit]);
    }
    
    return id;
  }, [profileId, taxYear, profile, frankingCredits, calculate]);

  // Derived values
  const totalTaxOffsets = useMemo(() => summary?.totalOffsets || 0, [summary]);
  const totalFrankingCredits = useMemo(() => summary?.frankingCredits.totalCredits || 0, [summary]);
  const grandTotal = useMemo(() => totalTaxOffsets + totalFrankingCredits, [totalTaxOffsets, totalFrankingCredits]);

  return {
    summary,
    profile,
    frankingCredits,
    isLoading,
    error,
    calculate,
    refresh,
    addFrankingCredit: addFrankingCreditEntry,
    totalTaxOffsets,
    totalFrankingCredits,
    grandTotal,
    formattedTotalTaxOffsets: formatCurrency(totalTaxOffsets),
    formattedTotalFrankingCredits: formatCurrency(totalFrankingCredits),
    formattedGrandTotal: formatCurrency(grandTotal)
  };
}

// ============= HOOK: useLITO =============

export function useLITO(taxableIncome: number) {
  return useMemo(() => calculateLITO(taxableIncome), [taxableIncome]);
}

// ============= HOOK: useLMITO =============

export function useLMITO(taxableIncome: number) {
  return useMemo(() => calculateLMITO(taxableIncome), [taxableIncome]);
}

// ============= HOOK: useSAPTO =============

interface UseSAPTOInput {
  taxableIncome: number;
  age: number;
  hasSpouse: boolean;
  spouseIncome?: number;
  isSoleParent?: boolean;
}

export function useSAPTO(input: UseSAPTOInput) {
  return useMemo(() => 
    calculateSAPTO(
      input.taxableIncome,
      input.age,
      input.hasSpouse,
      input.spouseIncome,
      input.isSoleParent
    ),
    [input.taxableIncome, input.age, input.hasSpouse, input.spouseIncome, input.isSoleParent]
  );
}

// ============= HOOK: useFrankingCredits =============

export function useFrankingCredits(dividends: FrankingCredit[]) {
  return useMemo(() => calculateFrankingCredits(dividends), [dividends]);
}

// ============= HOOK: usePHIRebate =============

interface UsePHIRebateInput {
  premiumAmount: number;
  age: number;
  taxableIncome: number;
  hasSpouse: boolean;
  spouseIncome?: number;
}

export function usePHIRebate(input: UsePHIRebateInput) {
  return useMemo(() => {
    const tier = determinePHITier(input.taxableIncome, input.hasSpouse, input.spouseIncome);
    return calculatePHIRebate(input.premiumAmount, input.age, tier);
  }, [input.premiumAmount, input.age, input.taxableIncome, input.hasSpouse, input.spouseIncome]);
}

// ============= HOOK: useTaxOffsetCalculator =============

interface UseTaxOffsetCalculatorInput {
  profile: TaxPayerProfile;
  frankingCredits?: FrankingCredit[];
  phiPremiumAmount?: number;
}

export function useTaxOffsetCalculator(input: UseTaxOffsetCalculatorInput) {
  return useMemo(() => {
    const calcInput: CalculateTaxOffsetsInput = {
      profile: input.profile,
      frankingCredits: input.frankingCredits || [],
      phiPremiumAmount: input.phiPremiumAmount || 0
    };
    return calculateAllTaxOffsets(calcInput);
  }, [input.profile, input.frankingCredits, input.phiPremiumAmount]);
}

// ============= UTILITY FUNCTIONS =============

function getOffsetDescription(offsetType: string): string {
  const descriptions: Record<string, string> = {
    'LITO': 'Low Income Tax Offset',
    'LMITO': 'Low and Middle Income Tax Offset',
    'SAPTO': 'Seniors and Pensioners Tax Offset',
    'PHI_Rebate': 'Private Health Insurance Rebate'
  };
  return descriptions[offsetType] || offsetType;
}

// ============= TYPES EXPORT =============

export type {
  TaxPayerProfile,
  FrankingCredit,
  TaxOffsetSummary,
  TaxOffsetResult,
  CalculateTaxOffsetsInput,
  TaxProfileInput
};

export {
  calculateLITO,
  calculateLMITO,
  calculateSAPTO,
  calculateFrankingCredits,
  calculateFrankingCreditFromPercentage,
  calculatePHIRebate,
  determinePHITier,
  formatCurrency,
  getFinancialYear,
  calculateAndSaveTaxOffsets,
  getTaxOffsetSummary,
  getTaxProfile,
  addFrankingCredit,
  getFrankingCredits,
  getTaxOffsetCalculations
};

export default {
  useTaxOffsets,
  useLITO,
  useLMITO,
  useSAPTO,
  useFrankingCredits,
  usePHIRebate,
  useTaxOffsetCalculator
};
