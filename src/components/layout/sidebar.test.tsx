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

const SECTION_KEYS = [
  'core.calendar', 'core.patients', 'core.tasks', 'core.clinicalNotes',
  'core.specialties', 'core.billing', 'core.team', 'core.storage',
] as const;

function sectionRows(disabled: string[] = []): TenantModule[] {
  return SECTION_KEYS.map((moduleKey) => ({
    id: `${moduleKey}-a`,
    tenantId: 'tenant-a',
    moduleKey,
    enabled: !disabled.includes(moduleKey),
  }));
}

const teamModule = sectionRows()[6];

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
    useAuthStore.getState().tenant?.id === 'tenant-a' ? sectionRows() : [],
  );
  api.legacyListModules.mockResolvedValue([teamModule]);
  useAuthStore.setState({ user: admin, tenant: clinicTenant('tenant-a') });
});

describe('Sidebar clinical modules entry', () => {
  it.each([UserRole.MASTER])('is shown to %s', async (role) => {
    useAuthStore.setState({ user: { ...admin, role } });
    renderSidebar();
    expect(await screen.findByRole('link', { name: 'Módulos clínicos' })).toHaveAttribute('href', '/admin/specialties');
  });

  it.each([UserRole.ASISTENTE, UserRole.PROFESIONAL, UserRole.ADMIN, UserRole.SOPORTE])('is hidden from %s', async (role) => {
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

describe('Sidebar administration section', () => {
  const adminLinks = ['Equipo', 'Suscripción', 'Almacenamiento', 'Configuración'];

  it('shows every administration entry to the account holder', async () => {
    renderSidebar();
    for (const name of adminLinks) {
      expect(await screen.findByRole('link', { name })).toBeInTheDocument();
    }
  });

  it.each([UserRole.PROFESIONAL, UserRole.ASISTENTE, UserRole.ADMIN])(
    'hides the whole section from %s',
    async (role) => {
      useAuthStore.setState({ user: { ...admin, role } });
      renderSidebar();
      expect(await screen.findByRole('link', { name: 'Pacientes' })).toBeInTheDocument();
      for (const name of [...adminLinks, 'Módulos clínicos']) {
        expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
      }
      expect(screen.queryByText('Administración')).not.toBeInTheDocument();
    },
  );

  // ADMIN is reserved: it is neither the account holder nor a professional.
  it('hides billing from ADMIN', async () => {
    useAuthStore.setState({ user: { ...admin, role: UserRole.ADMIN } });
    renderSidebar();
    expect(await screen.findByRole('link', { name: 'Pacientes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Facturación' })).not.toBeInTheDocument();
  });
});

describe('Sidebar section visibility', () => {
  it.each([
    ['Calendario', 'core.calendar'],
    ['Pacientes', 'core.patients'],
    ['Tareas', 'core.tasks'],
    ['Módulos clínicos', 'core.specialties'],
    ['Facturación', 'core.billing'],
    ['Equipo', 'core.team'],
    ['Almacenamiento', 'core.storage'],
  ])('hides %s when %s is off', async (name, key) => {
    vi.mocked(tenantModulesApi.list).mockResolvedValue(sectionRows([key]));
    renderSidebar();
    expect(await screen.findByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    await waitFor(() => expect(tenantModulesApi.list).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('link', { name })).not.toBeInTheDocument());
    // Everything else stays.
    expect(screen.getByRole('link', { name: 'Suscripción' })).toBeInTheDocument();
  });

  it('always shows Dashboard, Suscripción and Configuración to the account holder', async () => {
    vi.mocked(tenantModulesApi.list).mockResolvedValue(sectionRows([...SECTION_KEYS]));
    renderSidebar();
    await waitFor(() => expect(tenantModulesApi.list).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Pacientes' })).not.toBeInTheDocument());
    for (const name of ['Dashboard', 'Suscripción', 'Configuración']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
  });

  it('shows Equipo to a personal clinic when core.team is on', async () => {
    useAuthStore.setState({ tenant: { ...clinicTenant('tenant-a'), tenantType: TenantType.PERSONAL } });
    renderSidebar();
    expect(await screen.findByRole('link', { name: 'Equipo' })).toBeInTheDocument();
  });

  it('shows no gated entry while the sections are loading', () => {
    vi.mocked(tenantModulesApi.list).mockImplementation(() => new Promise(() => {}));
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'Pacientes' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });
});
