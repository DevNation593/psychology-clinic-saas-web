import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { UserRole, type Patient, type User } from '@/types';
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useParams: () => ({ id: 'patient-1' }),
}));
vi.mock('@/hooks/usePatients', () => ({
  usePatient: () => ({ data: patient, isLoading: false }),
  useUpdatePatient: vi.fn(),
  useDeletePatient: () => ({ mutate: mocks.removePatient, isPending: false }),
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
    if (url.endsWith('/team') || url.endsWith('/team/eligible') || url.includes('/specialties')) {
      return Promise.resolve([]);
    }
    throw new Error(`Unexpected request: ${url}`);
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
});
