export type UserRole = 'fleet_manager' | 'dispatcher' | 'safety_officer' | 'financial_analyst';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export type VehicleType = 'Truck' | 'Van' | 'Bus' | 'Trailer' | 'Electric';
export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';
export type VehicleRegion = 'North' | 'South' | 'East' | 'West' | 'Central';

export interface Vehicle {
  id: string;
  reg_number: string;
  model: string;
  type: VehicleType;
  max_capacity_kg: number;
  odometer_km: number;
  acquisition_cost: number;
  region: VehicleRegion;
  status: VehicleStatus;
  created_at?: string;
  updated_at?: string;
}

export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';
export type DriverLicenseCategory =
  | 'Class A - Heavy Articulated'
  | 'Class B - Heavy Rigid'
  | 'Class C - Commercial Van'
  | 'Class D - Multi-Passenger';

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  license_category: DriverLicenseCategory;
  license_expiry: string;
  contact_number: string;
  safety_score: number;
  status: DriverStatus;
  created_at?: string;
  updated_at?: string;
}

export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';

export interface Trip {
  id: string;
  trip_code: string;
  source: string;
  destination: string;
  planned_distance_km: number;
  cargo_weight_kg: number;
  vehicle_id: string;
  driver_id: string;
  planned_departure: string;
  actual_departure?: string | null;
  actual_distance_km?: number | null;
  fuel_consumed_litres?: number | null;
  revenue?: number | null;
  status: TripStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  vehicle?: Vehicle;
  driver?: Driver;
}

export type MaintenanceType =
  | 'Scheduled Service'
  | 'Engine Repair'
  | 'Brake Overhaul'
  | 'Inspection'
  | 'Tire Replacement'
  | 'Electrical System';

export type MaintenanceStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  description: string;
  cost: number;
  start_date: string;
  expected_completion: string;
  actual_completion?: string | null;
  status: MaintenanceStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  vehicle?: Vehicle;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  date: string;
  litres: number;
  price_per_litre: number;
  total_cost: number;
  odometer_reading: number;
  notes?: string | null;
  created_at?: string;
  vehicle?: Vehicle;
}

export type ExpenseCategory =
  | 'Tolls'
  | 'Maintenance'
  | 'Insurance'
  | 'Parking'
  | 'Permits'
  | 'Other';

export interface Expense {
  id: string;
  vehicle_id?: string | null;
  category: ExpenseCategory;
  date: string;
  amount: number;
  description: string;
  created_at?: string;
  vehicle?: Vehicle;
}

export interface SystemSettings {
  id: string;
  org_name: string;
  region_base: string;
  currency: string;
  units: 'metric' | 'imperial';
  license_warning_days: number;
  maintenance_interval_km: number;
  updated_at?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'danger' | 'success';
  link?: string;
  read: boolean;
  created_at: string;
}

export interface KPISummary {
  totalVehicles: number;
  availableVehicles: number;
  vehiclesOnTrip: number;
  vehiclesInMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
}
