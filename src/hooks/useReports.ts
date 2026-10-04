'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi, type ActivityReportParams } from '@/lib/api/reports-api';
import { requireTenantId, useTenantId } from '@/hooks/useTenantScope';

/** Activity of the clinic in a period. Disabled until the period is a valid one. */
export function useActivityReport(params: ActivityReportParams | null) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['tenant', 'reports', 'activity', tenantId ?? '', params],
    queryFn: () => reportsApi.activity(requireTenantId(tenantId), params!),
    enabled: !!tenantId && !!params,
  });
}
