'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { specialtyCatalogApi, tenantModulesApi, tenantSpecialtiesApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/authStore';

function useTenantId(): string | null {
  return useAuthStore((state) => state.tenant?.id ?? state.user?.tenantId ?? null);
}

function requireTenantId(tenantId: string | null): string {
  if (!tenantId) throw new Error('No tenant ID available. User must be authenticated.');
  return tenantId;
}

export function useSpecialtyCatalog() {
  return useQuery({ queryKey: QUERY_KEYS.SPECIALTY_CATALOG, queryFn: specialtyCatalogApi.list });
}

export function useTenantSpecialties() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: QUERY_KEYS.TENANT_SPECIALTIES_SCOPED(tenantId ?? ''),
    queryFn: () => tenantSpecialtiesApi.list(requireTenantId(tenantId)),
    enabled: !!tenantId,
  });
}

export function useTenantModules() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: QUERY_KEYS.TENANT_MODULES_SCOPED(tenantId ?? ''),
    queryFn: () => tenantModulesApi.list(requireTenantId(tenantId)),
    enabled: !!tenantId,
  });
}

export function useReplaceTenantSpecialties() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: (specialtyCodes: string[]) =>
      tenantSpecialtiesApi.replace(specialtyCodes, requireTenantId(tenantId)),
    onSuccess: async (selection) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT_SPECIALTIES_SCOPED(selection.tenantId), exact: true }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEGACY_TENANT_SPECIALTIES, exact: true }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEGACY_PATIENT_SPECIALTIES, exact: true }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT_MODULES_SCOPED(selection.tenantId), exact: true }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT_MODULES, exact: true }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION, exact: true }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION_USAGE }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT, exact: true }),
      ]);
    },
  });
}

export function useSetTenantModule() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: ({ moduleKey, enabled }: { moduleKey: string; enabled: boolean }) =>
      tenantModulesApi.setEnabled(moduleKey, enabled, requireTenantId(tenantId)),
    onSuccess: async (module) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT_MODULES_SCOPED(module.tenantId), exact: true }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT_MODULES, exact: true }),
      ]);
    },
  });
}
