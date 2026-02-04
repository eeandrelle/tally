import { useState, useCallback } from 'react';

export type DonationType = 
  | 'cash'
  | 'regular'
  | 'workplace'
  | 'property'
  | 'shares'
  | 'cultural'
  | 'bequest'
  | 'political';

export interface Donation {
  id: string;
  type: DonationType;
  organization: string;
  amount: number;
  date: string;
  dgrStatus: boolean;
  receiptNumber?: string;
  description?: string;
  createdAt: string;
}

const STORAGE_KEY = 'tally_d8_donations';

export function useDonations() {
  const [donations, setDonations] = useState<Donation[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const saveDonations = useCallback((newDonations: Donation[]) => {
    setDonations(newDonations);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDonations));
    }
  }, []);

  const addDonation = useCallback((donation: Omit<Donation, 'id' | 'createdAt'>) => {
    const newDonation: Donation = {
      ...donation,
      id: `d8-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...donations, newDonation];
    saveDonations(updated);
    return newDonation.id;
  }, [donations, saveDonations]);

  const updateDonation = useCallback((id: string, updates: Partial<Donation>) => {
    const updated = donations.map(d => d.id === id ? { ...d, ...updates } : d);
    saveDonations(updated);
  }, [donations, saveDonations]);

  const deleteDonation = useCallback((id: string) => {
    const updated = donations.filter(d => d.id !== id);
    saveDonations(updated);
  }, [donations, saveDonations]);

  const getTotalDonations = useCallback(() => {
    return donations.reduce((total, donation) => total + donation.amount, 0);
  }, [donations]);

  const getDeductibleTotal = useCallback(() => {
    return donations
      .filter(d => d.dgrStatus && d.amount >= 2)
      .reduce((total, donation) => total + donation.amount, 0);
  }, [donations]);

  const getDonationsByType = useCallback((type: DonationType) => {
    return donations.filter(d => d.type === type);
  }, [donations]);

  return {
    donations,
    addDonation,
    updateDonation,
    deleteDonation,
    getTotalDonations,
    getDeductibleTotal,
    getDonationsByType,
  };
}
