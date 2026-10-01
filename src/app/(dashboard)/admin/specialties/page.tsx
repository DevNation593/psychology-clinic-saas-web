'use client';

import { Alert } from '@/components/ui/alert';
import { SpecialtyManager } from '@/features/admin/specialties/specialty-manager';
import { useAuthStore } from '@/store/authStore';
import { canManageUsers } from '@/types/guards';

export default function SpecialtiesPage() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;

  // The menu entry is hidden for other roles; this covers direct navigation.
  if (!canManageUsers(user)) {
    return (
      <Alert variant="warning" title="Acceso restringido">
        Solo los administradores pueden gestionar los módulos clínicos.
      </Alert>
    );
  }

  return <SpecialtyManager />;
}
