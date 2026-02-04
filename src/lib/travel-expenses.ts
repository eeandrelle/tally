/**
 * D2 Travel Expenses Workpaper Library
 * Supports overnight work-related travel expenses
 * 
 * ATO Guidelines:
 * - Accommodation: Reasonable costs for overnight stays
 * - Meals: Only when staying overnight for work
 * - Transport: Flights, trains, taxis, rideshare, car hire
 * - Domestic vs International travel rules
 */

export type TravelType = 'domestic' | 'international';
export type TripPurpose = 'conference' | 'training' | 'client-meeting' | 'site-visit' | 'other';

export interface TripDetails {
  destination: string;
  travelType: TravelType;
  purpose: TripPurpose;
  purposeDescription?: string;
  departureDate: string;
  returnDate: string;
  nightsAway: number;
}

export interface AccommodationExpense {
  id: string;
  date: string;
  provider: string;
  location: string;
  amount: number;
  nights: number;
  receiptId?: string;
  receiptUrl?: string;
}

export interface MealExpense {
  id: string;
  date: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  description: string;
  amount: number;
  location?: string;
  receiptId?: string;
  receiptUrl?: string;
}

export interface TransportExpense {
  id: string;
  date: string;
  type: 'flight' | 'train' | 'bus' | 'taxi' | 'rideshare' | 'car-hire' | 'parking' | 'toll' | 'fuel' | 'other';
  description: string;
  fromLocation?: string;
  toLocation?: string;
  amount: number;
  returnJourney: boolean;
  receiptId?: string;
  receiptUrl?: string;
}

export interface TravelExpenseSummary {
  accommodation: {
    total: number;
    nights: number;
    averagePerNight: number;
    count: number;
  };
  meals: {
    total: number;
    breakdown: {
      breakfast: number;
      lunch: number;
      dinner: number;
      snacks: number;
    };
    count: number;
  };
  transport: {
    total: number;
    breakdown: {
      flight: number;
      train: number;
      bus: number;
      taxi: number;
      rideshare: number;
      'car-hire': number;
      parking: number;
      toll: number;
      fuel: number;
      other: number;
    };
    count: number;
  };
  grandTotal: number;
}

export interface TravelExpenseWorkpaper {
  id: string;
  taxYear: string;
  tripName: string;
  tripDetails: TripDetails;
  accommodation: AccommodationExpense[];
  meals: MealExpense[];
  transport: TransportExpense[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Transport type labels and icons
export const TRANSPORT_TYPES = {
  flight: { label: 'Flight', icon: 'Plane' },
  train: { label: 'Train', icon: 'Train' },
  bus: { label: 'Bus', icon: 'Bus' },
  taxi: { label: 'Taxi', icon: 'Taxi' },
  rideshare: { label: 'Rideshare', icon: 'Car' },
  'car-hire': { label: 'Car Hire', icon: 'CarFront' },
  parking: { label: 'Parking', icon: 'ParkingCircle' },
  toll: { label: 'Toll', icon: 'Road' },
  fuel: { label: 'Fuel', icon: 'Fuel' },
  other: { label: 'Other', icon: 'MoreHorizontal' },
} as const;

// Trip purpose options
export const TRIP_PURPOSES = {
  conference: { label: 'Conference or Seminar', description: 'Attending work-related conferences, seminars, or workshops' },
  training: { label: 'Training or Education', description: 'Work-related training courses or professional development' },
  'client-meeting': { label: 'Client Meeting', description: 'Meeting with clients or customers at their location' },
  'site-visit': { label: 'Site Visit', description: 'Visiting work sites, branches, or project locations' },
  other: { label: 'Other Work Purpose', description: 'Other work-related travel purposes' },
} as const;

// ATO reasonable amounts for meals (2024-25) - per day
export const REASONABLE_MEAL_AMOUNTS = {
  domestic: {
    breakfast: 26.45,
    lunch: 30.05,
    dinner: 51.75,
  },
  international: {
    breakfast: 35.00, // varies by country
    lunch: 45.00,
    dinner: 70.00,
  },
} as const;

// Calculate nights between two dates
export function calculateNights(departureDate: string, returnDate: string): number {
  const start = new Date(departureDate);
  const end = new Date(returnDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate accommodation summary
export function calculateAccommodationSummary(expenses: AccommodationExpense[]) {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const nights = expenses.reduce((sum, exp) => sum + exp.nights, 0);
  return {
    total,
    nights,
    averagePerNight: nights > 0 ? total / nights : 0,
    count: expenses.length,
  };
}

// Calculate meals summary
export function calculateMealsSummary(expenses: MealExpense[]) {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const breakdown = {
    breakfast: expenses.filter(e => e.type === 'breakfast').reduce((sum, e) => sum + e.amount, 0),
    lunch: expenses.filter(e => e.type === 'lunch').reduce((sum, e) => sum + e.amount, 0),
    dinner: expenses.filter(e => e.type === 'dinner').reduce((sum, e) => sum + e.amount, 0),
    snacks: expenses.filter(e => e.type === 'snacks').reduce((sum, e) => sum + e.amount, 0),
  };
  return { total, breakdown, count: expenses.length };
}

// Calculate transport summary
export function calculateTransportSummary(expenses: TransportExpense[]) {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const breakdown = {
    flight: expenses.filter(e => e.type === 'flight').reduce((sum, e) => sum + e.amount, 0),
    train: expenses.filter(e => e.type === 'train').reduce((sum, e) => sum + e.amount, 0),
    bus: expenses.filter(e => e.type === 'bus').reduce((sum, e) => sum + e.amount, 0),
    taxi: expenses.filter(e => e.type === 'taxi').reduce((sum, e) => sum + e.amount, 0),
    rideshare: expenses.filter(e => e.type === 'rideshare').reduce((sum, e) => sum + e.amount, 0),
    'car-hire': expenses.filter(e => e.type === 'car-hire').reduce((sum, e) => sum + e.amount, 0),
    parking: expenses.filter(e => e.type === 'parking').reduce((sum, e) => sum + e.amount, 0),
    toll: expenses.filter(e => e.type === 'toll').reduce((sum, e) => sum + e.amount, 0),
    fuel: expenses.filter(e => e.type === 'fuel').reduce((sum, e) => sum + e.amount, 0),
    other: expenses.filter(e => e.type === 'other').reduce((sum, e) => sum + e.amount, 0),
  };
  return { total, breakdown, count: expenses.length };
}

// Calculate complete summary
export function calculateSummary(workpaper: TravelExpenseWorkpaper): TravelExpenseSummary {
  const accommodation = calculateAccommodationSummary(workpaper.accommodation);
  const meals = calculateMealsSummary(workpaper.meals);
  const transport = calculateTransportSummary(workpaper.transport);
  
  return {
    accommodation,
    meals,
    transport,
    grandTotal: accommodation.total + meals.total + transport.total,
  };
}

// Create empty workpaper
export function createEmptyWorkpaper(taxYear: string): TravelExpenseWorkpaper {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    taxYear,
    tripName: '',
    tripDetails: {
      destination: '',
      travelType: 'domestic',
      purpose: 'conference',
      departureDate: '',
      returnDate: '',
      nightsAway: 0,
    },
    accommodation: [],
    meals: [],
    transport: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ATO validation rules
export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateWorkpaper(workpaper: TravelExpenseWorkpaper): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Required fields
  if (!workpaper.tripName.trim()) {
    errors.push('Trip name is required');
  }
  
  if (!workpaper.tripDetails.destination.trim()) {
    errors.push('Destination is required');
  }
  
  if (!workpaper.tripDetails.departureDate) {
    errors.push('Departure date is required');
  }
  
  if (!workpaper.tripDetails.returnDate) {
    errors.push('Return date is required');
  }
  
  // Date validation
  if (workpaper.tripDetails.departureDate && workpaper.tripDetails.returnDate) {
    const departure = new Date(workpaper.tripDetails.departureDate);
    const return_ = new Date(workpaper.tripDetails.returnDate);
    
    if (return_ < departure) {
      errors.push('Return date cannot be before departure date');
    }
    
    // Warn if trip is very long
    const diffDays = calculateNights(workpaper.tripDetails.departureDate, workpaper.tripDetails.returnDate);
    if (diffDays > 30) {
      warnings.push('Trip duration exceeds 30 days - ensure this is for work purposes');
    }
  }
  
  // Expense validation
  if (workpaper.accommodation.length === 0 && workpaper.meals.length === 0 && workpaper.transport.length === 0) {
    warnings.push('No expenses recorded for this trip');
  }

  // Receipt validation
  const totalExpenses = workpaper.accommodation.length + workpaper.meals.length + workpaper.transport.length;
  const expensesWithoutReceipts = [
    ...workpaper.accommodation.filter(e => !e.receiptId).map(() => 'accommodation'),
    ...workpaper.meals.filter(e => !e.receiptId).map(() => 'meal'),
    ...workpaper.transport.filter(e => !e.receiptId).map(() => 'transport'),
  ];

  if (totalExpenses > 0) {
    const coverage = ((totalExpenses - expensesWithoutReceipts.length) / totalExpenses) * 100;
    if (coverage < 100) {
      warnings.push(`${expensesWithoutReceipts.length} expense${expensesWithoutReceipts.length !== 1 ? 's' : ''} missing receipt links - ATO requires receipts for travel claims over $300`);
    }
    if (coverage < 50) {
      warnings.push('Less than 50% of expenses have linked receipts - this may trigger ATO review');
    }
  }
  
  // Meal amount warnings (reasonable amounts)
  const mealTotalsByDay = new Map<string, number>();
  workpaper.meals.forEach(meal => {
    const current = mealTotalsByDay.get(meal.date) || 0;
    mealTotalsByDay.set(meal.date, current + meal.amount);
  });
  
  const reasonableDailyTotal = workpaper.tripDetails.travelType === 'international' 
    ? 150 
    : 108.25; // Sum of all reasonable meal amounts
    
  mealTotalsByDay.forEach((total, date) => {
    if (total > reasonableDailyTotal * 1.5) {
      warnings.push(`Meal expenses on ${date} exceed reasonable amounts - ensure receipts are kept`);
    }
  });
  
  // Accommodation warnings
  const accommodationTotal = workpaper.accommodation.reduce((sum, a) => sum + a.amount, 0);
  const accommodationNights = workpaper.accommodation.reduce((sum, a) => sum + a.nights, 0);
  
  if (accommodationNights > 0) {
    const avgPerNight = accommodationTotal / accommodationNights;
    if (avgPerNight > 400) {
      warnings.push('Average accommodation cost exceeds $400/night - ensure this is reasonable for the location');
    }
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

// Export for tax filing
export function exportForTax(workpaper: TravelExpenseWorkpaper) {
  const summary = calculateSummary(workpaper);

  // Calculate receipt coverage
  const totalExpenses = workpaper.accommodation.length + workpaper.meals.length + workpaper.transport.length;
  const linkedExpenses = workpaper.accommodation.filter(e => e.receiptId).length +
                         workpaper.meals.filter(e => e.receiptId).length +
                         workpaper.transport.filter(e => e.receiptId).length;

  return {
    d2TravelExpenses: {
      accommodation: summary.accommodation.total,
      meals: summary.meals.total,
      transport: summary.transport.total,
      total: summary.grandTotal,
    },
    details: {
      tripName: workpaper.tripName,
      destination: workpaper.tripDetails.destination,
      travelType: workpaper.tripDetails.travelType,
      purpose: workpaper.tripDetails.purpose,
      dates: {
        departure: workpaper.tripDetails.departureDate,
        return: workpaper.tripDetails.returnDate,
        nights: workpaper.tripDetails.nightsAway,
      },
      expenseCount: {
        accommodation: workpaper.accommodation.length,
        meals: workpaper.meals.length,
        transport: workpaper.transport.length,
      },
      receiptCoverage: {
        total: totalExpenses,
        linked: linkedExpenses,
        percentage: totalExpenses > 0 ? Math.round((linkedExpenses / totalExpenses) * 100) : 0,
      },
    },
    expenses: {
      accommodation: workpaper.accommodation.map(e => ({
        date: e.date,
        provider: e.provider,
        location: e.location,
        amount: e.amount,
        nights: e.nights,
        hasReceipt: !!e.receiptId,
        receiptId: e.receiptId,
      })),
      meals: workpaper.meals.map(e => ({
        date: e.date,
        type: e.type,
        description: e.description,
        amount: e.amount,
        hasReceipt: !!e.receiptId,
        receiptId: e.receiptId,
      })),
      transport: workpaper.transport.map(e => ({
        date: e.date,
        type: e.type,
        description: e.description,
        fromLocation: e.fromLocation,
        toLocation: e.toLocation,
        amount: e.amount,
        returnJourney: e.returnJourney,
        hasReceipt: !!e.receiptId,
        receiptId: e.receiptId,
      })),
    },
  };
}
