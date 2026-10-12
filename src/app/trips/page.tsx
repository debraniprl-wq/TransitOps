'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Navigation,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Download,
  Truck,
  User,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { DataProvider } from '@/lib/data-provider';
import { exportToCSV } from '@/lib/calculations';
import { Trip, Vehicle, Driver, TripStatus } from '@/types';

export default function TripsPage() {
  const { showToast } = useToast();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Sorting
  const [sortField, setSortField] = useState<keyof Trip>('planned_departure');
  const [sortAsc, setSortAsc] = useState(false);

  // Modals & Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);
  const [completingTrip, setCompletingTrip] = useState<Trip | null>(null);
  const [cancellingTripId, setCancellingTripId] = useState<string | null>(null);
  const [dispatchingTripId, setDispatchingTripId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    planned_distance_km: '',
    cargo_weight_kg: '',
    vehicle_id: '',
    driver_id: '',
    planned_departure: '',
    notes: '',
  });

  // Complete Form State
  const [completeData, setCompleteData] = useState({
    actual_distance_km: '',
    fuel_consumed_litres: '',
    revenue: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [t, v, d] = await Promise.all([
      DataProvider.getTrips(),
      DataProvider.getVehicles(),
      DataProvider.getDrivers(),
    ]);
    setTrips(t);
    setVehicles(v);
    setDrivers(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('search');
      if (s) setSearch(s);
    }
  }, []);

  const handleSort = (field: keyof Trip) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const selectedVehicleForForm = vehicles.find((v) => v.id === formData.vehicle_id);

  const filteredAndSortedTrips = useMemo(() => {
    return trips
      .filter((t) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches =
            t.trip_code.toLowerCase().includes(q) ||
            t.source.toLowerCase().includes(q) ||
            t.destination.toLowerCase().includes(q) ||
            (t.vehicle && t.vehicle.reg_number.toLowerCase().includes(q)) ||
            (t.driver && t.driver.name.toLowerCase().includes(q));
          if (!matches) return false;
        }
        if (filterStatus !== 'All' && t.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal === undefined || aVal === null || bVal === undefined || bVal === null) return 0;
        if (aVal < bVal) return sortAsc ? -1 : 1;
        if (aVal > bVal) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [trips, search, filterStatus, sortField, sortAsc]);

  // Create Trip
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    const res = await DataProvider.createTrip({
      source: formData.source,
      destination: formData.destination,
      planned_distance_km: Number(formData.planned_distance_km),
      cargo_weight_kg: Number(formData.cargo_weight_kg),
      vehicle_id: formData.vehicle_id,
      driver_id: formData.driver_id,
      planned_departure: formData.planned_departure,
      notes: formData.notes,
    });
    setActionLoading(false);

    if (res.success) {
      showToast(`Trip ${res.data?.trip_code} created as Draft`, 'success');
      setIsCreateOpen(false);
      setFormData({
        source: '',
        destination: '',
        planned_distance_km: '',
        cargo_weight_kg: '',
        vehicle_id: '',
        driver_id: '',
        planned_departure: '',
        notes: '',
      });
      loadData();
    } else {
      showToast(res.error || 'Failed to create trip', 'error');
    }
  };

  // Dispatch Trip
  const handleDispatchConfirm = async () => {
    if (!dispatchingTripId) return;
    setActionLoading(true);
    const res = await DataProvider.dispatchTrip(dispatchingTripId);
    setActionLoading(false);

    if (res.success) {
      showToast(res.message || 'Trip dispatched', 'success');
      setDispatchingTripId(null);
      loadData();
    } else {
      showToast(res.error || 'Dispatch rejected', 'error');
      setDispatchingTripId(null);
    }
  };

  // Open Complete Dialog
  const handleOpenComplete = (trip: Trip) => {
    setCompletingTrip(trip);
    setCompleteData({
      actual_distance_km: String(trip.planned_distance_km),
      fuel_consumed_litres: String(Math.round(trip.planned_distance_km * 0.3)),
      revenue: trip.revenue ? String(trip.revenue) : '2500',
    });
  };

  // Submit Complete Trip
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTrip) return;
    setActionLoading(true);

    const res = await DataProvider.completeTrip(completingTrip.id, {
      actual_distance_km: Number(completeData.actual_distance_km),
      fuel_consumed_litres: Number(completeData.fuel_consumed_litres),
      revenue: Number(completeData.revenue),
    });
    setActionLoading(false);

    if (res.success) {
      showToast(res.message || 'Trip completed', 'success');
      setCompletingTrip(null);
      loadData();
    } else {
      showToast(res.error || 'Failed to complete trip', 'error');
    }
  };

  // Cancel Trip
  const handleCancelConfirm = async () => {
    if (!cancellingTripId) return;
    setActionLoading(true);
    const res = await DataProvider.cancelTrip(cancellingTripId);
    setActionLoading(false);

    if (res.success) {
      showToast(res.message || 'Trip cancelled', 'info');
      setCancellingTripId(null);
      loadData();
    } else {
      showToast(res.error || 'Cancellation failed', 'error');
      setCancellingTripId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Trip Code',
      'Source',
      'Destination',
      'Planned Dist (km)',
      'Actual Dist (km)',
      'Cargo (kg)',
      'Vehicle Reg',
      'Driver Name',
      'Departure',
      'Fuel (L)',
      'Revenue ($)',
      'Status',
    ];
    const rows = filteredAndSortedTrips.map((t) => [
      t.trip_code,
      t.source,
      t.destination,
      t.planned_distance_km,
      t.actual_distance_km || '',
      t.cargo_weight_kg,
      t.vehicle ? t.vehicle.reg_number : '',
      t.driver ? t.driver.name : '',
      t.planned_departure,
      t.fuel_consumed_litres || '',
      t.revenue || '',
      t.status,
    ]);
    exportToCSV('TransitOps_Trips_Manifest', headers, rows);
    showToast('Trips CSV exported', 'success');
  };

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2DDD1]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#193C49] tracking-tight">
            Trips &amp; Dispatch Management
          </h2>
          <p className="text-xs sm:text-sm text-[#71818A] mt-0.5">
            Manifest lifecycle: Draft &rarr; Dispatched &rarr; Completed with automated asset allocation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-[#FFFEFA] border border-[#E2DDD1] hover:bg-[#F5F2E9] text-[#193C49] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#71818A]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-2 bg-[#23866D] hover:bg-[#1D735D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Trip</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#71818A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search trip code, route, vehicle, driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#71818A]">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button
            onClick={loadData}
            title="Refresh records"
            className="p-1.5 rounded-lg border border-[#E2DDD1] text-[#71818A] hover:bg-[#F5F2E9]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#23866D]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#EAE5D9] text-[#71818A] uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => handleSort('trip_code')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Trip Code <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">Origin &rarr; Destination</th>
                <th
                  onClick={() => handleSort('planned_distance_km')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Distance &amp; Cargo <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">Vehicle</th>
                <th className="py-3 px-4 font-semibold">Driver</th>
                <th
                  onClick={() => handleSort('planned_departure')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Departure <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Status <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE1]">
              {filteredAndSortedTrips.map((t) => (
                <tr key={t.id} className="hover:bg-[#FAF8F3] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#193C49]">
                    {t.trip_code}
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    <div className="font-semibold truncate max-w-[200px]">{t.source}</div>
                    <div className="text-[11px] text-[#71818A] truncate max-w-[200px]">&rarr; {t.destination}</div>
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    <div className="font-medium">{t.planned_distance_km.toLocaleString()} km</div>
                    <div className="text-[11px] text-[#71818A]">{t.cargo_weight_kg.toLocaleString()} kg payload</div>
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    {t.vehicle ? (
                      <div>
                        <div className="font-medium">{t.vehicle.reg_number}</div>
                        <div className="text-[11px] text-[#71818A]">{t.vehicle.model}</div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    {t.driver ? (
                      <div>
                        <div className="font-medium">{t.driver.name}</div>
                        <div className="text-[11px] text-[#23866D]">Safety: {t.driver.safety_score}%</div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    <div>{new Date(t.planned_departure).toLocaleDateString()}</div>
                    <div className="text-[11px] text-[#71818A]">
                      {new Date(t.planned_departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={t.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingTrip(t)}
                        title="View Trip Manifest"
                        className="p-1 rounded-md text-[#71818A] hover:text-[#193C49] hover:bg-stone-200"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* DISPATCH ACTION (Only for Draft) */}
                      {t.status === 'Draft' && (
                        <button
                          onClick={() => setDispatchingTripId(t.id)}
                          title="Dispatch Trip"
                          className="px-2 py-1 rounded-md bg-[#23866D] hover:bg-[#1D735D] text-white text-[11px] font-medium flex items-center gap-1 shadow-2xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>Dispatch</span>
                        </button>
                      )}

                      {/* COMPLETE ACTION (Only for Dispatched) */}
                      {t.status === 'Dispatched' && (
                        <button
                          onClick={() => handleOpenComplete(t)}
                          title="Complete Trip"
                          className="px-2 py-1 rounded-md bg-[#4F91D8] hover:bg-[#3B7BBF] text-white text-[11px] font-medium flex items-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Complete</span>
                        </button>
                      )}

                      {/* CANCEL ACTION (For Draft or Dispatched) */}
                      {(t.status === 'Draft' || t.status === 'Dispatched') && (
                        <button
                          onClick={() => setCancellingTripId(t.id)}
                          title="Cancel Trip"
                          className="p-1 rounded-md text-[#71818A] hover:text-[#D95353] hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAndSortedTrips.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#71818A]">
                    No trips found matching current search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[#EAE5D9] bg-[#FAF8F3] text-xs text-[#71818A] flex justify-between items-center">
          <span>Showing {filteredAndSortedTrips.length} of {trips.length} freight manifests</span>
          <span>Double-booking prevention: Enabled</span>
        </div>
      </div>

      {/* CREATE TRIP MODAL */}
      {isCreateOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Trip Manifest"
          subtitle="Strict validation against vehicle capacity, maintenance status, and driver credentials"
          maxWidth="xl"
        >
          <form onSubmit={handleCreateTrip} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Source / Origin *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dallas Freight Hub, TX"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Destination *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicago Distribution Yard, IL"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Planned Distance (km) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="1480"
                  value={formData.planned_distance_km}
                  onChange={(e) => setFormData({ ...formData, planned_distance_km: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Cargo Weight (kg) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="22000"
                  value={formData.cargo_weight_kg}
                  onChange={(e) => setFormData({ ...formData, cargo_weight_kg: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Planned Departure *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.planned_departure}
                  onChange={(e) => setFormData({ ...formData, planned_departure: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Assign Available Vehicle *
                </label>
                <select
                  required
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="">-- Select Available Vehicle --</option>
                  {vehicles
                    .filter((v) => v.status === 'Available')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg_number} - {v.model} (Max {v.max_capacity_kg.toLocaleString()} kg)
                      </option>
                    ))}
                </select>
                {selectedVehicleForForm && (
                  <p className="text-[11px] text-[#23866D] mt-1">
                    Max payload capacity: {selectedVehicleForForm.max_capacity_kg.toLocaleString()} kg
                    {Number(formData.cargo_weight_kg) > selectedVehicleForForm.max_capacity_kg && (
                      <span className="text-[#D95353] font-bold block">
                        Warning: Cargo exceeds vehicle capacity!
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Assign Available Driver *
                </label>
                <select
                  required
                  value={formData.driver_id}
                  onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="">-- Select Available Driver --</option>
                  {drivers
                    .filter(
                      (d) =>
                        d.status === 'Available' &&
                        new Date(d.license_expiry) >= new Date()
                    )
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.license_category}) - Safety: {d.safety_score}%
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">Manifest Notes</label>
              <textarea
                rows={2}
                placeholder="Special handling instructions, gate codes, temperature thresholds..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#71818A] hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-medium bg-[#23866D] hover:bg-[#1D735D] text-white rounded-lg shadow-xs"
              >
                {actionLoading ? 'Creating...' : 'Create Draft Trip'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* COMPLETE TRIP MODAL */}
      {completingTrip && (
        <Modal
          isOpen={true}
          onClose={() => setCompletingTrip(null)}
          title={`Complete Trip: ${completingTrip.trip_code}`}
          subtitle="Record actual telemetry distance, fuel consumption, and freight revenue"
          maxWidth="md"
        >
          <form onSubmit={handleCompleteSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-[#EDF5FD] border border-[#C7E0FA] text-xs text-[#2B6CB0]">
              Completing this trip will automatically release Vehicle (
              <strong>{completingTrip.vehicle?.reg_number}</strong>) and Driver (
              <strong>{completingTrip.driver?.name}</strong>) back to Available status, increment
              odometer by actual distance, and log fuel consumption.
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">
                Actual Distance Travelled (km) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={completeData.actual_distance_km}
                onChange={(e) =>
                  setCompleteData({ ...completeData, actual_distance_km: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">
                Actual Fuel Consumed (Litres) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={completeData.fuel_consumed_litres}
                onChange={(e) =>
                  setCompleteData({ ...completeData, fuel_consumed_litres: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">
                Freight Revenue Recorded ($) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={completeData.revenue}
                onChange={(e) =>
                  setCompleteData({ ...completeData, revenue: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompletingTrip(null)}
                className="px-4 py-2 text-xs font-medium text-[#71818A] hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-medium bg-[#4F91D8] hover:bg-[#3B7BBF] text-white rounded-lg shadow-xs"
              >
                {actionLoading ? 'Completing...' : 'Complete & Release Resources'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW TRIP MODAL */}
      {viewingTrip && (
        <Modal
          isOpen={true}
          onClose={() => setViewingTrip(null)}
          title={`Trip Manifest: ${viewingTrip.trip_code}`}
          subtitle={`${viewingTrip.source} &rarr; ${viewingTrip.destination}`}
          maxWidth="lg"
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <div>
                <span className="text-[#71818A]">Manifest Status:</span>
                <div className="mt-1"><StatusBadge status={viewingTrip.status} size="sm" /></div>
              </div>
              <div className="text-right">
                <span className="text-[#71818A]">Planned Departure:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">
                  {new Date(viewingTrip.planned_departure).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <div>
                <span className="text-[#71818A]">Assigned Vehicle:</span>
                <p className="font-bold text-[#193C49] mt-0.5">
                  {viewingTrip.vehicle ? `${viewingTrip.vehicle.reg_number} (${viewingTrip.vehicle.model})` : 'Unassigned'}
                </p>
                <span className="text-[11px] text-[#71818A]">
                  Max Capacity: {viewingTrip.vehicle?.max_capacity_kg.toLocaleString()} kg
                </span>
              </div>
              <div>
                <span className="text-[#71818A]">Assigned Driver:</span>
                <p className="font-bold text-[#193C49] mt-0.5">
                  {viewingTrip.driver ? viewingTrip.driver.name : 'Unassigned'}
                </p>
                <span className="text-[11px] text-[#23866D]">
                  Safety Score: {viewingTrip.driver?.safety_score}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <div>
                <span className="text-[#71818A]">Distance Planned:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">{viewingTrip.planned_distance_km} km</p>
              </div>
              <div>
                <span className="text-[#71818A]">Cargo Weight:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">{viewingTrip.cargo_weight_kg.toLocaleString()} kg</p>
              </div>
              <div>
                <span className="text-[#71818A]">Revenue:</span>
                <p className="font-semibold text-[#23866D] mt-0.5">${viewingTrip.revenue || '0.00'}</p>
              </div>
            </div>

            {viewingTrip.actual_distance_km !== undefined && viewingTrip.actual_distance_km !== null && (
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#E8F5F1] border border-[#C2E3D8]">
                <div>
                  <span className="text-[#1E735E] font-medium">Actual Telemetry Distance:</span>
                  <p className="font-bold text-[#193C49] mt-0.5">{viewingTrip.actual_distance_km} km</p>
                </div>
                <div>
                  <span className="text-[#1E735E] font-medium">Actual Fuel Consumed:</span>
                  <p className="font-bold text-[#193C49] mt-0.5">{viewingTrip.fuel_consumed_litres} Litres</p>
                </div>
              </div>
            )}

            {viewingTrip.notes && (
              <div className="p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
                <span className="text-[#71818A]">Manifest Notes:</span>
                <p className="text-[#193C49] mt-0.5 leading-relaxed">{viewingTrip.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAE5D9] flex justify-end">
            <button
              onClick={() => setViewingTrip(null)}
              className="px-4 py-2 text-xs font-medium text-[#193C49] bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* DISPATCH CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(dispatchingTripId)}
        onClose={() => setDispatchingTripId(null)}
        onConfirm={handleDispatchConfirm}
        title="Dispatch Trip Manifest"
        message="Dispatching this trip will atomically set the trip status to 'Dispatched', update the assigned vehicle and driver statuses to 'On Trip', and lock resources against conflicting double-booking."
        confirmLabel="Dispatch Now"
        isLoading={actionLoading}
      />

      {/* CANCEL CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(cancellingTripId)}
        onClose={() => setCancellingTripId(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Trip Manifest"
        message="Are you sure you want to cancel this trip? Any resources currently locked or dispatched will be safely returned to Available status."
        confirmLabel="Cancel Trip"
        isDestructive={true}
        isLoading={actionLoading}
      />
    </AppShell>
  );
}
