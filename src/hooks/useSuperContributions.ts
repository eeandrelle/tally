import { useState, useCallback } from 'react';

export interface SuperContribution {
  id: string;
  fundName: string;
  abn?: string;
  amount: number;
  date: string;
  noticeSubmitted: boolean;
  noticeDate?: string;
  acknowledgmentReceived: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'tally_d10_super_contributions';

export function useSuperContributions() {
  const [contributions, setContributions] = useState<SuperContribution[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const saveContributions = useCallback((newContributions: SuperContribution[]) => {
    setContributions(newContributions);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newContributions));
    }
  }, []);

  const addContribution = useCallback((contribution: Omit<SuperContribution, 'id' | 'createdAt'>) => {
    const newContribution: SuperContribution = {
      ...contribution,
      id: `d10-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...contributions, newContribution];
    saveContributions(updated);
    return newContribution.id;
  }, [contributions, saveContributions]);

  const updateContribution = useCallback((id: string, updates: Partial<SuperContribution>) => {
    const updated = contributions.map(c => c.id === id ? { ...c, ...updates } : c);
    saveContributions(updated);
  }, [contributions, saveContributions]);

  const deleteContribution = useCallback((id: string) => {
    const updated = contributions.filter(c => c.id !== id);
    saveContributions(updated);
  }, [contributions, saveContributions]);

  const getTotalContributions = useCallback(() => {
    return contributions
      .filter(c => c.acknowledgmentReceived)
      .reduce((total, c) => total + c.amount, 0);
  }, [contributions]);

  const getAllContributionsTotal = useCallback(() => {
    return contributions.reduce((total, c) => total + c.amount, 0);
  }, [contributions]);

  const getValidContributions = useCallback(() => {
    return contributions.filter(c => c.acknowledgmentReceived);
  }, [contributions]);

  const getPendingContributions = useCallback(() => {
    return contributions.filter(c => !c.acknowledgmentReceived);
  }, [contributions]);

  return {
    contributions,
    addContribution,
    updateContribution,
    deleteContribution,
    getTotalContributions,
    getAllContributionsTotal,
    getValidContributions,
    getPendingContributions,
  };
}
