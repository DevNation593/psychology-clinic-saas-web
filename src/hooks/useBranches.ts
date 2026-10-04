'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { branchesApi, extractArray, usersApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { requireTenantId, useTenantId } from '@/hooks/useTenantScope';
import type { ApiError } from '@/types';
import type { BranchInput, BranchUpdate } from '@/types/clinical';

/** Branches of the clinic, the main one first. */
export function useBranches() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: QUERY_KEYS.BRANCHES(tenantId ?? ''),
    queryFn: () => branchesApi.list(requireTenantId(tenantId)),
    enabled: !!tenantId,
  });
}

/** Accounts with an active professional profile: the ones that can be tied to a branch. */
export function useClinicProfessionals() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['tenant', 'professionals', tenantId ?? ''],
    queryFn: async () =>
      extractArray(await usersApi.list(undefined, requireTenantId(tenantId))).filter(
        (user) => user.isActive && user.professionalProfile?.isActive,
      ),
    enabled: !!tenantId,
  });
}

/** Replaces the professionals who attend in a branch; an empty list lifts the restriction. */
export function useSetBranchProfessionals() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: ({ branchId, userIds }: { branchId: string; userIds: string[] }) =>
      branchesApi.setProfessionals(requireTenantId(tenantId), branchId, userIds),
    onSuccess: () => {
      if (tenantId) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BRANCHES(tenantId) });
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'No fue posible guardar los profesionales de la sede');
    },
  });
}

/** Creates a branch, or updates it when `branchId` is given. */
export function useSaveBranch() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: ({ branchId, data }: { branchId?: string; data: BranchInput | BranchUpdate }) =>
      branchId
        ? branchesApi.update(requireTenantId(tenantId), branchId, data)
        : branchesApi.create(requireTenantId(tenantId), data as BranchInput),
    onSuccess: () => {
      if (tenantId) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BRANCHES(tenantId) });
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'No fue posible guardar la sede');
    },
  });
}
