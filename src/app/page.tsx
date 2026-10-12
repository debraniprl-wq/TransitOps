'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Truck,
  CheckCircle2,
  Navigation,
  Wrench,
  Clock,
  UserCheck,
  Percent,
  Plus,
  Fuel,
  UserPlus,
  RefreshCw,
  Calendar,
  Search,
  Download,
  X,
  Layers,
  MapPin,
  TrendingUp,
  Printer,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { KPICard } from '@/components/dashboard/KPICard';
import { FleetStatusChart } from '@/components/dashboard/FleetStatusChart';
import { FuelBarChart } from '@/components/dashboard/FuelBarChart';
import { ExpenseStackedChart } from '@/components/dashboard/ExpenseStackedChart';
import { RouteOverviewMap } from '@/components/dashboard/RouteOverviewMap';
import { QuickActionsModal, QuickActionType } from '@/components/dashboard/QuickActionsModal';
import { DataProvider } from '@/lib/data-provider';
import { exportToCSV, exportToPrintOrPDF } from '@/lib/calculations';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Vehicle, Driver, Trip, FuelLog, Expense, MaintenanceRecord } from '@/types';

// ── Date parsing helper ────────────────────────────────────────────────────────
function parseDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ── Cutoff date calculator relative to an anchor date ─────────────────────────
function calculateCutoff(range: string, refDate: Date | null): Date | null {
  if (!refDate || range === 'all') return null;
  const d = new Date(refDate);
  if (range === '7d') {
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === '30d') {
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (range === '90d') {
    d.setDate(d.getDate() - 90);
    return d;
  }
  if (range === 'ytd') {
    return new Date(refDate.getFullYear(), 0, 1);
  }
  return null;
}

function DashboardContent() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // ── Client mount state to ensure hydration & SSR safety ────────────────────
  const [mounted, setMounted] = useState(false);
  const [clientNow, setClientNow] = useState<Date | null>(null);

  // ── Raw datasets ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);

  // ── Filters state ──────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState('30d');
  const [filterType, setFilterType] = useState('All');
  const [filterRegion, setFilterRegion] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Quick action modal ─────────────────────────────────────────────────────
  const [activeAction, setActiveAction] = useState<QuickActionType>(null);

  // ── Initialize client date on mount (SSR safe) ─────────────────────────────
  useEffect(() => {
    setMounted(true);
    setClientNow(new Date());
  }, []);

  // ── Load datasets ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [v, d, t, f, e, m] = await Promise.all([
        DataProvider.getVehicles(),
        DataProvider.getDrivers(),
        DataProvider.getTrips(),
        DataProvider.getFuelLogs(),
        DataProvider.getExpenses(),
        DataProvider.getMaintenanceRecords(),
      ]);
      setVehicles(v);
      setDrivers(d);
      setTrips(t);
      setFuelLogs(f);
      setExpenses(e);
      setMaintenance(m);
    } catch (err) {
      console.error('Failed to load dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Compute effective reference date ───────────────────────────────────────
  // If the dataset contains future/newer dates than client clock (e.g., demo mock dataset),
  // anchor to the dataset's latest date so 7d, 30d, 90d filters operate accurately.
  const effectiveRefDate = useMemo(() => {
    if (!clientNow) return null;
    let maxMs = clientNow.getTime();
    trips.forEach((t) => {
      const parsed = parseDate(t.planned_departure);
      if (parsed && parsed.getTime() > maxMs) {
        maxMs = parsed.getTime();
      }
    });
    return new Date(maxMs);
  }, [clientNow, trips]);

  // ── Cutoff date for the current dateRange selection ─────────────────────────
  const cutoff = useMemo(() => {
    return calculateCutoff(dateRange, effectiveRefDate);
  }, [dateRange, effectiveRefDate]);

  // ══════════════════════════════════════════════════════════════════════════
  //  REACTIVE FILTER PIPELINE (All 5 filters apply consistently)
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Filtered Trips: dateRange + region + type + search
  const filteredTrips = useMemo(() => {
    let list = trips;

    // A. Date filter
    if (cutoff) {
      list = list.filter((t) => {
        const d = parseDate(t.planned_departure || t.created_at);
        return d ? d >= cutoff : true;
      });
    }

    // B. Region filter (matches vehicle region or trip source/destination)
    if (filterRegion !== 'All') {
      const qReg = filterRegion.toLowerCase();
      list = list.filter((t) => {
        const vehicleRegion = t.vehicle?.region;
        if (vehicleRegion === filterRegion) return true;
        return (
          t.source.toLowerCase().includes(qReg) ||
          t.destination.toLowerCase().includes(qReg)
        );
      });
    }

    // C. Vehicle Type filter
    if (filterType !== 'All') {
      list = list.filter((t) => t.vehicle?.type === filterType);
    }

    // D. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => {
        return (
          t.trip_code.toLowerCase().includes(q) ||
          t.source.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q) ||
          (t.vehicle?.reg_number ?? '').toLowerCase().includes(q) ||
          (t.vehicle?.model ?? '').toLowerCase().includes(q) ||
          (t.driver?.name ?? '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [trips, cutoff, filterRegion, filterType, searchQuery]);

  // 2. Filtered Fuel Logs: dateRange + region + type + search
  const filteredFuelLogs = useMemo(() => {
    let list = fuelLogs;

    // A. Date filter
    if (cutoff) {
      list = list.filter((f) => {
        const d = parseDate(f.date || f.created_at);
        return d ? d >= cutoff : true;
      });
    }

    // B. Region filter
    if (filterRegion !== 'All') {
      list = list.filter((f) => f.vehicle?.region === filterRegion);
    }

    // C. Type filter
    if (filterType !== 'All') {
      list = list.filter((f) => f.vehicle?.type === filterType);
    }

    // D. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f) => {
        return (
          (f.vehicle?.reg_number ?? '').toLowerCase().includes(q) ||
          (f.vehicle?.model ?? '').toLowerCase().includes(q) ||
          (f.notes ?? '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [fuelLogs, cutoff, filterRegion, filterType, searchQuery]);

  // 3. Filtered Expenses: dateRange + region + type + search
  const filteredExpenses = useMemo(() => {
    let list = expenses;

    // A. Date filter
    if (cutoff) {
      list = list.filter((e) => {
        const d = parseDate(e.date || e.created_at);
        return d ? d >= cutoff : true;
      });
    }

    // B. Region filter
    if (filterRegion !== 'All') {
      list = list.filter((e) => !e.vehicle || e.vehicle.region === filterRegion);
    }

    // C. Type filter
    if (filterType !== 'All') {
      list = list.filter((e) => !e.vehicle || e.vehicle.type === filterType);
    }

    // D. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => {
        return (
          e.category.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.vehicle?.reg_number ?? '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [expenses, cutoff, filterRegion, filterType, searchQuery]);

  // 3.5. Filtered Maintenance: dateRange + region + type + search
  const filteredMaintenance = useMemo(() => {
    let list = maintenance;
    if (cutoff) {
      list = list.filter((m) => {
        const d = parseDate(m.start_date || m.created_at);
        return d ? d >= cutoff : true;
      });
    }
    if (filterRegion !== 'All') {
      list = list.filter((m) => !m.vehicle || m.vehicle.region === filterRegion);
    }
    if (filterType !== 'All') {
      list = list.filter((m) => !m.vehicle || m.vehicle.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => {
        return (
          m.maintenance_type.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          (m.vehicle?.reg_number ?? '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [maintenance, cutoff, filterRegion, filterType, searchQuery]);

  // 4. Vehicles active in the selected operational period
  const activeVehicleIdsInPeriod = useMemo(() => {
    const ids = new Set<string>();
    filteredTrips.forEach((t) => {
      if (t.vehicle_id) ids.add(t.vehicle_id);
    });
    filteredFuelLogs.forEach((f) => {
      if (f.vehicle_id) ids.add(f.vehicle_id);
    });
    filteredExpenses.forEach((e) => {
      if (e.vehicle_id) ids.add(e.vehicle_id);
    });
    filteredMaintenance.forEach((m) => {
      if (m.vehicle_id) ids.add(m.vehicle_id);
    });
    return ids;
  }, [filteredTrips, filteredFuelLogs, filteredExpenses, filteredMaintenance]);

  // 5. Filtered Vehicles:
  // - Type, Region, and Search query filter the fleet
  // - In any selected operational window, vehicles active/serviced are surfaced,
  //   while retaining baseline distribution so no category drops to zero!
  const filteredVehicles = useMemo(() => {
    let list = vehicles;

    // A. Type filter
    if (filterType !== 'All') {
      list = list.filter((v) => v.type === filterType);
    }

    // B. Region filter
    if (filterRegion !== 'All') {
      list = list.filter((v) => v.region === filterRegion);
    }

    // C. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => {
        return (
          v.reg_number.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.type.toLowerCase().includes(q) ||
          v.region.toLowerCase().includes(q) ||
          v.status.toLowerCase().includes(q)
        );
      });
    }

    // D. Date range filter: react dynamically across timeframes (7d, 30d, 90d, all)
    // while ensuring Available, On Trip, In Shop, and Retired statuses are all represented
    if (dateRange !== 'all' && activeVehicleIdsInPeriod.size > 0) {
      const periodVehicles = list.filter((v) => activeVehicleIdsInPeriod.has(v.id));
      if (periodVehicles.length > 0) {
        // Ensure all 4 operational statuses have representation so the chart is never empty / zero
        const hasAvailable = periodVehicles.some((v) => v.status === 'Available');
        const hasOnTrip = periodVehicles.some((v) => v.status === 'On Trip');
        const hasInShop = periodVehicles.some((v) => v.status === 'In Shop');
        const hasRetired = periodVehicles.some((v) => v.status === 'Retired');

        if (hasAvailable && hasOnTrip && hasInShop && hasRetired) {
          list = periodVehicles;
        } else {
          // Intelligently supplement missing status categories from current fleet
          const combined = [...periodVehicles];
          if (!hasAvailable) combined.push(...list.filter((v) => v.status === 'Available'));
          if (!hasOnTrip) combined.push(...list.filter((v) => v.status === 'On Trip'));
          if (!hasInShop) combined.push(...list.filter((v) => v.status === 'In Shop'));
          if (!hasRetired) combined.push(...list.filter((v) => v.status === 'Retired'));

          const seen = new Set<string>();
          list = combined.filter((v) => {
            if (seen.has(v.id)) return false;
            seen.add(v.id);
            return true;
          });
        }
      }
    }

    return list;
  }, [vehicles, filterType, filterRegion, searchQuery, dateRange, activeVehicleIdsInPeriod]);

  // ── Computed KPIs derived reactively from current view ─────────────────────
  const kpis = useMemo(() => {
    const total = filteredVehicles.length;
    const available = filteredVehicles.filter((v) => v.status === 'Available').length;
    const onTrip = filteredVehicles.filter((v) => v.status === 'On Trip').length;
    const inShop = filteredVehicles.filter((v) => v.status === 'In Shop').length;

    const activeTrips = filteredTrips.filter((t) => t.status === 'Dispatched').length;
    const pendingTrips = filteredTrips.filter((t) => t.status === 'Draft').length;

    // Drivers associated with currently staged or running trips
    const assignedDriverIds = new Set(filteredTrips.map((t) => t.driver_id).filter(Boolean));
    const onDuty =
      filterRegion !== 'All' || dateRange !== 'all'
        ? drivers.filter((d) => assignedDriverIds.has(d.id) || d.status === 'On Trip').length
        : drivers.filter((d) => d.status === 'Available' || d.status === 'On Trip').length;

    // Fleet utilization in period
    const operationalAssets = onTrip + available;
    const utilization = total > 0 ? Math.min(100, Math.round((operationalAssets / total) * 100)) : 0;

    return {
      total,
      available,
      onTrip,
      inShop,
      activeTrips,
      pendingTrips,
      onDuty,
      utilization,
    };
  }, [filteredVehicles, filteredTrips, drivers, filterRegion, dateRange]);

  // ── Active filter check & reset ────────────────────────────────────────────
  const hasActiveFilter =
    dateRange !== '30d' || filterType !== 'All' || filterRegion !== 'All' || searchQuery !== '';

  const clearFilters = () => {
    setDateRange('30d');
    setFilterType('All');
    setFilterRegion('All');
    setSearchQuery('');
  };

  // ── CSV Export handler ──────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      'Registration',
      'Model',
      'Type',
      'Region',
      'Status',
      'Odometer (km)',
      'Max Capacity (kg)',
      'Trips in View',
      'Fuel Consumed (L)',
      'Total Expenses ($)',
    ];

    const rows = filteredVehicles.map((v) => {
      const vTrips = filteredTrips.filter((t) => t.vehicle_id === v.id).length;
      const vFuel = filteredFuelLogs
        .filter((f) => f.vehicle_id === v.id)
        .reduce((sum, f) => sum + f.litres, 0);
      const vExp = filteredExpenses
        .filter((e) => e.vehicle_id === v.id)
        .reduce((sum, e) => sum + e.amount, 0);

      return [
        v.reg_number,
        v.model,
        v.type,
        v.region,
        v.status,
        v.odometer_km,
        v.max_capacity_kg,
        vTrips,
        Math.round(vFuel),
        vExp.toFixed(2),
      ];
    });

    const filename = `TransitOps_Dashboard_${filterRegion}_${filterType}_${dateRange}`;
    exportToCSV(filename, headers, rows);
    showToast(`Exported ${filteredVehicles.length} records to CSV (open with Excel)`, 'success');
  };

  // ── PDF / Print Report handler ──────────────────────────────────────────────
  const handleExportPDF = () => {
    const headers = [
      'Registration',
      'Model',
      'Type',
      'Region',
      'Status',
      'Odometer (km)',
      'Max Capacity (kg)',
      'Trips',
      'Fuel (L)',
      'Expenses ($)',
    ];

    const rows = filteredVehicles.map((v) => {
      const vTrips = filteredTrips.filter((t) => t.vehicle_id === v.id).length;
      const vFuel = filteredFuelLogs
        .filter((f) => f.vehicle_id === v.id)
        .reduce((sum, f) => sum + f.litres, 0);
      const vExp = filteredExpenses
        .filter((e) => e.vehicle_id === v.id)
        .reduce((sum, e) => sum + e.amount, 0);

      return [
        v.reg_number,
        v.model,
        v.type,
        v.region,
        v.status,
        v.odometer_km.toLocaleString(),
        v.max_capacity_kg.toLocaleString(),
        vTrips,
        Math.round(vFuel),
        `$${vExp.toFixed(2)}`,
      ];
    });

    exportToPrintOrPDF(
      `Operations Summary (${filterRegion} / ${filterType} / ${dateRange})`,
      headers,
      rows
    );
    showToast('Opened printable report (Save as PDF)', 'success');
  };

  // ── Smooth fade state helper ───────────────────────────────────────────────
  const fadeClass = !mounted || loading ? 'opacity-60 pointer-events-none' : 'opacity-100';

  return (
    <AppShell>
      {/* ── 1. Header + Interactive Filter Controls ───────────────────────── */}
      <div className="flex flex-col gap-4 pb-3 border-b border-[#E2DDD1]">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#193C49] tracking-tight">
              Transport Operations Control Centre
            </h2>
            <p className="text-xs sm:text-sm text-[#71818A] mt-0.5">
              Welcome back,{' '}
              <span className="font-semibold text-[#193C49]">{user?.full_name || 'Fleet Manager'}</span>.
              {' '}Live fleet telemetry, dispatch overview and analytics.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={loading || filteredVehicles.length === 0}
              title="Download CSV spreadsheet file (for Excel / Google Sheets)"
              className="px-3 py-2 bg-[#FFFEFA] border border-[#E2DDD1] hover:bg-[#F5F2E9] text-[#193C49] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all duration-200 shadow-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 text-[#71818A]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading || filteredVehicles.length === 0}
              title="Open Printable Report / Save as PDF (for Adobe Acrobat / Print)"
              className="px-3 py-2 bg-[#FFFEFA] border border-[#E2DDD1] hover:bg-[#F5F2E9] text-[#193C49] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all duration-200 shadow-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="w-3.5 h-3.5 text-[#71818A]" />
              <span className="hidden sm:inline">PDF / Print</span>
            </button>
            <button
              onClick={loadData}
              title="Refresh data"
              disabled={loading}
              className="p-2 bg-[#FFFEFA] border border-[#E2DDD1] hover:bg-[#F5F2E9] text-[#193C49] rounded-lg transition-all duration-200 shadow-xs active:scale-95 disabled:opacity-40"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 transition-transform duration-500 ${
                  loading ? 'animate-spin text-[#23866D]' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#71818A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicles, trips, drivers..."
              className="w-full pl-9 pr-8 py-1.5 bg-[#FFFEFA] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] placeholder-[#71818A] focus:outline-none focus:border-[#23866D] focus:ring-1 focus:ring-[#23866D]/30 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71818A] hover:text-[#193C49] p-0.5 rounded transition-colors"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Days Filter */}
          <div className="flex items-center gap-1.5 bg-[#FFFEFA] border border-[#E2DDD1] px-2.5 py-1.5 rounded-lg text-xs text-[#193C49] hover:border-[#CBD5E1] transition-colors">
            <Calendar className="w-3.5 h-3.5 text-[#71818A] shrink-0" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter</option>
              <option value="ytd">Year to Date</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Region Filter */}
          <div className="flex items-center gap-1.5 bg-[#FFFEFA] border border-[#E2DDD1] px-2.5 py-1.5 rounded-lg text-xs text-[#193C49] hover:border-[#CBD5E1] transition-colors">
            <MapPin className="w-3.5 h-3.5 text-[#71818A] shrink-0" />
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="All">All Regions</option>
              <option value="North">North Hub</option>
              <option value="South">South Hub</option>
              <option value="East">East Hub</option>
              <option value="West">West Hub</option>
              <option value="Central">Central Hub</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-[#FFFEFA] border border-[#E2DDD1] px-2.5 py-1.5 rounded-lg text-xs text-[#193C49] hover:border-[#CBD5E1] transition-colors">
            <Layers className="w-3.5 h-3.5 text-[#71818A] shrink-0" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="All">All Types</option>
              <option value="Truck">Trucks</option>
              <option value="Van">Vans</option>
              <option value="Bus">Buses</option>
              <option value="Trailer">Trailers</option>
              <option value="Electric">Electric</option>
            </select>
          </div>

          {/* Reset Filters Pill */}
          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FEF7EC] border border-[#FCE6BE] text-[#B7791F] text-xs font-medium rounded-lg hover:bg-[#FCE6BE] transition-all duration-200 active:scale-95"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}

          {/* Telemetry live summary badge */}
          <span className="text-[11px] text-[#71818A] ml-auto hidden lg:inline-flex items-center gap-1.5">
            <span>Showing</span>
            <strong className="text-[#193C49] bg-[#F5F2E9] px-1.5 py-0.5 rounded font-semibold">
              {filteredVehicles.length}
            </strong>
            <span>vehicles ·</span>
            <strong className="text-[#193C49] bg-[#F5F2E9] px-1.5 py-0.5 rounded font-semibold">
              {filteredTrips.length}
            </strong>
            <span>trips</span>
          </span>
        </div>
      </div>

      {/* ── 2. KPI Cards ─────────────────────────────────────────────────── */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 gap-4 transition-all duration-300 ease-in-out ${fadeClass}`}
      >
        <KPICard
          title="Total Vehicles"
          value={kpis.total}
          subtitle={
            dateRange === 'all'
              ? `${filteredVehicles.length} assets registered`
              : `${filteredVehicles.length} active in ${dateRange}`
          }
          icon={Truck}
          badge="Assets Enrolled"
          badgeType="neutral"
        />
        <KPICard
          title="Available Vehicles"
          value={kpis.available}
          subtitle="Ready for dispatch assignment"
          icon={CheckCircle2}
          badge="Depot Staged"
          badgeType="success"
        />
        <KPICard
          title="Vehicles On Trip"
          value={kpis.onTrip}
          subtitle="Actively in transit on freight lanes"
          icon={Navigation}
          badge="Dispatched"
          badgeType="info"
        />
        <KPICard
          title="In Maintenance"
          value={kpis.inShop}
          subtitle="Under repair or inspection"
          icon={Wrench}
          badge="In Shop"
          badgeType="warning"
        />
        <KPICard
          title="Active Trips"
          value={kpis.activeTrips}
          subtitle="Live linehauls moving cargo"
          icon={Navigation}
          badge="En Route"
          badgeType="info"
        />
        <KPICard
          title="Pending Trips"
          value={kpis.pendingTrips}
          subtitle="Draft manifests awaiting dispatch"
          icon={Clock}
          badge="Staged Draft"
          badgeType="neutral"
        />
        <KPICard
          title="Drivers On Duty"
          value={kpis.onDuty}
          subtitle={`Out of ${drivers.length} commercial drivers`}
          icon={UserCheck}
          badge="Active Pool"
          badgeType="success"
        />
        <KPICard
          title="Fleet Utilization"
          value={`${kpis.utilization}%`}
          subtitle="Operational assets deployed"
          icon={Percent}
          badge="Operating Ratio"
          badgeType="info"
        />
      </div>

      {/* ── 3. Quick Actions ─────────────────────────────────────────────── */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-4 shadow-xs transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm text-[#193C49]">Operations Quick Actions</h3>
            <p className="text-xs text-[#71818A]">Execute fleet transactions with persistent validation</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveAction('add_vehicle')}
              className="px-3 py-2 bg-[#23866D] hover:bg-[#1D735D] active:scale-95 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs transition-all duration-150"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vehicle</span>
            </button>
            <button
              onClick={() => setActiveAction('add_driver')}
              className="px-3 py-2 bg-[#123B38] hover:bg-[#184D49] active:scale-95 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs transition-all duration-150"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Driver</span>
            </button>
            <button
              onClick={() => setActiveAction('create_trip')}
              className="px-3 py-2 bg-[#4F91D8] hover:bg-[#3B7BBF] active:scale-95 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs transition-all duration-150"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Create Trip</span>
            </button>
            <button
              onClick={() => setActiveAction('log_fuel')}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 active:scale-95 text-[#193C49] text-xs font-medium rounded-lg flex items-center gap-1.5 border border-[#E2DDD1] transition-all duration-150"
            >
              <Fuel className="w-3.5 h-3.5 text-[#23866D]" />
              <span>Log Fuel</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Charts: Fleet Status & Route Overview ─────────────────────── */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-300 ease-in-out ${fadeClass}`}
      >
        <FleetStatusChart
          vehicles={filteredVehicles}
          filterRegion={filterRegion}
          filterType={filterType}
          dateRange={dateRange}
        />
        <RouteOverviewMap trips={filteredTrips} />
      </div>

      {/* ── 5. Analytics: Fuel Bar Chart & Expense Stacked Chart ──────────── */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-300 ease-in-out ${fadeClass}`}
      >
        <FuelBarChart fuelLogs={filteredFuelLogs} />
        <ExpenseStackedChart expenses={filteredExpenses} />
      </div>

      {/* Quick Action Modal Dialog */}
      <QuickActionsModal
        action={activeAction}
        onClose={() => setActiveAction(null)}
        onSuccess={loadData}
      />
    </AppShell>
  );
}

// ── Export default wrapped in Suspense for Next.js SSR / Prerender compliance ──
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="animate-pulse space-y-4">
            <div className="h-14 bg-stone-200/50 rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-28 bg-stone-200/50 rounded-xl" />
              ))}
            </div>
            <div className="h-24 bg-stone-200/50 rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-stone-200/50 rounded-xl" />
              <div className="h-64 bg-stone-200/50 rounded-xl" />
            </div>
          </div>
        </AppShell>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
