/**
 * D3 Clothing & Laundry Workpaper Library
 * 
 * ATO D3 Category: Work-related clothing, uniform, and laundry expenses
 * 
 * Claimable items:
 - Compulsory uniforms with logo/brand
 * - Occupation-specific clothing (chef's pants, nurse's shoes)
 * - Protective clothing (hi-vis, steel-capped boots, aprons)
 * - Laundry/dry cleaning costs for eligible clothing
 * 
 * NOT claimable:
 - Conventional clothing (suits, plain shirts, black pants)
 * - Everyday shoes
 * - Clothing for personal use
 */

// Clothing expense types
export type ClothingType = 'compulsory-uniform' | 'occupation-specific' | 'protective' | 'non-claimable';

export interface ClothingExpense {
  id: string;
  date: string;
  description: string;
  type: ClothingType;
  amount: number;
  vendor?: string;
  receiptUrl?: string;
  isLaundry: boolean;
  notes?: string;
}

export interface LaundryExpense {
  id: string;
  date: string;
  description: string;
  method: 'home' | 'laundromat' | 'dry-cleaner';
  amount: number;
  loads?: number; // for home laundry
  vendor?: string;
  receiptUrl?: string;
  relatedClothingIds?: string[]; // links to clothing items this laundry is for
  notes?: string;
}

export interface ClothingWorkpaper {
  id: string;
  taxYear: string;
  employeeName: string;
  employerName: string;
  employerRequiresUniform: boolean;
  uniformDescription?: string;
  
  clothingExpenses: ClothingExpense[];
  laundryExpenses: LaundryExpense[];
  
  // ATO reasonable laundry rates (per load, no receipts required under $150 total)
  useReasonableLaundryRate: boolean;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ATO reasonable laundry rates per load (2024-25)
export const REASONABLE_LAUNDRY_RATES = {
  'home': 1.00,        // $1 per load for home washing
  'laundromat': 2.50,  // $2.50 per load for laundromat
  'dry-cleaner': 0,    // No reasonable rate - actual receipts required
} as const;

// Clothing type metadata
export const CLOTHING_TYPES: Record<ClothingType, { 
  label: string; 
  description: string;
  examples: string[];
  atoReference: string;
  claimable: boolean;
}> = {
  'compulsory-uniform': {
    label: 'Compulsory Uniform',
    description: 'Uniforms your employer requires you to wear with a logo or unique brand',
    examples: [
      'Company branded shirts/polo shirts',
      'Uniforms with embroidered logo',
      'Specific color combinations unique to employer',
    ],
    atoReference: 'D3 - Compulsory work uniform',
    claimable: true,
  },
  'occupation-specific': {
    label: 'Occupation-Specific Clothing',
    description: 'Clothing distinct to your occupation, not for everyday use',
    examples: [
      'Chef\'s checked pants and jackets',
      'Nurse\'s traditional uniform',
      'Security officer uniform',
      'Judge\'s robes',
    ],
    atoReference: 'D3 - Occupation-specific clothing',
    claimable: true,
  },
  'protective': {
    label: 'Protective Clothing',
    description: 'Clothing and footwear that protects from injury or illness at work',
    examples: [
      'Hi-vis vests and jackets',
      'Steel-capped boots',
      'Hard hats and safety helmets',
      'Sun protection clothing',
      'Aprons and overalls',
      'Gloves and safety glasses',
    ],
    atoReference: 'D3 - Protective clothing',
    claimable: true,
  },
  'non-claimable': {
    label: 'Non-Claimable Clothing',
    description: 'Conventional clothing, even if required for work',
    examples: [
      'Suits, dress shirts, blouses',
      'Plain pants, skirts, dresses',
      'Everyday shoes and accessories',
      'Business attire',
    ],
    atoReference: 'D3 - Not deductible',
    claimable: false,
  },
};

// Laundry method metadata
export const LAUNDRY_METHODS = {
  'home': {
    label: 'Home Laundry',
    description: 'Washing at home (machine or hand wash)',
    rate: 1.00,
    needsReceipts: false,
  },
  'laundromat': {
    label: 'Laundromat',
    description: 'Self-service or serviced laundromat',
    rate: 2.50,
    needsReceipts: true,
  },
  'dry-cleaner': {
    label: 'Dry Cleaner',
    description: 'Professional dry cleaning service',
    rate: 0,
    needsReceipts: true,
  },
} as const;

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create empty workpaper
export function createEmptyWorkpaper(taxYear: string): ClothingWorkpaper {
  return {
    id: generateId(),
    taxYear,
    employeeName: '',
    employerName: '',
    employerRequiresUniform: false,
    clothingExpenses: [],
    laundryExpenses: [],
    useReasonableLaundryRate: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Calculate totals by category
export interface CategoryTotals {
  clothing: {
    'compulsory-uniform': number;
    'occupation-specific': number;
    'protective': number;
    'non-claimable': number;
    total: number;
  };
  laundry: {
    'home': number;
    'laundromat': number;
    'dry-cleaner': number;
    total: number;
  };
  grandTotal: number;
  claimableTotal: number;
}

export function calculateTotals(workpaper: ClothingWorkpaper): CategoryTotals {
  const clothing = {
    'compulsory-uniform': 0,
    'occupation-specific': 0,
    'protective': 0,
    'non-claimable': 0,
    total: 0,
  };
  
  workpaper.clothingExpenses.forEach(expense => {
    clothing[expense.type] += expense.amount;
    clothing.total += expense.amount;
  });
  
  const laundry = {
    'home': 0,
    'laundromat': 0,
    'dry-cleaner': 0,
    total: 0,
  };
  
  workpaper.laundryExpenses.forEach(expense => {
    laundry[expense.method] += expense.amount;
    laundry.total += expense.amount;
  });
  
  const claimableTotal = 
    clothing['compulsory-uniform'] + 
    clothing['occupation-specific'] + 
    clothing['protective'] + 
    laundry.total;
  
  return {
    clothing,
    laundry,
    grandTotal: clothing.total + laundry.total,
    claimableTotal,
  };
}

// Validation
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

export function validateWorkpaper(workpaper: ClothingWorkpaper): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];
  
  // Required fields
  if (!workpaper.employeeName.trim()) {
    errors.push('Employee name is required');
  }
  
  if (!workpaper.employerName.trim()) {
    errors.push('Employer name is required');
  }
  
  // Check for non-claimable items
  const nonClaimableCount = workpaper.clothingExpenses.filter(e => e.type === 'non-claimable').length;
  if (nonClaimableCount > 0) {
    warnings.push(`${nonClaimableCount} clothing item(s) marked as non-claimable will not be included in deduction`);
  }
  
  // Check for laundry without related clothing
  const laundryWithoutClothing = workpaper.laundryExpenses.filter(e => 
    !e.relatedClothingIds || e.relatedClothingIds.length === 0
  );
  if (laundryWithoutClothing.length > 0) {
    info.push(`${laundryWithoutClothing.length} laundry expense(s) not linked to specific clothing items`);
  }
  
  // Check receipt requirements
  const dryCleaningWithoutReceipts = workpaper.laundryExpenses.filter(
    e => e.method === 'dry-cleaner' && !e.receiptUrl
  );
  if (dryCleaningWithoutReceipts.length > 0) {
    warnings.push(`${dryCleaningWithoutReceipts.length} dry cleaning expense(s) without receipts`);
  }
  
  // ATO threshold info
  const totals = calculateTotals(workpaper);
  if (totals.claimableTotal > 0 && totals.claimableTotal <= 150) {
    info.push('Total claim under $150 - detailed receipts may not be required by ATO');
  }
  
  // Reasonable rate warning
  if (workpaper.useReasonableLaundryRate) {
    const homeLaundry = workpaper.laundryExpenses.filter(e => e.method === 'home');
    if (homeLaundry.length > 0) {
      info.push(`Using ATO reasonable rate of $${REASONABLE_LAUNDRY_RATES.home} per load for home laundry`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

// Export for tax filing
export interface WorkpaperExport {
  taxYear: string;
  category: 'D3';
  categoryName: string;
  claimAmount: number;
  employeeName: string;
  employerName: string;
  breakdown: {
    compulsoryUniform: number;
    occupationSpecific: number;
    protective: number;
    laundry: number;
  };
  itemCount: {
    clothing: number;
    laundry: number;
  };
  notes?: string;
}

export function exportForTax(workpaper: ClothingWorkpaper): WorkpaperExport {
  const totals = calculateTotals(workpaper);
  
  return {
    taxYear: workpaper.taxYear,
    category: 'D3',
    categoryName: 'Work-related clothing, laundry and dry-cleaning expenses',
    claimAmount: totals.claimableTotal,
    employeeName: workpaper.employeeName,
    employerName: workpaper.employerName,
    breakdown: {
      compulsoryUniform: totals.clothing['compulsory-uniform'],
      occupationSpecific: totals.clothing['occupation-specific'],
      protective: totals.clothing['protective'],
      laundry: totals.laundry.total,
    },
    itemCount: {
      clothing: workpaper.clothingExpenses.length,
      laundry: workpaper.laundryExpenses.length,
    },
    notes: workpaper.notes,
  };
}
