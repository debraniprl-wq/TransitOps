'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Truck,
  Users,
  Navigation,
  Wrench,
  Fuel,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronRight,
  Boxes,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Vehicles', href: '/vehicles', icon: Truck },
  { name: 'Drivers', href: '/drivers', icon: Users },
  { name: 'Trips & Dispatch', href: '/trips', icon: Navigation },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'Fuel & Expenses', href: '/expenses', icon: Fuel },
  { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
  { name: 'User Management', href: '/users', icon: ShieldCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#123B38] text-[#E5EFEA] flex flex-col h-full border-r border-[#1B4C48] shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#1B4C48] gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#23866D] flex items-center justify-center text-white shadow-md">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-white leading-tight">
            TransitOps
          </h1>
          <p className="text-[11px] font-medium text-[#A9CDBA] tracking-wider uppercase">
            Operations Hub
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-[#8EABA3] uppercase tracking-wider">
          Fleet Operations
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1D5854] text-white shadow-xs'
                  : 'text-[#C9DDD6] hover:bg-[#184D49] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#A9CDBA]' : 'text-[#8EABA3]'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#A9CDBA]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Decorative Logistics Illustration / Card at bottom */}
      <div className="p-4 border-t border-[#1B4C48] bg-[#0E2F2D]/60">
        <div className="rounded-xl bg-[#164440] p-3.5 border border-[#1E5752]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A9CDBA] flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5" />
              Transit Network
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#23866D] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#23866D]" />
            </span>
          </div>
          <p className="text-xs text-[#C9DDD6] leading-relaxed">
            All freight nodes operational with active dispatch sync.
          </p>
          <div className="mt-2.5 pt-2 border-t border-[#1F5550] flex items-center justify-between text-[11px] text-[#A9CDBA]">
            <span>System v2.4</span>
            <Link
              href="/reports"
              onClick={onCloseMobile}
              className="hover:underline flex items-center gap-0.5"
            >
              Telemetry <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
