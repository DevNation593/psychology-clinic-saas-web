import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { UserRole, type EligiblePatientProfessional, type PatientTeamMember, type User } from '@/types';
import { PatientTeamTab } from './patient-team-tab';

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiClient: http }));

const psychology = { id: 'psychology', code: 'PSY', name: 'Psicología' };
const nutrition = { id: 'nutrition', code: 'NUT', name: 'Nutrición' };
const actor = (role: UserRole) => ({ id: 'actor-1', role, tenantId: 'tenant-1' }) as User;
const member = (id: string, specialty: typeof psychology | null, isActive = true): PatientTeamMember => ({
  id: `assignment-${id}`, patientId: 'patient-1', professionalId: id,
  assignedAt: '2026-09-25T10:00:00Z', assignedBy: { id: 'actor-1', firstName: 'Eva', lastName: 'Ríos' }, isActive,
  professional: { id, firstName: id === 'nutrition-1' ? 'Nutricionista' : 'Psicóloga',
    lastName: 'Uno', professionalTitle: specialty ? 'Especialista' : null,
    licenseNumber: null, specialty },
});
const candidate = (id: string, specialty = nutrition): EligiblePatientProfessional => ({
  id, firstName: id === 'admin-clinical' ? 'Admin' : 'Nutricionista', lastName: 'Uno',
  professionalTitle: 'Especialista', licenseNumber: null, specialty, isAssigned: false,
});
const enabledSpecialties = [
  { ...psychology, description: null, isActive: true, modules: [] },
  { ...nutrition, description: null, isActive: true, modules: [] },
];

function renderTeam({
  role = UserRole.ADMIN,
  team = [],
  eligible = [],
  specialties = enabledSpecialties,
  teamError,
  specialtiesRequest,
  eligibleRequest,
}: {
  role?: UserRole;
  team?: PatientTeamMember[];
  eligible?: EligiblePatientProfessional[];
  specialties?: typeof enabledSpecialties;
  teamError?: Error;
  specialtiesRequest?: () => Promise<typeof enabledSpecialties>;
  eligibleRequest?: () => Promise<EligiblePatientProfessional[]>;
} = {}) {
  useAuthStore.setState({ user: actor(role), tenant: { id: 'tenant-1' } as ReturnType<typeof useAuthStore.getState>['tenant'] });
  http.get.mockImplementation((url: string) => {
    if (url.endsWith('/team')) return teamError ? Promise.reject(teamError) : Promise.resolve(team);
    if (url.endsWith('/team/eligible')) return eligibleRequest ? eligibleRequest() : Promise.resolve(eligible);
    if (url.includes('/specialties')) return specialtiesRequest ? specialtiesRequest() : Promise.resolve(specialties);
    throw new Error(`Unexpected request: ${url}`);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><PatientTeamTab patientId="patient-1" /></QueryClientProvider>);
}

async function openRemoval(name: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Retirar ${name}` }));
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Retirar' }));
}

async function selectNutritionSpecialty() {
  const select = await screen.findByLabelText('Especialidad');
  await screen.findByRole('option', { name: 'Nutrición' });
  fireEvent.change(select, { target: { value: 'nutrition' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  http.put.mockResolvedValue(member('nutrition-1', nutrition));
  http.delete.mockResolvedValue(member('nutrition-1', nutrition, false));
});

describe('PatientTeamTab', () => {
  it('groups active and inactive rows by specialty with historical null profiles', async () => {
    renderTeam({ team: [member('old-1', null, false), member('nutrition-1', nutrition, false), member('psych-1', psychology)] });
    expect(await screen.findByRole('heading', { name: 'Psicología' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nutrición' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sin especialidad vigente' })).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getAllByText('Inactivo')).toHaveLength(2);
    expect(screen.getAllByText(/Eva Ríos/)).toHaveLength(3);
    expect(screen.getAllByText(/25/)).toHaveLength(3);
    const names = screen.getAllByTestId('team-member').map((row) => row.textContent);
    expect(names[0]).toContain('Psicóloga Uno');
  });

  it('passes the selected specialty to eligible candidates and displays clinical administrators', async () => {
    renderTeam({ eligible: [candidate('admin-clinical'), candidate('nutrition-1')] });
    await screen.findByLabelText('Especialidad');
    expect(http.get.mock.calls.filter(([url]) => (url as string).endsWith('/team/eligible'))).toHaveLength(0);
    await selectNutritionSpecialty();
    await waitFor(() => expect(http.get).toHaveBeenCalledWith(
      '/tenants/tenant-1/patients/patient-1/team/eligible', { params: { specialtyId: 'nutrition' } },
    ));
    expect(await screen.findByRole('option', { name: /Admin Uno/ })).toBeInTheDocument();
  });

  it.each([
    [UserRole.ADMIN, true, true],
    [UserRole.CLIENTE, true, true],
    [UserRole.ASISTENTE, true, true],
    [UserRole.PROFESIONAL, true, false],
    [UserRole.PSICOLOGO, true, false],
    [UserRole.PACIENTE, false, false],
    [UserRole.SOPORTE, false, false],
  ] as const)('applies add/remove UI permissions for %s', async (role, canAdd, canRemove) => {
    // The actor is on the team, so a professional role is allowed to refer colleagues.
    renderTeam({ role, team: [member('nutrition-1', nutrition), member('actor-1', psychology)] });
    await screen.findByText('Nutricionista Uno');

    expect(!!screen.queryByRole('button', { name: 'Agregar al equipo' })).toBe(canAdd);
    expect(!!screen.queryByRole('button', { name: 'Retirar Nutricionista Uno' })).toBe(canRemove);
    if (!canAdd) {
      expect(http.get.mock.calls.some(([url]) => (url as string).includes('/specialties'))).toBe(false);
      expect(http.get.mock.calls.some(([url]) => (url as string).endsWith('/team/eligible'))).toBe(false);
    }
  });

  it('shows specialty loading, empty, and safe error retry states', async () => {
    const never = () => new Promise<typeof enabledSpecialties>(() => undefined);
    const loading = renderTeam({ specialtiesRequest: never });
    expect(await screen.findByRole('status', { name: 'Cargando especialidades' })).toBeInTheDocument();
    loading.unmount();

    renderTeam({ specialties: [] });
    expect(await screen.findByText('No hay especialidades disponibles.')).toBeInTheDocument();
  });

  it('retries specialty errors without exposing the raw response', async () => {
    const request = vi.fn().mockRejectedValue(new Error('raw specialty failure'));
    renderTeam({ specialtiesRequest: request });

    expect(await screen.findByText('No se pudieron cargar las especialidades.')).toBeInTheDocument();
    expect(screen.queryByText(/raw specialty failure/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar especialidades' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('distinguishes unselected, loading, and empty professional states', async () => {
    const request = vi.fn(() => new Promise<EligiblePatientProfessional[]>(() => undefined));
    const loading = renderTeam({ eligibleRequest: request });
    expect(await screen.findByText('Selecciona una especialidad para ver profesionales.')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    await selectNutritionSpecialty();
    expect(await screen.findByRole('status', { name: 'Cargando profesionales' })).toBeInTheDocument();
    loading.unmount();

    renderTeam({ eligible: [] });
    await selectNutritionSpecialty();
    expect(await screen.findByText('No hay profesionales elegibles para esta especialidad.')).toBeInTheDocument();
  });

  it('retries candidate errors without exposing the raw response', async () => {
    const request = vi.fn().mockRejectedValue(new Error('raw candidate failure'));
    renderTeam({ eligibleRequest: request });
    await selectNutritionSpecialty();

    expect(await screen.findByText('No se pudieron cargar los profesionales.')).toBeInTheDocument();
    expect(screen.queryByText(/raw candidate failure/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar profesionales' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('allows professional referral but exposes no remove action', async () => {
    // The acting professional already treats this patient, so they may refer a colleague.
    renderTeam({ role: UserRole.PROFESIONAL, team: [member('actor-1', psychology)], eligible: [candidate('nutrition-1')] });
    await selectNutritionSpecialty();
    const professional = await screen.findByLabelText('Profesional');
    await screen.findByRole('option', { name: 'Nutricionista Uno' });
    fireEvent.change(professional, { target: { value: 'nutrition-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar al equipo' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/tenants/tenant-1/patients/patient-1/team/nutrition-1'));
    expect(screen.queryByRole('button', { name: /Retirar/ })).not.toBeInTheDocument();
  });

  it.each([UserRole.PROFESIONAL, UserRole.PSICOLOGO])(
    'shows the team read-only to a %s who does not treat the patient',
    async (role) => {
      renderTeam({ role, team: [member('psych-1', psychology), member('actor-1', nutrition, false)] });

      expect(await screen.findAllByTestId('team-member')).toHaveLength(2);
      expect(screen.getByText('Solo los profesionales que atienden a este paciente pueden agregar integrantes.')).toBeInTheDocument();
      expect(screen.queryByLabelText('Especialidad')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Agregar al equipo' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Retirar/ })).not.toBeInTheDocument();
      expect(http.get.mock.calls.some(([url]) => String(url).includes('/team/eligible'))).toBe(false);
    },
  );

  it('disables candidate controls while an assignment is pending', async () => {
    let finish!: (value: PatientTeamMember) => void;
    http.put.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderTeam({ team: [member('psych-1', psychology)], eligible: [candidate('nutrition-1')] });
    await selectNutritionSpecialty();
    const professional = await screen.findByLabelText('Profesional');
    await screen.findByRole('option', { name: 'Nutricionista Uno' });
    fireEvent.change(professional, { target: { value: 'nutrition-1' } });
    const addButton = screen.getByRole('button', { name: 'Agregar al equipo' });
    fireEvent.click(addButton);

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Especialidad')).toBeDisabled();
    expect(professional).toBeDisabled();
    expect(addButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retirar Psicóloga Uno' })).toBeDisabled();
    await act(async () => finish(member('nutrition-1', nutrition)));
  });

  it.each([UserRole.ADMIN, UserRole.ASISTENTE, UserRole.CLIENTE])('%s confirms removal and keeps the row until server response', async (role) => {
    let finish!: (value: PatientTeamMember) => void;
    http.delete.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderTeam({ role, team: [member('nutrition-1', nutrition)] });
    const removeButton = await screen.findByRole('button', { name: 'Retirar Nutricionista Uno' });
    fireEvent.click(removeButton);
    expect(http.delete).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Retirar' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Nutricionista Uno')).toBeInTheDocument();
    expect(removeButton).toBeDisabled();
    expect(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Retirar' })).toBeDisabled();
    await act(async () => finish(member('nutrition-1', nutrition, false)));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('keeps the row and links safe future appointments after blocked removal', async () => {
    http.delete.mockRejectedValue({ code: 'PROFESSIONAL_HAS_FUTURE_APPOINTMENTS',
      message: 'Cancela o reasigna las citas futuras.', details: { appointments: [
        { id: 'appointment /1', startTime: '2026-10-01T15:00:00Z', title: 'Consulta', status: 'SCHEDULED' },
      ] } });
    renderTeam({ role: UserRole.ASISTENTE, team: [member('nutrition-1', nutrition)] });
    await openRemoval('Nutricionista Uno');
    expect(await screen.findByText('Consulta')).toBeInTheDocument();
    expect(screen.getByText('Nutricionista Uno')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir cita' })).toHaveAttribute('href', '/calendar?appointmentId=appointment%20%2F1');
  });

  it('keeps the row and closes confirmation after a generic removal error', async () => {
    http.delete.mockRejectedValue({
      message: 'raw private removal response',
      details: { appointments: [
        { id: 'private-appointment', startTime: '2026-10-01T15:00:00Z', title: 'Private title', status: 'SCHEDULED' },
      ] },
    });
    renderTeam({ team: [member('nutrition-1', nutrition)] });
    await openRemoval('Nutricionista Uno');

    expect(await screen.findByText('No se pudo retirar al profesional. Inténtalo de nuevo.')).toBeInTheDocument();
    expect(screen.getByText('Nutricionista Uno')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByText('raw private removal response')).not.toBeInTheDocument();
    expect(screen.queryByText('Private title')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Abrir cita' })).not.toBeInTheDocument();
  });

  it('does not render arbitrary malformed removal details', async () => {
    http.delete.mockRejectedValue({ code: 'PROFESSIONAL_HAS_FUTURE_APPOINTMENTS', message: 'unsafe-message',
      details: { appointments: [{ id: { url: 'https://evil.test' }, title: { secret: 'private' } }, '<script>secret</script>'] } });
    renderTeam({ team: [member('nutrition-1', nutrition)] });
    await openRemoval('Nutricionista Uno');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Nutricionista Uno')).toBeInTheDocument();
    expect(screen.queryByText('unsafe-message')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Abrir cita' })).not.toBeInTheDocument();
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument();
  });

  it('offers an accessible retry when team loading fails', async () => {
    renderTeam({ teamError: new Error('offline') });
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar equipo tratante' }));
    await waitFor(() => expect(http.get.mock.calls.filter(([url]) => (url as string).endsWith('/team'))).toHaveLength(2));
  });

});
