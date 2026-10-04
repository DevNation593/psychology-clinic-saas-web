'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userPermissionsApi, type UserPermissionChanges } from '@/lib/api/permissions-api';
import { requireTenantId, useTenantId } from '@/hooks/useTenantScope';
import type { ApiError } from '@/types';

const key = (tenantId: string, userId: string) => ['tenant', 'permissions', tenantId, userId];

/**
 * Whether the signed-in user has a permission: one of their role that was not withdrawn, or
 * one given to them beyond it. While the answer is loading or cannot be read, `can` answers
 * `whileUnknown` (what the role alone would allow): the API is what enforces, this only hides
 * what would fail.
 */
export function useMyPermissions() {
  const tenantId = useTenantId();
  const query = useQuery({
    queryKey: key(tenantId ?? '', 'me'),
    queryFn: () => userPermissionsApi.get(requireTenantId(tenantId), 'me'),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
  const effective = query.data ? new Set(query.data.effective) : null;
  return {
    can: (permission: string, whileUnknown = true) =>
      effective ? effective.has(permission) : whileUnknown,
  };
}

/** Permissions of another user, for the account holder. */
export function useUserPermissions(userId: string | null) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: key(tenantId ?? '', userId ?? ''),
    queryFn: () => userPermissionsApi.get(requireTenantId(tenantId), userId!),
    enabled: !!tenantId && !!userId,
  });
}

export function useSaveUserPermissions(userId: string) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: (changes: UserPermissionChanges) =>
      userPermissionsApi.replace(requireTenantId(tenantId), userId, changes),
    onSuccess: (saved) => {
      if (tenantId) queryClient.setQueryData(key(tenantId, userId), saved);
      toast.success('Permisos actualizados');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'No fue posible guardar los permisos');
    },
  });
}
