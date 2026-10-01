import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { AppointmentStatus, UserRole, type Appointment, type Patient, type User } from '@/types';
import PatientDetailPage from './[id]/page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  removePatient: vi.fn(),
  get: vi.fn(),
}));

const patient = {
  id: 'patient-1',
  tenantId: 'tenant-1',
  firstName: 'Ana',
  lastName: 'Vega',
  email: 'ana@example.com',
  phone: '555',
  dateOfBirth: '1990-01-01',
  gender: null,
  address: 'Centro',
  emergencyContactName: 'Luis',
  emergencyContactPhone: '123',
  notes: 'Nota clínica preservada',
  assignedPsychologistId: 'legacy-1',
  assignedPsychologist: { id: 'legacy-1', firstName: 'Legacy', lastName: 'Psych', email: 'legacy@example.com' },
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
} as Patient;

const canonicalAppointment = {
  id: 'appointment-1',
  tenantId: 'tenant-1',
  patientId: 'patient-1',
  patient: { id: 'patient-1', firstName: 'Ana', lastName: 'Vega', email: null, phone: null },
  professionalId: 'professional-1',
  professional: {
    id: 'professional-1', firstName: 'Noa', lastName: 'Paz', email: 'noa@example.com',
    professionalTitle: 'Nutricionista',
  },
  specialtyId: 'nutrition',
  specialty: { id: 'nutrition', code: 'NUTRITION', name: 'Nutrición' },
  psychologistId: 'legacy-psychologist',
  psychologist: { id: 'legacy-psychologist', firstName: 'Legacy', lastName: 'Psych', email: 'legacy@example.com' },
  title: 'Consulta nutricional',
  description: null,
  startTime: '2025-01-01T15:00:00.000Z',
  endTime: '2025-01-01T16:00:00.000Z',
  duration: 60,
  status: AppointmentStatus.COMPLETED,
  location: null,
  isOnline: false,
  meetingUrl: null,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  reminderSent24h: false,
  reminderSent2h: false,
  lastReminderSentAt: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
} as Appointment;

const canonicalAppointmentWithoutTitle = {
  ...canonicalAppointment,
  id: 'appointment-2',
  professionalId: 'professional-2',
  professional: {
    id: 'professional-2', firstName: 'Luis', lastName: 'Claro', email: 'luis@example.com',
    professionalTitle: null,
  },
  psychologistId: 'legacy-psychologist-2',
  psychologist: { id: 'legacy-psychologist-2', firstName: 'Otro', lastName: 'Legado', email: 'otro@example.com' },
} as Appointment;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useParams: () => ({ id: 'patient-1' }),
}));
vi.mock('@/hooks/usePatients', () => ({
  usePatient: () => ({ data: patient, isLoading: false }),
  useUpdatePatient: vi.fn(),
  useDeletePatient: () => ({ mutate: mocks.removePatient, isPending: false }),
}));
vi.mock('@/features/billing/patient-invoices-tab', () => ({
  PatientInvoicesTab: ({ patientId }: { patientId: string }) => (
    <div data-testid="patient-invoices">{patientId}</div>
  ),
}));
vi.mock('@/lib/api/client', () => ({
  apiClient: { get: mocks.get, put: vi.fn(), delete: vi.fn() },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PatientDetailPage /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    user: { id: 'admin-1', tenantId: 'tenant-1', role: UserRole.CLIENTE } as User,
    tenant: { id: 'tenant-1' } as ReturnType<typeof useAuthStore.getState>['tenant'],
  });
  mocks.get.mockImplementation((url: string) => {
    if (url.endsWith('/appointments')) {
      return Promise.resolve([canonicalAppointment, canonicalAppointmentWithoutTitle]);
    }
    if (url.endsWith('/team') || url.endsWith('/team/eligible') || url.includes('/specialties')) {
      return Promise.resolve([]);
    }
    throw new Error(`Unexpected request: ${url}`);
  });

});

describe('patient detail invoices tab', () => {
  it.each([
    [UserRole.ADMIN, true],
    [UserRole.CLIENTE, true],
    [UserRole.PROFESIONAL, true],
    [UserRole.PSICOLOGO, true],
    [UserRole.ASISTENTE, false],
  ])('for %s is visible: %s', (role, visible) => {
    useAuthStore.setState({ user: { id: 'user-1', tenantId: 'tenant-1', role } as User });
    renderPage();

    expect(!!screen.queryByRole('button', { name: 'Facturas' })).toBe(visible);
    if (visible) {
      fireEvent.click(screen.getByRole('button', { name: 'Facturas' }));
      expect(screen.getByTestId('patient-invoices')).toHaveTextContent('patient-1');
    }
  });
});

describe('patient detail treating-team wiring', () => {
  it('places the team tab after General and removes only the legacy assignee overview card', async () => {
    renderPage();

    const tabs = screen.getByRole('navigation', { name: 'Tabs' });
    const tabButtons = Array.from(tabs.querySelectorAll('button')).map((button) => button.textContent?.trim());
    expect(tabButtons).toEqual([
      'General',
      'Equipo tratante',
      'Historia Clínica',
      'Especialidades',
      'Citas',
      'Tareas',
      'Facturas',
      'Plan de Sesión',
    ]);
    expect(screen.queryByText('Psicólogo Asignado')).not.toBeInTheDocument();
    expect(screen.getByText('Información Personal')).toBeInTheDocument();
    expect(screen.getByText('Contacto de Emergencia')).toBeInTheDocument();
    expect(screen.getByText('Nota clínica preservada')).toBeInTheDocument();
    expect(screen.getByText('Resumen')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Equipo tratante' }));
    expect(await screen.findByRole('heading', { name: 'Equipo tratante' })).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith('/tenants/tenant-1/patients/patient-1/team');
  });

  it('renders appointment cards from canonical professional and specialty metadata', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Citas' }));

    expect(await screen.findByText('Nutricionista Noa Paz')).toBeInTheDocument();
    expect(screen.getByText('Luis Claro')).toBeInTheDocument();
    expect(screen.getAllByText('Nutrición')).toHaveLength(2);
    expect(screen.queryByText(/Legacy Psych/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dr\. Noa Paz/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dr\. Luis Claro/)).not.toBeInTheDocument();
  });
});
