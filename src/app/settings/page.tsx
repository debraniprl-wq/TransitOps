'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Building,
  BellRing,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { DataProvider } from '@/lib/data-provider';
import { testSupabaseConnection, isSupabaseConfigured } from '@/lib/supabase';
import { SystemSettings } from '@/types';

export default function SettingsPage() {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Supabase test state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    tested: boolean;
    connected: boolean;
    message: string;
    error?: string;
  } | null>(null);

  // Reset confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Copy SQL state
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    DataProvider.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    const res = await DataProvider.updateSettings(settings);
    setSaving(false);

    if (res.success) {
      showToast('System configuration saved successfully', 'success');
    } else {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleTestSupabase = async () => {
    setTestingConnection(true);
    const result = await testSupabaseConnection();
    setTestingConnection(false);
    setConnectionResult({ tested: true, ...result });

    if (result.connected) {
      showToast('Supabase connection verified!', 'success');
    } else {
      showToast(result.message, 'info');
    }
  };

  const handleResetData = () => {
    DataProvider.resetToSeedData();
    setIsResetConfirmOpen(false);
    showToast('Platform restored to default factory seed data', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleCopyMigrationSql = () => {
    const sqlPath = 'supabase/migrations/20261011_transitops_schema.sql';
    navigator.clipboard.writeText(sqlPath);
    setCopiedSql(true);
    showToast('Migration file path copied to clipboard', 'info');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (loading || !settings) {
    return (
      <AppShell>
        <div className="py-20 text-center text-xs text-[#71818A]">
          Loading system parameters...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2DDD1]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#193C49] tracking-tight">
            System Settings &amp; Cloud Integration
          </h2>
          <p className="text-xs sm:text-sm text-[#71818A] mt-0.5">
            Fleet network configuration, telemetry thresholds, and Supabase database connection
          </p>
        </div>

        <button
          onClick={() => setIsResetConfirmOpen(true)}
          className="px-3.5 py-2 bg-stone-100 hover:bg-red-50 text-[#D95353] border border-[#E2DDD1] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Factory Seed Data</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form (2 columns) */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-2 space-y-6">
          {/* General Organization Settings */}
          <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-sm text-[#193C49] mb-1 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#23866D]" /> Fleet Network Identity
            </h3>
            <p className="text-xs text-[#71818A] mb-4">
              Organization parameters applied to freight manifests and exported reports
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Operating Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={settings.org_name}
                  onChange={(e) => setSettings({ ...settings, org_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#193C49] mb-1">
                    Central Logistics Base *
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.region_base}
                    onChange={(e) => setSettings({ ...settings, region_base: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#193C49] mb-1">
                    Default Currency Code
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Measurement System
                </label>
                <select
                  value={settings.units}
                  onChange={(e) =>
                    setSettings({ ...settings, units: e.target.value as 'metric' | 'imperial' })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="metric">Metric (Kilometers, Kilograms, Litres)</option>
                  <option value="imperial">Imperial (Miles, Pounds, Gallons)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Telemetry & Compliance Thresholds */}
          <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-sm text-[#193C49] mb-1 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#E9A23B]" /> Compliance Alert Thresholds
            </h3>
            <p className="text-xs text-[#71818A] mb-4">
              Automated trigger limits for safety warnings and routine maintenance
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  License Expiry Warning Window (Days) *
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  required
                  value={settings.license_warning_days}
                  onChange={(e) =>
                    setSettings({ ...settings, license_warning_days: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
                <p className="text-[11px] text-[#71818A] mt-1">
                  Triggers yellow badge when commercial license expires within this count
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Routine Maintenance Odometer Interval (km) *
                </label>
                <input
                  type="number"
                  min="1000"
                  max="50000"
                  required
                  value={settings.maintenance_interval_km}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenance_interval_km: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
                <p className="text-[11px] text-[#71818A] mt-1">
                  Scheduled preventative inspection interval
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#23866D] hover:bg-[#1D735D] text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>

        {/* Supabase Integration & Status Panel (1 column) */}
        <div className="space-y-6">
          <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-sm text-[#193C49] mb-1 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#4F91D8]" /> Supabase Integration
            </h3>
            <p className="text-xs text-[#71818A] mb-4">
              Real cloud database connection status
            </p>

            <div className="p-3.5 rounded-xl border bg-[#FAF8F3] border-[#EAE5D9] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#71818A]">Mode:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                    isSupabaseConfigured
                      ? 'bg-[#E8F5F1] text-[#1E735E] border border-[#C2E3D8]'
                      : 'bg-[#FEF7EC] text-[#B7791F] border border-[#FCE6BE]'
                  }`}
                >
                  {isSupabaseConfigured ? 'Supabase Live' : 'Persistent Local Sandbox'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#71818A]">Client Safe Key:</span>
                <span className="font-mono text-[11px] text-[#193C49]">
                  {isSupabaseConfigured ? 'NEXT_PUBLIC_ANON_KEY (Loaded)' : 'Pending in .env.local'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#71818A]">Service Role Key:</span>
                <span className="text-[11px] text-[#23866D] font-semibold">
                  Zero Client Leakage
                </span>
              </div>
            </div>

            <button
              onClick={handleTestSupabase}
              disabled={testingConnection}
              className="w-full mt-3 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-[#193C49] text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-stone-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin text-[#23866D]' : ''}`} />
              <span>{testingConnection ? 'Testing Connection...' : 'Test Supabase Connection'}</span>
            </button>

            {connectionResult && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs border ${
                  connectionResult.connected
                    ? 'bg-[#E8F5F1] border-[#C2E3D8] text-[#1E735E]'
                    : 'bg-[#FEF7EC] border-[#FCE6BE] text-[#B7791F]'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {connectionResult.connected ? (
                    <CheckCircle2 className="w-4 h-4 text-[#23866D]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#E9A23B]" />
                  )}
                  <span>{connectionResult.connected ? 'Connection Success' : 'Status Note'}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">{connectionResult.message}</p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[#F0ECE1] space-y-2 text-xs text-[#71818A]">
              <span className="font-semibold text-[#193C49] block">Database Setup Instructions:</span>
              <p className="text-[11px] leading-relaxed">
                1. Copy <code>.env.example</code> to <code>.env.local</code> and provide your Supabase URL &amp; Anon Key.
              </p>
              <p className="text-[11px] leading-relaxed">
                2. Run the migration SQL in your Supabase SQL Editor:
              </p>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[#F5F2E9] border border-[#E2DDD1] text-[11px] font-mono text-[#193C49]">
                <span className="truncate flex-1">supabase/migrations/20261011_transitops_schema.sql</span>
                <button
                  type="button"
                  onClick={handleCopyMigrationSql}
                  title="Copy path"
                  className="p-1 text-[#71818A] hover:text-[#193C49]"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-[#23866D]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM RESET DIALOG */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Reset Entire Fleet Platform"
        message="This action will reset all vehicles, drivers, trips, maintenance logs, and expenses back to the default initial seed database. Any customized records will be reverted."
        confirmLabel="Reset Everything"
        isDestructive={true}
      />
    </AppShell>
  );
}
