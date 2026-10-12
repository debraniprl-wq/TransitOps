'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '@/types';
import { INITIAL_PROFILES } from './seed-data';

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  switchUser: (profileId: string) => void;
  allProfiles: Profile[];
  login: (email: string) => boolean;
  logout: () => void;
  permissions: {
    canManageVehicles: boolean;
    canDispatch: boolean;
    canManageSafety: boolean;
    canManageFinance: boolean;
    isAdmin: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile>(INITIAL_PROFILES[0]); // Default to Fleet Manager Marcus Vance

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('transitops_active_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const match = INITIAL_PROFILES.find((p) => p.id === parsed.id) || parsed;
        setUser(match);
      }
    } catch {
      // fallback
    }
  }, []);

  const switchUser = (profileId: string) => {
    const selected = INITIAL_PROFILES.find((p) => p.id === profileId);
    if (selected) {
      setUser(selected);
      try {
        localStorage.setItem('transitops_active_user', JSON.stringify(selected));
      } catch {}
    }
  };

  const setRole = (newRole: UserRole) => {
    const updated = { ...user, role: newRole };
    setUser(updated);
    try {
      localStorage.setItem('transitops_active_user', JSON.stringify(updated));
    } catch {}
  };

  const login = (email: string) => {
    const found = INITIAL_PROFILES.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setUser(found);
      localStorage.setItem('transitops_active_user', JSON.stringify(found));
      return true;
    }
    // Default fallback user
    const customUser: Profile = {
      id: crypto.randomUUID(),
      email,
      full_name: email.split('@')[0],
      role: 'dispatcher',
    };
    setUser(customUser);
    localStorage.setItem('transitops_active_user', JSON.stringify(customUser));
    return true;
  };

  const logout = () => {
    localStorage.removeItem('transitops_active_user');
    // Set to guest or re-default
    setUser(INITIAL_PROFILES[0]);
  };

  const permissions = {
    canManageVehicles: user.role === 'fleet_manager',
    canDispatch: user.role === 'fleet_manager' || user.role === 'dispatcher',
    canManageSafety: user.role === 'fleet_manager' || user.role === 'safety_officer',
    canManageFinance: user.role === 'fleet_manager' || user.role === 'financial_analyst',
    isAdmin: user.role === 'fleet_manager',
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        setRole,
        switchUser,
        allProfiles: INITIAL_PROFILES,
        login,
        logout,
        permissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
