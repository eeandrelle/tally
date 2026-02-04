import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getTaxYears, getCurrentFinancialYear, type TaxYear } from "@/lib/db";

interface TaxYearContextType {
  selectedYear: number;
  availableYears: TaxYear[];
  currentYear: number;
  isLoading: boolean;
  setSelectedYear: (year: number) => void;
  isViewingCurrentYear: boolean;
  getYearDates: () => { startDate: string; endDate: string };
}

const TaxYearContext = createContext<TaxYearContextType | undefined>(undefined);

const STORAGE_KEY = "tally-selected-tax-year";

export function TaxYearProvider({ children }: { children: React.ReactNode }) {
  const [selectedYear, setSelectedYearState] = useState<number>(() => {
    // Initialize from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return getCurrentFinancialYear();
  });
  
  const [availableYears, setAvailableYears] = useState<TaxYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentYear] = useState(() => getCurrentFinancialYear());

  // Load available tax years from database
  useEffect(() => {
    const loadYears = async () => {
      try {
        const years = await getTaxYears();
        setAvailableYears(years);
        
        // If no years in DB yet, add current and previous years
        if (years.length === 0) {
          const current = getCurrentFinancialYear();
          const defaultYears = [
            { year: current, start_date: `${current}-07-01`, end_date: `${current + 1}-06-30` },
            { year: current - 1, start_date: `${current - 1}-07-01`, end_date: `${current}-06-30` },
            { year: current - 2, start_date: `${current - 2}-07-01`, end_date: `${current - 1}-06-30` },
          ];
          setAvailableYears(defaultYears);
        }
        
        // Validate selected year is in available years
        const yearExists = years.length > 0 
          ? years.some(y => y.year === selectedYear)
          : true; // If no DB years yet, allow any
          
        if (!yearExists && years.length > 0) {
          // Reset to current year if selected year doesn't exist
          const newYear = years[0]?.year || currentYear;
          setSelectedYearState(newYear);
          localStorage.setItem(STORAGE_KEY, newYear.toString());
        }
      } catch (error) {
        console.error("Failed to load tax years:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadYears();
  }, [currentYear, selectedYear]);

  const setSelectedYear = useCallback((year: number) => {
    setSelectedYearState(year);
    localStorage.setItem(STORAGE_KEY, year.toString());
  }, []);

  const isViewingCurrentYear = selectedYear === currentYear;

  const getYearDates = useCallback(() => {
    const yearData = availableYears.find(y => y.year === selectedYear);
    if (yearData) {
      return {
        startDate: yearData.start_date,
        endDate: yearData.end_date,
      };
    }
    // Fallback calculation
    return {
      startDate: `${selectedYear}-07-01`,
      endDate: `${selectedYear + 1}-06-30`,
    };
  }, [availableYears, selectedYear]);

  return (
    <TaxYearContext.Provider
      value={{
        selectedYear,
        availableYears,
        currentYear,
        isLoading,
        setSelectedYear,
        isViewingCurrentYear,
        getYearDates,
      }}
    >
      {children}
    </TaxYearContext.Provider>
  );
}

export function useTaxYear() {
  const context = useContext(TaxYearContext);
  if (context === undefined) {
    throw new Error("useTaxYear must be used within a TaxYearProvider");
  }
  return context;
}
