'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Lock, Mail, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { INITIAL_PROFILES } from '@/lib/seed-data';

export default function LoginPage() {
  const router = useRouter();
  const { login, switchUser, setRole } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('manager@transitops.io');
  const [password, setPassword] = useState('TransitOps2026!');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const success = login(email);
      if (success) {
        showToast('Authenticated successfully', 'success');
        router.push('/');
      } else {
        showToast('Invalid credentials', 'error');
      }
    }, 400);
  };

  const handleQuickLoginAs = (profileId: string) => {
    const target = INITIAL_PROFILES.find((p) => p.id === profileId);
    if (target) {
      setEmail(target.email);
      switchUser(target.id);
      setRole(target.role);
      showToast(`Logged in as ${target.full_name} (${target.role})`, 'success');
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2E9] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#FFFEFA] border border-[#E2DDD1] rounded-2xl p-6 sm:p-8 shadow-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#123B38] flex items-center justify-center text-white shadow-md mb-3">
            <Truck className="w-6 h-6 text-[#A9CDBA]" />
          </div>
          <h1 className="text-2xl font-bold text-[#193C49] tracking-tight">TransitOps</h1>
          <p className="text-xs text-[#71818A] mt-1">Smart Transport Operations Platform</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#193C49] mb-1">
              Operator Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#71818A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@transitops.io"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#193C49] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#71818A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#23866D] hover:bg-[#1D735D] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Role Switcher Demo logins */}
        <div className="mt-6 pt-5 border-t border-[#EAE5D9]">
          <p className="text-[11px] font-semibold text-[#71818A] uppercase tracking-wider mb-2 text-center">
            Instant Demo Sign-in by Role
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {INITIAL_PROFILES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleQuickLoginAs(p.id)}
                className="p-2 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9] hover:bg-[#F5F2E9] hover:border-[#C2E3D8] text-left transition-all"
              >
                <div className="font-semibold text-[#193C49] truncate">{p.full_name}</div>
                <div className="text-[10px] text-[#23866D] capitalize">
                  {p.role.replace('_', ' ')}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 text-center text-[11px] text-[#71818A]">
          Row Level Security (RLS) &bull; Supabase Auth Ready
        </div>
      </div>
    </div>
  );
}
