'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  LogOut,
  UserCheck,
  Check,
  ExternalLink,
  Truck,
  Users,
  Navigation,
  Database,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DataProvider } from '@/lib/data-provider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AppNotification, Vehicle, Driver, Trip } from '@/types';

interface NavbarProps {
  onToggleMobile: () => void;
}

export function Navbar({ onToggleMobile }: NavbarProps) {
  const router = useRouter();
  const { user, role, setRole, logout, allProfiles, switchUser } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    vehicles: Vehicle[];
    drivers: Driver[];
    trips: Trip[];
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Profile menu state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const loadNotifications = async () => {
    const list = await DataProvider.getNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Global search trigger
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

  // Click outside listeners
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    await DataProvider.markAllNotificationsRead();
    await loadNotifications();
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    await DataProvider.markNotificationRead(notif.id);
    setIsNotifOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const roleDisplayNames: Record<string, string> = {
    fleet_manager: 'Fleet Manager',
    dispatcher: 'Dispatcher',
    safety_officer: 'Safety Officer',
    financial_analyst: 'Financial Analyst',
  };

  return (
    <header className="h-16 bg-[#FFFEFA] border-b border-[#E2DDD1] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile hamburger & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onToggleMobile}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg text-[#193C49] hover:bg-[#F5F2E9] lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Input */}
        <div ref={searchRef} className="relative w-full max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-[#71818A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults) setIsSearchOpen(true);
              }}
              placeholder="Search vehicles, drivers, trips... (e.g. TX, TRP, Pendelton)"
              className="w-full pl-10 pr-4 py-2 bg-[#F5F2E9] border border-[#E2DDD1] rounded-lg text-sm text-[#193C49] placeholder-[#71818A] focus:outline-none focus:border-[#23866D] focus:bg-[#FFFEFA] transition-all"
            />
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && searchResults && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xl overflow-hidden max-h-96 overflow-y-auto z-50">
              <div className="p-2 border-b border-[#EAE5D9] bg-[#FAF8F3] text-xs font-semibold text-[#71818A] flex justify-between items-center">
                <span>Search Results for &ldquo;{searchQuery}&rdquo;</span>
                <span className="text-[11px] font-normal text-[#8EABA3]">Live Records</span>
              </div>

              {/* Vehicles */}
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
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-[#193C49] border border-stone-200">
                        {v.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Drivers */}
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
                      <span className="text-[11px] text-[#23866D] font-medium">
                        Safety: {d.safety_score}%
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Trips */}
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
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {t.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.vehicles.length === 0 &&
                searchResults.drivers.length === 0 &&
                searchResults.trips.length === 0 && (
                  <div className="p-6 text-center text-xs text-[#71818A]">
                    No matching records found in fleet database.
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Database Status, Notifications, and Profile */}
      <div className="flex items-center gap-3">
        {/* Connection status indicator */}
        <button
          onClick={() => router.push('/settings')}
          title={isSupabaseConfigured ? 'Supabase Database Connected' : 'Running in TransitOps Persistent Local Engine'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            isSupabaseConfigured
              ? 'bg-[#E8F5F1] text-[#1E735E] border-[#C2E3D8]'
              : 'bg-[#FEF7EC] text-[#B7791F] border-[#FCE6BE]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isSupabaseConfigured ? 'Supabase Live' : 'Sandbox (Local Mode)'}</span>
        </button>

        {/* Notification Center */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            aria-label="Notifications"
            className="p-2 rounded-lg text-[#193C49] hover:bg-[#F5F2E9] relative transition-colors"
          >
            <Bell className="w-5 h-5 text-[#193C49]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#D95353] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[#EAE5D9] bg-[#FAF8F3] flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[#193C49]">Fleet Notifications</h4>
                  <p className="text-xs text-[#71818A]">{unreadCount} unread alert{unreadCount === 1 ? '' : 's'}</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-[#23866D] hover:underline font-medium"
                  >
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
                      className={`p-3.5 text-xs hover:bg-[#F5F2E9] cursor-pointer transition-colors ${
                        !notif.read ? 'bg-[#FAF8F2]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-[#193C49] leading-tight">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-[#23866D] shrink-0 mt-1" />
                        )}
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

        {/* Profile Menu & Role Switcher */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl hover:bg-[#F5F2E9] border border-transparent hover:border-[#E2DDD1] transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-[#123B38] text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#23866D]">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-[#193C49] leading-none">
                {user?.full_name || 'Fleet Operator'}
              </div>
              <div className="text-[10px] font-medium text-[#23866D] mt-0.5">
                {roleDisplayNames[role] || role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#71818A]" />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xl overflow-hidden z-50 p-2">
              <div className="px-3 py-2 border-b border-[#EAE5D9]">
                <p className="text-xs font-semibold text-[#193C49]">{user?.full_name}</p>
                <p className="text-[11px] text-[#71818A]">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F5F1] text-[#1E735E]">
                  {roleDisplayNames[role]}
                </span>
              </div>

              {/* Role Quick Switcher */}
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
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push('/settings');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[#193C49] hover:bg-[#F5F2E9] flex items-center gap-2 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#71818A]" /> Profile &amp; Settings
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsProfileOpen(false);
                    router.push('/login');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[#D95353] hover:bg-red-50 flex items-center gap-2 transition-colors mt-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
