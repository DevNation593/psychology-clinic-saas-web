import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { specialtyCatalogApi, specialtiesApi, subscriptionApi, tenantModulesApi, tenantSpecialtiesApi } from '@/lib/api/endpoints';
import { useReplaceTenantSpecialties, useSetTenantModule, useSpecialtyCatalog, useTenantModules, useTenantSpecialties } from './useSpecialties';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiClient: http }));

const selection = {
  tenantId: 'tenant-1',
  specialties: [{ id: 's1', code: 'PSYCHOLOGY', name: 'Psicología', description: null, modules: [{ id: 'm1', moduleKey: 'psychology.records' }] }],
  modules: [{ moduleKey: 'psychology.records', enabled: true }],
  pricing: { includedSpecialties: 1, selectedSpecialties: 1, billableSpecialties: 0, specialtyUnitPrice: 15, basePlanPrice: 0, featureAddonsPrice: 0, specialtyAddonsPrice: 0, totalMonthly: 0, currency: 'USD' },
};

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ tenant: { id: 'tenant-1' } as ReturnType<typeof useAuthStore.getState>['tenant'], user: null });
  http.get.mockResolvedValue([]);
  http.put.mockResolvedValue(selection);
  http.patch.mockResolvedValue({ id: 'tm1', tenantId: 'tenant-1', moduleKey: 'psychology.records', enabled: false });
  http.post.mockResolvedValue(selection);
});

describe('specialty API boundaries', () => {
  it('gets the public catalog without tenant context', async () => {
    useAuthStore.setState({ tenant: null, user: null });
    await specialtyCatalogApi.list();
    expect(http.get).toHaveBeenCalledWith('/specialties');
  });

  it('uses tenant-scoped GET, PUT and PATCH with exact payloads', async () => {
    await tenantSpecialtiesApi.list();
    await tenantSpecialtiesApi.replace(['PSYCHOLOGY']);
    await tenantModulesApi.list();
    await tenantModulesApi.setEnabled('psychology.records', false);
    expect(http.get).toHaveBeenCalledWith('/tenants/tenant-1/specialties');
    expect(http.put).toHaveBeenCalledWith('/tenants/tenant-1/specialties', { specialtyCodes: ['PSYCHOLOGY'] });
    expect(http.get).toHaveBeenCalledWith('/tenants/tenant-1/modules');
    expect(http.patch).toHaveBeenCalledWith('/tenants/tenant-1/modules/psychology.records', { enabled: false });
  });

  it('encodes a module key as one URL segment', async () => {
    await tenantModulesApi.setEnabled('psychology/forms draft?', true);
    expect(http.patch).toHaveBeenCalledWith(
      '/tenants/tenant-1/modules/psychology%2Fforms%20draft%3F',
      { enabled: true },
    );
  });

  it('delegates the legacy replacement facade to the canonical PUT', async () => {
    await specialtiesApi.setForTenant(['NUTRITION'], 'tenant-2');
    expect(http.put).toHaveBeenCalledWith('/tenants/tenant-2/specialties', { specialtyCodes: ['NUTRITION'] });
    expect(http.post).not.toHaveBeenCalled();
  });

  it('requires tenant context for authenticated tenant clients', async () => {
    useAuthStore.setState({ tenant: null, user: null });
    expect(() => tenantSpecialtiesApi.list()).toThrow('No tenant ID available');
    expect(http.get).not.toHaveBeenCalled();
  });

  it('normalizes specialty price metadata from the raw subscription', async () => {
    http.get.mockResolvedValueOnce({ subscription: { id: 'sub1', tenantId: 'tenant-1', planType: 'TRIAL', status: 'TRIALING', currency: 'USD', includedSpecialties: 1, specialtyPrice: '15.50', specialties: [{ specialtyId: 's1' }, { specialtyId: 's2' }] } });
    const result = await subscriptionApi.getCurrent();
    expect(result.specialtyPricing).toEqual({ includedSpecialties: 1, selectedSpecialties: 2, specialtyUnitPrice: 15.5, currency: 'USD' });
  });
});

describe('specialty query hooks', () => {
  it('loads catalog, tenant specialties and modules through stable keys', async () => {
    const { client, wrapper } = createWrapper();
    const catalog = renderHook(() => useSpecialtyCatalog(), { wrapper });
    const tenantSpecialties = renderHook(() => useTenantSpecialties(), { wrapper });
    const modules = renderHook(() => useTenantModules(), { wrapper });
    await waitFor(() => expect(catalog.result.current.isSuccess && tenantSpecialties.result.current.isSuccess && modules.result.current.isSuccess).toBe(true));
    expect(client.getQueryData(QUERY_KEYS.SPECIALTY_CATALOG)).toEqual([]);
    expect(client.getQueryData(['tenant', 'specialties', 'tenant-1'])).toEqual([]);
    expect(client.getQueryData(['tenant', 'modules', 'tenant-1'])).toEqual([]);
  });

  it('keeps tenant A data isolated when auth changes to tenant B', async () => {
    const specialtyA = { id: 'sA', code: 'A', name: 'Specialty A', description: null, isActive: true, modules: [{ id: 'smA', specialtyId: 'sA', moduleKey: 'a.records' }] };
    const specialtyB = { id: 'sB', code: 'B', name: 'Specialty B', description: 'B description', isActive: true, modules: [{ id: 'smB', specialtyId: 'sB', moduleKey: 'b.records' }] };
    const moduleA = { id: 'tmA', tenantId: 'tenant-1', moduleKey: 'a.records', enabled: true, limits: null, createdAt: '2026-09-26T00:00:00.000Z', updatedAt: '2026-09-26T00:00:00.000Z' };
    const moduleB = { id: 'tmB', tenantId: 'tenant-2', moduleKey: 'b.records', enabled: false, limits: null, createdAt: '2026-09-26T00:00:00.000Z', updatedAt: '2026-09-26T00:00:00.000Z' };
    http.get.mockImplementation((url: string) => Promise.resolve(
      url.endsWith('/specialties')
        ? [url.includes('tenant-1') ? specialtyA : specialtyB]
        : [url.includes('tenant-1') ? moduleA : moduleB],
    ));
    const { client, wrapper } = createWrapper();
    const specialties = renderHook(() => useTenantSpecialties(), { wrapper });
    const modules = renderHook(() => useTenantModules(), { wrapper });
    await waitFor(() => expect(specialties.result.current.data).toEqual([specialtyA]));
    await waitFor(() => expect(modules.result.current.data).toEqual([moduleA]));

    act(() => useAuthStore.setState({ tenant: { id: 'tenant-2' } as ReturnType<typeof useAuthStore.getState>['tenant'] }));
    await waitFor(() => expect(specialties.result.current.data).toEqual([specialtyB]));
    await waitFor(() => expect(modules.result.current.data).toEqual([moduleB]));
    expect(client.getQueryData(['tenant', 'specialties', 'tenant-1'])).toEqual([specialtyA]);
    expect(client.getQueryData(['tenant', 'specialties', 'tenant-2'])).toEqual([specialtyB]);
    expect(client.getQueryData(['tenant', 'modules', 'tenant-1'])).toEqual([moduleA]);
    expect(client.getQueryData(['tenant', 'modules', 'tenant-2'])).toEqual([moduleB]);
    expect(http.get).toHaveBeenCalledWith('/tenants/tenant-2/specialties');
    expect(http.get).toHaveBeenCalledWith('/tenants/tenant-2/modules');
  });

  it('disables tenant queries without a tenant and never calls HTTP', async () => {
    useAuthStore.setState({ tenant: null, user: null });
    const { wrapper } = createWrapper();
    const specialties = renderHook(() => useTenantSpecialties(), { wrapper });
    const modules = renderHook(() => useTenantModules(), { wrapper });
    expect(specialties.result.current.fetchStatus).toBe('idle');
    expect(modules.result.current.fetchStatus).toBe('idle');
    expect(http.get).not.toHaveBeenCalled();
  });

  it('invalidates exact tenant A resources and legacy readers after replacement', async () => {
    const { client, wrapper } = createWrapper();
    const invalidated = [
      ['tenant', 'specialties', 'tenant-1'], ['tenant', 'modules', 'tenant-1'],
      ['tenant-specialties'], ['tenant', 'modules'],
      ['subscription'], ['subscription', 'usage', 'current'], ['tenant'],
    ];
    const untouched = [
      ['tenant', 'specialties', 'tenant-2'], ['tenant', 'modules', 'tenant-2'],
      ['subscription', 'unrelated'], ['tenant', 'settings'],
    ];
    [...invalidated, ...untouched].forEach((key) => client.setQueryData(key, { prior: true }));
    const { result } = renderHook(() => useReplaceTenantSpecialties(), { wrapper });
    await act(async () => { await result.current.mutateAsync(['PSYCHOLOGY']); });
    expect(http.put).toHaveBeenCalledWith('/tenants/tenant-1/specialties', { specialtyCodes: ['PSYCHOLOGY'] });
    invalidated.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
    untouched.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(false));
  });

  it('invalidates the patient page specialty key without invalidating the public catalog', async () => {
    const { client, wrapper } = createWrapper();
    client.setQueryData(['specialties'], [{ code: 'PSYCHOLOGY' }]);
    client.setQueryData(['specialties', 'catalog'], [{ code: 'NUTRITION' }]);
    const { result } = renderHook(() => useReplaceTenantSpecialties(), { wrapper });
    await act(async () => { await result.current.mutateAsync(['PSYCHOLOGY']); });
    expect(client.getQueryState(['specialties'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['specialties', 'catalog'])?.isInvalidated).toBe(false);
  });

  it('invalidates scoped and legacy modules after toggling one', async () => {
    const { client, wrapper } = createWrapper();
    client.setQueryData(['tenant', 'modules', 'tenant-1'], [{ moduleKey: 'psychology.records', enabled: true }]);
    client.setQueryData(['tenant', 'modules', 'tenant-2'], []);
    client.setQueryData(['tenant', 'modules'], []);
    const { result } = renderHook(() => useSetTenantModule(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ moduleKey: 'psychology.records', enabled: false }); });
    expect(http.patch).toHaveBeenCalledWith('/tenants/tenant-1/modules/psychology.records', { enabled: false });
    expect(client.getQueryState(['tenant', 'modules', 'tenant-1'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['tenant', 'modules'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['tenant', 'modules', 'tenant-2'])?.isInvalidated).toBe(false);
  });

  it('rejects mutations without a tenant and leaves caches untouched', async () => {
    const { client, wrapper } = createWrapper();
    client.setQueryData(['tenant', 'specialties', 'tenant-1'], [{ code: 'A' }]);
    client.setQueryData(['tenant', 'modules', 'tenant-1'], [{ moduleKey: 'x', enabled: true }]);
    const replace = renderHook(() => useReplaceTenantSpecialties(), { wrapper });
    const toggle = renderHook(() => useSetTenantModule(), { wrapper });
    act(() => useAuthStore.setState({ tenant: null, user: null }));
    await act(async () => {
      await expect(replace.result.current.mutateAsync(['PSYCHOLOGY'])).rejects.toThrow('No tenant');
      await expect(toggle.result.current.mutateAsync({ moduleKey: 'x', enabled: false })).rejects.toThrow('No tenant');
    });
    expect(http.put).not.toHaveBeenCalled();
    expect(http.patch).not.toHaveBeenCalled();
    expect(client.getQueryState(['tenant', 'specialties', 'tenant-1'])?.isInvalidated).toBe(false);
    expect(client.getQueryState(['tenant', 'modules', 'tenant-1'])?.isInvalidated).toBe(false);
  });
});
