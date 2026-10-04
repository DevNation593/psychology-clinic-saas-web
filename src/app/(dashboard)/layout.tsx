'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { NotificationsPanel } from '@/components/layout/notifications-panel';
import { useUIStore } from '@/store/uiStore';
import { postLoginRoute } from '@/lib/post-login-route';
import { ROUTES } from '@/lib/constants';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  // Anything other than the dashboard means this user does not belong in it.
  const homeRoute = user ? postLoginRoute(user) : ROUTES.DASHBOARD;
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  useEffect(() => {
    if (window.innerWidth < 768) {
      useUIStore.getState().setSidebarCollapsed(true);
    }
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (homeRoute !== ROUTES.DASHBOARD) {
      router.replace(homeRoute);
    }
  }, [isAuthenticated, hasHydrated, homeRoute, router]);

  if (!hasHydrated) {
    return null;
  }
  if (!isAuthenticated || homeRoute !== ROUTES.DASHBOARD) {
    return null;
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      <Sidebar />
      {!sidebarCollapsed && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => useUIStore.getState().setSidebarCollapsed(true)}
        />
      )}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
      <NotificationsPanel />
    </div>
  );
}
