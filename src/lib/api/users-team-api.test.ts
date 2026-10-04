import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usersApi } from './endpoints';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiClient: http }));

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    tenant: { id: 'tenant-1' } as ReturnType<typeof useAuthStore.getState>['tenant'],
    user: null,
  });
  http.post.mockImplementation(async (_url: string, body: unknown) => body);
  http.patch.mockImplementation(async (_url: string, body: unknown) => body);
  http.delete.mockResolvedValue(undefined);
});

describe('tenant team user API', () => {
  it('posts the narrow create input to the selected tenant path', async () => {
    const input = {
      email: 'ana@example.com',
      password: 'Secret123',
      firstName: 'Ana',
      lastName: 'Vega',
      role: UserRole.PROFESIONAL as const,
      professionalProfile: { specialtyId: 'specialty-1', isActive: true },
    };

    await usersApi.create(input, 'tenant-2');

    expect(http.post).toHaveBeenCalledWith('/tenants/tenant-2/users', input);
    expect(input).not.toHaveProperty('tenantId');
    expect(input).not.toHaveProperty('managedByProvider');
  });

  it('patches profile removal without account or credential metadata', async () => {
    const input = {
      email: 'ana@example.com',
      firstName: 'Ana',
      lastName: 'Vega',
      role: UserRole.MASTER as const,
      professionalProfile: null,
    };

    await usersApi.update('user-1', input, 'tenant-2');

    expect(http.patch).toHaveBeenCalledWith('/tenants/tenant-2/users/user-1', input);
    expect(input).not.toHaveProperty('password');
    expect(input).not.toHaveProperty('tenantId');
    expect(input).not.toHaveProperty('emailVerified');
  });

  it('deactivates an account through DELETE', async () => {
    await usersApi.delete('user-1', 'tenant-2');

    expect(http.delete).toHaveBeenCalledWith('/tenants/tenant-2/users/user-1');
  });
});
