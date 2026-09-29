import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useAssignPatientProfessional, useEligiblePatientProfessionals, usePatientTeam, useRemovePatientProfessional } from './usePatientTeam';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiClient: http }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

function tenant(id: string | null) {
  useAuthStore.setState({ tenant: id ? { id } as ReturnType<typeof useAuthStore.getState>['tenant'] : null, user: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  tenant('tenant-1');
  http.get.mockResolvedValue([]);
  http.put.mockResolvedValue({});
  http.delete.mockResolvedValue(undefined);
});

describe('patient team query isolation', () => {
  it('keeps two tenants in separate cache entries and requests', async () => {
    const teamA = [{ id: 'a' }];
    const teamB = [{ id: 'b' }];
    http.get.mockImplementation((url: string) => Promise.resolve(url.includes('tenant-1') ? teamA : teamB));
    const { client, wrapper } = setup();
    const team = renderHook(() => usePatientTeam('patient-1'), { wrapper });
    await waitFor(() => expect(team.result.current.data).toEqual(teamA));
    act(() => tenant('tenant-2'));
    await waitFor(() => expect(team.result.current.data).toEqual(teamB));
    expect(client.getQueryData(['patient-team', 'tenant-1', 'patient-1'])).toEqual(teamA);
    expect(client.getQueryData(['patient-team', 'tenant-2', 'patient-1'])).toEqual(teamB);
    expect(http.get).toHaveBeenCalledWith('/tenants/tenant-2/patients/patient-1/team');
  });

  it('does not read without both tenant and patient, and keys eligible specialties separately', async () => {
    const { client, wrapper } = setup();
    tenant(null);
    const team = renderHook(() => usePatientTeam('patient-1'), { wrapper });
    const eligible = renderHook(() => useEligiblePatientProfessionals('patient-1', 'nutrition'), { wrapper });
    expect(team.result.current.fetchStatus).toBe('idle');
    expect(eligible.result.current.fetchStatus).toBe('idle');
    expect(http.get).not.toHaveBeenCalled();
    act(() => tenant('tenant-1'));
    await waitFor(() => expect(client.getQueryData(['patient-team', 'tenant-1', 'patient-1', 'eligible', 'nutrition'])).toEqual([]));
    expect(http.get).toHaveBeenCalledWith('/tenants/tenant-1/patients/patient-1/team/eligible', { params: { specialtyId: 'nutrition' } });
    const empty = renderHook(() => usePatientTeam(''), { wrapper });
    expect(empty.result.current.fetchStatus).toBe('idle');
  });

  it.each(['assign', 'remove'] as const)('%s invalidates only its patient and tenant families', async (action) => {
    const { client, wrapper } = setup();
    const affected = [
      ['patient-team', 'tenant-1', 'patient-1'],
      ['patient-team', 'tenant-1', 'patient-1', 'eligible', undefined],
      ['patient-team', 'tenant-1', 'patient-1', 'eligible', 'nutrition'],
      ['appointments', 'tenant', 'tenant-1', undefined],
      ['appointments', 'tenant', 'tenant-1', { patientId: 'patient-1' }],
    ];
    const untouched = [
      ['patient-team', 'tenant-1', 'patient-2'],
      ['patient-team', 'tenant-1', 'patient-2', 'eligible', 'nutrition'],
      ['patient-team', 'tenant-2', 'patient-1'],
      ['patient-team', 'tenant-2', 'patient-1', 'eligible', 'nutrition'],
      ['appointments', 'tenant', 'tenant-2', undefined],
    ];
    [...affected, ...untouched].forEach((key) => client.setQueryData(key, { old: true }));
    const hook = renderHook(() => action === 'assign'
      ? useAssignPatientProfessional('patient-1')
      : useRemovePatientProfessional('patient-1'), { wrapper });
    await act(async () => { await hook.result.current.mutateAsync('professional-1'); });
    affected.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
    untouched.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(false));
    expect(action === 'assign' ? http.put : http.delete).toHaveBeenCalledWith('/tenants/tenant-1/patients/patient-1/team/professional-1');
  });

  it.each(['assign', 'remove'] as const)('%s keeps invocation patient and tenant after a rerender', async (action) => {
    const { client, wrapper } = setup();
    const original = ['patient-team', 'tenant-1', 'patient-1'];
    const otherPatient = ['patient-team', 'tenant-1', 'patient-2'];
    const otherTenant = ['patient-team', 'tenant-2', 'patient-1'];
    [original, otherPatient, otherTenant].forEach((key) => client.setQueryData(key, []));
    let resolve!: (value: object) => void;
    const transport = action === 'assign' ? http.put : http.delete;
    transport.mockImplementation(() => new Promise<object>((done) => { resolve = done; }));
    const onSuccess = vi.fn();
    const onSettled = vi.fn();
    const hook = renderHook(({ patientId }) => action === 'assign'
      ? useAssignPatientProfessional(patientId)
      : useRemovePatientProfessional(patientId), {
      wrapper, initialProps: { patientId: 'patient-1' },
    });
    let pending!: Promise<unknown>;
    act(() => { pending = hook.result.current.mutateAsync('pro-1', { onSuccess, onSettled }); });
    hook.rerender({ patientId: 'patient-2' });
    act(() => tenant('tenant-2'));
    await waitFor(() => expect(transport).toHaveBeenCalledWith('/tenants/tenant-1/patients/patient-1/team/pro-1'));
    await act(async () => { resolve({ id: 'assignment-1' }); await pending; });
    expect(client.getQueryState(original)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherPatient)?.isInvalidated).toBe(false);
    expect(client.getQueryState(otherTenant)?.isInvalidated).toBe(false);
    expect(hook.result.current.variables).toBe('pro-1');
    expect(onSuccess.mock.calls[0][1]).toBe('pro-1');
    expect(onSettled.mock.calls[0][2]).toBe('pro-1');
  });

  it('keeps failed assignment callbacks public and leaves both patient caches fresh', async () => {
    const { client, wrapper } = setup();
    const first = ['patient-team', 'tenant-1', 'patient-1'];
    const second = ['patient-team', 'tenant-1', 'patient-2'];
    [first, second].forEach((key) => client.setQueryData(key, []));
    let reject!: (error: Error) => void;
    http.put.mockImplementation(() => new Promise((_done, fail) => { reject = fail; }));
    const onError = vi.fn();
    const onSettled = vi.fn();
    const hook = renderHook(({ patientId }) => useAssignPatientProfessional(patientId), {
      wrapper, initialProps: { patientId: 'patient-1' },
    });
    let pending!: Promise<unknown>;
    act(() => { pending = hook.result.current.mutateAsync('pro-1', { onError, onSettled }); });
    hook.rerender({ patientId: 'patient-2' });
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/tenants/tenant-1/patients/patient-1/team/pro-1'));
    await act(async () => { reject(new Error('blocked')); await expect(pending).rejects.toThrow('blocked'); });
    expect(client.getQueryState(first)?.isInvalidated).toBe(false);
    expect(client.getQueryState(second)?.isInvalidated).toBe(false);
    expect(onError.mock.calls[0][1]).toBe('pro-1');
    expect(onSettled.mock.calls[0][2]).toBe('pro-1');
  });
});
