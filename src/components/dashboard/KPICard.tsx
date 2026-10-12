import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'info' | 'neutral';
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeType = 'neutral',
}: KPICardProps) {
  const badgeClasses = {
    success: 'bg-[#E8F5F1] text-[#1E735E] border-[#C2E3D8]',
    warning: 'bg-[#FEF7EC] text-[#B7791F] border-[#FCE6BE]',
    info: 'bg-[#EDF5FD] text-[#2B6CB0] border-[#C7E0FA]',
    neutral: 'bg-stone-100 text-[#5A6872] border-stone-200',
  }[badgeType];

  return (
    <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#71818A] uppercase tracking-wider">
            {title}
          </p>
          <div className="text-2xl sm:text-3xl font-bold text-[#193C49] tracking-tight">
            {value}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#F5F2E9] border border-[#E2DDD1] flex items-center justify-center text-[#23866D] group-hover:bg-[#E8F5F1] transition-colors">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#F0ECE1] flex items-center justify-between text-xs">
        <span className="text-[#71818A]">{subtitle}</span>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${badgeClasses}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
