# TransitOps — Smart Transport Operations Platform

TransitOps is a full-stack, enterprise-grade fleet and transport operations management platform built with **Next.js (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Supabase (PostgreSQL with RLS & Stored Procedures)**.

---

## 1. Visual Direction & Design Tokens

Designed specifically to meet enterprise logistics operations aesthetics:
- **Sidebar**: Deep Forest Teal (`#123B38`)
- **Main Background**: Warm Cream (`#F5F2E9`)
- **Main Cards & Panels**: Soft Ivory White (`#FFFEFA`)
- **Primary Accent**: Emerald Green (`#23866D`)
- **Secondary Accent**: Muted Sage (`#A9CDBA`)
- **Information**: Calm Blue (`#4F91D8`)
- **Warning**: Muted Amber (`#E9A23B`)
- **Danger**: Restrained Coral Red (`#D95353`)
- **Main Text**: Deep Blue-Grey (`#193C49`)
- **Secondary Text**: Muted Slate (`#71818A`)
- **Borders**: Subtle Warm Grey (`#E2DDD1`)

---

## 2. Platform Modules & Features (Zero Fake Controls)

Every control, form, button, and filter connects to real persistent data operations:

1. **Dashboard Overview (`/`)**
   - KPI metrics computed directly from active database records: Total Vehicles, Available Vehicles, Vehicles On Trip, In Maintenance, Active Trips, Pending Trips, Drivers On Duty, and Fleet Utilization.
   - Interactive SVG Fleet Status donut breakdown.
   - Fuel Consumption bar chart and Operational Expenses allocation stacked chart.
   - Operational Route Overview based on genuine source-destination waypoint telemetry.
   - Working Quick Actions: Add Vehicle, Add Driver, Create Trip, and Log Fuel.
   - Interactive date range, region, and vehicle type filters.

2. **Vehicle Management (`/vehicles`)**
   - Complete CRUD: Enrol vehicles, view full telemetry specifications, edit assets, and safe deletion.
   - Unique registration number constraint enforcement.
   - Safe Deletion Guard: Hard deletion is blocked if the vehicle is assigned to active trips or active maintenance (recommends setting status to 'Retired' instead).
   - Filter by status, type, and operating region. Column sorting and RFC-4180 CSV export.

3. **Driver Management (`/drivers`)**
   - Complete CRUD: Register drivers, edit contact and licensing details.
   - Commercial license expiry tracking with automated 30-day warning badges and expired badges.
   - Safety score telemetry rating (0–100%).
   - Dispatch Eligibility Guard: Suspended or expired drivers are blocked at the server and database level from dispatch assignments.
   - Real CSV export with escaped data fields.

4. **Trips & Dispatch Lifecycle (`/trips`)**
   - Manifest Lifecycle: `Draft` &rarr; `Dispatched` &rarr; `Completed` or `Cancelled`.
   - **Atomic Dispatch Transition**:
     - Validates vehicle is Available (not Retired, not In Shop, not On Trip).
     - Validates driver is Available (not Suspended, not Off Duty, not Expired).
     - Validates cargo weight &le; vehicle max payload capacity.
     - Atomically marks Trip &rarr; `Dispatched`, Vehicle &rarr; `On Trip`, Driver &rarr; `On Trip`.
   - **Atomic Completion**:
     - Records actual distance, fuel consumed, and freight revenue.
     - Increments vehicle odometer, restores Vehicle &rarr; `Available`, restores Driver &rarr; `Available`.
     - Automatically logs fuel consumption telemetry.
   - **Atomic Cancellation**:
     - Safely restores resources to Available status without corruption.

5. **Maintenance & Workshop Bay (`/maintenance`)**
   - Schedule routine services, brake overhauls, engine repairs, inspections, and tire replacements.
   - **In-Shop Conflict Guard**: Beginning maintenance atomically sets Vehicle &rarr; `In Shop`, preventing concurrent dispatch assignment.
   - Completing maintenance returns vehicle to `Available` (unless retired).

6. **Fuel & Operating Expenses (`/expenses`)**
   - High-precision fuel logging with litres, price per litre, total cost calculation, and odometer tracking.
   - Operating expense ledger for tolls, permits, insurance, and parking.
   - Double-counting prevention: Workshop maintenance recorded in both registries is not counted twice in operating cost calculations.
   - Dual CSV downloads for fuel logs and expenses.

7. **Reports & Analytics (`/reports`)**
   - **Fuel Efficiency**: `Distance Travelled / Fuel Consumed` (km/L).
   - **Fleet Utilization**: `(Vehicles On Trip / Non-Retired Vehicles) * 100`.
   - **Vehicle ROI**: `(Freight Revenue − Maintenance Cost − Fuel Cost) / Asset Acquisition Cost`.
   - Safe division-by-zero protection.
   - Downloadable comprehensive CSV report.

8. **User Management & Role-Based Access (`/users`)**
   - Multi-role permission matrix: Fleet Manager, Dispatcher, Safety Officer, and Financial Analyst.
   - 1-click active session switcher to test distinct permission boundaries.

9. **Settings & Cloud Integration (`/settings`)**
   - Company identity, currency, and metric/imperial unit preferences.
   - Live Supabase connection tester.
   - Factory seed reset button with confirmation modal.

10. **Global Search & Notification Center**
    - Instant search across vehicles, drivers, and trips with keyboard shortcuts.
    - Live alert notification popover with unread counter and navigation links.

---

## 3. Database Architecture & Migrations

The full PostgreSQL migration file is located in:
```
supabase/migrations/20261011_transitops_schema.sql
```
And seed data in:
```
supabase/seed.sql
```

### Relational Schema:
- `public.profiles` (UUID, roles, email)
- `public.vehicles` (UUID, reg_number UNIQUE, capacity, odometer, acquisition cost, status, region)
- `public.drivers` (UUID, license_number UNIQUE, category, expiry, safety_score, status)
- `public.trips` (UUID, trip_code UNIQUE, vehicle_id FK, driver_id FK, payload, departure, actuals, status)
- `public.maintenance_records` (UUID, vehicle_id FK, type, cost, dates, status)
- `public.fuel_logs` (UUID, vehicle_id FK, litres, price, total_cost, odometer)
- `public.expenses` (UUID, vehicle_id FK, category, amount, description)
- `public.system_settings` (UUID, org_name, currency, units, alert thresholds)
- `public.notifications` (UUID, title, message, type, read)

### PostgreSQL Stored Procedures / RPCs:
- `dispatch_trip(trip_id_param UUID)`: Atomic lock and multi-record validation and state transition.
- `complete_trip(trip_id_param UUID, actual_dist, fuel_used, revenue)`: Telemetry finalization and resource release.
- `cancel_trip(trip_id_param UUID)`: Safe resource restoration.
- `start_maintenance(record_id_param UUID)`: Sets vehicle to `In Shop`.
- `complete_maintenance(record_id_param UUID, actual_date, notes)`: Returns vehicle to `Available`.

---

## 4. Environment Configuration

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Supabase project parameters:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

*Note:* If Supabase credentials are not supplied, TransitOps operates seamlessly in **Persistent Local Sandbox Mode** with identical business logic, RPC semantics, and localStorage persistence.

---

## 5. Local Development & Verification

### Install dependencies:
```bash
npm install
```

### Start development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run production build test:
```bash
npm run build
```
The production bundle compiles with full TypeScript strictness and zero errors.
