'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { specialtyCatalogApi, tenantModulesApi, tenantSpecialtiesApi } from '@/lib/api/endpoints';

export function useSpecialtyCatalog() {
  return useQuery({ queryKey: QUERY_KEYS.SPECIALTY_CATALOG, queryFn: specialtyCatalogApi.list });
}

export function useTenantSpecialties() {
  return useQuery({ queryKey: QUERY_KEYS.TENANT_SPECIALTIES, queryFn: () => tenantSpecialtiesApi.list() });
}

export function useTenantModules() {
  return useQuery({ queryKey: QUERY_KEYS.TENANT_MODULES, queryFn: () => tenantModulesApi.list() });
}

export function useReplaceTenantSpecialties() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (specialtyCodes: string[]) => tenantSpecialtiesApi.replace(specialtyCodes),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT_SPECIALTIES }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT_MODULES }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION_USAGE }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT }),
      ]);
    },
  });
}

export function useSetTenantModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleKey, enabled }: { moduleKey: string; enabled: boolean }) =>
      tenantModulesApi.setEnabled(moduleKey, enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT_MODULES });
    },
  });
}
