'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
  UserCheck,
  Check,
  ExternalLink,
  Database,
  ChevronRight,
  Boxes,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DataProvider } from '@/lib/data-provider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AppNotification, Vehicle, Driver, Trip } from '@/types';

// ── Navigation items (preserved from Sidebar.tsx) ──────────────────────────
const NAV_ITEMS = [
  { name: 'Dashboard',          href: '/',          icon: LayoutDashboard },
  { name: 'Vehicles',           href: '/vehicles',  icon: Truck },
  { name: 'Drivers',            href: '/drivers',   icon: Users },
  { name: 'Trips & Dispatch',   href: '/trips',     icon: Navigation },
  { name: 'Maintenance',        href: '/maintenance', icon: Wrench },
  { name: 'Fuel & Expenses',    href: '/expenses',  icon: Fuel },
  { name: 'Reports & Analytics',href: '/reports',   icon: BarChart3 },
  { name: 'User Management',    href: '/users',     icon: ShieldCheck },
  { name: 'Settings',           href: '/settings',  icon: Settings },
];

// Items visible inline on the nav bar (first 6); rest go into overflow menu
const INLINE_COUNT = 6;

interface TopNavProps {
  mobileMenuOpen: boolean;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
}

export function TopNav({ mobileMenuOpen, onToggleMobile, onCloseMobile }: TopNavProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, role, setRole, logout, allProfiles, switchUser } = useAuth();

  // ── Search ──────────────────────────────────────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<{
    vehicles: Vehicle[]; drivers: Driver[]; trips: Trip[];
  } | null>(null);
  const [isSearchOpen,  setIsSearchOpen]  = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen,   setIsNotifOpen]   = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Profile dropdown ─────────────────────────────────────────────────────
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── Overflow nav menu (desktop) ──────────────────────────────────────────
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // ── Load notifications ───────────────────────────────────────────────────
  const loadNotifications = async () => {
    const list = await DataProvider.getNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10_000);
    return () => clearInterval(interval);
  }, []);

  // ── Global search ────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        const res = await DataProvider.globalSearch(searchQuery);
        setSearchResults(res);
        setIsSearchOpen(true);
      } else {
        setSearchResults(null);
        setIsSearchOpen(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Click-outside ────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current  && !searchRef.current.contains(e.target  as Node)) setIsSearchOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target   as Node)) setIsNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
      if (moreRef.current    && !moreRef.current.contains(e.target    as Node)) setIsMoreOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    await DataProvider.markAllNotificationsRead();
    await loadNotifications();
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    await DataProvider.markNotificationRead(notif.id);
    setIsNotifOpen(false);
    if (notif.link) router.push(notif.link);
  };

  const roleDisplayNames: Record<string, string> = {
    fleet_manager:    'Fleet Manager',
    dispatcher:       'Dispatcher',
    safety_officer:   'Safety Officer',
    financial_analyst:'Financial Analyst',
  };

  const inlineItems   = NAV_ITEMS.slice(0, INLINE_COUNT);
  const overflowItems = NAV_ITEMS.slice(INLINE_COUNT);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          PRIMARY NAVIGATION BAR
          ═══════════════════════════════════════════════════════════════════ */}
      <header
        id="top-nav-header"
        className="sticky top-0 z-40 w-full bg-[#123B38] border-b border-[#1B4C48] shadow-md"
      >
        {/* ── Row 1: Brand + Module Nav + Controls ── */}
        <div className="flex items-center h-14 px-4 lg:px-6 gap-3">

          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group mr-2"
            aria-label="TransitOps Home"
          >
            <div className="w-8 h-8 rounded-lg bg-[#23866D] flex items-center justify-center shadow-md group-hover:bg-[#1D735D] transition-colors">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-sm text-white leading-tight tracking-tight">TransitOps</div>
              <div className="text-[10px] font-medium text-[#A9CDBA] tracking-wider uppercase leading-none">
                Operations Hub
              </div>
            </div>
          </Link>

          {/* Separator */}
          <div className="hidden lg:block w-px h-6 bg-[#1B4C48] mx-1 shrink-0" />

          {/* ── Desktop Horizontal Nav Links ── */}
          <nav
            id="desktop-nav"
            className="hidden lg:flex items-center gap-0.5 flex-1 overflow-hidden"
            aria-label="Main navigation"
          >
            {inlineItems.map((item) => {
              const active = isActive(item.href);
              const Icon   = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                    transition-all duration-150 whitespace-nowrap select-none
                    ${active
                      ? 'bg-[#1D5854] text-white shadow-inner'
                      : 'text-[#C9DDD6] hover:bg-[#184D49] hover:text-white'}
                  `}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#A9CDBA]' : 'text-[#8EABA3]'}`} />
                  <span>{item.name}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#A9CDBA] ml-0.5 shrink-0" />}
                </Link>
              );
            })}

            {/* Overflow "More" menu */}
            {overflowItems.length > 0 && (
              <div ref={moreRef} className="relative">
                <button
                  id="nav-more-menu-btn"
                  type="button"
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                    transition-all duration-150 select-none
                    ${overflowItems.some((i) => isActive(i.href))
                      ? 'bg-[#1D5854] text-white'
                      : 'text-[#C9DDD6] hover:bg-[#184D49] hover:text-white'}
                  `}
                >
                  More
                  <ChevronDown className={`w-3 h-3 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMoreOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xl overflow-hidden z-50 py-1">
                    {overflowItems.map((item) => {
                      const active = isActive(item.href);
                      const Icon   = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className={`
                            flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors
                            ${active
                              ? 'bg-[#E8F5F1] text-[#193C49]'
                              : 'text-[#193C49] hover:bg-[#F5F2E9]'}
                          `}
                        >
                          <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#23866D]' : 'text-[#71818A]'}`} />
                          {item.name}
                          {active && <ChevronRight className="w-3 h-3 ml-auto text-[#23866D]" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Spacer so controls are right-aligned on desktop when no nav visible */}
          <div className="flex-1 lg:hidden" />

          {/* ── Right Controls ── */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Global Search */}
            <div ref={searchRef} className="relative hidden sm:block">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8EABA3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="global-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults) setIsSearchOpen(true); }}
                  placeholder="Search..."
                  aria-label="Global search"
                  className="w-36 lg:w-52 pl-8 pr-3 py-1.5 bg-[#1B4C48] border border-[#2A6561] rounded-lg text-xs text-[#E5EFEA] placeholder-[#8EABA3] focus:outline-none focus:border-[#23866D] focus:bg-[#164440] focus:w-64 transition-all duration-200"
                />
              </div>

              {/* Search Dropdown */}
              {isSearchOpen && searchResults && (
                <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xl overflow-hidden max-h-96 overflow-y-auto z-50">
                  <div className="p-2 border-b border-[#EAE5D9] bg-[#FAF8F3] text-xs font-semibold text-[#71818A] flex justify-between items-center">
                    <span>Results for &ldquo;{searchQuery}&rdquo;</span>
                    <span className="text-[11px] font-normal text-[#8EABA3]">Live Records</span>
                  </div>

                  {searchResults.vehicles.length > 0 && (
                    <div className="p-2 border-b border-[#EAE5D9]">
                      <span className="text-[11px] font-semibold text-[#71818A] uppercase tracking-wider px-2 flex items-center gap-1.5 mb-1">
                        <Truck className="w-3 h-3 text-[#23866D]" /> Vehicles ({searchResults.vehicles.length})
                      </span>
                      {searchResults.vehicles.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                            router.push(`/vehicles?search=${encodeURIComponent(v.reg_number)}`);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#F5F2E9] text-xs flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-[#193C49]">{v.reg_number}</span>
                            <span className="text-[#71818A] ml-2">{v.model} ({v.type})</span>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-[#193C49] border border-stone-200">{v.status}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.drivers.length > 0 && (
                    <div className="p-2 border-b border-[#EAE5D9]">
                      <span className="text-[11px] font-semibold text-[#71818A] uppercase tracking-wider px-2 flex items-center gap-1.5 mb-1">
                        <Users className="w-3 h-3 text-[#4F91D8]" /> Drivers ({searchResults.drivers.length})
                      </span>
                      {searchResults.drivers.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                            router.push(`/drivers?search=${encodeURIComponent(d.name)}`);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#F5F2E9] text-xs flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-[#193C49]">{d.name}</span>
                            <span className="text-[#71818A] ml-2">{d.license_number}</span>
                          </div>
                          <span className="text-[11px] text-[#23866D] font-medium">Safety: {d.safety_score}%</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.trips.length > 0 && (
                    <div className="p-2">
                      <span className="text-[11px] font-semibold text-[#71818A] uppercase tracking-wider px-2 flex items-center gap-1.5 mb-1">
                        <Navigation className="w-3 h-3 text-[#E9A23B]" /> Trips ({searchResults.trips.length})
                      </span>
                      {searchResults.trips.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                            router.push(`/trips?search=${encodeURIComponent(t.trip_code)}`);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#F5F2E9] text-xs flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-[#193C49]">{t.trip_code}</span>
                            <span className="text-[#71818A] ml-2">{t.source} &rarr; {t.destination}</span>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{t.status}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.vehicles.length === 0 && searchResults.drivers.length === 0 && searchResults.trips.length === 0 && (
                    <div className="p-6 text-center text-xs text-[#71818A]">
                      No matching records found in fleet database.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DB Status Pill */}
            <button
              id="db-status-btn"
              onClick={() => router.push('/settings')}
              title={isSupabaseConfigured ? 'Supabase Database Connected' : 'Running in TransitOps Persistent Local Engine'}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isSupabaseConfigured
                  ? 'bg-[#1D5854] text-[#A9CDBA] border-[#2A6561]'
                  : 'bg-[#4A3800] text-[#E9A23B] border-[#6B5200]'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>{isSupabaseConfigured ? 'Supabase Live' : 'Sandbox'}</span>
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                id="notifications-btn"
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                aria-label="Notifications"
                className="p-2 rounded-lg text-[#C9DDD6] hover:bg-[#184D49] hover:text-white relative transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#D95353] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[#EAE5D9] bg-[#FAF8F3] flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-[#193C49]">Fleet Notifications</h4>
                      <p className="text-xs text-[#71818A]">{unreadCount} unread alert{unreadCount === 1 ? '' : 's'}</p>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-[#23866D] hover:underline font-medium">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#EAE5D9]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#71818A]">No notifications.</div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3.5 text-xs hover:bg-[#F5F2E9] cursor-pointer transition-colors ${!notif.read ? 'bg-[#FAF8F2]' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-[#193C49] leading-tight">{notif.title}</span>
                            {!notif.read && <span className="w-2 h-2 rounded-full bg-[#23866D] shrink-0 mt-1" />}
                          </div>
                          <p className="text-[#5A6872] mt-1 leading-relaxed">{notif.message}</p>
                          {notif.link && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#23866D] font-medium mt-1.5">
                              View details <ExternalLink className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div ref={profileRef} className="relative">
              <button
                id="profile-menu-btn"
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-[#184D49] border border-transparent hover:border-[#2A6561] transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-[#23866D] text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#2A6561]">
                  {user?.full_name ? user.full_name[0] : 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-white leading-none">
                    {user?.full_name || 'Fleet Operator'}
                  </div>
                  <div className="text-[10px] font-medium text-[#A9CDBA] mt-0.5">
                    {roleDisplayNames[role] || role}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-[#8EABA3] hidden md:block" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xl overflow-hidden z-50 p-2">
                  <div className="px-3 py-2 border-b border-[#EAE5D9]">
                    <p className="text-xs font-semibold text-[#193C49]">{user?.full_name}</p>
                    <p className="text-[11px] text-[#71818A]">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F5F1] text-[#1E735E]">
                      {roleDisplayNames[role]}
                    </span>
                  </div>

                  {/* Role Switcher */}
                  <div className="py-2 border-b border-[#EAE5D9]">
                    <p className="px-3 text-[10px] font-semibold text-[#71818A] uppercase tracking-wider mb-1">
                      Switch Active Role
                    </p>
                    {allProfiles.map((p) => {
                      const isSelected = user?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            switchUser(p.id);
                            setRole(p.role);
                            setIsProfileOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-[#F5F2E9] transition-colors"
                        >
                          <div>
                            <div className="font-medium text-[#193C49]">{p.full_name}</div>
                            <div className="text-[10px] text-[#71818A]">{roleDisplayNames[p.role]}</div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#23866D]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="pt-1">
                    <button
                      onClick={() => { setIsProfileOpen(false); router.push('/settings'); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[#193C49] hover:bg-[#F5F2E9] flex items-center gap-2 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#71818A]" /> Profile &amp; Settings
                    </button>
                    <button
                      onClick={() => { logout(); setIsProfileOpen(false); router.push('/login'); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[#D95353] hover:bg-red-50 flex items-center gap-2 transition-colors mt-0.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              id="mobile-menu-btn"
              type="button"
              onClick={onToggleMobile}
              aria-label="Toggle navigation menu"
              className="p-2 rounded-lg text-[#C9DDD6] hover:bg-[#184D49] hover:text-white lg:hidden transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Nav Drawer (slides down below the bar) ── */}
        {mobileMenuOpen && (
          <nav
            id="mobile-nav-menu"
            className="lg:hidden border-t border-[#1B4C48] bg-[#0E2F2D] px-4 py-3"
            aria-label="Mobile navigation"
          >
            {/* Mobile search */}
            <div className="mb-3 sm:hidden">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8EABA3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vehicles, drivers, trips..."
                  className="w-full pl-8 pr-3 py-2 bg-[#164440] border border-[#2A6561] rounded-lg text-xs text-[#E5EFEA] placeholder-[#8EABA3] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                const Icon   = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`
                      flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors
                      ${active
                        ? 'bg-[#1D5854] text-white'
                        : 'text-[#C9DDD6] hover:bg-[#184D49] hover:text-white'}
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#A9CDBA]' : 'text-[#8EABA3]'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Transit Network status card */}
            <div className="mt-3 rounded-xl bg-[#164440] p-3 border border-[#1E5752]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A9CDBA] flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5" /> Transit Network
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#23866D] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#23866D]" />
                </span>
              </div>
              <p className="text-xs text-[#C9DDD6] leading-relaxed">All freight nodes operational.</p>
              <div className="mt-2 pt-2 border-t border-[#1F5550] flex items-center justify-between text-[11px] text-[#A9CDBA]">
                <span>System v2.4</span>
                <Link href="/reports" onClick={onCloseMobile} className="hover:underline flex items-center gap-0.5">
                  Telemetry <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          SECONDARY MODULE BREADCRUMB BAR
          A slim context bar that shows current section, styled in cream
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-14 z-30 w-full bg-[#FFFEFA] border-b border-[#E2DDD1] shadow-xs">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center gap-2">
          {(() => {
            const current = NAV_ITEMS.find((item) =>
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            );
            const Icon = current?.icon ?? LayoutDashboard;
            return (
              <>
                <Icon className="w-3.5 h-3.5 text-[#23866D] shrink-0" />
                <span className="text-xs font-semibold text-[#193C49]">
                  {current?.name ?? 'TransitOps'}
                </span>
                <span className="w-1 h-1 rounded-full bg-[#C2D5CC] mx-1" />
                <span className="text-xs text-[#71818A]">Fleet Operations Platform</span>
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}
