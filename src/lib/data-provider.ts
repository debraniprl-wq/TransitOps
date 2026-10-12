'use client';

import {
  Vehicle,
  Driver,
  Trip,
  MaintenanceRecord,
  FuelLog,
  Expense,
  SystemSettings,
  AppNotification,
  KPISummary,
  Profile,
} from '@/types';
import {
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_TRIPS,
  INITIAL_MAINTENANCE,
  INITIAL_FUEL_LOGS,
  INITIAL_EXPENSES,
  INITIAL_NOTIFICATIONS,
  INITIAL_SETTINGS,
  INITIAL_PROFILES,
} from './seed-data';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  VEHICLES: 'transitops_vehicles_v2',
  DRIVERS: 'transitops_drivers_v2',
  TRIPS: 'transitops_trips_v2',
  MAINTENANCE: 'transitops_maintenance_v2',
  FUEL: 'transitops_fuel_v2',
  EXPENSES: 'transitops_expenses_v2',
  NOTIFICATIONS: 'transitops_notifications_v2',
  SETTINGS: 'transitops_settings_v2',
  PROFILES: 'transitops_profiles_v2',
};

// Safe LocalStorage helpers
function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

function writeStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

export class DataProvider {
  // Reset all data back to factory seed
  static resetToSeedData() {
    writeStorage(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
    writeStorage(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
    writeStorage(STORAGE_KEYS.TRIPS, INITIAL_TRIPS);
    writeStorage(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE);
    writeStorage(STORAGE_KEYS.FUEL, INITIAL_FUEL_LOGS);
    writeStorage(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    writeStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    writeStorage(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  }

  // ---------------------------------------------------------------------------
  // Vehicles
  // ---------------------------------------------------------------------------
  static async getVehicles(): Promise<Vehicle[]> {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data as Vehicle[];
      }
    }
    return readStorage<Vehicle[]>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
  }

  static async getVehicleById(id: string): Promise<Vehicle | null> {
    const vehicles = await this.getVehicles();
    return vehicles.find((v) => v.id === id) || null;
  }

  static async createVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: Vehicle; error?: string }> {
    const vehicles = await this.getVehicles();

    // Validate registration uniqueness
    const exists = vehicles.find((v) => v.reg_number.trim().toUpperCase() === vehicle.reg_number.trim().toUpperCase());
    if (exists) {
      return { success: false, error: `Vehicle with registration "${vehicle.reg_number}" already exists.` };
    }

    if (vehicle.max_capacity_kg <= 0) {
      return { success: false, error: 'Maximum load capacity must be greater than zero.' };
    }

    if (vehicle.odometer_km < 0) {
      return { success: false, error: 'Odometer cannot be negative.' };
    }

    const newVehicle: Vehicle = {
      ...vehicle,
      id: crypto.randomUUID(),
      reg_number: vehicle.reg_number.trim().toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('vehicles').insert(newVehicle);
      }
    }

    const updated = [newVehicle, ...vehicles];
    writeStorage(STORAGE_KEYS.VEHICLES, updated);

    await this.addNotification({
      title: 'Vehicle Added to Fleet',
      message: `${newVehicle.model} (${newVehicle.reg_number}) was enrolled into the ${newVehicle.region} fleet hub.`,
      type: 'info',
      link: '/vehicles',
    });

    return { success: true, data: newVehicle };
  }

  static async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<{ success: boolean; data?: Vehicle; error?: string }> {
    const vehicles = await this.getVehicles();
    const index = vehicles.findIndex((v) => v.id === id);
    if (index === -1) return { success: false, error: 'Vehicle not found' };

    // Check duplicate reg number if changing
    if (updates.reg_number) {
      const reg = updates.reg_number.trim().toUpperCase();
      const duplicate = vehicles.find((v) => v.id !== id && v.reg_number.toUpperCase() === reg);
      if (duplicate) {
        return { success: false, error: `Another vehicle with registration "${reg}" already exists.` };
      }
      updates.reg_number = reg;
    }

    const existing = vehicles[index];
    const updatedVehicle: Vehicle = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    vehicles[index] = updatedVehicle;

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('vehicles').update(updatedVehicle).eq('id', id);
      }
    }

    writeStorage(STORAGE_KEYS.VEHICLES, vehicles);
    return { success: true, data: updatedVehicle };
  }

  static async deleteVehicle(id: string): Promise<{ success: boolean; error?: string }> {
    const vehicles = await this.getVehicles();
    const target = vehicles.find((v) => v.id === id);
    if (!target) return { success: false, error: 'Vehicle not found' };

    // Check if vehicle has active trips
    const trips = await this.getTrips();
    const activeTrip = trips.find((t) => t.vehicle_id === id && (t.status === 'Dispatched' || t.status === 'Draft'));
    if (activeTrip) {
      return {
        success: false,
        error: `Cannot delete vehicle: It is currently assigned to trip ${activeTrip.trip_code} (${activeTrip.status}). Complete or cancel the trip first, or change status to 'Retired'.`,
      };
    }

    // Check if vehicle is in maintenance
    const maintenance = await this.getMaintenanceRecords();
    const activeMaintenance = maintenance.find((m) => m.vehicle_id === id && (m.status === 'In Progress' || m.status === 'Scheduled'));
    if (activeMaintenance) {
      return {
        success: false,
        error: `Cannot delete vehicle: Active maintenance (${activeMaintenance.maintenance_type}) is scheduled/in progress. Retire vehicle instead.`,
      };
    }

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('vehicles').delete().eq('id', id);
      }
    }

    const updated = vehicles.filter((v) => v.id !== id);
    writeStorage(STORAGE_KEYS.VEHICLES, updated);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Drivers
  // ---------------------------------------------------------------------------
  static async getDrivers(): Promise<Driver[]> {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('drivers').select('*').order('name');
        if (!error && data && data.length > 0) return data as Driver[];
      }
    }
    return readStorage<Driver[]>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
  }

  static async createDriver(driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: Driver; error?: string }> {
    const drivers = await this.getDrivers();

    const exists = drivers.find((d) => d.license_number.trim().toUpperCase() === driver.license_number.trim().toUpperCase());
    if (exists) {
      return { success: false, error: `Driver with license number "${driver.license_number}" already exists.` };
    }

    if (driver.safety_score < 0 || driver.safety_score > 100) {
      return { success: false, error: 'Safety score must be between 0 and 100.' };
    }

    const newDriver: Driver = {
      ...driver,
      id: crypto.randomUUID(),
      license_number: driver.license_number.trim().toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('drivers').insert(newDriver);
      }
    }

    const updated = [newDriver, ...drivers];
    writeStorage(STORAGE_KEYS.DRIVERS, updated);
    return { success: true, data: newDriver };
  }

  static async updateDriver(id: string, updates: Partial<Driver>): Promise<{ success: boolean; data?: Driver; error?: string }> {
    const drivers = await this.getDrivers();
    const index = drivers.findIndex((d) => d.id === id);
    if (index === -1) return { success: false, error: 'Driver not found' };

    if (updates.license_number) {
      const lic = updates.license_number.trim().toUpperCase();
      const duplicate = drivers.find((d) => d.id !== id && d.license_number.toUpperCase() === lic);
      if (duplicate) {
        return { success: false, error: `Another driver with license "${lic}" already exists.` };
      }
      updates.license_number = lic;
    }

    if (updates.safety_score !== undefined && (updates.safety_score < 0 || updates.safety_score > 100)) {
      return { success: false, error: 'Safety score must be between 0 and 100.' };
    }

    const updatedDriver: Driver = {
      ...drivers[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    drivers[index] = updatedDriver;

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('drivers').update(updatedDriver).eq('id', id);
      }
    }

    writeStorage(STORAGE_KEYS.DRIVERS, drivers);
    return { success: true, data: updatedDriver };
  }

  static async deleteDriver(id: string): Promise<{ success: boolean; error?: string }> {
    const drivers = await this.getDrivers();
    const target = drivers.find((d) => d.id === id);
    if (!target) return { success: false, error: 'Driver not found' };

    const trips = await this.getTrips();
    const activeTrip = trips.find((t) => t.driver_id === id && (t.status === 'Dispatched' || t.status === 'Draft'));
    if (activeTrip) {
      return {
        success: false,
        error: `Cannot delete driver: Currently assigned to trip ${activeTrip.trip_code} (${activeTrip.status}). Change status to 'Suspended' or 'Off Duty' instead.`,
      };
    }

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('drivers').delete().eq('id', id);
      }
    }

    const updated = drivers.filter((d) => d.id !== id);
    writeStorage(STORAGE_KEYS.DRIVERS, updated);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Trips & Dispatch Lifecycle
  // ---------------------------------------------------------------------------
  static async getTrips(): Promise<Trip[]> {
    let trips: Trip[] = [];
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) trips = data as Trip[];
      }
    }
    if (trips.length === 0) {
      trips = readStorage<Trip[]>(STORAGE_KEYS.TRIPS, INITIAL_TRIPS);
    }

    // Hydrate vehicles and drivers
    const vehicles = await this.getVehicles();
    const drivers = await this.getDrivers();

    return trips.map((trip) => ({
      ...trip,
      vehicle: vehicles.find((v) => v.id === trip.vehicle_id),
      driver: drivers.find((d) => d.id === trip.driver_id),
    }));
  }

  static async createTrip(tripData: {
    source: string;
    destination: string;
    planned_distance_km: number;
    cargo_weight_kg: number;
    vehicle_id: string;
    driver_id: string;
    planned_departure: string;
    notes?: string;
  }): Promise<{ success: boolean; data?: Trip; error?: string }> {
    const vehicles = await this.getVehicles();
    const vehicle = vehicles.find((v) => v.id === tripData.vehicle_id);
    if (!vehicle) return { success: false, error: 'Assigned vehicle not found.' };

    if (vehicle.status === 'Retired') {
      return { success: false, error: 'Cannot assign a retired vehicle.' };
    }
    if (vehicle.status === 'In Shop') {
      return { success: false, error: 'Cannot assign a vehicle that is currently In Shop for maintenance.' };
    }
    if (vehicle.status === 'On Trip') {
      return { success: false, error: 'Cannot assign vehicle: It is already deployed On Trip.' };
    }

    if (tripData.cargo_weight_kg > vehicle.max_capacity_kg) {
      return {
        success: false,
        error: `Cargo weight (${tripData.cargo_weight_kg.toLocaleString()} kg) exceeds vehicle max payload capacity (${vehicle.max_capacity_kg.toLocaleString()} kg).`,
      };
    }

    const drivers = await this.getDrivers();
    const driver = drivers.find((d) => d.id === tripData.driver_id);
    if (!driver) return { success: false, error: 'Assigned driver not found.' };

    if (driver.status === 'Suspended') {
      return { success: false, error: 'Cannot assign driver: Driver is Suspended due to safety/policy violation.' };
    }
    if (driver.status === 'On Trip') {
      return { success: false, error: 'Cannot assign driver: Driver is already actively On Trip.' };
    }

    const expiryDate = new Date(driver.license_expiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiryDate < today) {
      return {
        success: false,
        error: `Cannot assign driver: Driver commercial license expired on ${driver.license_expiry}.`,
      };
    }

    const trips = await this.getTrips();
    const tripCode = `TRP-${1040 + trips.length + 1}`;

    const newTrip: Trip = {
      id: crypto.randomUUID(),
      trip_code: tripCode,
      source: tripData.source.trim(),
      destination: tripData.destination.trim(),
      planned_distance_km: Number(tripData.planned_distance_km),
      cargo_weight_kg: Number(tripData.cargo_weight_kg),
      vehicle_id: tripData.vehicle_id,
      driver_id: tripData.driver_id,
      planned_departure: tripData.planned_departure,
      status: 'Draft',
      notes: tripData.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('trips').insert(newTrip);
      }
    }

    const updatedTrips = [newTrip, ...trips];
    writeStorage(STORAGE_KEYS.TRIPS, updatedTrips);

    return { success: true, data: newTrip };
  }

  // ATOMIC DISPATCH
  static async dispatchTrip(tripId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const trips = await this.getTrips();
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return { success: false, error: 'Trip not found.' };

    if (trip.status !== 'Draft') {
      return { success: false, error: `Only Draft trips can be dispatched. Current status is ${trip.status}.` };
    }

    const vehicles = await this.getVehicles();
    const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
    if (!vehicle) return { success: false, error: 'Vehicle associated with trip does not exist.' };

    if (vehicle.status !== 'Available') {
      return {
        success: false,
        error: `Vehicle ${vehicle.reg_number} is not eligible for dispatch. Current vehicle status: "${vehicle.status}".`,
      };
    }

    if (trip.cargo_weight_kg > vehicle.max_capacity_kg) {
      return {
        success: false,
        error: `Cargo weight (${trip.cargo_weight_kg} kg) exceeds vehicle max capacity (${vehicle.max_capacity_kg} kg).`,
      };
    }

    const drivers = await this.getDrivers();
    const driver = drivers.find((d) => d.id === trip.driver_id);
    if (!driver) return { success: false, error: 'Driver associated with trip does not exist.' };

    if (driver.status !== 'Available') {
      return {
        success: false,
        error: `Driver ${driver.name} is not eligible for dispatch. Current driver status: "${driver.status}".`,
      };
    }

    const expiryDate = new Date(driver.license_expiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiryDate < today) {
      return {
        success: false,
        error: `Driver ${driver.name} has an expired license (${driver.license_expiry}). Dispatch rejected.`,
      };
    }

    // Execute atomic transition
    await this.updateVehicle(vehicle.id, { status: 'On Trip' });
    await this.updateDriver(driver.id, { status: 'On Trip' });

    const tripIndex = trips.findIndex((t) => t.id === tripId);
    const now = new Date().toISOString();
    trips[tripIndex] = {
      ...trip,
      status: 'Dispatched',
      actual_departure: now,
      updated_at: now,
    };
    writeStorage(STORAGE_KEYS.TRIPS, trips);

    await this.addNotification({
      title: 'Trip Dispatched',
      message: `${trip.trip_code} departed ${trip.source} heading to ${trip.destination} (Driver: ${driver.name}, Vehicle: ${vehicle.reg_number}).`,
      type: 'info',
      link: '/trips',
    });

    return { success: true, message: `Trip ${trip.trip_code} successfully dispatched.` };
  }

  // ATOMIC COMPLETE
  static async completeTrip(
    tripId: string,
    data: { actual_distance_km: number; fuel_consumed_litres: number; revenue: number }
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const trips = await this.getTrips();
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return { success: false, error: 'Trip not found.' };

    if (trip.status !== 'Dispatched') {
      return { success: false, error: `Only Dispatched trips can be completed. Current status: ${trip.status}.` };
    }

    // Release vehicle and increment odometer
    const vehicles = await this.getVehicles();
    const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
    if (vehicle) {
      const newOdometer = vehicle.odometer_km + (data.actual_distance_km > 0 ? data.actual_distance_km : 0);
      await this.updateVehicle(vehicle.id, {
        status: 'Available',
        odometer_km: newOdometer,
      });

      // Also create an automatic fuel log entry if fuel was consumed
      if (data.fuel_consumed_litres > 0) {
        await this.createFuelLog({
          vehicle_id: vehicle.id,
          date: new Date().toISOString().split('T')[0],
          litres: data.fuel_consumed_litres,
          price_per_litre: 1.25,
          odometer_reading: newOdometer,
          notes: `Telemetry fuel log recorded upon completion of trip ${trip.trip_code}`,
        });
      }
    }

    // Release driver
    const drivers = await this.getDrivers();
    const driver = drivers.find((d) => d.id === trip.driver_id);
    if (driver) {
      await this.updateDriver(driver.id, { status: 'Available' });
    }

    const tripIndex = trips.findIndex((t) => t.id === tripId);
    trips[tripIndex] = {
      ...trip,
      status: 'Completed',
      actual_distance_km: Number(data.actual_distance_km),
      fuel_consumed_litres: Number(data.fuel_consumed_litres),
      revenue: Number(data.revenue),
      updated_at: new Date().toISOString(),
    };
    writeStorage(STORAGE_KEYS.TRIPS, trips);

    await this.addNotification({
      title: 'Trip Completed',
      message: `${trip.trip_code} arrived at destination ${trip.destination}. ${data.actual_distance_km} km logged, revenue $${data.revenue}.`,
      type: 'success',
      link: '/trips',
    });

    return { success: true, message: `Trip ${trip.trip_code} successfully completed.` };
  }

  // ATOMIC CANCEL
  static async cancelTrip(tripId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const trips = await this.getTrips();
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return { success: false, error: 'Trip not found.' };

    if (trip.status === 'Completed') {
      return { success: false, error: 'Cannot cancel an already completed trip.' };
    }

    // If it was already dispatched, release resources back to Available
    if (trip.status === 'Dispatched') {
      const vehicles = await this.getVehicles();
      const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
      if (vehicle && vehicle.status === 'On Trip') {
        await this.updateVehicle(vehicle.id, { status: 'Available' });
      }

      const drivers = await this.getDrivers();
      const driver = drivers.find((d) => d.id === trip.driver_id);
      if (driver && driver.status === 'On Trip') {
        await this.updateDriver(driver.id, { status: 'Available' });
      }
    }

    const tripIndex = trips.findIndex((t) => t.id === tripId);
    trips[tripIndex] = {
      ...trip,
      status: 'Cancelled',
      updated_at: new Date().toISOString(),
    };
    writeStorage(STORAGE_KEYS.TRIPS, trips);

    await this.addNotification({
      title: 'Trip Cancelled',
      message: `Trip ${trip.trip_code} has been cancelled and assigned resources have been restored to available status.`,
      type: 'warning',
      link: '/trips',
    });

    return { success: true, message: `Trip ${trip.trip_code} cancelled.` };
  }

  // ---------------------------------------------------------------------------
  // Maintenance Management
  // ---------------------------------------------------------------------------
  static async getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    let records: MaintenanceRecord[] = [];
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('maintenance_records').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) records = data as MaintenanceRecord[];
      }
    }
    if (records.length === 0) {
      records = readStorage<MaintenanceRecord[]>(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE);
    }

    const vehicles = await this.getVehicles();
    return records.map((m) => ({
      ...m,
      vehicle: vehicles.find((v) => v.id === m.vehicle_id),
    }));
  }

  static async createMaintenanceRecord(data: Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: MaintenanceRecord; error?: string }> {
    const vehicles = await this.getVehicles();
    const vehicle = vehicles.find((v) => v.id === data.vehicle_id);
    if (!vehicle) return { success: false, error: 'Vehicle not found.' };

    if (vehicle.status === 'On Trip') {
      return { success: false, error: 'Cannot schedule immediate maintenance: Vehicle is currently active On Trip.' };
    }

    const newRecord: MaintenanceRecord = {
      ...data,
      id: crypto.randomUUID(),
      cost: Number(data.cost) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // If starting in progress, set vehicle to In Shop
    if (data.status === 'In Progress') {
      await this.updateVehicle(vehicle.id, { status: 'In Shop' });
    }

    const existing = await this.getMaintenanceRecords();
    const updated = [newRecord, ...existing];
    writeStorage(STORAGE_KEYS.MAINTENANCE, updated);

    await this.addNotification({
      title: 'Maintenance Logged',
      message: `${data.maintenance_type} recorded for ${vehicle.reg_number} ($${data.cost}). Status: ${data.status}.`,
      type: 'warning',
      link: '/maintenance',
    });

    return { success: true, data: newRecord };
  }

  static async updateMaintenanceStatus(
    id: string,
    status: MaintenanceRecord['status'],
    options?: { actual_completion?: string; notes?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const records = await this.getMaintenanceRecords();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return { success: false, error: 'Record not found' };

    const record = records[index];
    const vehicles = await this.getVehicles();
    const vehicle = vehicles.find((v) => v.id === record.vehicle_id);

    if (status === 'In Progress' && vehicle) {
      if (vehicle.status === 'On Trip') {
        return { success: false, error: 'Vehicle is currently On Trip and cannot enter workshop right now.' };
      }
      await this.updateVehicle(vehicle.id, { status: 'In Shop' });
    } else if (status === 'Completed' && vehicle) {
      if (vehicle.status !== 'Retired') {
        await this.updateVehicle(vehicle.id, { status: 'Available' });
      }
    }

    records[index] = {
      ...record,
      status,
      actual_completion: status === 'Completed' ? (options?.actual_completion || new Date().toISOString().split('T')[0]) : record.actual_completion,
      notes: options?.notes ? `${record.notes || ''}\n${options.notes}`.trim() : record.notes,
      updated_at: new Date().toISOString(),
    };

    writeStorage(STORAGE_KEYS.MAINTENANCE, records);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Fuel Logs & Expenses
  // ---------------------------------------------------------------------------
  static async getFuelLogs(): Promise<FuelLog[]> {
    let logs: FuelLog[] = [];
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('fuel_logs').select('*').order('date', { ascending: false });
        if (!error && data && data.length > 0) logs = data as FuelLog[];
      }
    }
    if (logs.length === 0) {
      logs = readStorage<FuelLog[]>(STORAGE_KEYS.FUEL, INITIAL_FUEL_LOGS);
    }

    const vehicles = await this.getVehicles();
    return logs.map((l) => ({
      ...l,
      vehicle: vehicles.find((v) => v.id === l.vehicle_id),
    }));
  }

  static async createFuelLog(data: {
    vehicle_id: string;
    date: string;
    litres: number;
    price_per_litre: number;
    odometer_reading: number;
    notes?: string;
  }): Promise<{ success: boolean; data?: FuelLog; error?: string }> {
    if (data.litres <= 0) return { success: false, error: 'Fuel litres must be greater than zero.' };
    if (data.price_per_litre <= 0) return { success: false, error: 'Price per litre must be greater than zero.' };

    const totalCost = Number((data.litres * data.price_per_litre).toFixed(2));
    const newLog: FuelLog = {
      id: crypto.randomUUID(),
      vehicle_id: data.vehicle_id,
      date: data.date,
      litres: Number(data.litres),
      price_per_litre: Number(data.price_per_litre),
      total_cost: totalCost,
      odometer_reading: Number(data.odometer_reading),
      notes: data.notes || null,
      created_at: new Date().toISOString(),
    };

    // Update vehicle odometer if higher
    const vehicles = await this.getVehicles();
    const vehicle = vehicles.find((v) => v.id === data.vehicle_id);
    if (vehicle && data.odometer_reading > vehicle.odometer_km) {
      await this.updateVehicle(vehicle.id, { odometer_km: data.odometer_reading });
    }

    const existing = await this.getFuelLogs();
    const updated = [newLog, ...existing];
    writeStorage(STORAGE_KEYS.FUEL, updated);

    return { success: true, data: newLog };
  }

  static async getExpenses(): Promise<Expense[]> {
    let list: Expense[] = [];
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
        if (!error && data && data.length > 0) list = data as Expense[];
      }
    }
    if (list.length === 0) {
      list = readStorage<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    }

    const vehicles = await this.getVehicles();
    return list.map((e) => ({
      ...e,
      vehicle: e.vehicle_id ? vehicles.find((v) => v.id === e.vehicle_id) : undefined,
    }));
  }

  static async createExpense(data: {
    category: Expense['category'];
    date: string;
    amount: number;
    description: string;
    vehicle_id?: string | null;
  }): Promise<{ success: boolean; data?: Expense; error?: string }> {
    if (data.amount <= 0) return { success: false, error: 'Expense amount must be greater than zero.' };
    if (!data.description.trim()) return { success: false, error: 'Description is required.' };

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      category: data.category,
      date: data.date,
      amount: Number(data.amount),
      description: data.description.trim(),
      vehicle_id: data.vehicle_id || null,
      created_at: new Date().toISOString(),
    };

    const existing = await this.getExpenses();
    const updated = [newExpense, ...existing];
    writeStorage(STORAGE_KEYS.EXPENSES, updated);

    return { success: true, data: newExpense };
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  static async getNotifications(): Promise<AppNotification[]> {
    return readStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  static async markNotificationRead(id: string): Promise<void> {
    const list = await this.getNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
  }

  static async markAllNotificationsRead(): Promise<void> {
    const list = await this.getNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
  }

  static async addNotification(notif: Omit<AppNotification, 'id' | 'read' | 'created_at'>): Promise<void> {
    const list = await this.getNotifications();
    const item: AppNotification = {
      ...notif,
      id: crypto.randomUUID(),
      read: false,
      created_at: new Date().toISOString(),
    };
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, [item, ...list]);
  }

  // ---------------------------------------------------------------------------
  // Settings & Profiles
  // ---------------------------------------------------------------------------
  static async getSettings(): Promise<SystemSettings> {
    return readStorage<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  static async updateSettings(updates: Partial<SystemSettings>): Promise<{ success: boolean; data?: SystemSettings }> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    writeStorage(STORAGE_KEYS.SETTINGS, updated);
    return { success: true, data: updated };
  }

  static async getProfiles(): Promise<Profile[]> {
    return readStorage<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  }

  static async updateProfileRole(id: string, role: Profile['role']): Promise<void> {
    const profiles = await this.getProfiles();
    const updated = profiles.map((p) => (p.id === id ? { ...p, role, updated_at: new Date().toISOString() } : p));
    writeStorage(STORAGE_KEYS.PROFILES, updated);
  }

  // ---------------------------------------------------------------------------
  // Dashboard & Analytics KPI Calculations
  // ---------------------------------------------------------------------------
  static async getKPISummary(): Promise<KPISummary> {
    const vehicles = await this.getVehicles();
    const drivers = await this.getDrivers();
    const trips = await this.getTrips();

    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter((v) => v.status === 'Available').length;
    const vehiclesOnTrip = vehicles.filter((v) => v.status === 'On Trip').length;
    const vehiclesInMaintenance = vehicles.filter((v) => v.status === 'In Shop').length;
    const activeTrips = trips.filter((t) => t.status === 'Dispatched').length;
    const pendingTrips = trips.filter((t) => t.status === 'Draft').length;
    const driversOnDuty = drivers.filter((d) => d.status === 'Available' || d.status === 'On Trip').length;

    // Fleet utilization = active vehicles on trip / non-retired vehicles * 100
    const activeFleetCount = vehicles.filter((v) => v.status !== 'Retired').length;
    const fleetUtilization = activeFleetCount > 0 ? Number(((vehiclesOnTrip / activeFleetCount) * 100).toFixed(1)) : 0;

    return {
      totalVehicles,
      availableVehicles,
      vehiclesOnTrip,
      vehiclesInMaintenance,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilization,
    };
  }

  // ---------------------------------------------------------------------------
  // Global Search across Vehicles, Drivers, Trips
  // ---------------------------------------------------------------------------
  static async globalSearch(query: string): Promise<{
    vehicles: Vehicle[];
    drivers: Driver[];
    trips: Trip[];
  }> {
    const q = query.trim().toLowerCase();
    if (!q) return { vehicles: [], drivers: [], trips: [] };

    const [vehicles, drivers, trips] = await Promise.all([
      this.getVehicles(),
      this.getDrivers(),
      this.getTrips(),
    ]);

    const filteredVehicles = vehicles.filter(
      (v) =>
        v.reg_number.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q)
    );

    const filteredDrivers = drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q) ||
        d.contact_number.includes(q)
    );

    const filteredTrips = trips.filter(
      (t) =>
        t.trip_code.toLowerCase().includes(q) ||
        t.source.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q)
    );

    return {
      vehicles: filteredVehicles,
      drivers: filteredDrivers,
      trips: filteredTrips,
    };
  }
}
