'use client';

import { Bell, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useLogout } from '@/hooks/useAuth';
import { getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const { toggleNotificationsPanel } = useUIStore();
  const { mutate: logout } = useLogout();
  const router = useRouter();

  if (!user) return null;

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold">
          Hola, {user.firstName} 👋
        </h2>
        <p className="text-sm text-muted-foreground">
          Bienvenido de vuelta
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleNotificationsPanel}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => router.push('/profile')}>
          <User className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => logout()}>
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
