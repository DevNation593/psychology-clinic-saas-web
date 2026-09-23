'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { NotificationsPanel } from '@/components/layout/notifications-panel';
import { useUIStore } from '@/store/uiStore';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  useEffect(() => {
    if (window.innerWidth < 768) {
      useUIStore.getState().setSidebarCollapsed(true);
    }
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  if (!hasHydrated) {
    return null;
  }
  if (!isAuthenticated) {
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
