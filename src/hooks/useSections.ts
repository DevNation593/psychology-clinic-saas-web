import { useMemo } from 'react';
import { useTenantModules } from '@/hooks/useSpecialties';
import type { SectionKey } from '@/types';

/**
 * The clinic's enabled sections, read from the module rows the sidebar already loads.
 * A section is enabled only when its row exists and is on, so it reads as off while loading.
 */
export function useSections() {
  const { data, isPending, isError, refetch } = useTenantModules();
  const enabled = useMemo(
    () => new Set((data ?? []).filter((row) => row.enabled).map((row) => row.moduleKey)),
    [data],
  );

  return {
    isEnabled: (key: SectionKey) => enabled.has(key),
    isLoading: isPending,
    // A failed background refetch keeps the cached rows, which are still enough to decide.
    isError: isError && data === undefined,
    refetch: () => {
      void refetch();
    },
  };
}
