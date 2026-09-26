import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { onboardingApi, specialtyCatalogApi, specialtiesApi, subscriptionApi, tenantModulesApi, tenantSpecialtiesApi } from '@/lib/api/endpoints';
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

  it('posts the public onboarding payload without requiring a tenant', async () => {
    useAuthStore.setState({ tenant: null, user: null });
    const input = { clinicName: 'Centro', contactEmail: 'contact@example.com', timezone: 'America/Guayaquil', locale: 'es', specialtyCodes: ['PSYCHOLOGY'], adminFirstName: 'Ana', adminLastName: 'Vega', adminEmail: 'ana@example.com', adminPassword: 'Secret123', adminProvidesCare: false };
    await onboardingApi.createClinic(input);
    expect(http.post).toHaveBeenCalledWith('/onboarding/tenants', input);
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
    expect(client.getQueryData(QUERY_KEYS.TENANT_SPECIALTIES)).toEqual([]);
    expect(client.getQueryData(QUERY_KEYS.TENANT_MODULES)).toEqual([]);
  });

  it('invalidates specialties, modules, subscription, usage and tenant after replacement', async () => {
    const { client, wrapper } = createWrapper();
    const keys = [QUERY_KEYS.TENANT_SPECIALTIES, QUERY_KEYS.TENANT_MODULES, QUERY_KEYS.SUBSCRIPTION, QUERY_KEYS.SUBSCRIPTION_USAGE, QUERY_KEYS.TENANT];
    keys.forEach((key) => client.setQueryData(key, { prior: true }));
    const { result } = renderHook(() => useReplaceTenantSpecialties(), { wrapper });
    await act(async () => { await result.current.mutateAsync(['PSYCHOLOGY']); });
    expect(http.put).toHaveBeenCalledWith('/tenants/tenant-1/specialties', { specialtyCodes: ['PSYCHOLOGY'] });
    keys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  });

  it('invalidates modules after toggling one', async () => {
    const { client, wrapper } = createWrapper();
    client.setQueryData(QUERY_KEYS.TENANT_MODULES, [{ moduleKey: 'psychology.records', enabled: true }]);
    const { result } = renderHook(() => useSetTenantModule(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ moduleKey: 'psychology.records', enabled: false }); });
    expect(http.patch).toHaveBeenCalledWith('/tenants/tenant-1/modules/psychology.records', { enabled: false });
    expect(client.getQueryState(QUERY_KEYS.TENANT_MODULES)?.isInvalidated).toBe(true);
  });
});
