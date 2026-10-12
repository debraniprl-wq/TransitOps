'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Check,
  Shield,
  Key,
  Users,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { DataProvider } from '@/lib/data-provider';
import { useToast } from '@/components/ui/Toast';
import { Profile, UserRole } from '@/types';

export default function UserManagementPage() {
  const { user, switchUser, role, setRole } = useAuth();
  const { showToast } = useToast();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfiles = async () => {
    setLoading(true);
    const data = await DataProvider.getProfiles();
    setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    await DataProvider.updateProfileRole(profileId, newRole);
    if (user?.id === profileId) {
      setRole(newRole);
    }
    showToast(`Role updated to ${newRole.replace('_', ' ')}`, 'success');
    loadProfiles();
  };

  const roleLabels: Record<UserRole, string> = {
    fleet_manager: 'Fleet Manager',
    dispatcher: 'Dispatcher',
    safety_officer: 'Safety Officer',
    financial_analyst: 'Financial Analyst',
  };

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2DDD1]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#193C49] tracking-tight">
            User Management &amp; Role-Based Access Control
          </h2>
          <p className="text-xs sm:text-sm text-[#71818A] mt-0.5">
            Manage administrative personnel, enforce Supabase Row Level Security (RLS) policies and operational permissions
          </p>
        </div>

        <button
          onClick={loadProfiles}
          title="Refresh user roster"
          className="p-2 bg-[#FFFEFA] border border-[#E2DDD1] hover:bg-[#F5F2E9] text-[#193C49] rounded-lg text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#23866D]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs">
        <h3 className="font-semibold text-sm text-[#193C49] mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#23866D]" /> Role Permission Matrix
        </h3>
        <p className="text-xs text-[#71818A] mb-4">
          Enforced server-side via Supabase Row Level Security policies and client navigation guards
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#EAE5D9] text-[#71818A] uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Role</th>
                <th className="py-2.5 px-3 font-semibold text-center">Vehicles CRUD</th>
                <th className="py-2.5 px-3 font-semibold text-center">Trips &amp; Dispatch</th>
                <th className="py-2.5 px-3 font-semibold text-center">Driver Safety &amp; Audit</th>
                <th className="py-2.5 px-3 font-semibold text-center">Expenses &amp; Fuel</th>
                <th className="py-2.5 px-3 font-semibold text-center">System Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE1]">
              <tr className="hover:bg-[#FAF8F3]">
                <td className="py-2.5 px-3 font-bold text-[#193C49]">Fleet Manager</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-[#23866D] mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-[#23866D] mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-[#23866D] mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-[#23866D] mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-[#23866D] mx-auto" /></td>
              </tr>
              <tr className="hover:bg-[#FAF8F3]">
                <td className="py-2.5 px-3 font-bold text-[#193C49]">Dispatcher</td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">Read-Only</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-[#23866D] mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">Read-Only</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-[#23866D] mx-auto" /> (Fuel)</td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">&times;</td>
              </tr>
              <tr className="hover:bg-[#FAF8F3]">
                <td className="py-2.5 px-3 font-bold text-[#193C49]">Safety Officer</td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">Read-Only</td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">Read-Only</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-[#23866D] mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">&times;</td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">&times;</td>
              </tr>
              <tr className="hover:bg-[#FAF8F3]">
                <td className="py-2.5 px-3 font-bold text-[#193C49]">Financial Analyst</td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">Read-Only</td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">Read-Only</td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">&times;</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-[#23866D] mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-[#71818A]">&times;</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Authorized Users Table */}
      <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#EAE5D9] bg-[#FAF8F3] flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-sm text-[#193C49]">Authenticated Operations Personnel</h3>
            <p className="text-xs text-[#71818A]">Select active user session or modify RBAC assignment</p>
          </div>
          <span className="text-xs text-[#71818A]">
            Current Session: <strong className="text-[#23866D]">{user?.full_name}</strong> ({roleLabels[role]})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#EAE5D9] text-[#71818A] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Assigned Role</th>
                <th className="py-3 px-4 font-semibold text-right">Switch Active Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE1]">
              {profiles.map((p) => {
                const isCurrent = user?.id === p.id;

                return (
                  <tr key={p.id} className="hover:bg-[#FAF8F3] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#193C49]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#123B38] text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#23866D]">
                          {p.full_name[0]}
                        </div>
                        <div>
                          <div>{p.full_name}</div>
                          {isCurrent && (
                            <span className="text-[10px] text-[#23866D] font-medium">Active Session</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#193C49] font-medium">{p.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={p.role}
                        onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                        className="px-2.5 py-1 bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-xs font-semibold text-[#193C49] focus:outline-none focus:border-[#23866D]"
                      >
                        <option value="fleet_manager">Fleet Manager</option>
                        <option value="dispatcher">Dispatcher</option>
                        <option value="safety_officer">Safety Officer</option>
                        <option value="financial_analyst">Financial Analyst</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          switchUser(p.id);
                          setRole(p.role);
                          showToast(`Switched active user to ${p.full_name}`, 'info');
                        }}
                        disabled={isCurrent}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isCurrent
                            ? 'bg-[#E8F5F1] text-[#1E735E] border border-[#C2E3D8] cursor-default'
                            : 'bg-stone-100 hover:bg-stone-200 text-[#193C49] border border-stone-200'
                        }`}
                      >
                        {isCurrent ? 'Current User' : 'Switch To This User'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
