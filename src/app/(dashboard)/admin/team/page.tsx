'use client';

import { RestrictedAccess } from '@/components/layout/restricted-access';
import { TeamManager } from '@/features/admin/team/team-manager';
import { useCanManageAccount } from '@/hooks/useCanManageAccount';
import { useAuthStore } from '@/store/authStore';

export default function TeamPage() {
  const user = useAuthStore((state) => state.user);
  const canManage = useCanManageAccount();
  if (!user) return null;
  // The menu entry is hidden for other roles; this covers direct navigation.
  if (!canManage) return <RestrictedAccess />;
  return <TeamManager />;
}
