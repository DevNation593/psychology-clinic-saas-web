import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tenantModulesApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { TenantType, UserRole, type Tenant, type TenantModule, type User } from '@/types';
import { Sidebar } from './sidebar';

const api = vi.hoisted(() => ({ listModules: vi.fn(), legacyListModules: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/lib/api/endpoints', () => ({
  specialtyCatalogApi: { list: vi.fn() },
  tenantSpecialtiesApi: { list: vi.fn(), replace: vi.fn() },
  tenantModulesApi: { list: api.listModules, setEnabled: vi.fn() },
  specialtiesApi: { modules: api.legacyListModules },
}));

const teamModule: TenantModule = {
  id: 'team-module-a',
  tenantId: 'tenant-a',
  moduleKey: 'core.team',
  enabled: true,
};

const admin = {
  id: 'admin-1',
  email: 'admin@example.com',
  firstName: 'Ana',
  lastName: 'Vega',
  role: UserRole.MASTER,
  tenantId: 'tenant-a',
} as User;

function clinicTenant(id: string): Tenant {
  return { id, name: id, tenantType: TenantType.CLINIC } as Tenant;
}

function renderSidebar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Sidebar />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(tenantModulesApi.list).mockImplementation(async () =>
    useAuthStore.getState().tenant?.id === 'tenant-a' ? [teamModule] : [],
  );
  api.legacyListModules.mockResolvedValue([teamModule]);
  useAuthStore.setState({ user: admin, tenant: clinicTenant('tenant-a') });
});

describe('Sidebar clinical modules entry', () => {
  it.each([UserRole.MASTER, UserRole.SOPORTE])('is shown to %s', async (role) => {
    useAuthStore.setState({ user: { ...admin, role } });
    renderSidebar();
    expect(await screen.findByRole('link', { name: 'Módulos clínicos' })).toHaveAttribute('href', '/admin/specialties');
  });

  it.each([UserRole.ASISTENTE, UserRole.PROFESIONAL, UserRole.ADMIN])('is hidden from %s', async (role) => {
    useAuthStore.setState({ user: { ...admin, role } });
    renderSidebar();
    expect(await screen.findByRole('link', { name: 'Pacientes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Módulos clínicos' })).not.toBeInTheDocument();
  });
});

describe('Sidebar billing entry', () => {
  it('is hidden from assistants, who cannot issue invoices', async () => {
    useAuthStore.setState({ user: { ...admin, role: UserRole.ASISTENTE } });
    renderSidebar();
    expect(await screen.findByRole('link', { name: 'Pacientes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Facturación' })).not.toBeInTheDocument();
  });

  it.each([UserRole.MASTER, UserRole.PROFESIONAL])('is shown to %s', async (role) => {
    useAuthStore.setState({ user: { ...admin, role } });
    renderSidebar();
    expect(await screen.findByRole('link', { name: 'Facturación' })).toBeInTheDocument();
  });
});

describe('Sidebar tenant module visibility', () => {
  it('drops tenant A module access after switching to tenant B', async () => {
    renderSidebar();

    expect(await screen.findByRole('link', { name: 'Equipo' })).toBeInTheDocument();

    act(() => useAuthStore.setState({ tenant: { ...clinicTenant('tenant-b'), tenantType: undefined } }));

    await waitFor(() => expect(tenantModulesApi.list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Equipo' })).not.toBeInTheDocument());
  });
});
