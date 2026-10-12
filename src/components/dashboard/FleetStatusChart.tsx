'use client';

import React, { useState, useMemo } from 'react';
import { Vehicle } from '@/types';
import { RotateCcw, Truck, MapPin, Activity, ChevronRight } from 'lucide-react';

interface FleetStatusChartProps {
  vehicles: Vehicle[];
  filterRegion?: string;
  filterType?: string;
  dateRange?: string;
}

type ViewMode = 'status' | 'type' | 'region';

export function FleetStatusChart({ vehicles, filterRegion, filterType, dateRange }: FleetStatusChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('status');
  const [activeSliceKey, setActiveSliceKey] = useState<string | null>(null);

  // ── Calculate dynamic dataset based on viewMode ────────────────────────────
  const { data, total, activeSummary } = useMemo(() => {
    const totalCount = vehicles.length || 1;

    if (viewMode === 'status') {
      const counts: Record<string, number> = {
        Available: vehicles.filter((v) => v.status === 'Available').length,
        'On Trip': vehicles.filter((v) => v.status === 'On Trip').length,
        'In Shop': vehicles.filter((v) => v.status === 'In Shop').length,
        Retired: vehicles.filter((v) => v.status === 'Retired').length,
      };

      const slices = [
        { key: 'Available', label: 'Available', count: counts.Available, color: '#23866D', bgClass: 'bg-[#23866D]' },
        { key: 'On Trip', label: 'On Trip', count: counts['On Trip'], color: '#4F91D8', bgClass: 'bg-[#4F91D8]' },
        { key: 'In Shop', label: 'In Shop', count: counts['In Shop'], color: '#E9A23B', bgClass: 'bg-[#E9A23B]' },
        { key: 'Retired', label: 'Retired', count: counts.Retired, color: '#71818A', bgClass: 'bg-[#71818A]' },
      ];

      return {
        data: slices,
        total: totalCount,
        activeSummary: {
          label: 'Total Fleet',
          count: vehicles.length,
          subLabel: `${counts.Available + counts['On Trip']} Operational`,
        },
      };
    }

    if (viewMode === 'type') {
      const counts: Record<string, number> = {
        Truck: vehicles.filter((v) => v.type === 'Truck').length,
        Van: vehicles.filter((v) => v.type === 'Van').length,
        Electric: vehicles.filter((v) => v.type === 'Electric').length,
        Trailer: vehicles.filter((v) => v.type === 'Trailer').length,
        Bus: vehicles.filter((v) => v.type === 'Bus').length,
      };

      const slices = [
        { key: 'Truck', label: 'Trucks', count: counts.Truck, color: '#23866D', bgClass: 'bg-[#23866D]' },
        { key: 'Van', label: 'Vans', count: counts.Van, color: '#4F91D8', bgClass: 'bg-[#4F91D8]' },
        { key: 'Electric', label: 'Electric', count: counts.Electric, color: '#10B981', bgClass: 'bg-[#10B981]' },
        { key: 'Trailer', label: 'Trailers', count: counts.Trailer, color: '#8B5CF6', bgClass: 'bg-[#8B5CF6]' },
        { key: 'Bus', label: 'Buses', count: counts.Bus, color: '#F59E0B', bgClass: 'bg-[#F59E0B]' },
      ];

      return {
        data: slices,
        total: totalCount,
        activeSummary: {
          label: 'Vehicle Types',
          count: vehicles.length,
          subLabel: `${slices.filter((s) => s.count > 0).length} Active Categories`,
        },
      };
    }

    // viewMode === 'region'
    const counts: Record<string, number> = {
      North: vehicles.filter((v) => v.region === 'North').length,
      West: vehicles.filter((v) => v.region === 'West').length,
      Central: vehicles.filter((v) => v.region === 'Central').length,
      East: vehicles.filter((v) => v.region === 'East').length,
      South: vehicles.filter((v) => v.region === 'South').length,
    };

    const slices = [
      { key: 'North', label: 'North', count: counts.North, color: '#3B82F6', bgClass: 'bg-[#3B82F6]' },
      { key: 'West', label: 'West', count: counts.West, color: '#F97316', bgClass: 'bg-[#F97316]' },
      { key: 'Central', label: 'Central', count: counts.Central, color: '#8B5CF6', bgClass: 'bg-[#8B5CF6]' },
      { key: 'East', label: 'East', count: counts.East, color: '#10B981', bgClass: 'bg-[#10B981]' },
      { key: 'South', label: 'South', count: counts.South, color: '#EC4899', bgClass: 'bg-[#EC4899]' },
    ];

    return {
      data: slices,
      total: totalCount,
      activeSummary: {
        label: 'Territories',
        count: vehicles.length,
        subLabel: `${slices.filter((s) => s.count > 0).length} Operating Hubs`,
      },
    };
  }, [vehicles, viewMode]);

  // Selected slice details
  const selectedSlice = data.find((d) => d.key === activeSliceKey) || null;

  // Matching vehicles for drill-down preview
  const drillDownVehicles = useMemo(() => {
    if (!activeSliceKey) return [];
    if (viewMode === 'status') {
      return vehicles.filter((v) => v.status === activeSliceKey);
    }
    if (viewMode === 'type') {
      return vehicles.filter((v) => v.type === activeSliceKey);
    }
    return vehicles.filter((v) => v.region === activeSliceKey);
  }, [vehicles, activeSliceKey, viewMode]);

  // SVG Donut geometry
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  // Counts for bottom status footer
  const statusCounts = useMemo(() => {
    return {
      available: vehicles.filter((v) => v.status === 'Available').length,
      onTrip: vehicles.filter((v) => v.status === 'On Trip').length,
      inShop: vehicles.filter((v) => v.status === 'In Shop').length,
      retired: vehicles.filter((v) => v.status === 'Retired').length,
    };
  }, [vehicles]);

  return (
    <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all duration-300">
      {/* ── Card Header & Interactive Mode Switcher ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0ECE1]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[#193C49] tracking-tight">Fleet Status Breakdown</h3>
            <span className="text-[11px] font-semibold text-[#23866D] bg-[#E8F5F1] px-2 py-0.5 rounded-full border border-[#C5E5DC]">
              {vehicles.length} Units
            </span>
          </div>
          <p className="text-xs text-[#71818A] mt-0.5">
            Real-time distribution across active fleet telemetry
          </p>
        </div>

        {/* Dimension View Tabs (Status / Type / Region) */}
        <div className="flex items-center bg-[#F5F2E9] p-1 rounded-lg border border-[#E2DDD1] text-xs self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => {
              setViewMode('status');
              setActiveSliceKey(null);
            }}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all duration-200 flex items-center gap-1 ${
              viewMode === 'status'
                ? 'bg-[#FFFEFA] text-[#193C49] shadow-xs'
                : 'text-[#71818A] hover:text-[#193C49]'
            }`}
          >
            <Activity className="w-3 h-3 text-[#23866D]" />
            <span>Status</span>
          </button>
          <button
            onClick={() => {
              setViewMode('type');
              setActiveSliceKey(null);
            }}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all duration-200 flex items-center gap-1 ${
              viewMode === 'type'
                ? 'bg-[#FFFEFA] text-[#193C49] shadow-xs'
                : 'text-[#71818A] hover:text-[#193C49]'
            }`}
          >
            <Truck className="w-3 h-3 text-[#4F91D8]" />
            <span>Type</span>
          </button>
          <button
            onClick={() => {
              setViewMode('region');
              setActiveSliceKey(null);
            }}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all duration-200 flex items-center gap-1 ${
              viewMode === 'region'
                ? 'bg-[#FFFEFA] text-[#193C49] shadow-xs'
                : 'text-[#71818A] hover:text-[#193C49]'
            }`}
          >
            <MapPin className="w-3 h-3 text-[#E9A23B]" />
            <span>Region</span>
          </button>
        </div>
      </div>

      {/* ── Donut Chart & Interactive Legend ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
        {/* SVG Donut */}
        <div className="relative w-40 h-40 flex items-center justify-center select-none">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#F0ECE1"
              strokeWidth="13"
            />
            {data.map((slice) => {
              if (slice.count <= 0) return null;
              const sliceLength = (slice.count / total) * circumference;
              const strokeDasharray = `${sliceLength} ${circumference}`;
              const strokeDashoffset = -accumulatedOffset;
              accumulatedOffset += sliceLength;

              const isSelected = activeSliceKey === slice.key;
              const isAnySelected = activeSliceKey !== null;

              return (
                <circle
                  key={slice.key}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isSelected ? 16 : 13}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  opacity={isAnySelected && !isSelected ? 0.45 : 1}
                  className="transition-all duration-300 ease-out cursor-pointer hover:stroke-width-[16]"
                  onMouseEnter={() => setActiveSliceKey(slice.key)}
                  onClick={() => setActiveSliceKey(isSelected ? null : slice.key)}
                />
              );
            })}
          </svg>

          {/* Dynamic Center Label — changes with hover / selection */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 cursor-pointer"
            onClick={() => setActiveSliceKey(null)}
            title="Click to reset selection"
          >
            {selectedSlice ? (
              <>
                <span className="text-3xl font-black text-[#193C49] leading-none transition-all duration-200">
                  {selectedSlice.count}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded"
                  style={{ color: selectedSlice.color }}
                >
                  {selectedSlice.label}
                </span>
                <span className="text-[10px] text-[#71818A] font-semibold mt-0.5">
                  {Math.round((selectedSlice.count / total) * 100)}% of fleet
                </span>
              </>
            ) : (
              <>
                <span className="text-3xl font-black text-[#193C49] leading-none transition-all duration-200">
                  {vehicles.length}
                </span>
                <span className="text-[10px] text-[#71818A] uppercase font-bold tracking-wider mt-1">
                  {activeSummary.label}
                </span>
                <span className="text-[9px] text-[#23866D] font-semibold mt-0.5">
                  {activeSummary.subLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="space-y-2 flex-1 w-full max-w-[220px]">
          {data.map((item) => {
            const pct = Math.round((item.count / total) * 100);
            const isSelected = activeSliceKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSliceKey(isSelected ? null : item.key)}
                onMouseEnter={() => setActiveSliceKey(item.key)}
                className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 text-left ${
                  isSelected
                    ? 'bg-[#F5F2E9] border-[#23866D] shadow-2xs font-semibold'
                    : 'bg-transparent border-transparent hover:bg-[#FAF8F3] hover:border-[#E2DDD1]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[#193C49] font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[#193C49] font-bold">{item.count}</span>
                  <span className="text-[#71818A] text-[11px] font-medium">({pct}%)</span>
                </div>
              </button>
            );
          })}

          {activeSliceKey && (
            <button
              onClick={() => setActiveSliceKey(null)}
              className="text-[11px] text-[#23866D] hover:underline flex items-center gap-1 pt-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Show all categories</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Interactive Drill-down Card (when a slice is active) ───────── */}
      {selectedSlice && drillDownVehicles.length > 0 && (
        <div className="mb-3 p-3 bg-[#FAF8F3] rounded-lg border border-[#E2DDD1] text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-[#193C49]">
              {selectedSlice.label} Assets ({drillDownVehicles.length}):
            </span>
            <span className="text-[10px] text-[#71818A]">
              Click asset to inspect in registry
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {drillDownVehicles.map((v) => (
              <span
                key={v.id}
                className="px-2 py-1 bg-[#FFFEFA] border border-[#E2DDD1] rounded text-[11px] font-mono text-[#193C49] flex items-center gap-1 shadow-2xs"
              >
                <span className="font-bold">{v.reg_number}</span>
                <span className="text-[#71818A]">· {v.model.split(' ')[0]}</span>
                <span className="text-[10px] text-[#71818A]">({v.region})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Telemetry Footer — Never Empty / Guaranteed Values ──── */}
      <div className="mt-2 pt-3 border-t border-[#F0ECE1] text-[11px] text-[#71818A] grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-[#71818A]">Available</span>
          <span className="font-bold text-[#23866D]">
            {statusCounts.available} Units ({Math.round((statusCounts.available / total) * 100)}%)
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-[#71818A]">On Trip</span>
          <span className="font-bold text-[#4F91D8]">
            {statusCounts.onTrip} Units ({Math.round((statusCounts.onTrip / total) * 100)}%)
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-[#71818A]">In Shop</span>
          <span className="font-bold text-[#E9A23B]">
            {statusCounts.inShop} Units ({Math.round((statusCounts.inShop / total) * 100)}%)
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-[#71818A]">Retired</span>
          <span className="font-bold text-[#71818A]">
            {statusCounts.retired} Units ({Math.round((statusCounts.retired / total) * 100)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
