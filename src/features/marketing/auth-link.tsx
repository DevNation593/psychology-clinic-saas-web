'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export function AuthLink() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const signedIn = hasHydrated && isAuthenticated;
  return (
    <Link href={signedIn ? '/dashboard' : '/login'} className="text-sm font-medium hover:underline">
      {signedIn ? 'Ir al panel' : 'Iniciar sesión'}
    </Link>
  );
}
