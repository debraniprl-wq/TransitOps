'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Fuel,
  Wrench,
  Gauge,
  Percent,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { DataProvider } from '@/lib/data-provider';
import { computeFleetAnalytics, exportToCSV, FleetReportData } from '@/lib/calculations';
import { useToast } from '@/components/ui/Toast';
import { Vehicle, Trip, MaintenanceRecord, FuelLog, Expense } from '@/types';

export default function ReportsPage() {
  const { showToast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedVehicleId, setSelectedVehicleId] = useState('All');
  const [dateRange, setDateRange] = useState('30d');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [v, t, m, f, e] = await Promise.all([
      DataProvider.getVehicles(),
      DataProvider.getTrips(),
      DataProvider.getMaintenanceRecords(),
      DataProvider.getFuelLogs(),
      DataProvider.getExpenses(),
    ]);

    setVehicles(v);
    setTrips(t);
    setMaintenance(m);
    setFuelLogs(f);
    setExpenses(e);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute analytics
  const analytics: FleetReportData = useMemo(() => {
    const vFiltered = selectedVehicleId === 'All' ? vehicles : vehicles.filter((v) => v.id === selectedVehicleId);
    const tFiltered = selectedVehicleId === 'All' ? trips : trips.filter((t) => t.vehicle_id === selectedVehicleId);
    const mFiltered = selectedVehicleId === 'All' ? maintenance : maintenance.filter((m) => m.vehicle_id === selectedVehicleId);
    const fFiltered = selectedVehicleId === 'All' ? fuelLogs : fuelLogs.filter((f) => f.vehicle_id === selectedVehicleId);
    const eFiltered = selectedVehicleId === 'All' ? expenses : expenses.filter((e) => e.vehicle_id === selectedVehicleId);

    return computeFleetAnalytics(vFiltered, tFiltered, mFiltered, fFiltered, eFiltered);
  }, [vehicles, trips, maintenance, fuelLogs, expenses, selectedVehicleId]);

  const handleExportCSV = () => {
    const headers = [
      'Registration',
      'Model',
      'Distance (km)',
      'Fuel (L)',
      'Fuel Efficiency (km/L)',
      'Fuel Cost ($)',
      'Maintenance Cost ($)',
      'Revenue ($)',
      'Net Profit ($)',
      'Acquisition Cost ($)',
      'Vehicle ROI (%)',
    ];

    const rows = analytics.vehicleReports.map((vr) => [
      vr.regNumber,
      vr.model,
      vr.distanceKm,
      vr.fuelLitres,
      vr.fuelEfficiency,
      vr.fuelCost,
      vr.maintenanceCost,
      vr.revenue,
      vr.netProfit,
      vr.acquisitionCost,
      `${vr.roiPercent}%`,
    ]);

    exportToCSV('TransitOps_Fleet_ROI_Performance', headers, rows);
    showToast('Analytics & ROI CSV report downloaded', 'success');
  };

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2DDD1]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#193C49] tracking-tight">
            Fleet Intelligence &amp; Financial Analytics
          </h2>
          <p className="text-xs sm:text-sm text-[#71818A] mt-0.5">
            Fuel efficiency telemetry, asset return on investment (ROI), and operational cost models
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Vehicle selector */}
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="px-2.5 py-2 bg-[#FFFEFA] border border-[#E2DDD1] rounded-lg text-xs text-[#193C49] focus:outline-none focus:border-[#23866D]"
          >
            <option value="All">All Fleet Assets</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.reg_number} - {v.model}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-[#23866D] hover:bg-[#1D735D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Report</span>
          </button>
        </div>
      </div>

      {/* Core Operational Formula Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fuel Efficiency */}
        <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#71818A] uppercase">Fuel Efficiency</span>
            <Gauge className="w-4 h-4 text-[#23866D]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#193C49] mt-2">
            {analytics.fuelEfficiencyKmPerL} <span className="text-sm font-normal text-[#71818A]">km / L</span>
          </div>
          <p className="text-[11px] text-[#71818A] mt-1">
            Distance Travelled &divide; Fuel Consumed
          </p>
        </div>

        {/* Fleet Utilization */}
        <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#71818A] uppercase">Fleet Utilization</span>
            <Percent className="w-4 h-4 text-[#4F91D8]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#193C49] mt-2">
            {analytics.fleetUtilizationPercent}%
          </div>
          <p className="text-[11px] text-[#71818A] mt-1">
            On-Trip Units &divide; Active Non-Retired Units
          </p>
        </div>

        {/* Total Operational Expenses */}
        <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#71818A] uppercase">Total Operating Cost</span>
            <TrendingUp className="w-4 h-4 text-[#E9A23B]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#193C49] mt-2">
            ${analytics.totalOperationalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#71818A] mt-1">
            Fuel (${analytics.totalFuelCost}) + Maint (${analytics.totalMaintenanceCost}) + Ops (${analytics.totalOtherExpenses})
          </p>
        </div>

        {/* Overall Fleet ROI */}
        <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#71818A] uppercase">Overall Fleet ROI</span>
            <DollarSign className="w-4 h-4 text-[#23866D]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#193C49] mt-2">
            {analytics.overallROI}%
          </div>
          <p className="text-[11px] text-[#71818A] mt-1">
            (Revenue &minus; Operating Cost) &divide; Acquisition Cost
          </p>
        </div>
      </div>

      {/* Assumptions Documentation Note */}
      <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#EAE5D9] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#4F91D8] shrink-0 mt-0.5" />
        <div className="text-xs text-[#5A6872] leading-relaxed">
          <span className="font-bold text-[#193C49]">Calculation Assumptions &amp; Methodologies:</span>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><strong>Fuel Efficiency:</strong> Calculated strictly as total verified odometer kilometers from completed linehauls divided by fuel litres consumed. Zero fuel edge cases safely return 0.00.</li>
            <li><strong>Double-Count Prevention:</strong> Workshop maintenance costs recorded in both the maintenance registry and the expenses ledger are accounted only once when calculating total operational expenses.</li>
            <li><strong>Vehicle ROI:</strong> Computed as <code>(Net Linehaul Revenue − Fuel Costs − Maintenance Costs) / Asset Acquisition Cost</code>. Assets with zero acquisition cost default to 0.00% without division-by-zero errors.</li>
          </ul>
        </div>
      </div>

      {/* Vehicle ROI & Performance Table */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#EAE5D9] bg-[#FAF8F3] flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-sm text-[#193C49]">Vehicle-Wise ROI &amp; Performance Breakdown</h3>
            <p className="text-xs text-[#71818A]">Financial profitability and efficiency by asset</p>
          </div>
          <span className="text-xs text-[#71818A]">
            {analytics.vehicleReports.length} Assets Evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#EAE5D9] text-[#71818A] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Vehicle</th>
                <th className="py-3 px-4 font-semibold">Distance</th>
                <th className="py-3 px-4 font-semibold">Fuel Used</th>
                <th className="py-3 px-4 font-semibold">Efficiency</th>
                <th className="py-3 px-4 font-semibold">Fuel Cost</th>
                <th className="py-3 px-4 font-semibold">Maint Cost</th>
                <th className="py-3 px-4 font-semibold">Revenue</th>
                <th className="py-3 px-4 font-semibold">Net Profit</th>
                <th className="py-3 px-4 font-semibold">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE1]">
              {analytics.vehicleReports.map((vr) => (
                <tr key={vr.vehicleId} className="hover:bg-[#FAF8F3] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#193C49]">
                    <div>{vr.regNumber}</div>
                    <div className="text-[11px] text-[#71818A] font-normal">{vr.model}</div>
                  </td>
                  <td className="py-3 px-4 text-[#193C49] font-medium">
                    {vr.distanceKm > 0 ? `${vr.distanceKm.toLocaleString()} km` : '—'}
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">
                    {vr.fuelLitres > 0 ? `${vr.fuelLitres.toLocaleString()} L` : '—'}
                  </td>
                  <td className="py-3 px-4 text-[#193C49] font-semibold text-[#23866D]">
                    {vr.fuelEfficiency > 0 ? `${vr.fuelEfficiency} km/L` : '—'}
                  </td>
                  <td className="py-3 px-4 text-[#193C49]">${vr.fuelCost.toLocaleString()}</td>
                  <td className="py-3 px-4 text-[#193C49]">${vr.maintenanceCost.toLocaleString()}</td>
                  <td className="py-3 px-4 text-[#193C49] font-semibold text-[#23866D]">
                    ${vr.revenue.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#193C49]">
                    <span className={vr.netProfit >= 0 ? 'text-[#23866D]' : 'text-[#D95353]'}>
                      ${vr.netProfit.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        vr.roiPercent >= 0
                          ? 'bg-[#E8F5F1] text-[#1E735E] border border-[#C2E3D8]'
                          : 'bg-[#FDF2F2] text-[#C53030] border border-[#F8B4B4]'
                      }`}
                    >
                      {vr.roiPercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[#EAE5D9] bg-[#FAF8F3] text-xs text-[#71818A] flex justify-between items-center">
          <span>Total Recorded Freight Revenue: <strong>${analytics.totalRevenue.toLocaleString()}</strong></span>
          <span>RFC 4180 CSV export ready</span>
        </div>
      </div>
    </AppShell>
  );
}
