'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { KPICard } from '@/components/dashboard/KPICard';
import { FleetStatusChart } from '@/components/dashboard/FleetStatusChart';
import { FuelBarChart } from '@/components/dashboard/FuelBarChart';
import { ExpenseStackedChart } from '@/components/dashboard/ExpenseStackedChart';
import { RouteOverviewMap } from '@/components/dashboard/RouteOverviewMap';
import { QuickActionsModal, QuickActionType } from '@/components/dashboard/QuickActionsModal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataProvider } from '@/lib/data-provider';
import { useAuth } from '@/lib/auth-context';
import { Vehicle, Driver, Trip, MaintenanceRecord, FuelLog, Expense, KPISummary } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();

  // Primary state
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [kpis, setKpis] = useState<KPISummary | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState('30d');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRegion, setFilterRegion] = useState('All');

  // Quick Action Modal
  const [activeAction, setActiveAction] = useState<QuickActionType>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [v, d, t, m, f, e, k] = await Promise.all([
      DataProvider.getVehicles(),
      DataProvider.getDrivers(),
      DataProvider.getTrips(),
      DataProvider.getMaintenanceRecords(),
      DataProvider.getFuelLogs(),
      DataProvider.getExpenses(),
      DataProvider.getKPISummary(),
    ]);

    setVehicles(v);
    setDrivers(d);
    setTrips(t);
    setMaintenance(m);
    setFuelLogs(f);
    setExpenses(e);
    setKpis(k);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply dashboard filters to vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (filterType !== 'All' && v.type !== filterType) return false;
    if (filterStatus !== 'All' && v.status !== filterStatus) return false;
    if (filterRegion !== 'All' && v.region !== filterRegion) return false;
    return true;
  });

  return (
    <AppShell>
      {/* 1. Welcome Section & Operational Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2DDD1]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#193C49] tracking-tight">
            Transport Operations Control Centre
          </h2>
          <p className="text-xs sm:text-sm text-[#71818A] mt-0.5">
            Welcome back, <span className="font-semibold text-[#193C49]">{user?.full_name}</span>. Real-time telemetry, resource dispatching, and asset health.
          </p>
        </div>

        {/* Global Dashboard Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range filter */}
          <div className="flex items-center gap-1.5 bg-[#FFFEFA] border border-[#E2DDD1] px-2.5 py-1.5 rounded-lg text-xs text-[#193C49]">
            <Calendar className="w-3.5 h-3.5 text-[#71818A]" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter</option>
              <option value="all">Year to Date</option>
            </select>
          </div>

          {/* Region filter */}
          <div className="bg-[#FFFEFA] border border-[#E2DDD1] px-2.5 py-1.5 rounded-lg text-xs text-[#193C49]">
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">All Regions</option>
              <option value="North">North Hub</option>
              <option value="South">South Hub</option>
              <option value="East">East Hub</option>
              <option value="West">West Hub</option>
              <option value="Central">Central Hub</option>
            </select>
          </div>

          {/* Vehicle type filter */}
          <div className="bg-[#FFFEFA] border border-[#E2DDD1] px-2.5 py-1.5 rounded-lg text-xs text-[#193C49]">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Truck">Trucks</option>
              <option value="Van">Vans</option>
              <option value="Bus">Buses</option>
              <option value="Trailer">Trailers</option>
              <option value="Electric">Electric</option>
            </select>
          </div>

          {/* Refresh data button */}
          <button
            onClick={loadData}
            title="Refresh database records"
            className="p-2 bg-[#FFFEFA] border border-[#E2DDD1] hover:bg-[#F5F2E9] text-[#193C49] rounded-lg text-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#23866D]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. KPI Cards (Derived from real DB values) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Vehicles"
          value={kpis?.totalVehicles ?? vehicles.length}
          subtitle={`${filteredVehicles.length} in current view`}
          icon={Truck}
          badge="Assets Enrolled"
          badgeType="neutral"
        />
        <KPICard
          title="Available Vehicles"
          value={kpis?.availableVehicles ?? vehicles.filter((v) => v.status === 'Available').length}
          subtitle="Ready for dispatch assignment"
          icon={CheckCircle2}
          badge="Depot Staged"
          badgeType="success"
        />
        <KPICard
          title="Vehicles On Trip"
          value={kpis?.vehiclesOnTrip ?? vehicles.filter((v) => v.status === 'On Trip').length}
          subtitle="Actively in transit on freight lanes"
          icon={Navigation}
          badge="Dispatched"
          badgeType="info"
        />
        <KPICard
          title="In Maintenance"
          value={kpis?.vehiclesInMaintenance ?? vehicles.filter((v) => v.status === 'In Shop').length}
          subtitle="Under repair or inspection in workshop"
          icon={Wrench}
          badge="In Shop"
          badgeType="warning"
        />
        <KPICard
          title="Active Trips"
          value={kpis?.activeTrips ?? trips.filter((t) => t.status === 'Dispatched').length}
          subtitle="Live linehauls moving cargo"
          icon={Navigation}
          badge="En Route"
          badgeType="info"
        />
        <KPICard
          title="Pending Trips"
          value={kpis?.pendingTrips ?? trips.filter((t) => t.status === 'Draft').length}
          subtitle="Draft manifests awaiting dispatch"
          icon={Clock}
          badge="Staged Draft"
          badgeType="neutral"
        />
        <KPICard
          title="Drivers On Duty"
          value={kpis?.driversOnDuty ?? drivers.filter((d) => d.status === 'Available' || d.status === 'On Trip').length}
          subtitle={`Out of ${drivers.length} commercial drivers`}
          icon={UserCheck}
          badge="Active Pool"
          badgeType="success"
        />
        <KPICard
          title="Fleet Utilization"
          value={`${kpis?.fleetUtilization ?? 0}%`}
          subtitle="Operational assets deployed"
          icon={Percent}
          badge="Operating Ratio"
          badgeType="info"
        />
      </div>

      {/* 3. Quick Actions Panel */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm text-[#193C49]">Operations Quick Actions</h3>
            <p className="text-xs text-[#71818A]">Execute fleet transactions with persistent validation</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveAction('add_vehicle')}
              className="px-3 py-2 bg-[#23866D] hover:bg-[#1D735D] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vehicle</span>
            </button>

            <button
              onClick={() => setActiveAction('add_driver')}
              className="px-3 py-2 bg-[#123B38] hover:bg-[#184D49] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Driver</span>
            </button>

            <button
              onClick={() => setActiveAction('create_trip')}
              className="px-3 py-2 bg-[#4F91D8] hover:bg-[#3B7BBF] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Create Trip</span>
            </button>

            <button
              onClick={() => setActiveAction('log_fuel')}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-[#193C49] text-xs font-medium rounded-lg flex items-center gap-1.5 border border-[#E2DDD1] transition-colors"
            >
              <Fuel className="w-3.5 h-3.5 text-[#23866D]" />
              <span>Log Fuel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Analytics Panels: Status Donut & Corridors Route Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FleetStatusChart vehicles={filteredVehicles} />
        <RouteOverviewMap trips={trips} />
      </div>

      {/* 5. Fuel Consumption & Expenses Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FuelBarChart fuelLogs={fuelLogs} />
        <ExpenseStackedChart expenses={expenses} />
      </div>

      {/* 6. Recent Trips Table & Upcoming Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips Table (2 columns) */}
        <div className="lg:col-span-2 bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm text-[#193C49]">Recent Trips &amp; Manifests</h3>
                <p className="text-xs text-[#71818A]">Live status and assignments</p>
              </div>
              <Link
                href="/trips"
                className="text-xs font-medium text-[#23866D] hover:underline flex items-center gap-1"
              >
                All Trips <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EAE5D9] text-[#71818A] uppercase tracking-wider text-[11px]">
                    <th className="pb-2.5 font-semibold">Trip ID</th>
                    <th className="pb-2.5 font-semibold">Route</th>
                    <th className="pb-2.5 font-semibold">Vehicle</th>
                    <th className="pb-2.5 font-semibold">Driver</th>
                    <th className="pb-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE1]">
                  {trips.slice(0, 5).map((trip) => (
                    <tr key={trip.id} className="hover:bg-[#FAF8F3] transition-colors">
                      <td className="py-3 font-semibold text-[#193C49]">
                        <Link href={`/trips?search=${trip.trip_code}`} className="hover:underline">
                          {trip.trip_code}
                        </Link>
                      </td>
                      <td className="py-3 text-[#193C49]">
                        <div className="font-medium truncate max-w-[180px]">{trip.source}</div>
                        <div className="text-[11px] text-[#71818A] truncate max-w-[180px]">&rarr; {trip.destination}</div>
                      </td>
                      <td className="py-3 text-[#193C49]">
                        {trip.vehicle ? trip.vehicle.reg_number : '—'}
                      </td>
                      <td className="py-3 text-[#193C49]">
                        {trip.driver ? trip.driver.name : '—'}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={trip.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                  {trips.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-[#71818A]">
                        No trip records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0ECE1] text-[11px] text-[#71818A] flex justify-between">
            <span>Dispatched trips: <strong>{trips.filter((t) => t.status === 'Dispatched').length}</strong></span>
            <span>Completed trips: <strong>{trips.filter((t) => t.status === 'Completed').length}</strong></span>
          </div>
        </div>

        {/* Upcoming Maintenance List (1 column) */}
        <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm text-[#193C49]">Maintenance Schedule</h3>
                <p className="text-xs text-[#71818A]">Scheduled &amp; in-progress servicing</p>
              </div>
              <Link
                href="/maintenance"
                className="text-xs font-medium text-[#23866D] hover:underline flex items-center gap-1"
              >
                Manage <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {maintenance.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg border border-[#EAE5D9] bg-[#FAF8F3] hover:bg-[#F5F2E9] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-[#193C49] leading-tight">
                      {rec.maintenance_type}
                    </span>
                    <StatusBadge status={rec.status} size="sm" />
                  </div>
                  <p className="text-[11px] text-[#71818A] mt-1 line-clamp-1">
                    {rec.vehicle ? `${rec.vehicle.model} (${rec.vehicle.reg_number})` : 'Vehicle'}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#EAE5D9] text-[11px]">
                    <span className="text-[#71818A]">Target: {rec.expected_completion}</span>
                    <span className="font-semibold text-[#193C49]">${rec.cost}</span>
                  </div>
                </div>
              ))}

              {maintenance.length === 0 && (
                <div className="py-8 text-center text-xs text-[#71818A]">
                  No upcoming maintenance records scheduled.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0ECE1] text-[11px] text-[#71818A] flex justify-between">
            <span>In Shop count: <strong>{maintenance.filter((m) => m.status === 'In Progress').length}</strong></span>
            <span>Preventative upkeep: <strong>Active</strong></span>
          </div>
        </div>
      </div>

      {/* Quick Action Dialog */}
      <QuickActionsModal
        action={activeAction}
        onClose={() => setActiveAction(null)}
        onSuccess={loadData}
      />
    </AppShell>
  );
}
