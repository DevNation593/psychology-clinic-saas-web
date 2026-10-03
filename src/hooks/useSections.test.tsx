import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSections } from './useSections';

const modules = vi.hoisted(() => ({
  state: {} as { data?: { moduleKey: string; enabled: boolean }[]; isPending: boolean; isError: boolean; refetch: () => void },
}));
vi.mock('@/hooks/useSpecialties', () => ({ useTenantModules: () => modules.state }));

beforeEach(() => {
  modules.state = { data: undefined, isPending: false, isError: false, refetch: vi.fn() };
});

describe('useSections', () => {
  it('reports a section enabled only when its row exists and is enabled', () => {
    modules.state.data = [
      { moduleKey: 'core.calendar', enabled: true },
      { moduleKey: 'core.patients', enabled: false },
      { moduleKey: 'psychology.records', enabled: true },
    ];
    const { result } = renderHook(() => useSections());
    expect(result.current.isEnabled('core.calendar')).toBe(true);
    expect(result.current.isEnabled('core.patients')).toBe(false);
    // No row at all.
    expect(result.current.isEnabled('core.tasks')).toBe(false);
  });

  it('reports every section disabled while loading', () => {
    modules.state = { data: undefined, isPending: true, isError: false, refetch: vi.fn() };
    const { result } = renderHook(() => useSections());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isEnabled('core.calendar')).toBe(false);
    expect(result.current.isEnabled('core.team')).toBe(false);
  });
});
