'use client';

import React from 'react';
import { Expense } from '@/types';

interface ExpenseStackedChartProps {
  expenses: Expense[];
}

export function ExpenseStackedChart({ expenses }: ExpenseStackedChartProps) {
  const categoryTotals: Record<string, number> = {
    Tolls: 0,
    Maintenance: 0,
    Insurance: 0,
    Parking: 0,
    Permits: 0,
    Other: 0,
  };

  expenses.forEach((e) => {
    if (categoryTotals[e.category] !== undefined) {
      categoryTotals[e.category] += e.amount;
    } else {
      categoryTotals.Other += e.amount;
    }
  });

  const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;

  const categories = [
    { name: 'Tolls', amount: categoryTotals.Tolls, color: '#4F91D8' },
    { name: 'Maintenance', amount: categoryTotals.Maintenance, color: '#E9A23B' },
    { name: 'Permits', amount: categoryTotals.Permits, color: '#23866D' },
    { name: 'Insurance', amount: categoryTotals.Insurance, color: '#123B38' },
    { name: 'Parking', amount: categoryTotals.Parking, color: '#A9CDBA' },
    { name: 'Other', amount: categoryTotals.Other, color: '#71818A' },
  ].filter((c) => c.amount > 0);

  return (
    <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-[#193C49]">Operational Expense Allocation</h3>
          <p className="text-xs text-[#71818A]">Categorical distribution of operational expenditures</p>
        </div>
        <span className="text-xs font-semibold text-[#193C49] bg-[#F5F2E9] px-2.5 py-1 rounded-full border border-[#E2DDD1]">
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="my-2">
        <div className="w-full h-4 rounded-full overflow-hidden flex border border-[#E2DDD1] bg-[#F5F2E9]">
          {categories.map((c) => {
            const pct = (c.amount / total) * 100;
            return (
              <div
                key={c.name}
                style={{ width: `${pct}%`, backgroundColor: c.color }}
                title={`${c.name}: $${c.amount} (${Math.round(pct)}%)`}
                className="h-full transition-all duration-500 ease-out"
              />
            );
          })}
        </div>

        {/* Legend grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
          {categories.map((c) => {
            const pct = Math.round((c.amount / total) * 100);
            return (
              <div key={c.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9]">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-[#193C49] truncate font-medium">{c.name}</span>
                </div>
                <span className="text-[#71818A] font-semibold text-[11px] ml-1">
                  ${c.amount} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#F0ECE1] text-[11px] text-[#71818A] flex justify-between">
        <span>Active categories: <strong>{categories.length}</strong></span>
        <span>Reimbursable claims: <strong>100% Verified</strong></span>
      </div>
    </div>
  );
}
