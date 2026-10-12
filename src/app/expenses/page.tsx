'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Fuel,
  Receipt,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Printer,
  RefreshCw,
  Trash2,
  DollarSign,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { DataProvider } from '@/lib/data-provider';
import { exportToCSV, exportToPrintOrPDF } from '@/lib/calculations';
import { FuelLog, Expense, ExpenseCategory, Vehicle } from '@/types';

export default function ExpensesPage() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses'>('fuel');
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  // Modals
  const [isAddFuelOpen, setIsAddFuelOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: 'fuel' | 'expense'; id: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states: Fuel
  const [fuelForm, setFuelForm] = useState({
    vehicle_id: '',
    date: '',
    litres: '',
    price_per_litre: '1.25',
    odometer_reading: '',
    notes: '',
  });

  // Form states: Expense
  const [expenseForm, setExpenseForm] = useState({
    vehicle_id: '',
    category: 'Tolls' as ExpenseCategory,
    date: '',
    amount: '',
    description: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [f, e, v] = await Promise.all([
      DataProvider.getFuelLogs(),
      DataProvider.getExpenses(),
      DataProvider.getVehicles(),
    ]);
    setFuelLogs(f);
    setExpenses(e);
    setVehicles(v);
    setLoading(false);
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFuelForm((prev) => ({ ...prev, date: today }));
    setExpenseForm((prev) => ({ ...prev, date: today }));
    loadData();
  }, [loadData]);

  // Aggregate stats
  const totalFuelCost = useMemo(() => fuelLogs.reduce((acc, f) => acc + f.total_cost, 0), [fuelLogs]);
  const totalLitres = useMemo(() => fuelLogs.reduce((acc, f) => acc + f.litres, 0), [fuelLogs]);
  const totalExpenseCost = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);

  // Filtered Fuel
  const filteredFuelLogs = useMemo(() => {
    return fuelLogs.filter((f) => {
      if (filterVehicle !== 'All' && f.vehicle_id !== filterVehicle) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          (f.vehicle && f.vehicle.reg_number.toLowerCase().includes(q)) ||
          (f.notes && f.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [fuelLogs, filterVehicle, search]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterVehicle !== 'All' && e.vehicle_id !== filterVehicle) return false;
      if (filterCategory !== 'All' && e.category !== filterCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.vehicle && e.vehicle.reg_number.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [expenses, filterVehicle, filterCategory, search]);

  // Submit Fuel
  const handleCreateFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    const res = await DataProvider.createFuelLog({
      vehicle_id: fuelForm.vehicle_id,
      date: fuelForm.date,
      litres: Number(fuelForm.litres),
      price_per_litre: Number(fuelForm.price_per_litre),
      odometer_reading: Number(fuelForm.odometer_reading),
      notes: fuelForm.notes,
    });
    setActionLoading(false);

    if (res.success) {
      showToast('Fuel log recorded successfully', 'success');
      setIsAddFuelOpen(false);
      setFuelForm({
        vehicle_id: '',
        date: new Date().toISOString().split('T')[0],
        litres: '',
        price_per_litre: '1.25',
        odometer_reading: '',
        notes: '',
      });
      loadData();
    } else {
      showToast(res.error || 'Failed to record fuel log', 'error');
    }
  };

  // Submit Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    const res = await DataProvider.createExpense({
      vehicle_id: expenseForm.vehicle_id || null,
      category: expenseForm.category,
      date: expenseForm.date,
      amount: Number(expenseForm.amount),
      description: expenseForm.description,
    });
    setActionLoading(false);

    if (res.success) {
      showToast('Operational expense recorded', 'success');
      setIsAddExpenseOpen(false);
      setExpenseForm({
        vehicle_id: '',
        category: 'Tolls',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
      });
      loadData();
    } else {
      showToast(res.error || 'Failed to record expense', 'error');
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'fuel') {
      const headers = ['Vehicle Reg', 'Date', 'Litres', 'Price/L ($)', 'Total Cost ($)', 'Odometer (km)', 'Notes'];
      const rows = filteredFuelLogs.map((f) => [
        f.vehicle ? f.vehicle.reg_number : '',
        f.date,
        f.litres,
        f.price_per_litre,
        f.total_cost,
        f.odometer_reading,
        f.notes || '',
      ]);
      exportToCSV('TransitOps_Fuel_Logs', headers, rows);
      showToast('Fuel logs exported to CSV (open with Excel / Sheets)', 'success');
    } else {
      const headers = ['Category', 'Vehicle Reg', 'Date', 'Amount ($)', 'Description'];
      const rows = filteredExpenses.map((e) => [
        e.category,
        e.vehicle ? e.vehicle.reg_number : 'Fleet-Wide',
        e.date,
        e.amount,
        e.description,
      ]);
      exportToCSV('TransitOps_Expenses_Logs', headers, rows);
      showToast('Expenses exported to CSV (open with Excel / Sheets)', 'success');
    }
  };

  const handleExportPDF = () => {
    if (activeTab === 'fuel') {
      const headers = ['Vehicle Reg', 'Date', 'Litres', 'Price/L ($)', 'Total Cost ($)', 'Odometer (km)', 'Notes'];
      const rows = filteredFuelLogs.map((f) => [
        f.vehicle ? f.vehicle.reg_number : '',
        f.date,
        f.litres.toLocaleString(),
        `$${f.price_per_litre.toFixed(2)}`,
        `$${f.total_cost.toLocaleString()}`,
        f.odometer_reading.toLocaleString(),
        f.notes || '—',
      ]);
      exportToPrintOrPDF('Fuel Fill & Consumption Telemetry', headers, rows);
      showToast('Opened printable report (Save as PDF)', 'success');
    } else {
      const headers = ['Category', 'Vehicle Reg', 'Date', 'Amount ($)', 'Description'];
      const rows = filteredExpenses.map((e) => [
        e.category,
        e.vehicle ? e.vehicle.reg_number : 'Fleet-Wide',
        e.date,
        `$${e.amount.toLocaleString()}`,
        e.description,
      ]);
      exportToPrintOrPDF('Operating Expenses Ledger', headers, rows);
      showToast('Opened printable report (Save as PDF)', 'success');
    }
  };

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2DDD1]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#193C49] tracking-tight">
            Fuel Logs &amp; Operating Expenses
          </h2>
          <p className="text-xs sm:text-sm text-[#71818A] mt-0.5">
            Fuel consumption monitoring, toll road expenses, transit permits, and fiscal ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Download CSV spreadsheet file (for Excel / Google Sheets)"
            className="px-3 py-2 bg-[#FFFEFA] border border-[#E2DDD1] hover:bg-[#F5F2E9] text-[#193C49] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#71818A]" />
            <span>Export {activeTab === 'fuel' ? 'Fuel CSV' : 'Expenses CSV'}</span>
          </button>
          <button
            onClick={handleExportPDF}
            title="Open Printable Report / Save as PDF (for Adobe Acrobat / Print)"
            className="px-3 py-2 bg-[#FFFEFA] border border-[#E2DDD1] hover:bg-[#F5F2E9] text-[#193C49] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-[#71818A]" />
            <span>PDF / Print</span>
          </button>

          {activeTab === 'fuel' ? (
            <button
              onClick={() => setIsAddFuelOpen(true)}
              className="px-3.5 py-2 bg-[#23866D] hover:bg-[#1D735D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Log Fuel Fill</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="px-3.5 py-2 bg-[#23866D] hover:bg-[#1D735D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#71818A] uppercase">Total Fuel Spend</span>
            <Fuel className="w-4 h-4 text-[#23866D]" />
          </div>
          <div className="text-2xl font-bold text-[#193C49] mt-2">
            ${totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-[#71818A] mt-1">{totalLitres.toLocaleString()} Litres pumped</p>
        </div>

        <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#71818A] uppercase">Other Operating Expenses</span>
            <Receipt className="w-4 h-4 text-[#4F91D8]" />
          </div>
          <div className="text-2xl font-bold text-[#193C49] mt-2">
            ${totalExpenseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-[#71818A] mt-1">Tolls, permits, subscriptions</p>
        </div>

        <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#71818A] uppercase">Total Cost Of Operations</span>
            <Layers className="w-4 h-4 text-[#E9A23B]" />
          </div>
          <div className="text-2xl font-bold text-[#193C49] mt-2">
            ${(totalFuelCost + totalExpenseCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-[#71818A] mt-1">Excludes double-counted maintenance</p>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tab switch */}
        <div className="flex p-1 bg-[#F5F2E9] rounded-lg border border-[#E2DDD1] w-full md:w-auto">
          <button
            onClick={() => setActiveTab('fuel')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 flex-1 md:flex-initial justify-center ${
              activeTab === 'fuel'
                ? 'bg-[#FFFEFA] text-[#193C49] shadow-xs'
                : 'text-[#71818A] hover:text-[#193C49]'
            }`}
          >
            <Fuel className="w-3.5 h-3.5 text-[#23866D]" />
            <span>Fuel Logs ({fuelLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 flex-1 md:flex-initial justify-center ${
              activeTab === 'expenses'
                ? 'bg-[#FFFEFA] text-[#193C49] shadow-xs'
                : 'text-[#71818A] hover:text-[#193C49]'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-[#4F91D8]" />
            <span>Operational Expenses ({expenses.length})</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-[#71818A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description or vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
            />
          </div>

          <select
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          >
            <option value="All">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.reg_number}
              </option>
            ))}
          </select>

          {activeTab === 'expenses' && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
            >
              <option value="All">All Categories</option>
              <option value="Tolls">Tolls</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Insurance">Insurance</option>
              <option value="Parking">Parking</option>
              <option value="Permits">Permits</option>
              <option value="Other">Other</option>
            </select>
          )}

          <button
            onClick={loadData}
            title="Refresh records"
            className="p-1.5 rounded-lg border border-[#E2DDD1] text-[#71818A] hover:bg-[#F5F2E9]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#23866D]' : ''}`} />
          </button>
        </div>
      </div>

      {/* FUEL LOGS TABLE */}
      {activeTab === 'fuel' && (
        <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAF8F3] border-b border-[#EAE5D9] text-[#71818A] uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold">Vehicle</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Litres</th>
                  <th className="py-3 px-4 font-semibold">Price / Litre</th>
                  <th className="py-3 px-4 font-semibold">Total Cost ($)</th>
                  <th className="py-3 px-4 font-semibold">Odometer</th>
                  <th className="py-3 px-4 font-semibold">Notes / Station</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE1]">
                {filteredFuelLogs.map((f) => (
                  <tr key={f.id} className="hover:bg-[#FAF8F3] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#193C49]">
                      {f.vehicle ? (
                        <div>
                          <div>{f.vehicle.reg_number}</div>
                          <div className="text-[11px] text-[#71818A] font-normal">{f.vehicle.model}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#193C49]">{f.date}</td>
                    <td className="py-3 px-4 font-semibold text-[#23866D]">{f.litres} L</td>
                    <td className="py-3 px-4 text-[#193C49]">${f.price_per_litre.toFixed(2)}</td>
                    <td className="py-3 px-4 font-bold text-[#193C49]">${f.total_cost.toFixed(2)}</td>
                    <td className="py-3 px-4 text-[#193C49]">{f.odometer_reading.toLocaleString()} km</td>
                    <td className="py-3 px-4 text-[#71818A]">{f.notes || '—'}</td>
                  </tr>
                ))}

                {filteredFuelLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#71818A]">
                      No fuel logs recorded matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-[#EAE5D9] bg-[#FAF8F3] text-xs text-[#71818A]">
            Showing {filteredFuelLogs.length} fuel logs
          </div>
        </div>
      )}

      {/* OPERATIONAL EXPENSES TABLE */}
      {activeTab === 'expenses' && (
        <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAF8F3] border-b border-[#EAE5D9] text-[#71818A] uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Vehicle Assigned</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Amount ($)</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE1]">
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-[#FAF8F3] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#193C49]">
                      <span className="px-2.5 py-1 rounded-md bg-[#FAF8F3] border border-[#EAE5D9]">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#193C49]">
                      {e.vehicle ? (
                        <span className="font-medium">{e.vehicle.reg_number}</span>
                      ) : (
                        <span className="text-[#71818A]">Fleet-Wide / Overhead</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#193C49]">{e.date}</td>
                    <td className="py-3 px-4 font-bold text-[#193C49]">${e.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-[#193C49] max-w-xs truncate" title={e.description}>
                      {e.description}
                    </td>
                  </tr>
                ))}

                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-[#71818A]">
                      No expenses found matching current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-[#EAE5D9] bg-[#FAF8F3] text-xs text-[#71818A]">
            Showing {filteredExpenses.length} operational expense line items
          </div>
        </div>
      )}

      {/* ADD FUEL MODAL */}
      {isAddFuelOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddFuelOpen(false)}
          title="Record Fuel Fill Log"
          subtitle="Updates asset odometer and calculates total fuel charges"
          maxWidth="md"
        >
          <form onSubmit={handleCreateFuel} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">
                Fleet Vehicle *
              </label>
              <select
                required
                value={fuelForm.vehicle_id}
                onChange={(e) => {
                  setFuelForm({ ...fuelForm, vehicle_id: e.target.value });
                  const v = vehicles.find((item) => item.id === e.target.value);
                  if (v) setFuelForm((prev) => ({ ...prev, odometer_reading: String(v.odometer_km) }));
                }}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              >
                <option value="">-- Select Vehicle --</option>
                {vehicles
                  .filter((v) => v.status !== 'Retired')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.reg_number} - {v.model} ({v.odometer_km.toLocaleString()} km)
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={fuelForm.date}
                  onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Litres *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  placeholder="240"
                  value={fuelForm.litres}
                  onChange={(e) => setFuelForm({ ...fuelForm, litres: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Price / Litre ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={fuelForm.price_per_litre}
                  onChange={(e) => setFuelForm({ ...fuelForm, price_per_litre: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Odometer (km) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={fuelForm.odometer_reading}
                  onChange={(e) => setFuelForm({ ...fuelForm, odometer_reading: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            {fuelForm.litres && fuelForm.price_per_litre && (
              <div className="p-2.5 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9] flex justify-between text-xs font-medium text-[#193C49]">
                <span>Total Fuel Cost:</span>
                <span className="font-bold text-[#23866D]">
                  ${(Number(fuelForm.litres) * Number(fuelForm.price_per_litre)).toFixed(2)}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">Notes / Station</label>
              <input
                type="text"
                placeholder="Station location or receipt reference"
                value={fuelForm.notes}
                onChange={(e) => setFuelForm({ ...fuelForm, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddFuelOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#71818A] hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-medium bg-[#23866D] hover:bg-[#1D735D] text-white rounded-lg shadow-xs"
              >
                {actionLoading ? 'Saving...' : 'Save Fuel Fill'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ADD EXPENSE MODAL */}
      {isAddExpenseOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddExpenseOpen(false)}
          title="Record Operating Expense"
          subtitle="Toll fees, transit permits, depot handling charges"
          maxWidth="md"
        >
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="Tolls">Tolls</option>
                  <option value="Permits">Permits</option>
                  <option value="Parking">Parking</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="125.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Vehicle (Optional)
                </label>
                <select
                  value={expenseForm.vehicle_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="">-- Fleet-Wide / None --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.reg_number} - {v.model}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">
                Description *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Turnpike pass number, route authority permit reference, invoice number..."
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#71818A] hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-medium bg-[#23866D] hover:bg-[#1D735D] text-white rounded-lg shadow-xs"
              >
                {actionLoading ? 'Recording...' : 'Record Expense'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
