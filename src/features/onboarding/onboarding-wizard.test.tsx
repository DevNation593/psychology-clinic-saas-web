import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingWizard } from './onboarding-wizard';
import { apiClient } from '@/lib/api/client';
import { authApi, onboardingApi, specialtyCatalogApi, tenantsApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import type { AuthResponse, ClinicOnboardingResult, SpecialtyCatalogItem, Tenant } from '@/types';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/api/endpoints', () => ({
  specialtyCatalogApi: { list: vi.fn() },
  onboardingApi: { createClinic: vi.fn() },
  authApi: { login: vi.fn() },
  tenantsApi: { get: vi.fn() },
}));
vi.mock('@/lib/api/client', () => ({ apiClient: { setTokens: vi.fn(), clearAuthData: vi.fn() } }));

const catalog: SpecialtyCatalogItem[] = [
  { id: 's1', code: 'PSYCHOLOGY', name: 'Psicología', description: null, modules: [] },
  { id: 's2', code: 'NUTRITION', name: 'Nutrición', description: null, modules: [] },
];
const created = {
  admin: { email: 'server-canonical@example.com' },
} as ClinicOnboardingResult;
const session = {
  accessToken: 'access', refreshToken: 'refresh', user: { tenantId: 'tenant-1' },
} as AuthResponse;
const tenant = { id: 'tenant-1' } as Tenant;

function renderWizard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><OnboardingWizard /></QueryClientProvider>);
}

function fillClinic() {
  fireEvent.change(screen.getByLabelText('Nombre del consultorio'), { target: { value: '  Centro Integral  ' } });
  fireEvent.change(screen.getByLabelText('Correo de contacto'), { target: { value: ' CONTACTO@Example.com ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

async function selectSpecialties(names: string[]) {
  await screen.findByRole('checkbox', { name: 'Psicología' });
  for (const name of names) fireEvent.click(screen.getByRole('checkbox', { name }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

function fillAdmin() {
  fireEvent.change(screen.getByLabelText('Nombre del administrador'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('Apellido del administrador'), { target: { value: 'Vega' } });
  fireEvent.change(screen.getByLabelText('Correo del administrador'), { target: { value: ' ANA@Example.com ' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Secret123' } });
}

async function reachAdmin(names = ['Psicología']) {
  fillClinic();
  await screen.findByRole('heading', { name: 'Especialidades' });
  await selectSpecialties(names);
  await screen.findByRole('heading', { name: 'Administrador' });
}

async function reachConfirmation(names = ['Psicología']) {
  await reachAdmin(names);
  fillAdmin();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('heading', { name: 'Confirmación' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(specialtyCatalogApi.list).mockResolvedValue(catalog);
  vi.mocked(onboardingApi.createClinic).mockResolvedValue(created);
  vi.mocked(authApi.login).mockResolvedValue(session);
  vi.mocked(tenantsApi.get).mockResolvedValue(tenant);
  useAuthStore.setState({ user: null, tenant: null, isAuthenticated: false });
});

describe('OnboardingWizard', () => {
  it('loads the public catalog and shows four steps', async () => {
    let resolveCatalog!: (items: SpecialtyCatalogItem[]) => void;
    vi.mocked(specialtyCatalogApi.list).mockImplementation(() => new Promise((resolve) => { resolveCatalog = resolve; }));
    renderWizard();
    fillClinic();
    await screen.findByRole('heading', { name: 'Especialidades' });
    expect(screen.getByText('Cargando especialidades…')).toBeInTheDocument();
    resolveCatalog(catalog);
    expect(await screen.findByRole('checkbox', { name: 'Psicología' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Pasos de registro' })).toHaveTextContent('Consultorio');
    expect(screen.getByRole('list', { name: 'Pasos de registro' })).toHaveTextContent('Confirmación');
  });

  it('shows catalog error and retries', async () => {
    vi.mocked(specialtyCatalogApi.list).mockRejectedValueOnce(new Error('offline'));
    renderWizard();
    fillClinic();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las especialidades');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar catálogo' }));
    expect(await screen.findByRole('checkbox', { name: 'Nutrición' })).toBeInTheDocument();
  });

  it('shows empty catalog and blocks advancement', async () => {
    vi.mocked(specialtyCatalogApi.list).mockResolvedValue([]);
    renderWizard();
    fillClinic();
    expect(await screen.findByText('No hay especialidades disponibles.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('heading', { name: 'Especialidades' })).toBeInTheDocument();
  });

  it('validates each step and preserves multiple selections when going back', async () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Ingresa el nombre del consultorio')).toBeInTheDocument();
    fillClinic();
    await screen.findByRole('heading', { name: 'Especialidades' });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('heading', { name: 'Especialidades' })).toBeInTheDocument();
    await selectSpecialties(['Psicología', 'Nutrición']);
    await screen.findByRole('heading', { name: 'Administrador' });
    fillAdmin();
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(screen.getByRole('checkbox', { name: 'Psicología' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Nutrición' })).toBeChecked();
  });

  it('omits all clinical fields for a nonclinical administrator and normalizes payload', async () => {
    renderWizard();
    await reachConfirmation(['Psicología', 'Nutrición']);
    expect(screen.queryByText('Secret123')).not.toBeInTheDocument();
    expect(screen.getByText('Centro Integral')).toBeInTheDocument();
    expect(screen.getByText('CONTACTO@Example.com')).toBeInTheDocument();
    expect(screen.getByText('Ana Vega')).toBeInTheDocument();
    expect(screen.getByText('No atiende pacientes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    await waitFor(() => expect(onboardingApi.createClinic).toHaveBeenCalledTimes(1));
    expect(vi.mocked(onboardingApi.createClinic).mock.calls[0][0]).toEqual({
      clinicName: 'Centro Integral', contactEmail: 'contacto@example.com', contactPhone: '', address: '',
      timezone: 'America/Guayaquil', locale: 'es', specialtyCodes: ['PSYCHOLOGY', 'NUTRITION'],
      adminFirstName: 'Ana', adminLastName: 'Vega', adminEmail: 'ana@example.com',
      adminPassword: 'Secret123', adminProvidesCare: false,
    });
    expect(authApi.login).toHaveBeenCalledWith({ email: created.admin.email, password: 'Secret123' });
  });

  it('offers only selected specialties to clinical admins and sends professional fields', async () => {
    renderWizard();
    await reachAdmin(['Nutrición']);
    fillAdmin();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Atenderé pacientes' }));
    expect(screen.getByRole('option', { name: 'Nutrición' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Psicología' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Especialidad del administrador'), { target: { value: 'NUTRITION' } });
    fireEvent.change(screen.getByLabelText('Título profesional'), { target: { value: ' Nutricionista ' } });
    fireEvent.change(screen.getByLabelText('Número de licencia'), { target: { value: ' LIC-1 ' } });
    fireEvent.change(screen.getByLabelText('Biografía'), { target: { value: ' Nutrición clínica ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Confirmación' });
    expect(screen.getByText('Atiende pacientes: Nutrición')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    await waitFor(() => expect(onboardingApi.createClinic).toHaveBeenCalledWith(expect.objectContaining({
      adminProvidesCare: true, adminSpecialtyCode: 'NUTRITION', adminProfessionalTitle: 'Nutricionista',
      adminLicenseNumber: 'LIC-1', adminBio: 'Nutrición clínica',
    })));
  });

  it('requires admin identity and a selected specialty when the admin provides care', async () => {
    renderWizard();
    await reachAdmin();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Ingresa el nombre')).toBeInTheDocument();
    fillAdmin();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Atenderé pacientes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Selecciona una especialidad')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Administrador' })).toBeInTheDocument();
  });

  it('drops previously entered professional fields when care is turned off', async () => {
    renderWizard();
    await reachAdmin();
    fillAdmin();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Atenderé pacientes' }));
    fireEvent.change(screen.getByLabelText('Especialidad del administrador'), { target: { value: 'PSYCHOLOGY' } });
    fireEvent.change(screen.getByLabelText('Título profesional'), { target: { value: 'Psicóloga' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Atenderé pacientes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Confirmación' });
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    await waitFor(() => expect(onboardingApi.createClinic).toHaveBeenCalledTimes(1));
    expect(vi.mocked(onboardingApi.createClinic).mock.calls[0][0]).not.toHaveProperty('adminSpecialtyCode');
    expect(vi.mocked(onboardingApi.createClinic).mock.calls[0][0]).not.toHaveProperty('adminProfessionalTitle');
  });

  it('clears clinical specialty if the clinic selection is removed', async () => {
    renderWizard();
    await reachAdmin(['Psicología', 'Nutrición']);
    fillAdmin();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Atenderé pacientes' }));
    fireEvent.change(screen.getByLabelText('Especialidad del administrador'), { target: { value: 'NUTRITION' } });
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nutrición' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByLabelText('Especialidad del administrador')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('heading', { name: 'Administrador' })).toBeInTheDocument();
  });

  it('submits once on double click and commits auth only after tenant fetch', async () => {
    let resolveCreate!: (value: ClinicOnboardingResult) => void;
    vi.mocked(onboardingApi.createClinic).mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve; }));
    vi.mocked(tenantsApi.get).mockImplementation(async () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(apiClient.setTokens).toHaveBeenCalledWith('access', 'refresh');
      return tenant;
    });
    renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    expect(onboardingApi.createClinic).toHaveBeenCalledTimes(1);
    resolveCreate(created);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(apiClient.setTokens).toHaveBeenCalledWith('access', 'refresh');
    expect(tenantsApi.get).toHaveBeenCalledWith('tenant-1');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('keeps the created clinic state and offers login after a session failure', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Secret123'));
    renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    expect(await screen.findByText('Consultorio creado')).toBeInTheDocument();
    const loginLink = screen.getByRole('link', { name: 'Ir a iniciar sesión' });
    expect(loginLink).toHaveAttribute('href', '/login');
    expect(screen.getByText('server-canonical@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Secret123')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear consultorio' })).not.toBeInTheDocument();
    loginLink.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(loginLink);
    expect(onboardingApi.createClinic).toHaveBeenCalledTimes(1);
  });

  it('clears temporary tokens and auth if tenant fetch fails', async () => {
    vi.mocked(tenantsApi.get).mockRejectedValue(new Error('offline'));
    renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    expect(await screen.findByText('Consultorio creado')).toBeInTheDocument();
    expect(apiClient.clearAuthData).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(onboardingApi.createClinic).toHaveBeenCalledTimes(1);
  });

  it('preserves the form and permits explicit retry after creation fails', async () => {
    vi.mocked(onboardingApi.createClinic).mockRejectedValueOnce(new Error('Secret123'));
    renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo crear el consultorio');
    expect(screen.queryByText('Secret123')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar creación' }));
    await waitFor(() => expect(onboardingApi.createClinic).toHaveBeenCalledTimes(2));
  });
});
