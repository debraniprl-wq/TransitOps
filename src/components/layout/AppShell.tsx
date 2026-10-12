'use client';

import React, { useState } from 'react';
import { TopNav } from './TopNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#F5F2E9]">
      {/* Full-width sticky top navigation */}
      <TopNav
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobile={() => setMobileMenuOpen(!mobileMenuOpen)}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Scrollable Workspace — full width */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 bg-[#F5F2E9]">
        <div className="max-w-screen-2xl mx-auto space-y-6">{children}</div>
      </main>
    </div>
  );
}
