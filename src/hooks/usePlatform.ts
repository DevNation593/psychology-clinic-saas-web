'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import type { PlatformTenantListParams } from '@/types';

export function usePlatformSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_SUMMARY,
    queryFn: () => platformApi.getSummary(),
  });
}

export function usePlatformTenants(params: PlatformTenantListParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_TENANTS, params],
    queryFn: () => platformApi.listTenants(params),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformTenant(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_TENANT(id),
    queryFn: () => platformApi.getTenant(id),
    enabled: !!id,
  });
}

export function useSectionCatalog() {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_SECTION_CATALOG,
    queryFn: () => platformApi.getSectionCatalog(),
    staleTime: 5 * 60 * 1000,
  });
}
