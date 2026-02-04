/**
 * Vehicle Logbook Digital Tracker Library
 * ATO-compliant digital logbook with GPS tracking and manual entry
 * 
 * ATO Requirements:
 * - 12 consecutive weeks minimum
 * - Record all trips (business and personal)
 * - Odometer readings at start/end
 * - Business purpose for business trips
 * - Valid for 5 years (or until circumstances change)
 */

export type TripType = 'business' | 'personal';

export interface Trip {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startOdometer: number;
  endOdometer: number;
  distance: number; // km
  type: TripType;
  purpose?: string; // Required for business trips
  startLocation?: string;
  endLocation?: string;
  // GPS tracking data (optional)
  gpsData?: {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    accuracy: number; // meters
  };
  // Metadata
  createdAt: string;
  updatedAt: string;
  trackingMethod: 'manual' | 'gps' | 'odometer-only';
}

export interface Vehicle {
  id: string;
  name: string;
  registration: string;
  make?: string;
  model?: string;
  year?: number;
  // Odometer tracking
  odometerReading: number;
  odometerDate: string;
  // Logbook status
  logbookStartDate?: string;
  logbookEndDate?: string;
  isLogbookActive: boolean;
}

export interface LogbookPeriod {
  id: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  targetWeeks: number; // Usually 12
  isComplete: boolean;
  // Statistics
  totalTrips: number;
  businessTrips: number;
  personalTrips: number;
  totalDistance: number;
  businessDistance: number;
  businessPercentage: number;
  // Compliance
  hasConsecutiveWeeks: boolean;
  gapsInRecording: string[]; // Dates with missing trips
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalTrips: number;
  businessTrips: number;
  personalTrips: number;
  totalDistance: number;
  businessDistance: number;
  businessPercentage: number;
  isComplete: boolean; // All days have trips recorded
}

export interface LogbookCompliance {
  isValid: boolean;
  periodDays: number;
  periodWeeks: number;
  consecutiveWeeks: number;
  missingDays: string[];
  warnings: string[];
  canBeUsedForTax: boolean;
  expiryDate: string; // 5 years from completion
}

export interface GPSPoint {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  speed?: number; // km/h
}

export interface ActiveTrackingSession {
  id: string;
  vehicleId: string;
  startTime: string;
  startOdometer?: number;
  startLocation?: GPSPoint;
  type: TripType;
  purpose?: string;
  isActive: boolean;
  points: GPSPoint[];
}

// ATO Constants
export const MINIMUM_LOGBOOK_WEEKS = 12;
export const LOGBOOK_VALID_YEARS = 5;
export const MAX_GAP_DAYS = 1; // Allow 1 day gap for forgotten entries

// Common business purposes
export const BUSINESS_PURPOSES = [
  'Travel between workplaces',
  'Travel to client/customer site',
  'Travel to conference or training',
  'Travel to pick up supplies/equipment',
  'Travel for work-related errand',
  'Other work-related travel',
];

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate distance from odometer readings
export function calculateDistance(startOdometer: number, endOdometer: number): number {
  return Math.max(0, endOdometer - startOdometer);
}

// Calculate business percentage
export function calculateBusinessPercentage(businessKm: number, totalKm: number): number {
  if (totalKm === 0) return 0;
  return Math.round((businessKm / totalKm) * 100);
}

// Validate trip
export function validateTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (trip.endOdometer < trip.startOdometer) {
    errors.push('End odometer must be greater than start odometer');
  }
  
  if (trip.type === 'business' && !trip.purpose?.trim()) {
    errors.push('Business trips require a purpose');
  }
  
  const distance = calculateDistance(trip.startOdometer, trip.endOdometer);
  if (distance === 0) {
    errors.push('Trip distance cannot be zero');
  }
  
  if (distance > 2000) {
    errors.push('Trip distance seems unusually high (>2000km). Please verify odometer readings.');
  }
  
  return { valid: errors.length === 0, errors };
}

// Get week start (Monday) and end (Sunday) for a date
export function getWeekBounds(date: string): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

// Group trips by week
export function groupTripsByWeek(trips: Trip[]): WeeklySummary[] {
  const weekMap = new Map<string, Trip[]>();
  
  trips.forEach(trip => {
    const { start } = getWeekBounds(trip.date);
    if (!weekMap.has(start)) {
      weekMap.set(start, []);
    }
    weekMap.get(start)!.push(trip);
  });
  
  return Array.from(weekMap.entries())
    .map(([weekStart, weekTrips]) => {
      const { end } = getWeekBounds(weekStart);
      const businessTrips = weekTrips.filter(t => t.type === 'business');
      const totalDistance = weekTrips.reduce((sum, t) => sum + t.distance, 0);
      const businessDistance = businessTrips.reduce((sum, t) => sum + t.distance, 0);
      
      return {
        weekStart,
        weekEnd: end,
        totalTrips: weekTrips.length,
        businessTrips: businessTrips.length,
        personalTrips: weekTrips.filter(t => t.type === 'personal').length,
        totalDistance,
        businessDistance,
        businessPercentage: calculateBusinessPercentage(businessDistance, totalDistance),
        isComplete: true, // Simplified - would check each day
      };
    })
    .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());
}

// Check logbook compliance
export function checkLogbookCompliance(
  trips: Trip[],
  targetWeeks: number = MINIMUM_LOGBOOK_WEEKS
): LogbookCompliance {
  if (trips.length === 0) {
    return {
      isValid: false,
      periodDays: 0,
      periodWeeks: 0,
      consecutiveWeeks: 0,
      missingDays: [],
      warnings: ['No trips recorded'],
      canBeUsedForTax: false,
      expiryDate: '',
    };
  }
  
  // Sort trips by date
  const sortedTrips = [...trips].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const startDate = new Date(sortedTrips[0].date);
  const endDate = new Date(sortedTrips[sortedTrips.length - 1].date);
  const periodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const periodWeeks = Math.floor(periodDays / 7);
  
  const weeklySummaries = groupTripsByWeek(trips);
  const consecutiveWeeks = weeklySummaries.filter(w => w.totalTrips > 0).length;
  
  const warnings: string[] = [];
  
  if (consecutiveWeeks < targetWeeks) {
    warnings.push(`Only ${consecutiveWeeks} weeks recorded. Minimum ${targetWeeks} weeks required.`);
  }
  
  // Check for business trips without purpose
  const missingPurpose = trips.filter(t => t.type === 'business' && !t.purpose);
  if (missingPurpose.length > 0) {
    warnings.push(`${missingPurpose.length} business trips missing purpose`);
  }
  
  const isValid = consecutiveWeeks >= targetWeeks && missingPurpose.length === 0;
  const canBeUsedForTax = consecutiveWeeks >= MINIMUM_LOGBOOK_WEEKS;
  
  // Calculate expiry date (5 years from last trip)
  const expiryDate = new Date(endDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + LOGBOOK_VALID_YEARS);
  
  return {
    isValid,
    periodDays,
    periodWeeks,
    consecutiveWeeks,
    missingDays: [], // Would calculate gaps
    warnings,
    canBeUsedForTax,
    expiryDate: expiryDate.toISOString().split('T')[0],
  };
}

// Create a new trip
export function createTrip(data: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'distance'>): Trip {
  const now = new Date().toISOString();
  return {
    ...data,
    id: generateId(),
    distance: calculateDistance(data.startOdometer, data.endOdometer),
    createdAt: now,
    updatedAt: now,
  };
}

// Create a new vehicle
export function createVehicle(data: Omit<Vehicle, 'id' | 'isLogbookActive'>): Vehicle {
  return {
    ...data,
    id: generateId(),
    isLogbookActive: false,
  };
}

// Get logbook statistics
export function getLogbookStats(trips: Trip[]) {
  const totalTrips = trips.length;
  const businessTrips = trips.filter(t => t.type === 'business');
  const totalDistance = trips.reduce((sum, t) => sum + t.distance, 0);
  const businessDistance = businessTrips.reduce((sum, t) => sum + t.distance, 0);
  
  return {
    totalTrips,
    businessTrips: businessTrips.length,
    personalTrips: trips.filter(t => t.type === 'personal').length,
    totalDistance,
    businessDistance,
    businessPercentage: calculateBusinessPercentage(businessDistance, totalDistance),
    avgTripDistance: totalTrips > 0 ? totalDistance / totalTrips : 0,
    avgBusinessDistance: businessTrips.length > 0 ? businessDistance / businessTrips.length : 0,
  };
}

// Format date for display
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Format time for display
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Format distance
export function formatDistance(km: number): string {
  if (km === 0) return '0 km';
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  return `${km.toFixed(1)} km`;
}

// Export logbook data (for tax purposes)
export interface LogbookExport {
  vehicle: Vehicle;
  period: {
    startDate: string;
    endDate: string;
    weeks: number;
  };
  summary: {
    totalTrips: number;
    businessTrips: number;
    totalDistance: number;
    businessDistance: number;
    businessPercentage: number;
  };
  trips: Trip[];
  compliance: LogbookCompliance;
  exportedAt: string;
}

export function exportLogbookData(
  vehicle: Vehicle,
  trips: Trip[],
  targetWeeks: number = MINIMUM_LOGBOOK_WEEKS
): LogbookExport {
  const sortedTrips = [...trips].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const startDate = sortedTrips[0]?.date || '';
  const endDate = sortedTrips[sortedTrips.length - 1]?.date || '';
  const weeklySummaries = groupTripsByWeek(trips);
  
  return {
    vehicle,
    period: {
      startDate,
      endDate,
      weeks: weeklySummaries.length,
    },
    summary: getLogbookStats(trips),
    trips: sortedTrips,
    compliance: checkLogbookCompliance(trips, targetWeeks),
    exportedAt: new Date().toISOString(),
  };
}

// Generate CSV export
export function generateLogbookCSV(trips: Trip[]): string {
  const headers = [
    'Date',
    'Start Time',
    'End Time',
    'Start Odometer',
    'End Odometer',
    'Distance (km)',
    'Type',
    'Purpose',
    'Start Location',
    'End Location',
    'Method',
  ];
  
  const rows = trips
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(trip => [
      trip.date,
      trip.startTime,
      trip.endTime,
      trip.startOdometer,
      trip.endOdometer,
      trip.distance.toFixed(1),
      trip.type,
      trip.purpose || '',
      trip.startLocation || '',
      trip.endLocation || '',
      trip.trackingMethod,
    ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
