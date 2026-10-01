'use client';

import { useAuthStore } from '@/store/authStore';

export function useTenantId(): string | null {
  return useAuthStore((state) => state.tenant?.id ?? state.user?.tenantId ?? null);
}

export function requireTenantId(tenantId: string | null): string {
  if (!tenantId) throw new Error('No tenant ID available. User must be authenticated.');
  return tenantId;
}
