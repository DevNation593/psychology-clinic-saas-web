import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tenantModulesApi, tenantSpecialtiesApi, specialtyCatalogApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { UserRole, type SpecialtyCatalogItem, type SpecialtySelectionResult, type Tenant, type TenantModule, type TenantSpecialty, type User } from '@/types';
import { SpecialtyManager } from './specialty-manager';

const api = vi.hoisted(() => ({
  catalogList: vi.fn(),
  specialtiesList: vi.fn(),
  replaceSpecialties: vi.fn(),
  modulesList: vi.fn(),
  setModuleEnabled: vi.fn(),
}));

vi.mock('@/lib/api/endpoints', () => ({
  specialtyCatalogApi: { list: api.catalogList },
  tenantSpecialtiesApi: { list: api.specialtiesList, replace: api.replaceSpecialties },
  tenantModulesApi: { list: api.modulesList, setEnabled: api.setModuleEnabled },
}));

const psychology: SpecialtyCatalogItem = {
  id: 'specialty-psychology',
  code: 'PSYCHOLOGY',
  name: 'Psicología',
  description: 'Atención psicológica',
  modules: [{ id: 'catalog-module-psychology', moduleKey: 'psychology.assessments' }],
};

const nutrition: SpecialtyCatalogItem = {
  id: 'specialty-nutrition',
  code: 'NUTRITION',
  name: 'Nutrición',
  description: 'Atención nutricional',
  modules: [{ id: 'catalog-module-nutrition', moduleKey: 'nutrition.assessments' }],
};

const psychologySelection: TenantSpecialty = {
  id: psychology.id,
  code: psychology.code,
  name: psychology.name,
  description: psychology.description,
  isActive: true,
  modules: [],
};

const nutritionSelection: TenantSpecialty = {
  id: nutrition.id,
  code: nutrition.code,
  name: nutrition.name,
  description: nutrition.description,
  isActive: true,
  modules: [],
};

const psychologyModule: TenantModule = {
  id: 'tenant-module-psychology',
  tenantId: 'tenant-1',
  moduleKey: 'psychology.assessments',
  enabled: true,
};

const nutritionModule: TenantModule = {
  id: 'tenant-module-nutrition',
  tenantId: 'tenant-1',
  moduleKey: 'nutrition.assessments',
  enabled: false,
};

const canonicalResult: SpecialtySelectionResult = {
  tenantId: 'tenant-1',
  specialties: [psychology],
  modules: [{ moduleKey: 'psychology.assessments', enabled: true }],
  pricing: {
    includedSpecialties: 1,
    selectedSpecialties: 1,
    billableSpecialties: 0,
    specialtyUnitPrice: 15.5,
    basePlanPrice: 90,
    featureAddonsPrice: 0,
    specialtyAddonsPrice: 0,
    totalMonthly: 90,
    currency: 'USD',
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function enabledRows(codes: string[]): TenantSpecialty[] {
  return [psychologySelection, nutritionSelection].filter((specialty) => codes.includes(specialty.code));
}

// Specialty buttons render as soon as the catalog loads but stay disabled until the
// tenant selection has loaded too; clicking earlier is silently ignored.
async function findEnabledButton(name: RegExp) {
  const button = await screen.findByRole('button', { name });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

function renderManager() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <SpecialtyManager />
      </QueryClientProvider>,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(specialtyCatalogApi.list).mockResolvedValue([psychology, nutrition]);
  vi.mocked(tenantSpecialtiesApi.list).mockResolvedValue([psychologySelection]);
  vi.mocked(tenantSpecialtiesApi.replace).mockResolvedValue(canonicalResult);
  vi.mocked(tenantModulesApi.list).mockResolvedValue([psychologyModule, nutritionModule]);
  vi.mocked(tenantModulesApi.setEnabled).mockResolvedValue({ ...psychologyModule, enabled: false });
  useAuthStore.setState({
    user: { role: UserRole.ADMIN } as User,
    tenant: {
      id: 'tenant-1',
      subscription: {
        specialtyPricing: {
          includedSpecialties: 1,
          selectedSpecialties: 1,
          specialtyUnitPrice: 15.5,
          currency: 'USD',
        },
      },
    } as Tenant,
  });
});

describe('SpecialtyManager', () => {
  it('loads catalog and tenant selection independently before initializing the draft', async () => {
    const catalog = deferred<SpecialtyCatalogItem[]>();
    const selection = deferred<TenantSpecialty[]>();
    vi.mocked(specialtyCatalogApi.list).mockReturnValue(catalog.promise);
    vi.mocked(tenantSpecialtiesApi.list).mockReturnValue(selection.promise);

    renderManager();

    await waitFor(() => {
      expect(specialtyCatalogApi.list).toHaveBeenCalledTimes(1);
      expect(tenantSpecialtiesApi.list).toHaveBeenCalledTimes(1);
    });
    await act(async () => catalog.resolve([psychology, nutrition]));

    const nutritionButton = await findEnabledButton(/Nutrición/);
    expect(nutritionButton).toHaveAttribute('aria-pressed', 'false');
    expect(nutritionButton).toBeDisabled();

    await act(async () => selection.resolve([psychologySelection]));
    await waitFor(() => expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('renders catalog specialties that are not enabled for the tenant', async () => {
    renderManager();

    const nutritionButton = await findEnabledButton(/Nutrición/);
    expect(nutritionButton).toHaveAttribute('aria-pressed', 'false');
    expect(nutritionButton).toHaveTextContent('Inactiva');
    expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps local specialty edits when a background refetch returns different tenant data', async () => {
    const { client } = renderManager();
    const psychologyButton = await findEnabledButton(/Psicología/);
    fireEvent.click(psychologyButton);
    expect(psychologyButton).toHaveAttribute('aria-pressed', 'false');

    vi.mocked(tenantSpecialtiesApi.list).mockResolvedValue([psychologySelection, nutritionSelection]);
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['tenant', 'specialties', 'tenant-1'], exact: true });
    });

    expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Nutrición/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reconciles a clean draft to a same-tenant server refetch', async () => {
    const { client } = renderManager();
    await screen.findByRole('button', { name: /Psicología/ });
    vi.mocked(tenantSpecialtiesApi.list).mockResolvedValue([psychologySelection, nutritionSelection]);

    await act(async () => {
      await client.invalidateQueries({ queryKey: ['tenant', 'specialties', 'tenant-1'], exact: true });
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /Nutrición/ })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('treats a draft toggled back to server state as clean before the next refetch', async () => {
    const { client } = renderManager();
    fireEvent.click(await findEnabledButton(/Psicología/));
    fireEvent.click(screen.getByRole('button', { name: /Psicología/ }));
    expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'true');

    vi.mocked(tenantSpecialtiesApi.list).mockResolvedValue([nutritionSelection]);
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['tenant', 'specialties', 'tenant-1'], exact: true });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: /Nutrición/ })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('discards tenant A draft state and initializes from tenant B selection after a tenant switch', async () => {
    vi.mocked(tenantSpecialtiesApi.list).mockImplementation(async (requestedTenantId) =>
      requestedTenantId === 'tenant-2' ? [nutritionSelection] : [psychologySelection]);
    renderManager();
    fireEvent.click(await findEnabledButton(/Psicología/));
    expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      useAuthStore.setState({ tenant: { ...useAuthStore.getState().tenant!, id: 'tenant-2' } });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: /Nutrición/ })).toHaveAttribute('aria-pressed', 'true');
    });
    expect(tenantSpecialtiesApi.list).toHaveBeenCalledWith('tenant-2');
  });

  it('prevents saving an empty specialty selection', async () => {
    renderManager();
    fireEvent.click(await findEnabledButton(/Psicología/));

    const save = screen.getByRole('button', { name: 'Guardar especialidades' });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(tenantSpecialtiesApi.replace).not.toHaveBeenCalled();
  });

  it('shows the estimated add-on price after applying included specialty credits', async () => {
    renderManager();
    fireEvent.click(await findEnabledButton(/Nutrición/));

    expect(screen.getByText('Estimado mensual: $15.50 USD / mes')).toBeInTheDocument();
  });

  it('keeps the attempted selection and server message when the API blocks removal', async () => {
    vi.mocked(tenantSpecialtiesApi.list).mockResolvedValue(enabledRows(['PSYCHOLOGY', 'NUTRITION']));
    vi.mocked(tenantSpecialtiesApi.replace).mockRejectedValue({
      code: 'SPECIALTY_IN_USE_BY_ACTIVE_PROFESSIONAL',
      message: 'La especialidad tiene profesionales activos.',
    });
    renderManager();

    fireEvent.click(await findEnabledButton(/Psicología/));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar especialidades' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La especialidad tiene profesionales activos.');
    expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'false');
    expect(tenantSpecialtiesApi.replace).toHaveBeenCalledWith(['NUTRITION'], 'tenant-1');
  });

  it('adopts the canonical selection and pricing returned after a successful save', async () => {
    vi.mocked(tenantSpecialtiesApi.replace).mockResolvedValue({
      ...canonicalResult,
      specialties: [nutrition],
      pricing: { ...canonicalResult.pricing, specialtyAddonsPrice: 47.25, totalMonthly: 137.25 },
    });
    renderManager();

    fireEvent.click(await findEnabledButton(/Nutrición/));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar especialidades' }));

    expect(await screen.findByText('Precio mensual por especialidades: $47.25 USD / mes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Nutrición/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows module switches only for selected specialties and saves their requested state', async () => {
    renderManager();

    const psychologySwitch = await screen.findByRole('checkbox', { name: 'Evaluaciones psicológicas' });
    expect(psychologySwitch).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Evaluaciones nutricionales' })).not.toBeInTheDocument();

    fireEvent.click(psychologySwitch);
    await waitFor(() => expect(tenantModulesApi.setEnabled).toHaveBeenCalledWith(
      'psychology.assessments',
      false,
      'tenant-1',
    ));
  });

  it('requires a specialty to be saved before enabling one of its module switches', async () => {
    vi.mocked(tenantSpecialtiesApi.replace).mockResolvedValue({
      ...canonicalResult,
      specialties: [psychology, nutrition],
      pricing: { ...canonicalResult.pricing, selectedSpecialties: 2, billableSpecialties: 1 },
    });
    renderManager();

    fireEvent.click(await findEnabledButton(/Nutrición/));
    const nutritionSwitch = await screen.findByRole('checkbox', { name: 'Evaluaciones nutricionales' });
    expect(nutritionSwitch).toBeDisabled();
    expect(nutritionSwitch).toHaveAccessibleDescription('Guarda las especialidades antes de activar sus módulos.');
    fireEvent.click(nutritionSwitch);
    expect(tenantModulesApi.setEnabled).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar especialidades' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Evaluaciones nutricionales' })).toBeEnabled());
  });

  it('disables a pending module switch and restores server state after an error', async () => {
    const pending = deferred<TenantModule>();
    vi.mocked(tenantModulesApi.setEnabled).mockReturnValue(pending.promise);
    renderManager();

    const psychologySwitch = await screen.findByRole('checkbox', { name: 'Evaluaciones psicológicas' });
    fireEvent.click(psychologySwitch);
    await waitFor(() => expect(tenantModulesApi.setEnabled).toHaveBeenCalledWith(
      'psychology.assessments',
      false,
      'tenant-1',
    ));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Evaluaciones psicológicas' })).toBeDisabled());

    await act(async () => pending.reject({ message: 'No se pudo actualizar el módulo.' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo actualizar el módulo.');
    expect(screen.getByRole('checkbox', { name: 'Evaluaciones psicológicas' })).toBeChecked();
  });

  it('shows module loading without treating unknown module state as zero', async () => {
    const modules = deferred<TenantModule[]>();
    vi.mocked(tenantModulesApi.list).mockReturnValue(modules.promise);
    renderManager();

    await waitFor(() => expect(tenantModulesApi.list).toHaveBeenCalledWith('tenant-1'));
    expect(screen.getByText('Cargando módulos del consultorio…')).toBeInTheDocument();
    expect(screen.queryByText(/0 módulos habilitados/)).not.toBeInTheDocument();

    await act(async () => modules.resolve([psychologyModule]));
    expect(await screen.findByText(/1 módulo habilitado para este consultorio/)).toBeInTheDocument();
  });

  it('shows a retry action and no authoritative count after module loading fails', async () => {
    vi.mocked(tenantModulesApi.list).mockRejectedValueOnce(new Error('No se pudieron consultar los módulos.'));
    renderManager();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron consultar los módulos.');
    expect(screen.queryByText(/0 módulos habilitados/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar módulos' }));

    expect(await screen.findByText(/1 módulo habilitado para este consultorio/)).toBeInTheDocument();
  });

  it('does not render module switches until the loading query has returned server state', async () => {
    const modules = deferred<TenantModule[]>();
    vi.mocked(tenantModulesApi.list).mockReturnValue(modules.promise);
    renderManager();

    await waitFor(() => expect(tenantModulesApi.list).toHaveBeenCalledWith('tenant-1'));
    await waitFor(() => expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.queryByRole('checkbox', { name: 'Evaluaciones psicológicas' })).not.toBeInTheDocument();

    await act(async () => modules.resolve([psychologyModule]));
    expect(await screen.findByRole('checkbox', { name: 'Evaluaciones psicológicas' })).toBeChecked();
  });

  it('keeps module switches unknown after a load error until retry returns server state', async () => {
    vi.mocked(tenantModulesApi.list).mockRejectedValueOnce(new Error('Módulos no disponibles.'));
    renderManager();

    expect(await screen.findByRole('alert')).toHaveTextContent('Módulos no disponibles.');
    expect(screen.queryByRole('checkbox', { name: 'Evaluaciones psicológicas' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar módulos' }));
    expect(await screen.findByRole('checkbox', { name: 'Evaluaciones psicológicas' })).toBeChecked();
  });

  it('ignores tenant A save completion after tenant B has initialized its draft', async () => {
    const pendingSave = deferred<SpecialtySelectionResult>();
    vi.mocked(tenantSpecialtiesApi.replace).mockReturnValue(pendingSave.promise);
    vi.mocked(tenantSpecialtiesApi.list).mockImplementation(async (requestedTenantId) =>
      requestedTenantId === 'tenant-2' ? [nutritionSelection] : [psychologySelection]);
    renderManager();

    fireEvent.click(await findEnabledButton(/Nutrición/));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar especialidades' }));
    await waitFor(() => expect(tenantSpecialtiesApi.replace).toHaveBeenCalledWith(
      ['PSYCHOLOGY', 'NUTRITION'],
      'tenant-1',
    ));

    act(() => {
      useAuthStore.setState({
        tenant: {
          ...useAuthStore.getState().tenant!,
          id: 'tenant-2',
          subscription: {
            specialtyPricing: {
              includedSpecialties: 0,
              selectedSpecialties: 1,
              specialtyUnitPrice: 9.25,
              currency: 'USD',
            },
          },
        } as Tenant,
      });
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /Nutrición/ })).toHaveAttribute('aria-pressed', 'true'));
    await act(async () => pendingSave.resolve({
      ...canonicalResult,
      tenantId: 'tenant-1',
      specialties: [psychology],
      pricing: { ...canonicalResult.pricing, specialtyAddonsPrice: 47.25, totalMonthly: 137.25 },
    }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Nutrición/ })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Estimado mensual: $9.25 USD / mes')).toBeInTheDocument();
      expect(screen.queryByText(/47.25 USD/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Psicología/ })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Psicología/ }));
    expect(screen.getByRole('button', { name: /Psicología/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('titles the page like the navigation entry', async () => {
    renderManager();
    expect(await screen.findByRole('heading', { level: 1, name: 'Módulos clínicos' })).toBeInTheDocument();
  });

  it('groups module switches under their specialty with readable names', async () => {
    vi.mocked(tenantSpecialtiesApi.list).mockResolvedValue([psychologySelection, nutritionSelection]);
    renderManager();

    const psychologyGroup = await screen.findByRole('group', { name: 'Psicología' });
    const nutritionGroup = screen.getByRole('group', { name: 'Nutrición' });
    expect(within(psychologyGroup).getByRole('checkbox', { name: 'Evaluaciones psicológicas' })).toBeChecked();
    expect(within(nutritionGroup).getByRole('checkbox', { name: 'Evaluaciones nutricionales' })).not.toBeChecked();
    expect(within(psychologyGroup).queryByRole('checkbox', { name: 'Evaluaciones nutricionales' })).not.toBeInTheDocument();
  });

  it('never shows internal module keys', async () => {
    renderManager();
    await screen.findByRole('checkbox', { name: 'Evaluaciones psicológicas' });
    expect(screen.queryByText('psychology.assessments')).not.toBeInTheDocument();
    expect(screen.queryByText('nutrition.assessments')).not.toBeInTheDocument();
  });

  it('warns about unsaved specialty changes until they are saved or undone', async () => {
    renderManager();
    const nutritionButton = await findEnabledButton(/Nutrición/);
    expect(screen.queryByText('Tienes cambios sin guardar.')).not.toBeInTheDocument();

    fireEvent.click(nutritionButton);
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeInTheDocument();

    fireEvent.click(nutritionButton);
    expect(screen.queryByText('Tienes cambios sin guardar.')).not.toBeInTheDocument();
  });

  it('keeps specialty and module controls read-only without admin authority', async () => {
    useAuthStore.setState({ user: { role: UserRole.PROFESIONAL } as User });
    renderManager();

    expect(await screen.findByRole('button', { name: /Psicología/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar especialidades' })).not.toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: 'Evaluaciones psicológicas' })).toBeDisabled();
    expect(screen.getByText('La selección de especialidades la administra el administrador del consultorio.')).toBeInTheDocument();
  });
});
