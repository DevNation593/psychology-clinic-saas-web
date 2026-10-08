import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminSettingsPage from '@/app/(dashboard)/admin/settings/page';
import { useAuthStore } from '@/store/authStore';
import { UserRole, type User } from '@/types';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiClient: http }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/features/admin/branches/branches-manager', () => ({ BranchesManager: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Settings as the API returns them.
const storedSettings = {
  legalName: 'Clínica Integral S.A.',
  taxIdentificationType: 'RUC',
  taxIdentificationNumber: '1790012345001',
  fakturApiKey: '********1234',
  fakturEstablishment: '001',
  fakturEmissionPoint: '002',
  fakturNextSequential: 17,
  fakturEnabled: true,
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  defaultAppointmentDuration: 60,
  reminderRules: ['24h'],
  reminderEnabled: true,
  timezone: 'America/Bogota',
  locale: 'es',
};

function renderPage() {
  useAuthStore.setState({
    user: { id: 'user-1', role: UserRole.MASTER, tenantId: 'tenant-1' } as User,
    tenant: { id: 'tenant-1' } as ReturnType<typeof useAuthStore.getState>['tenant'],
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><AdminSettingsPage /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockResolvedValue(storedSettings);
  http.patch.mockImplementation(async (_url: string, body: unknown) => body);
});

describe('Faktur connection in the clinic settings', () => {
  it('asks for the key and numbering of the clinic, not for the URL, path or environment', async () => {
    renderPage();

    expect(await screen.findByLabelText('API key')).toBeInTheDocument();
    expect(screen.getByLabelText('Establecimiento')).toHaveValue('001');
    expect(screen.getByLabelText('Punto de emisión')).toHaveValue('002');
    expect(screen.queryByLabelText('URL de Faktur')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ruta de emisión')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ambiente')).not.toBeInTheDocument();
  });

  it('saves without sending a URL, path or environment', async () => {
    renderPage();

    fireEvent.change(await screen.findByLabelText('Establecimiento'), { target: { value: '003' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/ }));

    await waitFor(() => expect(http.patch).toHaveBeenCalledTimes(1));
    const body = http.patch.mock.calls[0][1];
    expect(body).toMatchObject({ fakturApiKey: '********1234', fakturEstablishment: '003' });
    expect(body).not.toHaveProperty('fakturApiUrl');
    expect(body).not.toHaveProperty('fakturInvoicePath');
    expect(body).not.toHaveProperty('fakturEnvironment');
  });
});
