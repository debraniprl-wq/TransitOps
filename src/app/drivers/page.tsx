'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  AlertTriangle,
  Download,
  Printer,
  Shield,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { DataProvider } from '@/lib/data-provider';
import { exportToCSV, exportToPrintOrPDF } from '@/lib/calculations';
import { Driver, DriverStatus, DriverLicenseCategory } from '@/types';

export default function DriversPage() {
  const { showToast } = useToast();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterExpiry, setFilterExpiry] = useState('All');

  // Sorting
  const [sortField, setSortField] = useState<keyof Driver>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    license_category: 'Class A - Heavy Articulated' as DriverLicenseCategory,
    license_expiry: '',
    contact_number: '',
    safety_score: '95',
    status: 'Available' as DriverStatus,
  });

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    const data = await DataProvider.getDrivers();
    setDrivers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // URL search parameter hook
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('search');
      if (s) setSearch(s);
    }
  }, []);

  const handleSort = (field: keyof Driver) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Expiry check helpers
  const getExpiryStatus = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { expired: true, warning: false, days: diffDays };
    if (diffDays <= 30) return { expired: false, warning: true, days: diffDays };
    return { expired: false, warning: false, days: diffDays };
  };

  const filteredAndSortedDrivers = useMemo(() => {
    return drivers
      .filter((d) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches =
            d.name.toLowerCase().includes(q) ||
            d.license_number.toLowerCase().includes(q) ||
            d.contact_number.includes(q);
          if (!matches) return false;
        }
        if (filterCategory !== 'All' && d.license_category !== filterCategory) return false;
        if (filterStatus !== 'All' && d.status !== filterStatus) return false;

        if (filterExpiry !== 'All') {
          const { expired, warning } = getExpiryStatus(d.license_expiry);
          if (filterExpiry === 'expired' && !expired) return false;
          if (filterExpiry === 'warning' && !warning) return false;
        }

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
  }, [drivers, search, filterCategory, filterStatus, filterExpiry, sortField, sortAsc]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      license_number: '',
      license_category: 'Class A - Heavy Articulated',
      license_expiry: '',
      contact_number: '',
      safety_score: '95',
      status: 'Available',
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (d: Driver) => {
    setEditingDriver(d);
    setFormData({
      name: d.name,
      license_number: d.license_number,
      license_category: d.license_category,
      license_expiry: d.license_expiry,
      contact_number: d.contact_number,
      safety_score: String(d.safety_score),
      status: d.status,
    });
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    if (editingDriver) {
      const res = await DataProvider.updateDriver(editingDriver.id, {
        name: formData.name,
        license_number: formData.license_number,
        license_category: formData.license_category,
        license_expiry: formData.license_expiry,
        contact_number: formData.contact_number,
        safety_score: Number(formData.safety_score),
        status: formData.status,
      });
      setActionLoading(false);
      if (res.success) {
        showToast(`Driver ${formData.name} updated`, 'success');
        setEditingDriver(null);
        loadDrivers();
      } else {
        showToast(res.error || 'Failed to update driver', 'error');
      }
    } else {
      const res = await DataProvider.createDriver({
        name: formData.name,
        license_number: formData.license_number,
        license_category: formData.license_category,
        license_expiry: formData.license_expiry,
        contact_number: formData.contact_number,
        safety_score: Number(formData.safety_score),
        status: formData.status,
      });
      setActionLoading(false);
      if (res.success) {
        showToast(`Driver ${res.data?.name} registered`, 'success');
        setIsAddOpen(false);
        loadDrivers();
      } else {
        showToast(res.error || 'Failed to register driver', 'error');
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDriverId) return;
    setActionLoading(true);
    const res = await DataProvider.deleteDriver(deletingDriverId);
    setActionLoading(false);

    if (res.success) {
      showToast('Driver record deleted successfully', 'success');
      setDeletingDriverId(null);
      loadDrivers();
    } else {
      showToast(res.error || 'Deletion blocked', 'error');
      setDeletingDriverId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'License Number', 'Category', 'License Expiry', 'Contact Number', 'Safety Score', 'Status'];
    const rows = filteredAndSortedDrivers.map((d) => [
      d.name,
      d.license_number,
      d.license_category,
      d.license_expiry,
      d.contact_number,
      d.safety_score,
      d.status,
    ]);
    exportToCSV('TransitOps_Drivers_Export', headers, rows);
    showToast('Drivers CSV exported (open with Excel / Sheets)', 'success');
  };

  const handleExportPDF = () => {
    const headers = ['Name', 'License Number', 'Category', 'License Expiry', 'Contact Number', 'Safety Score', 'Status'];
    const rows = filteredAndSortedDrivers.map((d) => [
      d.name,
      d.license_number,
      d.license_category,
      d.license_expiry,
      d.contact_number,
      `${d.safety_score}%`,
      d.status,
    ]);
    exportToPrintOrPDF('Driver Roster & Licensing Registry', headers, rows);
    showToast('Opened printable report (Save as PDF)', 'success');
  };

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2DDD1]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#193C49] tracking-tight">
            Commercial Driver Management
          </h2>
          <p className="text-xs sm:text-sm text-[#71818A] mt-0.5">
            Driver credentials, licensing audits, safety telemetry scores, and duty roster
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
            <span>Register Driver</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#71818A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search driver name, license, contact..."
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>

          <select
            value={filterExpiry}
            onChange={(e) => setFilterExpiry(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          >
            <option value="All">All License Dates</option>
            <option value="warning">Expiring in &le; 30 Days</option>
            <option value="expired">Expired Licenses</option>
          </select>

          <button
            onClick={loadDrivers}
            title="Refresh records"
            className="p-1.5 rounded-lg border border-[#E2DDD1] text-[#71818A] hover:bg-[#F5F2E9]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#23866D]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#EAE5D9] text-[#71818A] uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Driver Name <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('license_number')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    License &amp; Category <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('license_expiry')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    License Expiry <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">Contact</th>
                <th
                  onClick={() => handleSort('safety_score')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#193C49]"
                >
                  <div className="flex items-center gap-1">
                    Safety Score <ArrowUpDown className="w-3 h-3" />
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
              {filteredAndSortedDrivers.map((d) => {
                const { expired, warning, days } = getExpiryStatus(d.license_expiry);

                return (
                  <tr key={d.id} className="hover:bg-[#FAF8F3] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#193C49]">
                      {d.name}
                    </td>
                    <td className="py-3 px-4 text-[#193C49]">
                      <div className="font-semibold">{d.license_number}</div>
                      <div className="text-[11px] text-[#71818A]">{d.license_category}</div>
                    </td>
                    <td className="py-3 px-4 text-[#193C49]">
                      <div className="font-medium">{d.license_expiry}</div>
                      {expired && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D95353]">
                          <AlertTriangle className="w-3 h-3" /> Expired (Ineligible)
                        </span>
                      )}
                      {!expired && warning && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E9A23B]">
                          <AlertTriangle className="w-3 h-3" /> {days} days left
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#193C49]">
                      {d.contact_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Shield className={`w-3.5 h-3.5 ${d.safety_score >= 90 ? 'text-[#23866D]' : d.safety_score >= 80 ? 'text-[#E9A23B]' : 'text-[#D95353]'}`} />
                        <span>{d.safety_score}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingDriver(d)}
                          title="View Driver Record"
                          className="p-1 rounded-md text-[#71818A] hover:text-[#193C49] hover:bg-stone-200"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(d)}
                          title="Edit Driver Credentials"
                          className="p-1 rounded-md text-[#71818A] hover:text-[#23866D] hover:bg-stone-200"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingDriverId(d.id)}
                          title="Delete Driver Record"
                          className="p-1 rounded-md text-[#71818A] hover:text-[#D95353] hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAndSortedDrivers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#71818A]">
                    No drivers found matching current search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[#EAE5D9] bg-[#FAF8F3] text-xs text-[#71818A] flex justify-between items-center">
          <span>Showing {filteredAndSortedDrivers.length} of {drivers.length} commercial drivers</span>
          <span>Dispatch eligibility: Server &amp; DB Enforced</span>
        </div>
      </div>

      {/* VIEW DRIVER MODAL */}
      {viewingDriver && (
        <Modal
          isOpen={true}
          onClose={() => setViewingDriver(null)}
          title={`Driver Profile: ${viewingDriver.name}`}
          subtitle={`License ID: ${viewingDriver.license_number}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <div>
                <span className="text-[#71818A]">Status:</span>
                <div className="mt-1"><StatusBadge status={viewingDriver.status} size="sm" /></div>
              </div>
              <div>
                <span className="text-[#71818A]">Safety Telemetry:</span>
                <p className="font-bold text-sm text-[#23866D] mt-0.5">{viewingDriver.safety_score}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <div>
                <span className="text-[#71818A]">License Category:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">{viewingDriver.license_category}</p>
              </div>
              <div>
                <span className="text-[#71818A]">License Expiry Date:</span>
                <p className="font-semibold text-[#193C49] mt-0.5">{viewingDriver.license_expiry}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
              <span className="text-[#71818A]">Emergency / Operational Contact:</span>
              <p className="font-semibold text-[#193C49] mt-0.5">{viewingDriver.contact_number}</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EAE5D9] flex justify-end">
            <button
              onClick={() => setViewingDriver(null)}
              className="px-4 py-2 text-xs font-medium text-[#193C49] bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* ADD / EDIT MODAL */}
      {(isAddOpen || editingDriver) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddOpen(false);
            setEditingDriver(null);
          }}
          title={editingDriver ? `Edit Driver: ${editingDriver.name}` : 'Register Commercial Driver'}
          subtitle="All credentials audit against state DOT guidelines"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveDriver} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arthur Pendelton"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  License Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DL-882910-US"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Category</label>
                <select
                  value={formData.license_category}
                  onChange={(e) =>
                    setFormData({ ...formData, license_category: e.target.value as DriverLicenseCategory })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="Class A - Heavy Articulated">Class A - Heavy Articulated</option>
                  <option value="Class B - Heavy Rigid">Class B - Heavy Rigid</option>
                  <option value="Class C - Commercial Van">Class C - Commercial Van</option>
                  <option value="Class D - Multi-Passenger">Class D - Multi-Passenger</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  License Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.license_expiry}
                  onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Contact Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Safety Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.safety_score}
                  onChange={(e) => setFormData({ ...formData, safety_score: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as DriverStatus })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="Off Duty">Off Duty</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingDriver(null);
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
                {actionLoading ? 'Saving...' : editingDriver ? 'Update Driver' : 'Save Driver'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingDriverId)}
        onClose={() => setDeletingDriverId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Driver Profile"
        message="Are you sure you want to delete this driver? Deletion will be rejected if the driver is currently assigned to active trips."
        confirmLabel="Delete Driver"
        isDestructive={true}
        isLoading={actionLoading}
      />
    </AppShell>
  );
}
