'use client';

import { Bell, LogOut, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useLogout } from '@/hooks/useAuth';
import { getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { isPlatformAdmin } from '@/types/guards';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const { toggleNotificationsPanel, toggleSidebar } = useUIStore();
  const { mutate: logout } = useLogout();
  const router = useRouter();

  if (!user) return null;
  // The platform panel has no notifications panel and no /profile page.
  const showClinicControls = !isPlatformAdmin(user);

  return (
    <header className="min-h-16 border-b bg-card flex items-center justify-between gap-3 px-3 sm:px-6 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={toggleSidebar} aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
        <h2 className="text-base sm:text-xl font-semibold truncate">
          Hola, {user.firstName} 👋
        </h2>
        <p className="hidden sm:block text-sm text-muted-foreground">
          Bienvenido de vuelta
        </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {showClinicControls && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleNotificationsPanel}
              className="relative"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <Button variant="ghost" size="icon" onClick={() => router.push('/profile')} aria-label="Perfil">
              <User className="h-5 w-5" />
            </Button>
          </>
        )}

        <Button variant="ghost" size="icon" onClick={() => logout()} aria-label="Cerrar sesión">
          <LogOut className="h-5 w-5" />
        </Button>

        <Avatar
          fallback={getInitials(user.firstName, user.lastName)}
          src={user.avatarUrl}
          alt={`${user.firstName} ${user.lastName}`}
        />
      </div>
    </header>
  );
}
