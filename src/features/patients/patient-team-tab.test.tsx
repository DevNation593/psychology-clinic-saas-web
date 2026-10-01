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

function renderTeam({ role = UserRole.ADMIN, team = [], eligible = [], teamError }: {
  role?: UserRole;
  team?: PatientTeamMember[];
  eligible?: EligiblePatientProfessional[];
  teamError?: Error;
} = {}) {
  useAuthStore.setState({ user: actor(role), tenant: { id: 'tenant-1' } as ReturnType<typeof useAuthStore.getState>['tenant'] });
  http.get.mockImplementation((url: string) => {
    if (url.endsWith('/team')) return teamError ? Promise.reject(teamError) : Promise.resolve(team);
    if (url.endsWith('/team/eligible')) return Promise.resolve(eligible);
    if (url.includes('/specialties')) return Promise.resolve([
      { ...psychology, description: null, isActive: true, modules: [] },
      { ...nutrition, description: null, isActive: true, modules: [] },
    ]);
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
    fireEvent.change(await screen.findByLabelText('Especialidad'), { target: { value: 'nutrition' } });
    await waitFor(() => expect(http.get).toHaveBeenCalledWith(
      '/tenants/tenant-1/patients/patient-1/team/eligible', { params: { specialtyId: 'nutrition' } },
    ));
    expect(await screen.findByRole('option', { name: /Admin Uno/ })).toBeInTheDocument();
  });

  it('allows professional referral but exposes no remove action', async () => {
    renderTeam({ role: UserRole.PROFESIONAL, team: [member('psych-1', psychology)], eligible: [candidate('nutrition-1')] });
    fireEvent.change(await screen.findByLabelText('Especialidad'), { target: { value: 'nutrition' } });
    const professional = await screen.findByLabelText('Profesional');
    await screen.findByRole('option', { name: 'Nutricionista Uno' });
    fireEvent.change(professional, { target: { value: 'nutrition-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar al equipo' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/tenants/tenant-1/patients/patient-1/team/nutrition-1'));
    expect(screen.queryByRole('button', { name: /Retirar/ })).not.toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Abrir cita' })).toHaveAttribute('href', '/calendar?appointmentId=appointment%20%2F1');
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

  it.each([UserRole.PSICOLOGO, UserRole.CLIENTE, UserRole.PACIENTE])('uses legacy role mapping for %s', async (role) => {
    renderTeam({ role, team: [member('nutrition-1', nutrition)], eligible: [candidate('admin-clinical')] });
    await screen.findByText('Nutricionista Uno');
    expect(!!screen.queryByRole('button', { name: 'Agregar al equipo' })).toBe(role !== UserRole.PACIENTE);
    expect(!!screen.queryByRole('button', { name: 'Retirar Nutricionista Uno' })).toBe(role === UserRole.CLIENTE);
  });
});
