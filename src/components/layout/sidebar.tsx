'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { canManageUsers, canManageSubscription } from '@/types/guards';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Brain,
  ChevronLeft,
  ChevronRight,
  UserCog,
  CreditCard,
  Settings,
  HardDrive,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'Calendario', href: '/calendar', icon: Calendar, show: true },
    { name: 'Pacientes', href: '/patients', icon: Users, show: true },
    { name: 'Tareas', href: '/tasks', icon: ClipboardList, show: true },
  ];

  const adminNavigation = [
    {
      name: 'Equipo',
      href: '/admin/team',
      icon: UserCog,
      show: user && canManageUsers(user),
    },
    {
      name: 'Suscripción',
      href: '/admin/subscription',
      icon: CreditCard,
      show: user && canManageSubscription(user),
    },
    {
      name: 'Almacenamiento',
      href: '/admin/storage',
      icon: HardDrive,
      show: user && canManageUsers(user),
    },
    {
      name: 'Configuración',
      href: '/admin/settings',
      icon: Settings,
      show: user && canManageUsers(user),
    },
  ].filter((item) => item.show);

  return (
    <div
      className={cn(
        'flex flex-col bg-card border-r transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">{tenant?.name || 'Clínica'}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(sidebarCollapsed && 'mx-auto')}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                sidebarCollapsed && 'justify-center'
              )}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {adminNavigation.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              {!sidebarCollapsed && (
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase">
                  Administración
                </p>
              )}
              {sidebarCollapsed && <div className="border-t" />}
            </div>
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    sidebarCollapsed && 'justify-center'
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Info */}
      {!sidebarCollapsed && user && (
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
