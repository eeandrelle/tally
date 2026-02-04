/**
 * Vehicle Logbook React Hook
 * Manages state for digital logbook with persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trip,
  Vehicle,
  TripType,
  LogbookCompliance,
  WeeklySummary,
  ActiveTrackingSession,
  GPSPoint,
  createTrip,
  createVehicle,
  validateTrip,
  calculateDistance,
  checkLogbookCompliance,
  groupTripsByWeek,
  getLogbookStats,
  exportLogbookData,
  generateLogbookCSV,
  MINIMUM_LOGBOOK_WEEKS,
  BUSINESS_PURPOSES,
} from '@/lib/vehicle-logbook';

const STORAGE_KEY = 'tally-vehicle-logbook';
const TRACKING_SESSION_KEY = 'tally-active-tracking';

interface LogbookState {
  vehicles: Vehicle[];
  trips: Trip[];
  activeVehicleId: string | null;
}

interface UseVehicleLogbookReturn {
  // State
  vehicles: Vehicle[];
  trips: Trip[];
  activeVehicleId: string | null;
  activeVehicle: Vehicle | null;
  
  // Vehicle management
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'isLogbookActive'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  setActiveVehicle: (id: string | null) => void;
  startLogbookPeriod: (vehicleId: string, startDate: string) => void;
  
  // Trip management
  addTrip: (trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'distance'>) => { success: boolean; errors: string[] };
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  getTripsForVehicle: (vehicleId: string) => Trip[];
  
  // Stats and analysis
  stats: ReturnType<typeof getLogbookStats>;
  weeklySummaries: WeeklySummary[];
  compliance: LogbookCompliance;
  
  // GPS Tracking
  activeTracking: ActiveTrackingSession | null;
  startTracking: (vehicleId: string, type: TripType, purpose?: string, startOdometer?: number) => void;
  stopTracking: (endOdometer: number, purpose?: string) => Trip | null;
  isTracking: boolean;
  trackingDuration: number; // seconds
  
  // Export
  exportData: () => ReturnType<typeof exportLogbookData> | null;
  exportCSV: () => string;
  
  // Constants
  businessPurposes: string[];
  minWeeks: number;
}

export function useVehicleLogbook(): UseVehicleLogbookReturn {
  // Load initial state from localStorage
  const [state, setState] = useState<LogbookState>(() => {
    if (typeof window === 'undefined') {
      return { vehicles: [], trips: [], activeVehicleId: null };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load logbook state:', e);
    }
    return { vehicles: [], trips: [], activeVehicleId: null };
  });
  
  // Load active tracking session
  const [activeTracking, setActiveTracking] = useState<ActiveTrackingSession | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(TRACKING_SESSION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load tracking session:', e);
    }
    return null;
  });
  
  // Tracking duration timer
  const [trackingDuration, setTrackingDuration] = useState(0);
  
  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);
  
  // Persist tracking session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeTracking) {
        localStorage.setItem(TRACKING_SESSION_KEY, JSON.stringify(activeTracking));
      } else {
        localStorage.removeItem(TRACKING_SESSION_KEY);
      }
    }
  }, [activeTracking]);
  
  // Update tracking duration timer
  useEffect(() => {
    if (!activeTracking?.isActive) {
      setTrackingDuration(0);
      return;
    }
    
    const startTime = new Date(activeTracking.startTime).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setTrackingDuration(Math.floor((now - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTracking]);
  
  // Vehicle management
  const addVehicle = useCallback((vehicleData: Omit<Vehicle, 'id' | 'isLogbookActive'>) => {
    const newVehicle = createVehicle(vehicleData);
    setState(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, newVehicle],
      activeVehicleId: prev.activeVehicleId || newVehicle.id,
    }));
  }, []);
  
  const updateVehicle = useCallback((id: string, updates: Partial<Vehicle>) => {
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === id ? { ...v, ...updates } : v
      ),
    }));
  }, []);
  
  const deleteVehicle = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter(v => v.id !== id),
      trips: prev.trips.filter(t => {
        // We need to filter out trips for this vehicle - but trips don't have vehicleId
        // For now, we'll keep all trips
        return true;
      }),
      activeVehicleId: prev.activeVehicleId === id ? null : prev.activeVehicleId,
    }));
  }, []);
  
  const setActiveVehicle = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, activeVehicleId: id }));
  }, []);
  
  const startLogbookPeriod = useCallback((vehicleId: string, startDate: string) => {
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === vehicleId 
          ? { ...v, isLogbookActive: true, logbookStartDate: startDate, logbookEndDate: undefined }
          : v
      ),
    }));
  }, []);
  
  // Trip management
  const addTrip = useCallback((tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'distance'>) => {
    const validation = validateTrip(tripData);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    
    const newTrip = createTrip(tripData);
    setState(prev => ({
      ...prev,
      trips: [...prev.trips, newTrip],
    }));
    
    // Update vehicle odometer if this is the active vehicle
    if (state.activeVehicleId) {
      const vehicle = state.vehicles.find(v => v.id === state.activeVehicleId);
      if (vehicle && tripData.endOdometer > vehicle.odometerReading) {
        updateVehicle(state.activeVehicleId, {
          odometerReading: tripData.endOdometer,
          odometerDate: tripData.date,
        });
      }
    }
    
    return { success: true, errors: [] };
  }, [state.activeVehicleId, state.vehicles, updateVehicle]);
  
  const updateTrip = useCallback((id: string, updates: Partial<Trip>) => {
    setState(prev => ({
      ...prev,
      trips: prev.trips.map(t => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates, updatedAt: new Date().toISOString() };
        // Recalculate distance if odometer changed
        if (updates.startOdometer !== undefined || updates.endOdometer !== undefined) {
          updated.distance = calculateDistance(
            updated.startOdometer,
            updated.endOdometer
          );
        }
        return updated;
      }),
    }));
  }, []);
  
  const deleteTrip = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      trips: prev.trips.filter(t => t.id !== id),
    }));
  }, []);
  
  const getTripsForVehicle = useCallback((vehicleId: string) => {
    // For now, return all trips (in a real app, trips would have vehicleId)
    // We'll filter by active vehicle context
    return state.trips;
  }, [state.trips]);
  
  // Stats and analysis
  const vehicleTrips = useMemo(() => {
    return state.activeVehicleId ? getTripsForVehicle(state.activeVehicleId) : [];
  }, [state.activeVehicleId, state.trips, getTripsForVehicle]);
  
  const stats = useMemo(() => {
    return getLogbookStats(vehicleTrips);
  }, [vehicleTrips]);
  
  const weeklySummaries = useMemo(() => {
    return groupTripsByWeek(vehicleTrips);
  }, [vehicleTrips]);
  
  const compliance = useMemo(() => {
    return checkLogbookCompliance(vehicleTrips, MINIMUM_LOGBOOK_WEEKS);
  }, [vehicleTrips]);
  
  // GPS Tracking
  const startTracking = useCallback((
    vehicleId: string, 
    type: TripType, 
    purpose?: string,
    startOdometer?: number
  ) => {
    const session: ActiveTrackingSession = {
      id: `${Date.now()}`,
      vehicleId,
      startTime: new Date().toISOString(),
      startOdometer,
      type,
      purpose,
      isActive: true,
      points: [],
    };
    setActiveTracking(session);
  }, []);
  
  const stopTracking = useCallback((endOdometer: number, purpose?: string): Trip | null => {
    if (!activeTracking) return null;
    
    const endTime = new Date().toISOString();
    const startDate = new Date(activeTracking.startTime);
    
    const tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'distance'> = {
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: new Date(endTime).toTimeString().slice(0, 5),
      startOdometer: activeTracking.startOdometer || 0,
      endOdometer,
      type: activeTracking.type,
      purpose: purpose || activeTracking.purpose,
      trackingMethod: 'gps',
    };
    
    const result = addTrip(tripData);
    if (!result.success) {
      return null;
    }
    
    // Get the newly created trip
    setActiveTracking(null);
    return state.trips[state.trips.length - 1];
  }, [activeTracking, addTrip, state.trips]);
  
  // Export
  const exportData = useCallback(() => {
    if (!state.activeVehicleId) return null;
    const vehicle = state.vehicles.find(v => v.id === state.activeVehicleId);
    if (!vehicle) return null;
    return exportLogbookData(vehicle, vehicleTrips);
  }, [state.activeVehicleId, state.vehicles, vehicleTrips]);
  
  const exportCSV = useCallback(() => {
    return generateLogbookCSV(vehicleTrips);
  }, [vehicleTrips]);
  
  const activeVehicle = useMemo(() => {
    return state.vehicles.find(v => v.id === state.activeVehicleId) || null;
  }, [state.vehicles, state.activeVehicleId]);
  
  return {
    vehicles: state.vehicles,
    trips: state.trips,
    activeVehicleId: state.activeVehicleId,
    activeVehicle,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setActiveVehicle,
    startLogbookPeriod,
    addTrip,
    updateTrip,
    deleteTrip,
    getTripsForVehicle,
    stats,
    weeklySummaries,
    compliance,
    activeTracking,
    startTracking,
    stopTracking,
    isTracking: !!activeTracking?.isActive,
    trackingDuration,
    exportData,
    exportCSV,
    businessPurposes: BUSINESS_PURPOSES,
    minWeeks: MINIMUM_LOGBOOK_WEEKS,
  };
}
