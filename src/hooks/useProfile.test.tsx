import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateProfile } from './useProfile';

const mocks = vi.hoisted(() => ({
  user: { id: 'professional-1', tenantId: 'tenant-1', role: 'PROFESIONAL' },
  patch: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (state: { user: typeof mocks.user; setUser: typeof mocks.setUser }) => unknown) =>
      selector({ user: mocks.user, setUser: mocks.setUser }),
    { getState: () => ({ user: mocks.user, tenant: null }) },
  ),
}));

vi.mock('@/lib/api/client', () => ({ apiClient: { patch: mocks.patch } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useUpdateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.patch.mockResolvedValue({
      id: 'professional-1',
      tenantId: 'tenant-1',
      firstName: 'Ana',
      lastName: 'Vega',
      role: 'PROFESIONAL',
    });
  });

  it('sends the limited payload to the authenticated user endpoint', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    const payload = {
      firstName: 'Ana',
      lastName: 'Vega',
      phone: '+593 99 123 4567',
      professionalProfile: {
        professionalTitle: 'Psicóloga',
        licenseNumber: 'LIC-1',
        bio: 'Biografía clínica',
      },
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    await waitFor(() =>
      expect(mocks.patch).toHaveBeenCalledWith('/tenants/tenant-1/users/me', payload),
    );
  });
});
