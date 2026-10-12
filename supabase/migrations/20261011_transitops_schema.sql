-- =============================================================================
-- TransitOps — Smart Transport Operations Platform
-- Full PostgreSQL Schema Migration
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Profiles & Roles Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Vehicles Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reg_number TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Truck', 'Van', 'Bus', 'Trailer', 'Electric')),
    max_capacity_kg NUMERIC NOT NULL CHECK (max_capacity_kg > 0),
    odometer_km NUMERIC NOT NULL DEFAULT 0 CHECK (odometer_km >= 0),
    acquisition_cost NUMERIC NOT NULL DEFAULT 0 CHECK (acquisition_cost >= 0),
    region TEXT NOT NULL CHECK (region IN ('North', 'South', 'East', 'West', 'Central')),
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles (status);
CREATE INDEX IF NOT EXISTS idx_vehicles_region ON public.vehicles (region);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles (type);

-- -----------------------------------------------------------------------------
-- 3. Drivers Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    license_category TEXT NOT NULL CHECK (license_category IN ('Class A - Heavy Articulated', 'Class B - Heavy Rigid', 'Class C - Commercial Van', 'Class D - Multi-Passenger')),
    license_expiry DATE NOT NULL,
    contact_number TEXT NOT NULL,
    safety_score NUMERIC NOT NULL DEFAULT 95.0 CHECK (safety_score >= 0 AND safety_score <= 100),
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers (status);
CREATE INDEX IF NOT EXISTS idx_drivers_license_expiry ON public.drivers (license_expiry);

-- -----------------------------------------------------------------------------
-- 4. Trips & Dispatch Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_code TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    planned_distance_km NUMERIC NOT NULL CHECK (planned_distance_km > 0),
    cargo_weight_kg NUMERIC NOT NULL CHECK (cargo_weight_kg > 0),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles (id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES public.drivers (id) ON DELETE RESTRICT,
    planned_departure TIMESTAMPTZ NOT NULL,
    actual_departure TIMESTAMPTZ,
    actual_distance_km NUMERIC DEFAULT NULL CHECK (actual_distance_km IS NULL OR actual_distance_km >= 0),
    fuel_consumed_litres NUMERIC DEFAULT NULL CHECK (fuel_consumed_litres IS NULL OR fuel_consumed_litres >= 0),
    revenue NUMERIC DEFAULT NULL CHECK (revenue IS NULL OR revenue >= 0),
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.trips (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.trips (driver_id);

-- -----------------------------------------------------------------------------
-- 5. Maintenance Records Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles (id) ON DELETE RESTRICT,
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('Scheduled Service', 'Engine Repair', 'Brake Overhaul', 'Inspection', 'Tire Replacement', 'Electrical System')),
    description TEXT NOT NULL,
    cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
    start_date DATE NOT NULL,
    expected_completion DATE NOT NULL,
    actual_completion DATE DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON public.maintenance_records (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_records (status);

-- -----------------------------------------------------------------------------
-- 6. Fuel Logs Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles (id) ON DELETE CASCADE,
    date DATE NOT NULL,
    litres NUMERIC NOT NULL CHECK (litres > 0),
    price_per_litre NUMERIC NOT NULL CHECK (price_per_litre > 0),
    total_cost NUMERIC NOT NULL CHECK (total_cost >= 0),
    odometer_reading NUMERIC NOT NULL CHECK (odometer_reading >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_id ON public.fuel_logs (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_date ON public.fuel_logs (date);

-- -----------------------------------------------------------------------------
-- 7. Operational Expenses Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES public.vehicles (id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('Tolls', 'Maintenance', 'Insurance', 'Parking', 'Permits', 'Other')),
    date DATE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON public.expenses (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (date);

-- -----------------------------------------------------------------------------
-- 8. System Settings Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_name TEXT NOT NULL DEFAULT 'TransitOps Logistics Network',
    region_base TEXT NOT NULL DEFAULT 'North American Central Hub',
    currency TEXT NOT NULL DEFAULT 'USD',
    units TEXT NOT NULL DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),
    license_warning_days INTEGER NOT NULL DEFAULT 30,
    maintenance_interval_km INTEGER NOT NULL DEFAULT 5000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. Notification Center Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('warning', 'info', 'danger', 'success')),
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DATABASE FUNCTIONS & RPC WORKFLOWS (ACID TRANSACTIONS)
-- =============================================================================

-- Function: Dispatch Trip (Atomic validation & status transition)
CREATE OR REPLACE FUNCTION public.dispatch_trip(trip_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_trip RECORD;
    v_vehicle RECORD;
    v_driver RECORD;
BEGIN
    -- 1. Fetch trip
    SELECT * INTO v_trip FROM public.trips WHERE id = trip_id_param;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
    END IF;

    IF v_trip.status != 'Draft' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only Draft trips can be dispatched. Current status: ' || v_trip.status);
    END IF;

    -- 2. Lock and validate Vehicle
    SELECT * INTO v_vehicle FROM public.vehicles WHERE id = v_trip.vehicle_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Assigned vehicle does not exist');
    END IF;

    IF v_vehicle.status = 'Retired' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot dispatch: Vehicle is Retired');
    END IF;

    IF v_vehicle.status = 'In Shop' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot dispatch: Vehicle is currently In Shop for maintenance');
    END IF;

    IF v_vehicle.status = 'On Trip' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot dispatch: Vehicle is already active On Trip');
    END IF;

    IF v_trip.cargo_weight_kg > v_vehicle.max_capacity_kg THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cargo weight (' || v_trip.cargo_weight_kg || ' kg) exceeds vehicle max capacity (' || v_vehicle.max_capacity_kg || ' kg)');
    END IF;

    -- 3. Lock and validate Driver
    SELECT * INTO v_driver FROM public.drivers WHERE id = v_trip.driver_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Assigned driver does not exist');
    END IF;

    IF v_driver.status = 'Suspended' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot dispatch: Driver is currently Suspended');
    END IF;

    IF v_driver.status = 'Off Duty' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot dispatch: Driver is currently Off Duty');
    END IF;

    IF v_driver.status = 'On Trip' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot dispatch: Driver is already assigned to an active trip');
    END IF;

    IF v_driver.license_expiry < CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot dispatch: Driver license expired on ' || v_driver.license_expiry);
    END IF;

    -- 4. Apply atomic updates
    UPDATE public.trips 
    SET status = 'Dispatched', 
        actual_departure = NOW(), 
        updated_at = NOW() 
    WHERE id = trip_id_param;

    UPDATE public.vehicles 
    SET status = 'On Trip', 
        updated_at = NOW() 
    WHERE id = v_trip.vehicle_id;

    UPDATE public.drivers 
    SET status = 'On Trip', 
        updated_at = NOW() 
    WHERE id = v_trip.driver_id;

    RETURN jsonb_build_object('success', true, 'message', 'Trip ' || v_trip.trip_code || ' successfully dispatched');
END;
$$;

-- Function: Complete Trip (Records telemetry and releases resources)
CREATE OR REPLACE FUNCTION public.complete_trip(
    trip_id_param UUID, 
    actual_dist_param NUMERIC, 
    fuel_used_param NUMERIC, 
    revenue_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_trip RECORD;
BEGIN
    SELECT * INTO v_trip FROM public.trips WHERE id = trip_id_param;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
    END IF;

    IF v_trip.status != 'Dispatched' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only Dispatched trips can be completed. Current status: ' || v_trip.status);
    END IF;

    -- Update Trip
    UPDATE public.trips 
    SET status = 'Completed',
        actual_distance_km = actual_dist_param,
        fuel_consumed_litres = fuel_used_param,
        revenue = revenue_param,
        updated_at = NOW()
    WHERE id = trip_id_param;

    -- Release Vehicle and update Odometer
    UPDATE public.vehicles 
    SET status = 'Available',
        odometer_km = odometer_km + COALESCE(actual_dist_param, 0),
        updated_at = NOW()
    WHERE id = v_trip.vehicle_id;

    -- Release Driver
    UPDATE public.drivers 
    SET status = 'Available',
        updated_at = NOW()
    WHERE id = v_trip.driver_id;

    RETURN jsonb_build_object('success', true, 'message', 'Trip ' || v_trip.trip_code || ' marked as Completed');
END;
$$;

-- Function: Cancel Trip (Restores resources if trip was active)
CREATE OR REPLACE FUNCTION public.cancel_trip(trip_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_trip RECORD;
BEGIN
    SELECT * INTO v_trip FROM public.trips WHERE id = trip_id_param;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
    END IF;

    IF v_trip.status = 'Completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel an already completed trip');
    END IF;

    IF v_trip.status = 'Dispatched' THEN
        -- Only restore to Available if they were On Trip
        UPDATE public.vehicles SET status = 'Available', updated_at = NOW() WHERE id = v_trip.vehicle_id AND status = 'On Trip';
        UPDATE public.drivers SET status = 'Available', updated_at = NOW() WHERE id = v_trip.driver_id AND status = 'On Trip';
    END IF;

    UPDATE public.trips SET status = 'Cancelled', updated_at = NOW() WHERE id = trip_id_param;

    RETURN jsonb_build_object('success', true, 'message', 'Trip ' || v_trip.trip_code || ' cancelled');
END;
$$;

-- Function: Start Maintenance (Transitions vehicle to In Shop)
CREATE OR REPLACE FUNCTION public.start_maintenance(record_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec RECORD;
    v_veh RECORD;
BEGIN
    SELECT * INTO v_rec FROM public.maintenance_records WHERE id = record_id_param;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maintenance record not found');
    END IF;

    SELECT * INTO v_veh FROM public.vehicles WHERE id = v_rec.vehicle_id;
    IF v_veh.status = 'On Trip' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot put vehicle into maintenance: vehicle is currently active On Trip');
    END IF;

    UPDATE public.maintenance_records SET status = 'In Progress', updated_at = NOW() WHERE id = record_id_param;
    UPDATE public.vehicles SET status = 'In Shop', updated_at = NOW() WHERE id = v_rec.vehicle_id;

    RETURN jsonb_build_object('success', true, 'message', 'Maintenance marked In Progress. Vehicle status set to In Shop');
END;
$$;

-- Function: Complete Maintenance (Restores vehicle to Available)
CREATE OR REPLACE FUNCTION public.complete_maintenance(record_id_param UUID, actual_date DATE, notes_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec RECORD;
    v_veh RECORD;
BEGIN
    SELECT * INTO v_rec FROM public.maintenance_records WHERE id = record_id_param;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maintenance record not found');
    END IF;

    UPDATE public.maintenance_records 
    SET status = 'Completed', 
        actual_completion = COALESCE(actual_date, CURRENT_DATE),
        notes = COALESCE(notes_param, notes),
        updated_at = NOW() 
    WHERE id = record_id_param;

    -- Only restore to Available if not Retired
    UPDATE public.vehicles 
    SET status = 'Available', 
        updated_at = NOW() 
    WHERE id = v_rec.vehicle_id AND status != 'Retired';

    RETURN jsonb_build_object('success', true, 'message', 'Maintenance completed and vehicle returned to service');
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all operational data
CREATE POLICY "Allow authenticated read on vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on drivers" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on trips" ON public.trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on maintenance" ON public.maintenance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on fuel_logs" ON public.fuel_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on system_settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on notifications" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Allow modifications based on roles
CREATE POLICY "Allow fleet manager all on vehicles" ON public.vehicles FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('fleet_manager')));

CREATE POLICY "Allow fleet & dispatcher on trips" ON public.trips FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('fleet_manager', 'dispatcher')));

CREATE POLICY "Allow safety officer & fleet manager on drivers" ON public.drivers FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('fleet_manager', 'safety_officer')));

CREATE POLICY "Allow fleet manager on maintenance" ON public.maintenance_records FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('fleet_manager', 'safety_officer')));

CREATE POLICY "Allow financial analyst & fleet on expenses" ON public.expenses FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('fleet_manager', 'financial_analyst')));

CREATE POLICY "Allow financial analyst & fleet on fuel" ON public.fuel_logs FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('fleet_manager', 'financial_analyst', 'dispatcher')));
