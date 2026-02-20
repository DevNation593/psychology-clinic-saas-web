'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Tenant } from '@/types';
import { STORAGE_KEYS } from '@/lib/constants';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';


interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;

  // Actions
  setUser: (user: User) => void;
  setTenant: (tenant: Tenant) => void;
  setAuth: (user: User, tenant: Tenant) => void;
  logout: () => void;
  clearAuth: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}


export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setTenant: (tenant) => set({ tenant }),
      setAuth: (user, tenant) => set({ user, tenant, isAuthenticated: true }),
      logout: async () => {
        try {
          const refreshToken = typeof window !== 'undefined' 
            ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) 
            : null;
          if (refreshToken) {
            await authApi.logout(refreshToken);
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          apiClient.clearAuthData();
          set({ user: null, tenant: null, isAuthenticated: false });
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      },
      clearAuth: () => {
        apiClient.clearAuthData();
        set({ user: null, tenant: null, isAuthenticated: false });
      },
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
