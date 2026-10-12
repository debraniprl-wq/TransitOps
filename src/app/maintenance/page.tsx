'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Play,
  Eye,
  RefreshCw,
  Download,
  Printer,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { DataProvider } from '@/lib/data-provider';
import { exportToCSV, exportToPrintOrPDF } from '@/lib/calculations';
import { MaintenanceRecord, MaintenanceType, MaintenanceStatus, Vehicle } from '@/types';

export default function MaintenancePage() {
  const { showToast } = useToast();

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');

  // Sorting
  const [sortField, setSortField] = useState<keyof MaintenanceRecord>('start_date');
  const [sortAsc, setSortAsc] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<MaintenanceRecord | null>(null);
  const [completingRecord, setCompletingRecord] = useState<MaintenanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states: Create
  const [formData, setFormData] = useState({
    vehicle_id: '',
    maintenance_type: 'Scheduled Service' as MaintenanceType,
    description: '',
    cost: '',
    start_date: '',
    expected_completion: '',
    status: 'Scheduled' as MaintenanceStatus,
    notes: '',
  });

  // Form states: Complete
  const [completeDate, setCompleteDate] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [m, v] = await Promise.all([
      DataProvider.getMaintenanceRecords(),
      DataProvider.getVehicles(),
    ]);
    setRecords(m);
    setVehicles(v);
    setLoading(false);
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData((prev) => ({ ...prev, start_date: today }));
    setCompleteDate(today);
    loadData();
  }, [loadData]);

  const handleSort = (field: keyof MaintenanceRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredAndSortedRecords = useMemo(() => {
    return records
      .filter((r) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches =
            r.description.toLowerCase().includes(q) ||
            r.maintenance_type.toLowerCase().includes(q) ||
            (r.vehicle && r.vehicle.reg_number.toLowerCase().includes(q)) ||
            (r.vehicle && r.vehicle.model.toLowerCase().includes(q));
          if (!matches) return false;
        }
        if (filterStatus !== 'All' && r.status !== filterStatus) return false;
        if (filterType !== 'All' && r.maintenance_type !== filterType) return false;
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
  }, [records, search, filterStatus, filterType, sortField, sortAsc]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    const res = await DataProvider.createMaintenanceRecord({
      vehicle_id: formData.vehicle_id,
      maintenance_type: formData.maintenance_type,
      description: formData.description,
      cost: Number(formData.cost) || 0,
      start_date: formData.start_date,
      expected_completion: formData.expected_completion,
      status: formData.status,
      notes: formData.notes,
    });
    setActionLoading(false);

    if (res.success) {
      showToast('Maintenance schedule created successfully', 'success');
      setIsCreateOpen(false);
      setFormData({
        vehicle_id: '',
        maintenance_type: 'Scheduled Service',
        description: '',
        cost: '',
        start_date: new Date().toISOString().split('T')[0],
        expected_completion: '',
        status: 'Scheduled',
        notes: '',
      });
      loadData();
    } else {
      showToast(res.error || 'Failed to schedule maintenance', 'error');
    }
  };

  // Start Maintenance (Transitions vehicle to In Shop)
  const handleStartMaintenance = async (record: MaintenanceRecord) => {
    setActionLoading(true);
    const res = await DataProvider.updateMaintenanceStatus(record.id, 'In Progress');
    setActionLoading(false);

    if (res.success) {
      showToast(`Work started. Vehicle ${record.vehicle?.reg_number} status set to In Shop`, 'info');
      loadData();
    } else {
      showToast(res.error || 'Failed to start maintenance', 'error');
    }
  };

  // Complete Maintenance (Restores vehicle to Available)
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRecord) return;
    setActionLoading(true);

    const res = await DataProvider.updateMaintenanceStatus(completingRecord.id, 'Completed', {
      actual_completion: completeDate,
      notes: completeNotes,
    });
    setActionLoading(false);

    if (res.success) {
      showToast(`Maintenance completed. Vehicle ${completingRecord.vehicle?.reg_number} restored to Available`, 'success');
      setCompletingRecord(null);
      loadData();
    } else {
      showToast(res.error || 'Failed to complete maintenance', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Vehicle Reg',
      'Vehicle Model',
      'Type',
      'Description',
      'Cost ($)',
      'Start Date',
      'Expected Completion',
      'Actual Completion',
      'Status',
    ];
    const rows = filteredAndSortedRecords.map((r) => [
      r.vehicle ? r.vehicle.reg_number : '',
      r.vehicle ? r.vehicle.model : '',
      r.maintenance_type,
      r.description,
      r.cost,
      r.start_date,
      r.expected_completion,
      r.actual_completion || '',
      r.status,
    ]);
    exportToCSV('TransitOps_Maintenance_Logs', headers, rows);
    showToast('Maintenance logs exported to CSV (open with Excel / Sheets)', 'success');
  };

  const handleExportPDF = () => {
    const headers = [
      'Vehicle Reg',
      'Model',
      'Service Type',
      'Description',
      'Cost ($)',
      'Start Date',
      'Expected Finish',
      'Actual Finish',
      'Status',
    ];
    const rows = filteredAndSortedRecords.map((r) => [
      r.vehicle ? r.vehicle.reg_number : '',
      r.vehicle ? r.vehicle.model : '',
      r.maintenance_type,
      r.description,
      `$${r.cost.toLocaleString()}`,
      r.start_date,
      r.expected_completion,
      r.actual_completion || '—',
      r.status,
    ]);
    exportToPrintOrPDF('Maintenance & Workshop Service Logs', headers, rows);
    showToast('Opened printable report (Save as PDF)', 'success');
  };

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2DDD1]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#193C49] tracking-tight">
            Fleet Maintenance &amp; Workshop Servicing
          </h2>
          <p className="text-xs sm:text-sm text-[#71818A] mt-0.5">
            Preventative servicing, repair logs, bay staging, and vehicle availability locking
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
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-2 bg-[#23866D] hover:bg-[#1D735D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Maintenance</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#71818A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search maintenance description or vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#71818A]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress (In Shop)</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          >
            <option value="All">All Categories</option>
            <option value="Scheduled Service">Scheduled Service</option>
            <option value="Engine Repair">Engine Repair</option>
            <option value="Brake Overhaul">Brake Overhaul</option>
            <option value="Inspection">Inspection</option>
            <option value="Tire Replacement">Tire Replacement</option>
            <option value="Electrical System">Electrical System</option>
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

      {/* Maintenance Table */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#EAE5D9] text-[#71818A] uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => handleSort('maintenance_type')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Work Category <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">Vehicle</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th
                  onClick={() => handleSort('cost')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Cost ($) <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('start_date')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Schedule Dates <ArrowUpDown className="w-3 h-3" />
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
              {filteredAndSortedRecords.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAF8F3] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#193C49]">
                    {r.maintenance_type}
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    {r.vehicle ? (
                      <div>
                        <div className="font-semibold">{r.vehicle.reg_number}</div>
                        <div className="text-[11px] text-[#71818A]">{r.vehicle.model}</div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    <div className="max-w-[240px] truncate" title={r.description}>
                      {r.description}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#193C49] font-semibold">
                    ${r.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    <div>Start: {r.start_date}</div>
                    <div className="text-[11px] text-[#71818A]">Due: {r.expected_completion}</div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingRecord(r)}
                        title="View Details"
                        className="p-1 rounded-md text-[#71818A] hover:text-[#193C49] hover:bg-stone-200"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Start work */}
                      {r.status === 'Scheduled' && (
                        <button
                          onClick={() => handleStartMaintenance(r)}
                          disabled={actionLoading}
                          title="Begin Work (Sets vehicle to In Shop)"
                          className="px-2 py-1 rounded-md bg-[#E9A23B] hover:bg-[#D48F2A] text-white text-[11px] font-medium flex items-center gap-1 shadow-2xs"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start</span>
                        </button>
                      )}

                      {/* Complete work */}
                      {r.status === 'In Progress' && (
                        <button
                          onClick={() => setCompletingRecord(r)}
                          title="Finish Maintenance (Restores vehicle to Available)"
                          className="px-2 py-1 rounded-md bg-[#23866D] hover:bg-[#1D735D] text-white text-[11px] font-medium flex items-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Complete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAndSortedRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#71818A]">
                    No maintenance records found matching current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[#EAE5D9] bg-[#FAF8F3] text-xs text-[#71818A] flex justify-between items-center">
          <span>Showing {filteredAndSortedRecords.length} records</span>
          <span>In Shop conflict guard: Active</span>
        </div>
      </div>

      {/* CREATE MAINTENANCE MODAL */}
      {isCreateOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateOpen(false)}
          title="Schedule Vehicle Maintenance"
          subtitle="Vehicles currently On Trip cannot enter immediate In-Shop maintenance"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Target Vehicle *
                </label>
                <select
                  required
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="">-- Select Fleet Vehicle --</option>
                  {vehicles
                    .filter((v) => v.status !== 'Retired')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg_number} - {v.model} ({v.status})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Maintenance Type
                </label>
                <select
                  value={formData.maintenance_type}
                  onChange={(e) =>
                    setFormData({ ...formData, maintenance_type: e.target.value as MaintenanceType })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="Scheduled Service">Scheduled Service</option>
                  <option value="Engine Repair">Engine Repair</option>
                  <option value="Brake Overhaul">Brake Overhaul</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Tire Replacement">Tire Replacement</option>
                  <option value="Electrical System">Electrical System</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">
                Description of Work *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Diagnostic findings, parts requiring replacement, inspection items..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Estimated Cost ($)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="850"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Expected Completion *
                </label>
                <input
                  type="date"
                  required
                  value={formData.expected_completion}
                  onChange={(e) => setFormData({ ...formData, expected_completion: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as MaintenanceStatus })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress (Sets In Shop)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Technician / Bay</label>
                <input
                  type="text"
                  placeholder="e.g. Bay 2, Tech Ramirez"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
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
                {actionLoading ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* COMPLETE MAINTENANCE MODAL */}
      {completingRecord && (
        <Modal
          isOpen={true}
          onClose={() => setCompletingRecord(null)}
          title={`Complete Maintenance: ${completingRecord.maintenance_type}`}
          subtitle={`Vehicle ${completingRecord.vehicle?.reg_number} will be restored to Available`}
          maxWidth="md"
        >
          <form onSubmit={handleCompleteSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">
                Actual Completion Date *
              </label>
              <input
                type="date"
                required
                value={completeDate}
                onChange={(e) => setCompleteDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">
                Completion Notes / Quality Sign-off
              </label>
              <textarea
                rows={2}
                placeholder="Post-repair dyno passed, calipers torque-checked, fluids verified..."
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompletingRecord(null)}
                className="px-4 py-2 text-xs font-medium text-[#71818A] hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-medium bg-[#23866D] hover:bg-[#1D735D] text-white rounded-lg shadow-xs"
              >
                {actionLoading ? 'Completing...' : 'Sign Off & Return Vehicle'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW RECORD MODAL */}
      {viewingRecord && (
        <Modal
          isOpen={true}
          onClose={() => setViewingRecord(null)}
          title={`Maintenance Record: ${viewingRecord.maintenance_type}`}
          subtitle={viewingRecord.vehicle ? `${viewingRecord.vehicle.model} (${viewingRecord.vehicle.reg_number})` : 'Vehicle'}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <div>
                <span className="text-[#71818A]">Status:</span>
                <div className="mt-1"><StatusBadge status={viewingRecord.status} size="sm" /></div>
              </div>
              <div className="text-right">
                <span className="text-[#71818A]">Cost:</span>
                <p className="font-bold text-sm text-[#193C49] mt-0.5">${viewingRecord.cost}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <span className="text-[#71818A]">Description:</span>
              <p className="font-medium text-[#193C49] mt-1 leading-relaxed">{viewingRecord.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <div>
                <span className="text-[#71818A]">Start Date:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">{viewingRecord.start_date}</p>
              </div>
              <div>
                <span className="text-[#71818A]">Expected Finish:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">{viewingRecord.expected_completion}</p>
              </div>
            </div>

            {viewingRecord.actual_completion && (
              <div className="p-3 rounded-lg bg-[#E8F5F1] border border-[#C2E3D8]">
                <span className="text-[#1E735E]">Actual Completion Date:</span>
                <p className="font-bold text-[#193C49] mt-0.5">{viewingRecord.actual_completion}</p>
              </div>
            )}

            {viewingRecord.notes && (
              <div className="p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
                <span className="text-[#71818A]">Work Notes:</span>
                <p className="text-[#193C49] mt-0.5 whitespace-pre-line">{viewingRecord.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAE5D9] flex justify-end">
            <button
              onClick={() => setViewingRecord(null)}
              className="px-4 py-2 text-xs font-medium text-[#193C49] bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
