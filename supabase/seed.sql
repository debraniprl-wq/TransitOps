-- =============================================================================
-- TransitOps — Seed Data
-- =============================================================================

-- Clear existing data
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.expenses CASCADE;
TRUNCATE TABLE public.fuel_logs CASCADE;
TRUNCATE TABLE public.maintenance_records CASCADE;
TRUNCATE TABLE public.trips CASCADE;
TRUNCATE TABLE public.drivers CASCADE;
TRUNCATE TABLE public.vehicles CASCADE;
TRUNCATE TABLE public.system_settings CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- 1. Profiles
INSERT INTO public.profiles (id, email, full_name, role) VALUES
('00000000-0000-0000-0000-000000000001', 'manager@transitops.io', 'Marcus Vance', 'fleet_manager'),
('00000000-0000-0000-0000-000000000002', 'dispatch@transitops.io', 'Elena Rostova', 'dispatcher'),
('00000000-0000-0000-0000-000000000003', 'safety@transitops.io', 'David Chen', 'safety_officer'),
('00000000-0000-0000-0000-000000000004', 'finance@transitops.io', 'Sophia Al-Mansoor', 'financial_analyst');

-- 2. System Settings
INSERT INTO public.system_settings (id, org_name, region_base, currency, units, license_warning_days, maintenance_interval_km) VALUES
('11111111-1111-1111-1111-111111111111', 'TransitOps Logistics Network', 'North American Central Hub', 'USD', 'metric', 30, 5000);

-- 3. Vehicles
INSERT INTO public.vehicles (id, reg_number, model, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES
('22222222-2222-2222-2222-000000000001', 'FL-8921-TX', 'Volvo FH16 750 Globetrotter', 'Truck', 28000, 142500, 165000, 'North', 'On Trip'),
('22222222-2222-2222-2222-000000000002', 'FL-4309-CA', 'Freightliner Cascadia 126', 'Truck', 26500, 98200, 152000, 'West', 'Available'),
('22222222-2222-2222-2222-000000000003', 'FL-7110-IL', 'Scania R500 V8 Streamline', 'Truck', 27000, 215400, 158000, 'Central', 'In Shop'),
('22222222-2222-2222-2222-000000000004', 'VN-5512-NY', 'Mercedes-Benz Sprinter 519 CDI', 'Van', 4500, 64200, 68000, 'East', 'Available'),
('22222222-2222-2222-2222-000000000005', 'VN-3381-GA', 'Ford Transit 350 HD Cargo', 'Van', 4200, 89100, 54000, 'South', 'On Trip'),
('22222222-2222-2222-2222-000000000006', 'EV-1092-WA', 'Tesla Semi Long Haul', 'Electric', 22000, 31400, 195000, 'West', 'Available'),
('22222222-2222-2222-2222-000000000007', 'TR-9901-OH', 'Krone Cool Liner Reefer', 'Trailer', 32000, 184000, 82000, 'Central', 'Available'),
('22222222-2222-2222-2222-000000000008', 'BS-6420-FL', 'MAN Lion''s Coach L', 'Bus', 14000, 112000, 210000, 'South', 'Available'),
('22222222-2222-2222-2222-000000000009', 'FL-1288-MI', 'Peterbilt 579 UltraLoft', 'Truck', 25000, 310500, 148000, 'North', 'Retired');

-- 4. Drivers
INSERT INTO public.drivers (id, name, license_number, license_category, license_expiry, contact_number, safety_score, status) VALUES
('33333333-3333-3333-3333-000000000001', 'Arthur Pendelton', 'DL-882910-US', 'Class A - Heavy Articulated', '2027-08-14', '+1 (555) 234-8901', 98.5, 'On Trip'),
('33333333-3333-3333-3333-000000000002', 'Samantha Rivera', 'DL-441029-US', 'Class A - Heavy Articulated', '2028-02-20', '+1 (555) 345-6712', 96.0, 'Available'),
('33333333-3333-3333-3333-000000000003', 'Jackson Brody', 'DL-192834-US', 'Class C - Commercial Van', '2026-11-05', '+1 (555) 789-0123', 92.4, 'On Trip'),
('33333333-3333-3333-3333-000000000004', 'Mateo Gomez', 'DL-908172-US', 'Class B - Heavy Rigid', '2027-04-18', '+1 (555) 890-1234', 94.0, 'Available'),
('33333333-3333-3333-3333-000000000005', 'Rachel Sterling', 'DL-339182-US', 'Class D - Multi-Passenger', '2027-12-01', '+1 (555) 456-7890', 99.2, 'Off Duty'),
('33333333-3333-3333-3333-000000000006', 'Darius Walker', 'DL-771829-US', 'Class A - Heavy Articulated', '2026-04-10', '+1 (555) 567-8901', 78.5, 'Suspended');

-- 5. Trips
INSERT INTO public.trips (id, trip_code, source, destination, planned_distance_km, cargo_weight_kg, vehicle_id, driver_id, planned_departure, actual_departure, actual_distance_km, fuel_consumed_litres, revenue, status, notes) VALUES
('44444444-4444-4444-4444-000000000001', 'TRP-1041', 'Dallas Freight Hub, TX', 'Chicago Distribution Yard, IL', 1480, 24500, '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000001', '2026-10-10 06:00:00+00', '2026-10-10 06:22:00+00', NULL, NULL, 4850.00, 'Dispatched', 'Priority cold-chain pharmaceutical cargo'),
('44444444-4444-4444-4444-000000000002', 'TRP-1040', 'Atlanta Logistics Center, GA', 'Miami Harbor Terminal, FL', 1060, 3800, '22222222-2222-2222-2222-000000000005', '33333333-3333-3333-3333-000000000003', '2026-10-11 04:30:00+00', '2026-10-11 04:45:00+00', NULL, NULL, 2150.00, 'Dispatched', 'Express retail components delivery'),
('44444444-4444-4444-4444-000000000003', 'TRP-1039', 'Seattle Port Hub, WA', 'Portland Inland Depot, OR', 280, 16000, '22222222-2222-2222-2222-000000000006', '33333333-3333-3333-3333-000000000002', '2026-10-09 08:00:00+00', '2026-10-09 08:15:00+00', 284, 82, 1250.00, 'Completed', 'Zero-emission freight test corridor'),
('44444444-4444-4444-4444-000000000004', 'TRP-1038', 'Los Angeles Freight Yard, CA', 'Phoenix Logistics Park, AZ', 600, 21000, '22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000004', '2026-10-08 10:00:00+00', '2026-10-08 10:10:00+00', 608, 195, 2400.00, 'Completed', 'Industrial machinery parts delivery');

-- 6. Maintenance Records
INSERT INTO public.maintenance_records (id, vehicle_id, maintenance_type, description, cost, start_date, expected_completion, actual_completion, status, notes) VALUES
('55555555-5555-5555-5555-000000000001', '22222222-2222-2222-2222-000000000003', 'Brake Overhaul', 'Complete front and rear pneumatic brake pads replacement & pressure test', 2150.00, '2026-10-09', '2026-10-13', NULL, 'In Progress', 'High wear detected on primary calipers during routine inspection'),
('55555555-5555-5555-5555-000000000002', '22222222-2222-2222-2222-000000000002', 'Scheduled Service', '100k KM powertrain inspection, fluids & synthetic filter replacement', 850.00, '2026-09-28', '2026-09-29', '2026-09-29', 'Completed', 'Passed emission and dyno checks without issues'),
('55555555-5555-5555-5555-000000000003', '22222222-2222-2222-2222-000000000004', 'Tire Replacement', 'Scheduled installation of 4 Michelin Agilis all-season commercial tires', 1200.00, '2026-10-18', '2026-10-19', NULL, 'Scheduled', 'Tires ordered and staged at depot bay 3');

-- 7. Fuel Logs
INSERT INTO public.fuel_logs (id, vehicle_id, date, litres, price_per_litre, total_cost, odometer_reading, notes) VALUES
('66666666-6666-6666-6666-000000000001', '22222222-2222-2222-2222-000000000001', '2026-10-09', 380, 1.25, 475.00, 141020, 'Full diesel tank top-up before Dallas departure'),
('66666666-6666-6666-6666-000000000002', '22222222-2222-2222-2222-000000000002', '2026-10-08', 210, 1.28, 268.80, 97592, 'Refuel at Phoenix depot terminal'),
('66666666-6666-6666-6666-000000000003', '22222222-2222-2222-2222-000000000005', '2026-10-10', 95, 1.18, 112.10, 88040, 'Atlanta outbound staging refuel'),
('66666666-6666-6666-6666-000000000004', '22222222-2222-2222-2222-000000000004', '2026-10-05', 78, 1.22, 95.16, 63800, 'Weekly depot fuel reserve fill');

-- 8. Expenses
INSERT INTO public.expenses (id, vehicle_id, category, date, amount, description) VALUES
('77777777-7777-7777-7777-000000000001', '22222222-2222-2222-2222-000000000001', 'Tolls', '2026-10-10', 142.50, 'I-44 Turner Turnpike commercial toll passage'),
('77777777-7777-7777-7777-000000000002', '22222222-2222-2222-2222-000000000005', 'Tolls', '2026-10-11', 54.00, 'Florida Turnpike SunPass commercial toll charges'),
('77777777-7777-7777-7777-000000000003', '22222222-2222-2222-2222-000000000004', 'Permits', '2026-10-02', 320.00, 'Annual municipal cross-zone commercial transit permit'),
('77777777-7777-7777-7777-000000000004', '22222222-2222-2222-2222-000000000006', 'Other', '2026-10-07', 180.00, 'Quarterly high-voltage telematics diagnostics subscription');

-- 9. Notifications
INSERT INTO public.notifications (id, title, message, type, link, read) VALUES
('88888888-8888-8888-8888-000000000001', 'Active Maintenance In Progress', 'Scania R500 (FL-7110-IL) is undergoing Brake Overhaul at central workshop bay 2.', 'warning', '/maintenance', false),
('88888888-8888-8888-8888-000000000002', 'Driver License Expiring Soon', 'Driver Jackson Brody license expires in 25 days (2026-11-05). Renewal required.', 'danger', '/drivers', false),
('88888888-8888-8888-8888-000000000003', 'Trip Dispatched On Schedule', 'Trip TRP-1041 to Chicago safely departed Dallas Freight Hub with 24,500 kg cargo.', 'info', '/trips', true);
