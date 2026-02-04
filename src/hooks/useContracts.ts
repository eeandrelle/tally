// React hooks for Contract Document Parser
import { useState, useCallback, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import {
  type ExtractedContract,
  type Contract,
  type ContractValidationResult,
  type DepreciationInfo,
  type PaymentSchedule,
  type ContractParty,
  parseContractFromText,
  validateExtractedContract,
  parseContractPdf,
  parseContractImage,
  saveContract,
  getContractById,
  getContractsByStatus,
  updateContractStatus,
  deleteContract,
  initContractTables,
  summarizeContract,
  getImmediateDeductions,
  getLowValuePoolAssets,
  calculateTotalDepreciationValue,
  exportContractsToJSON,
  exportContractsToCSV,
} from "../lib/contracts";

// ============================================================================
// useContractParser Hook
// ============================================================================

interface UseContractParserReturn {
  // State
  extractedContract: ExtractedContract | null;
  validationResult: ContractValidationResult | null;
  isParsing: boolean;
  error: string | null;
  
  // Actions
  parseText: (text: string) => void;
  parsePdf: (pdfPath: string) => Promise<void>;
  parseImage: (imagePath: string) => Promise<void>;
  reset: () => void;
}

export function useContractParser(): UseContractParserReturn {
  const [extractedContract, setExtractedContract] = useState<ExtractedContract | null>(null);
  const [validationResult, setValidationResult] = useState<ContractValidationResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseText = useCallback((text: string) => {
    setIsParsing(true);
    setError(null);
    
    try {
      const result = parseContractFromText(text);
      setExtractedContract(result);
      setValidationResult(validateExtractedContract(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse contract");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const parsePdf = useCallback(async (pdfPath: string) => {
    setIsParsing(true);
    setError(null);
    
    try {
      const result = await parseContractPdf(pdfPath);
      setExtractedContract(result);
      setValidationResult(validateExtractedContract(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse PDF");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const parseImage = useCallback(async (imagePath: string) => {
    setIsParsing(true);
    setError(null);
    
    try {
      const result = await parseContractImage(imagePath);
      setExtractedContract(result);
      setValidationResult(validateExtractedContract(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse image");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setExtractedContract(null);
    setValidationResult(null);
    setError(null);
  }, []);

  return {
    extractedContract,
    validationResult,
    isParsing,
    error,
    parseText,
    parsePdf,
    parseImage,
    reset,
  };
}

// ============================================================================
// useContracts Hook
// ============================================================================

interface UseContractsReturn {
  // State
  contracts: Contract[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadContracts: (status?: Contract["status"]) => Promise<void>;
  addContract: (
    extracted: ExtractedContract,
    documentPath: string,
    documentType: "pdf" | "image",
    taxYear?: number,
    notes?: string
  ) => Promise<number | null>;
  updateStatus: (id: number, status: Contract["status"]) => Promise<void>;
  removeContract: (id: number) => Promise<void>;
  getContract: (id: number) => Promise<Contract | null>;
  refresh: () => Promise<void>;
  
  // Export
  exportToJSON: () => string;
  exportToCSV: () => string;
}

export function useContracts(db: Database | null): UseContractsReturn {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize tables on mount
  useEffect(() => {
    if (!db) return;
    
    initContractTables(db).catch(err => {
      console.error("Failed to init contract tables:", err);
      setError("Failed to initialize database");
    });
  }, [db]);

  const loadContracts = useCallback(async (status?: Contract["status"]) => {
    if (!db) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (status) {
        const results = await getContractsByStatus(db, status);
        setContracts(results);
      } else {
        // Load all contracts
        const results = await db.select<Contract[]>(
          "SELECT * FROM contracts ORDER BY created_at DESC"
        );
        setContracts(results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contracts");
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const addContract = useCallback(async (
    extracted: ExtractedContract,
    documentPath: string,
    documentType: "pdf" | "image",
    taxYear?: number,
    notes?: string
  ): Promise<number | null> => {
    if (!db) return null;
    
    try {
      const id = await saveContract(db, extracted, documentPath, documentType, taxYear, notes);
      await loadContracts();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contract");
      return null;
    }
  }, [db, loadContracts]);

  const updateStatus = useCallback(async (id: number, status: Contract["status"]) => {
    if (!db) return;
    
    try {
      await updateContractStatus(db, id, status);
      await loadContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }, [db, loadContracts]);

  const removeContract = useCallback(async (id: number) => {
    if (!db) return;
    
    try {
      await deleteContract(db, id);
      await loadContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contract");
    }
  }, [db, loadContracts]);

  const getContract = useCallback(async (id: number): Promise<Contract | null> => {
    if (!db) return null;
    return getContractById(db, id);
  }, [db]);

  const refresh = useCallback(async () => {
    await loadContracts();
  }, [loadContracts]);

  const exportToJSON = useCallback(() => {
    return exportContractsToJSON(contracts);
  }, [contracts]);

  const exportToCSV = useCallback(() => {
    return exportContractsToCSV(contracts);
  }, [contracts]);

  return {
    contracts,
    isLoading,
    error,
    loadContracts,
    addContract,
    updateStatus,
    removeContract,
    getContract,
    refresh,
    exportToJSON,
    exportToCSV,
  };
}

// ============================================================================
// useContractAnalysis Hook
// ============================================================================

interface ContractAnalysis {
  totalContractValue: number;
  totalDepreciationValue: number;
  immediateDeductionsValue: number;
  lowValuePoolValue: number;
  contractCount: number;
  partyCount: number;
  upcomingPayments: PaymentSchedule[];
  upcomingDates: { date: string; description: string; contractId?: number }[];
}

interface UseContractAnalysisReturn {
  analysis: ContractAnalysis | null;
  isLoading: boolean;
  error: string | null;
  recalculate: () => void;
}

export function useContractAnalysis(contracts: Contract[]): UseContractAnalysisReturn {
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateAnalysis = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      let totalContractValue = 0;
      let totalDepreciationValue = 0;
      let immediateDeductionsValue = 0;
      let lowValuePoolValue = 0;
      const allParties = new Set<string>();
      const upcomingPayments: PaymentSchedule[] = [];
      const upcomingDates: { date: string; description: string; contractId?: number }[] = [];

      for (const contract of contracts) {
        // Sum contract values
        totalContractValue += contract.total_value || 0;

        // Parse and analyze depreciation assets
        if (contract.depreciation_assets_json) {
          const assets: DepreciationInfo[] = JSON.parse(contract.depreciation_assets_json);
          totalDepreciationValue += calculateTotalDepreciationValue(assets);
          
          const immediate = getImmediateDeductions(assets);
          immediateDeductionsValue += immediate.reduce((sum, a) => sum + a.asset_value, 0);
          
          const poolAssets = getLowValuePoolAssets(assets);
          lowValuePoolValue += poolAssets.reduce((sum, a) => sum + a.asset_value, 0);
        }

        // Collect parties
        if (contract.parties_json) {
          const parties: ContractParty[] = JSON.parse(contract.parties_json);
          parties.forEach(p => allParties.add(p.name));
        }

        // Collect upcoming payments
        if (contract.payment_schedules_json) {
          const payments: PaymentSchedule[] = JSON.parse(contract.payment_schedules_json);
          upcomingPayments.push(...payments);
        }

        // Collect key dates
        if (contract.key_dates_json) {
          const dates = JSON.parse(contract.key_dates_json);
          dates.forEach((d: any) => {
            upcomingDates.push({
              date: d.date,
              description: d.description,
              contractId: contract.id,
            });
          });
        }
      }

      // Sort upcoming items by date
      upcomingPayments.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

      upcomingDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setAnalysis({
        totalContractValue,
        totalDepreciationValue,
        immediateDeductionsValue,
        lowValuePoolValue,
        contractCount: contracts.length,
        partyCount: allParties.size,
        upcomingPayments: upcomingPayments.slice(0, 10), // Top 10
        upcomingDates: upcomingDates.slice(0, 10), // Top 10
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze contracts");
    } finally {
      setIsLoading(false);
    }
  }, [contracts]);

  useEffect(() => {
    calculateAnalysis();
  }, [calculateAnalysis]);

  return {
    analysis,
    isLoading,
    error,
    recalculate: calculateAnalysis,
  };
}

// ============================================================================
// useContractSummary Hook
// ============================================================================

interface UseContractSummaryReturn {
  summary: {
    partyCount: number;
    keyDatesCount: number;
    paymentCount: number;
    depreciationCount: number;
    immediateDeductions: number;
    lowValuePoolAssets: number;
  } | null;
  isLoading: boolean;
}

export function useContractSummary(contract: Contract | null): UseContractSummaryReturn {
  const [summary, setSummary] = useState<UseContractSummaryReturn["summary"]>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!contract) {
      setSummary(null);
      return;
    }

    setIsLoading(true);
    try {
      setSummary(summarizeContract(contract));
    } finally {
      setIsLoading(false);
    }
  }, [contract]);

  return { summary, isLoading };
}

// ============================================================================
// useContractSearch Hook
// ============================================================================

interface UseContractSearchReturn {
  searchResults: Contract[];
  isSearching: boolean;
  search: (query: string) => void;
  clearSearch: () => void;
}

export function useContractSearch(contracts: Contract[]): UseContractSearchReturn {
  const [searchResults, setSearchResults] = useState<Contract[]>(contracts);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback((query: string) => {
    setIsSearching(true);
    
    if (!query.trim()) {
      setSearchResults(contracts);
    } else {
      const lowerQuery = query.toLowerCase();
      const filtered = contracts.filter(c => {
        // Search in various fields
        if (c.contract_type?.toLowerCase().includes(lowerQuery)) return true;
        if (c.contract_number?.toLowerCase().includes(lowerQuery)) return true;
        if (c.notes?.toLowerCase().includes(lowerQuery)) return true;
        if (c.raw_text?.toLowerCase().includes(lowerQuery)) return true;
        
        // Search in parties
        if (c.parties_json) {
          const parties: ContractParty[] = JSON.parse(c.parties_json);
          if (parties.some(p => p.name.toLowerCase().includes(lowerQuery))) return true;
        }
        
        return false;
      });
      setSearchResults(filtered);
    }
    
    setIsSearching(false);
  }, [contracts]);

  const clearSearch = useCallback(() => {
    setSearchResults(contracts);
  }, [contracts]);

  useEffect(() => {
    setSearchResults(contracts);
  }, [contracts]);

  return { searchResults, isSearching, search, clearSearch };
}
