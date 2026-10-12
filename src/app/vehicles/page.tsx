'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Archive,
  Download,
  Printer,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { DataProvider } from '@/lib/data-provider';
import { exportToCSV, exportToPrintOrPDF } from '@/lib/calculations';
import { Vehicle, VehicleType, VehicleRegion, VehicleStatus } from '@/types';

export default function VehiclesPage() {
  const { showToast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRegion, setFilterRegion] = useState('All');

  // Sorting
  const [sortField, setSortField] = useState<keyof Vehicle>('reg_number');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    reg_number: '',
    model: '',
    type: 'Truck' as VehicleType,
    max_capacity_kg: '',
    odometer_km: '',
    acquisition_cost: '',
    region: 'Central' as VehicleRegion,
    status: 'Available' as VehicleStatus,
  });

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    const data = await DataProvider.getVehicles();
    setVehicles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // Check URL params for direct search (e.g. from navbar global search)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('search');
      if (s) setSearch(s);
    }
  }, []);

  const handleSort = (field: keyof Vehicle) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredAndSortedVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches =
            v.reg_number.toLowerCase().includes(q) ||
            v.model.toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (filterType !== 'All' && v.type !== filterType) return false;
        if (filterStatus !== 'All' && v.status !== filterStatus) return false;
        if (filterRegion !== 'All' && v.region !== filterRegion) return false;
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
  }, [vehicles, search, filterType, filterStatus, filterRegion, sortField, sortAsc]);

  const handleOpenAdd = () => {
    setFormData({
      reg_number: '',
      model: '',
      type: 'Truck',
      max_capacity_kg: '',
      odometer_km: '0',
      acquisition_cost: '0',
      region: 'Central',
      status: 'Available',
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      reg_number: v.reg_number,
      model: v.model,
      type: v.type,
      max_capacity_kg: String(v.max_capacity_kg),
      odometer_km: String(v.odometer_km),
      acquisition_cost: String(v.acquisition_cost),
      region: v.region,
      status: v.status,
    });
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    if (editingVehicle) {
      const res = await DataProvider.updateVehicle(editingVehicle.id, {
        reg_number: formData.reg_number,
        model: formData.model,
        type: formData.type,
        max_capacity_kg: Number(formData.max_capacity_kg),
        odometer_km: Number(formData.odometer_km),
        acquisition_cost: Number(formData.acquisition_cost),
        region: formData.region,
        status: formData.status,
      });
      setActionLoading(false);
      if (res.success) {
        showToast(`Vehicle ${formData.reg_number} updated`, 'success');
        setEditingVehicle(null);
        loadVehicles();
      } else {
        showToast(res.error || 'Failed to update vehicle', 'error');
      }
    } else {
      const res = await DataProvider.createVehicle({
        reg_number: formData.reg_number,
        model: formData.model,
        type: formData.type,
        max_capacity_kg: Number(formData.max_capacity_kg),
        odometer_km: Number(formData.odometer_km) || 0,
        acquisition_cost: Number(formData.acquisition_cost) || 0,
        region: formData.region,
        status: formData.status,
      });
      setActionLoading(false);
      if (res.success) {
        showToast(`Vehicle ${res.data?.reg_number} added`, 'success');
        setIsAddOpen(false);
        loadVehicles();
      } else {
        showToast(res.error || 'Failed to create vehicle', 'error');
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVehicleId) return;
    setActionLoading(true);
    const res = await DataProvider.deleteVehicle(deletingVehicleId);
    setActionLoading(false);

    if (res.success) {
      showToast('Vehicle deleted successfully', 'success');
      setDeletingVehicleId(null);
      loadVehicles();
    } else {
      showToast(res.error || 'Deletion blocked', 'error');
      setDeletingVehicleId(null);
    }
  };

  const handleRetireVehicle = async (v: Vehicle) => {
    const res = await DataProvider.updateVehicle(v.id, { status: 'Retired' });
    if (res.success) {
      showToast(`Vehicle ${v.reg_number} status set to Retired`, 'info');
      loadVehicles();
    } else {
      showToast(res.error || 'Failed to retire vehicle', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Registration Number', 'Model', 'Type', 'Max Capacity (kg)', 'Odometer (km)', 'Acquisition Cost ($)', 'Region', 'Status'];
    const rows = filteredAndSortedVehicles.map((v) => [
      v.reg_number,
      v.model,
      v.type,
      v.max_capacity_kg,
      v.odometer_km,
      v.acquisition_cost,
      v.region,
      v.status,
    ]);
    exportToCSV('TransitOps_Vehicles_Export', headers, rows);
    showToast('Vehicles CSV exported (open with Excel / Sheets)', 'success');
  };

  const handleExportPDF = () => {
    const headers = [
      'Registration',
      'Model',
      'Type',
      'Capacity (kg)',
      'Odometer (km)',
      'Acquisition ($)',
      'Region',
      'Status',
    ];
    const rows = filteredAndSortedVehicles.map((v) => [
      v.reg_number,
      v.model,
      v.type,
      v.max_capacity_kg.toLocaleString(),
      v.odometer_km.toLocaleString(),
      `$${v.acquisition_cost.toLocaleString()}`,
      v.region,
      v.status,
    ]);
    exportToPrintOrPDF('Fleet Vehicles Registry', headers, rows);
    showToast('Opened printable report (Save as PDF)', 'success');
  };

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2DDD1]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#193C49] tracking-tight">
            Fleet Vehicle Management
          </h2>
          <p className="text-xs sm:text-sm text-[#71818A] mt-0.5">
            Asset registry, specifications, payload ratings, and operational statuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Download CSV spreadsheet file (for Excel / Google Sheets)"
            className="px-3 py-2 bg-[#FFFEFA] border border-[#E2DDD1] hover:bg-[#F5F2E9] text-[#193C49] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#71818A]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            title="Open Printable Report / Save as PDF (for Adobe Acrobat / Print)"
            className="px-3 py-2 bg-[#FFFEFA] border border-[#E2DDD1] hover:bg-[#F5F2E9] text-[#193C49] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-[#71818A]" />
            <span>PDF / Print</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-[#23866D] hover:bg-[#1D735D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#71818A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search registration or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#71818A]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          >
            <option value="All">All Types</option>
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Bus">Bus</option>
            <option value="Trailer">Trailer</option>
            <option value="Electric">Electric</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>

          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          >
            <option value="All">All Regions</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
            <option value="Central">Central</option>
          </select>

          <button
            onClick={loadVehicles}
            title="Refresh records"
            className="p-1.5 rounded-lg border border-[#E2DDD1] text-[#71818A] hover:bg-[#F5F2E9]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#23866D]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#EAE5D9] text-[#71818A] uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => handleSort('reg_number')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Registration <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('model')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Model &amp; Type <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('max_capacity_kg')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Max Capacity <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('odometer_km')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Odometer <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('region')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Region <ArrowUpDown className="w-3 h-3" />
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
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE1]">
              {filteredAndSortedVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-[#FAF8F3] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#193C49]">
                    {v.reg_number}
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    <div className="font-medium">{v.model}</div>
                    <div className="text-[11px] text-[#71818A]">{v.type}</div>
                  </td>
                  <td className="py-3 px-4 text-[#193C49] font-medium">
                    {v.max_capacity_kg.toLocaleString()} kg
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    {v.odometer_km.toLocaleString()} km
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    <span className="px-2 py-0.5 rounded-md bg-[#F5F2E9] border border-[#E2DDD1] text-[11px]">
                      {v.region} Hub
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={v.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingVehicle(v)}
                        title="View Vehicle Specs"
                        className="p-1 rounded-md text-[#71818A] hover:text-[#193C49] hover:bg-stone-200"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(v)}
                        title="Edit Vehicle Details"
                        className="p-1 rounded-md text-[#71818A] hover:text-[#23866D] hover:bg-stone-200"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {v.status !== 'Retired' && (
                        <button
                          onClick={() => handleRetireVehicle(v)}
                          title="Retire Asset"
                          className="p-1 rounded-md text-[#71818A] hover:text-[#E9A23B] hover:bg-stone-200"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingVehicleId(v.id)}
                        title="Delete Vehicle"
                        className="p-1 rounded-md text-[#71818A] hover:text-[#D95353] hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAndSortedVehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#71818A]">
                    No vehicles found matching current search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[#EAE5D9] bg-[#FAF8F3] text-xs text-[#71818A] flex justify-between items-center">
          <span>Showing {filteredAndSortedVehicles.length} of {vehicles.length} fleet assets</span>
          <span>Database state: Verified</span>
        </div>
      </div>

      {/* VIEW VEHICLE MODAL */}
      {viewingVehicle && (
        <Modal
          isOpen={true}
          onClose={() => setViewingVehicle(null)}
          title={`Asset Specs: ${viewingVehicle.reg_number}`}
          subtitle={viewingVehicle.model}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <div>
                <span className="text-[#71818A]">Status:</span>
                <div className="mt-1"><StatusBadge status={viewingVehicle.status} size="sm" /></div>
              </div>
              <div>
                <span className="text-[#71818A]">Vehicle Type:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">{viewingVehicle.type}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <div>
                <span className="text-[#71818A]">Max Load Capacity:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">{viewingVehicle.max_capacity_kg.toLocaleString()} kg</p>
              </div>
              <div>
                <span className="text-[#71818A]">Current Odometer:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">{viewingVehicle.odometer_km.toLocaleString()} km</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <div>
                <span className="text-[#71818A]">Acquisition Cost:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">${viewingVehicle.acquisition_cost.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[#71818A]">Assigned Region Hub:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">{viewingVehicle.region} Region</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EAE5D9] flex justify-end">
            <button
              onClick={() => setViewingVehicle(null)}
              className="px-4 py-2 text-xs font-medium text-[#193C49] bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* ADD / EDIT MODAL */}
      {(isAddOpen || editingVehicle) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddOpen(false);
            setEditingVehicle(null);
          }}
          title={editingVehicle ? `Edit Vehicle: ${editingVehicle.reg_number}` : 'Add New Fleet Vehicle'}
          subtitle="All fields validate against fleet database rules"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveVehicle} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FL-9920-IL"
                  value={formData.reg_number}
                  onChange={(e) => setFormData({ ...formData, reg_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Model / Asset Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Volvo FH16 Globetrotter"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as VehicleType })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Bus">Bus</option>
                  <option value="Trailer">Trailer</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Max Capacity (kg) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.max_capacity_kg}
                  onChange={(e) => setFormData({ ...formData, max_capacity_kg: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Region Hub</label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value as VehicleRegion })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="Central">Central</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Odometer (km)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.odometer_km}
                  onChange={(e) => setFormData({ ...formData, odometer_km: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Acquisition Cost ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.acquisition_cost}
                  onChange={(e) => setFormData({ ...formData, acquisition_cost: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="In Shop">In Shop</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingVehicle(null);
                }}
                className="px-4 py-2 text-xs font-medium text-[#71818A] hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-medium bg-[#23866D] hover:bg-[#1D735D] text-white rounded-lg shadow-xs"
              >
                {actionLoading ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingVehicleId)}
        onClose={() => setDeletingVehicleId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Vehicle Asset"
        message="Are you sure you want to delete this vehicle? Deletion will be safely blocked if the vehicle is currently attached to active trips or maintenance schedules."
        confirmLabel="Delete Asset"
        isDestructive={true}
        isLoading={actionLoading}
      />
    </AppShell>
  );
}
