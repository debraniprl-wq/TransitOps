'use client';

import React from 'react';
import { Vehicle } from '@/types';

interface FleetStatusChartProps {
  vehicles: Vehicle[];
}

export function FleetStatusChart({ vehicles }: FleetStatusChartProps) {
  const counts = {
    Available: vehicles.filter((v) => v.status === 'Available').length,
    'On Trip': vehicles.filter((v) => v.status === 'On Trip').length,
    'In Shop': vehicles.filter((v) => v.status === 'In Shop').length,
    Retired: vehicles.filter((v) => v.status === 'Retired').length,
  };

  const total = vehicles.length || 1;

  const data = [
    { label: 'Available', count: counts.Available, color: '#23866D', bgClass: 'bg-[#23866D]' },
    { label: 'On Trip', count: counts['On Trip'], color: '#4F91D8', bgClass: 'bg-[#4F91D8]' },
    { label: 'In Shop', count: counts['In Shop'], color: '#E9A23B', bgClass: 'bg-[#E9A23B]' },
    { label: 'Retired', count: counts.Retired, color: '#71818A', bgClass: 'bg-[#71818A]' },
  ];

  // SVG Donut calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-[#193C49]">Fleet Status Breakdown</h3>
          <p className="text-xs text-[#71818A]">Real-time operational distribution</p>
        </div>
        <span className="text-xs font-medium text-[#71818A] bg-[#F5F2E9] px-2.5 py-1 rounded-full border border-[#E2DDD1]">
          {vehicles.length} Units
        </span>
      </div>

      <div className="flex items-center justify-center gap-6 my-2">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#F0ECE1"
              strokeWidth="14"
            />
            {data.map((slice) => {
              const strokeDasharray = `${(slice.count / total) * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedOffset;
              accumulatedOffset += (slice.count / total) * circumference;

              if (slice.count === 0) return null;

              return (
                <circle
                  key={slice.label}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="14"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-[#193C49] leading-none">
              {counts.Available + counts['On Trip']}
            </span>
            <span className="text-[10px] text-[#71818A] uppercase font-semibold mt-0.5">
              Active
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2.5 flex-1 max-w-[140px]">
          {data.map((item) => {
            const pct = Math.round((item.count / total) * 100);
            return (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.bgClass}`} />
                  <span className="text-[#193C49] font-medium">{item.label}</span>
                </div>
                <span className="text-[#71818A] font-semibold">{item.count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#F0ECE1] text-[11px] text-[#71818A] flex justify-between">
        <span>Available for dispatch: <strong className="text-[#23866D]">{counts.Available}</strong></span>
        <span>Maintenance ratio: <strong className="text-[#E9A23B]">{Math.round((counts['In Shop'] / total) * 100)}%</strong></span>
      </div>
    </div>
  );
}
