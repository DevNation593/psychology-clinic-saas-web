import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingWizard } from './onboarding-wizard';
import { apiClient } from '@/lib/api/client';
import { authApi, onboardingApi, specialtyCatalogApi, tenantsApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { QUERY_KEYS } from '@/lib/constants';
import { PlanTier, SubscriptionStatus, TenantType, UserRole, type AuthResponse, type ClinicOnboardingResult, type SpecialtyCatalogItem, type Tenant } from '@/types';

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
  tenant: { id: 'tenant-1', name: 'Centro Integral', email: 'contacto@example.com', phone: null, address: null, tenantType: TenantType.CLINIC, onboardingCompleted: true },
  admin: { id: 'admin-1', tenantId: 'tenant-1', email: 'server-canonical@example.com', firstName: 'Ana', lastName: 'Vega', role: UserRole.ADMIN, professionalProfile: null },
  specialties: [catalog[0]], modules: [], pricing: { includedSpecialties: 1, selectedSpecialties: 1, billableSpecialties: 0, specialtyUnitPrice: 0, basePlanPrice: 0, featureAddonsPrice: 0, specialtyAddonsPrice: 0, totalMonthly: 0, currency: 'USD' },
} satisfies ClinicOnboardingResult;
const session = {
  accessToken: 'access', refreshToken: 'refresh', user: {
    id: 'admin-1', email: 'server-canonical@example.com', firstName: 'Ana', lastName: 'Vega', role: UserRole.ADMIN,
    tenantId: 'tenant-1', isActive: true, emailVerified: true, createdAt: '2026-09-25T00:00:00Z', updatedAt: '2026-09-25T00:00:00Z',
  },
} satisfies AuthResponse;
const closedDay = { enabled: false, startTime: '09:00', endTime: '17:00' };
const tenant: Tenant = {
  id: 'tenant-1', name: 'Centro Integral', email: 'contacto@example.com', tenantType: TenantType.CLINIC,
  subscription: {
    id: 'subscription-1', tenantId: 'tenant-1', status: SubscriptionStatus.TRIAL, trialEndsAt: null,
    currentPeriodStart: '2026-09-25', currentPeriodEnd: '2026-10-25', canceledAt: null, cancelAtPeriodEnd: false,
    createdAt: '2026-09-25T00:00:00Z', updatedAt: '2026-09-25T00:00:00Z',
    plan: {
      id: 'plan-1', planType: PlanTier.TRIAL, name: 'Trial', description: '', basePrice: 0, currency: 'EUR', billingInterval: 'MONTHLY',
      pricePerSeatMonthly: 0, pricePerSeatYearly: 0,
      limits: { maxPsychologists: 1, maxAssistants: 1, maxPatients: 20, storageGB: 1, maxEmailsPerMonth: 20, maxPushPerMonth: 20, maxSmsPerMonth: 0, maxApiRequestsPerHour: null },
      features: {
        dashboard: true, calendar: true, appointments: true, patients: true, clinicalNotes: false, tasks: false, attachments: false, sessionPlans: false,
        inAppNotifications: true, emailNotifications: false, webPush: false, smsNotifications: false,
        basicStats: true, advancedAnalytics: false, customReports: false, dataExport: false,
        googleCalendarSync: false, videoIntegration: false, apiAccess: 'none', webhooks: false,
        mfa: false, sso: false, auditLogs: false, customBranding: false,
      },
    },
  },
  settings: {
    workingHours: { monday: closedDay, tuesday: closedDay, wednesday: closedDay, thursday: closedDay, friday: closedDay, saturday: closedDay, sunday: closedDay },
    defaultSessionDuration: 50, reminderRules: [], timezone: 'America/Guayaquil', locale: 'es',
  },
  createdAt: '2026-09-25T00:00:00Z', updatedAt: '2026-09-25T00:00:00Z',
};

const markerKey = 'clinic-onboarding-created:v1';

function renderWizard(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return { client, ...render(<QueryClientProvider client={client}><OnboardingWizard /></QueryClientProvider>) };
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
  replace.mockReset();
  sessionStorage.clear();
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

  it('associates specialty and clinical selection errors with their controls', async () => {
    renderWizard();
    fillClinic();
    await screen.findByRole('heading', { name: 'Especialidades' });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    const group = screen.getByRole('group', { name: 'Especialidades del consultorio' });
    await waitFor(() => expect(group).toHaveAttribute('aria-invalid', 'true'));
    expect(group).toHaveAttribute('aria-describedby', 'specialtyCodes-error');
    expect(await screen.findByText('Selecciona al menos una especialidad')).toHaveAttribute('id', 'specialtyCodes-error');
    await selectSpecialties(['Psicología']);
    await screen.findByRole('heading', { name: 'Administrador' });
    fillAdmin();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Atenderé pacientes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    const select = screen.getByLabelText('Especialidad del administrador');
    await waitFor(() => expect(select).toHaveAttribute('aria-invalid', 'true'));
    expect(select).toHaveAttribute('aria-describedby', 'adminSpecialtyCode-error');
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'adminSpecialtyCode-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Selecciona una especialidad');
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
      expect(JSON.parse(sessionStorage.getItem(markerKey) ?? '{}')).toEqual({ tenantId: 'tenant-1', adminEmail: 'server-canonical@example.com' });
      return tenant;
    });
    replace.mockImplementation(() => {
      expect(JSON.parse(sessionStorage.getItem(markerKey) ?? '{}')).toEqual({ tenantId: 'tenant-1', adminEmail: 'server-canonical@example.com' });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
    renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    expect(onboardingApi.createClinic).toHaveBeenCalledTimes(1);
    resolveCreate(created);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    await waitFor(() => expect(sessionStorage.getItem(markerKey)).toBeNull());
    expect(apiClient.setTokens).toHaveBeenCalledWith('access', 'refresh');
    expect(tenantsApi.get).toHaveBeenCalledWith('tenant-1');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('recovers an already created clinic after remount without another POST', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('offline'));
    const view = renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    expect(await screen.findByRole('heading', { name: 'Consultorio creado' })).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(markerKey) ?? '{}')).toEqual({ tenantId: 'tenant-1', adminEmail: 'server-canonical@example.com' });
    view.unmount();
    renderWizard();
    expect(await screen.findByRole('heading', { name: 'Consultorio creado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear consultorio' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(onboardingApi.createClinic).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Descartar registro anterior y crear otro consultorio' }));
    expect(sessionStorage.getItem(markerKey)).toBeNull();
    expect(await screen.findByLabelText('Nombre del consultorio')).toBeInTheDocument();
  });

  it.each([
    ['empty tenant', '{"tenantId":"","adminEmail":"ana@example.com"}'],
    ['empty email', '{"tenantId":"tenant-1","adminEmail":""}'],
    ['non-email', '{"tenantId":"tenant-1","adminEmail":"not-an-email"}'],
    ['unnormalized email', '{"tenantId":"tenant-1","adminEmail":" ANA@Example.com "}'],
    ['extra data', '{"tenantId":"tenant-1","adminEmail":"ana@example.com","adminPassword":"Secret123"}'],
    ['wrong types', '{"tenantId":17,"adminEmail":["ana@example.com"]}'],
    ['malformed JSON', '{not json'],
  ])('deletes an invalid recovery marker (%s) and permits a fresh form', async (_name, raw) => {
    sessionStorage.setItem(markerKey, raw);
    renderWizard();
    expect(await screen.findByLabelText('Nombre del consultorio')).toBeInTheDocument();
    await waitFor(() => expect(sessionStorage.getItem(markerKey)).toBeNull());
    fillClinic();
    expect(await screen.findByRole('heading', { name: 'Especialidades' })).toBeInTheDocument();
  });

  it('persists a late create response after unmount but never starts login', async () => {
    let resolveCreate!: (value: ClinicOnboardingResult) => void;
    vi.mocked(onboardingApi.createClinic).mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve; }));
    const view = renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    view.unmount();
    await act(async () => { resolveCreate(created); });
    expect(JSON.parse(sessionStorage.getItem(markerKey) ?? '{}')).toEqual({ tenantId: 'tenant-1', adminEmail: 'server-canonical@example.com' });
    expect(authApi.login).not.toHaveBeenCalled();
    expect(apiClient.setTokens).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    renderWizard();
    expect(await screen.findByRole('heading', { name: 'Consultorio creado' })).toBeInTheDocument();
  });

  it('clears temporary tokens when unmounted during tenant fetch', async () => {
    let resolveTenant!: (value: Tenant) => void;
    vi.mocked(tenantsApi.get).mockImplementation(() => new Promise((resolve) => { resolveTenant = resolve; }));
    const view = renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    await waitFor(() => expect(tenantsApi.get).toHaveBeenCalledWith('tenant-1'));
    expect(apiClient.setTokens).toHaveBeenCalledWith('access', 'refresh');
    view.unmount();
    expect(apiClient.clearAuthData).toHaveBeenCalled();
    await act(async () => { resolveTenant(tenant); });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(markerKey)).not.toBeNull();
  });

  it('does not clear a completed session when the wizard unmounts after navigation', async () => {
    const view = renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    view.unmount();
    expect(apiClient.clearAuthData).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('keeps recovery and clears auth if dashboard navigation throws', async () => {
    replace.mockImplementation(() => { throw new Error('navigation failed'); });
    const view = renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    expect(await screen.findByRole('heading', { name: 'Consultorio creado' })).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(apiClient.clearAuthData).toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem(markerKey) ?? '{}')).toEqual({ tenantId: 'tenant-1', adminEmail: 'server-canonical@example.com' });
    view.unmount();
    renderWizard();
    expect(await screen.findByRole('heading', { name: 'Consultorio creado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear consultorio' })).not.toBeInTheDocument();
    expect(onboardingApi.createClinic).toHaveBeenCalledTimes(1);
  });

  it('treats a storage failure after POST success as created, never as a retryable create failure', async () => {
    const originalSetItem = Storage.prototype.setItem;
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (this === sessionStorage && key === markerKey) throw new Error('storage unavailable');
      return originalSetItem.call(this, key, value);
    });
    try {
      renderWizard();
      await reachConfirmation();
      fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
      expect(await screen.findByRole('heading', { name: 'Consultorio creado' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reintentar creación' })).not.toBeInTheDocument();
      expect(authApi.login).not.toHaveBeenCalled();
      expect(onboardingApi.createClinic).toHaveBeenCalledTimes(1);
    } finally {
      storageSpy.mockRestore();
    }
  });

  it('rejects a login session for another tenant and retains recovery', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ ...session, user: { ...session.user, tenantId: 'other-tenant' } });
    renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    expect(await screen.findByRole('heading', { name: 'Consultorio creado' })).toBeInTheDocument();
    expect(tenantsApi.get).not.toHaveBeenCalled();
    expect(apiClient.clearAuthData).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(markerKey)).not.toBeNull();
  });

  it('removes invalid selected codes after catalog refetch and returns to specialties', async () => {
    const view = renderWizard();
    await reachAdmin(['Psicología', 'Nutrición']);
    fillAdmin();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Atenderé pacientes' }));
    fireEvent.change(screen.getByLabelText('Especialidad del administrador'), { target: { value: 'NUTRITION' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Confirmación' });
    vi.mocked(specialtyCatalogApi.list).mockResolvedValue([catalog[0]]);
    await act(async () => { await view.client.refetchQueries({ queryKey: QUERY_KEYS.SPECIALTY_CATALOG }); });
    expect(await screen.findByRole('heading', { name: 'Especialidades' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa las especialidades');
    expect(screen.getByRole('checkbox', { name: 'Psicología' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Nutrición' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByLabelText('Especialidad del administrador')).toHaveValue('');
    expect(onboardingApi.createClinic).not.toHaveBeenCalled();
  });

  it('blocks submit when a catalog refresh removes every chosen code', async () => {
    const view = renderWizard();
    await reachConfirmation();
    vi.mocked(specialtyCatalogApi.list).mockResolvedValue([]);
    await act(async () => { await view.client.refetchQueries({ queryKey: QUERY_KEYS.SPECIALTY_CATALOG }); });
    expect(await screen.findByRole('heading', { name: 'Especialidades' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa las especialidades');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('heading', { name: 'Especialidades' })).toBeInTheDocument();
    expect(onboardingApi.createClinic).not.toHaveBeenCalled();
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
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('alert')).toHaveTextContent('ana@example.com');
    expect(screen.queryByRole('heading', { name: 'Consultorio creado' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar creación' }));
    await waitFor(() => expect(onboardingApi.createClinic).toHaveBeenCalledTimes(2));
  });

  it('gives neutral login guidance for a generic HTTP 409 without claiming the email is occupied', async () => {
    vi.mocked(onboardingApi.createClinic).mockRejectedValueOnce({ message: 'El correo electrónico ya está en uso', status: 409 });
    renderWizard();
    await reachConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Crear consultorio' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto al crear el consultorio. Puede que ya exista; inicia sesión o revisa los datos.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('correo ya está en uso');
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('heading', { name: 'Consultorio creado' })).not.toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
    expect(onboardingApi.createClinic).toHaveBeenCalledTimes(1);
  });
});
