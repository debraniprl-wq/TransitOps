'use client';

import React from 'react';
import { FuelLog } from '@/types';

interface FuelBarChartProps {
  fuelLogs: FuelLog[];
}

export function FuelBarChart({ fuelLogs }: FuelBarChartProps) {
  // Aggregate fuel consumed by date (or vehicle)
  const sorted = [...fuelLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const groupedByDate: Record<string, { litres: number; cost: number }> = {};

  sorted.forEach((log) => {
    const d = log.date.substring(5); // MM-DD
    if (!groupedByDate[d]) {
      groupedByDate[d] = { litres: 0, cost: 0 };
    }
    groupedByDate[d].litres += log.litres;
    groupedByDate[d].cost += log.total_cost;
  });

  const chartData = Object.entries(groupedByDate).map(([date, val]) => ({
    date,
    litres: Math.round(val.litres),
    cost: Math.round(val.cost),
  }));

  const maxLitres = Math.max(...chartData.map((d) => d.litres), 100);

  return (
    <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-[#193C49]">Fuel Consumption Overview</h3>
          <p className="text-xs text-[#71818A]">Litres logged across recent refuel dates</p>
        </div>
        <span className="text-xs font-semibold text-[#23866D] bg-[#E8F5F1] px-2.5 py-1 rounded-full border border-[#C2E3D8]">
          Total {chartData.reduce((a, b) => a + b.litres, 0).toLocaleString()} L
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-[#71818A]">
          No fuel records recorded yet.
        </div>
      ) : (
        <div className="space-y-3 my-2">
          {chartData.map((item) => {
            const widthPct = Math.max(12, Math.round((item.litres / maxLitres) * 100));
            return (
              <div key={item.date} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#193C49]">{item.date}</span>
                  <div className="space-x-2">
                    <span className="font-semibold text-[#23866D]">{item.litres} Litres</span>
                    <span className="text-[#71818A]">(${item.cost})</span>
                  </div>
                </div>
                <div className="w-full bg-[#F5F2E9] h-2.5 rounded-full overflow-hidden border border-[#E2DDD1]">
                  <div
                    className="bg-[#23866D] h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[#F0ECE1] text-[11px] text-[#71818A] flex justify-between">
        <span>Average price: <strong>$1.23 / L</strong></span>
        <span>Filtered logs: <strong>{fuelLogs.length}</strong></span>
      </div>
    </div>
  );
}
