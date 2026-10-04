import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { TenantType, type PlanCatalog, type Tenant } from '@/types';
import contract from './plan-catalog.contract.json';
import { PlanCatalogSection } from './plan-catalog-section';

const api = vi.hoisted(() => ({
  getPlans: vi.fn(),
  getCurrent: vi.fn(),
  getPayments: vi.fn(),
  upgrade: vi.fn(),
  downgrade: vi.fn(),
}));

vi.mock('@/lib/api/endpoints', () => ({ subscriptionApi: api }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const catalog = contract as PlanCatalog;

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PlanCatalogSection />
    </QueryClientProvider>,
  );
}

const card = (planType: string) => screen.findByTestId(`plan-${planType}`);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    tenant: { id: 'tenant-1', tenantType: TenantType.CLINIC } as Tenant,
  });
  api.getPlans.mockResolvedValue(catalog);
  api.getCurrent.mockResolvedValue({ apiPlanType: 'CLINIC_BASIC' });
  api.getPayments.mockResolvedValue([]);
  api.upgrade.mockResolvedValue({ success: true, message: 'Solicitud registrada.' });
  api.downgrade.mockResolvedValue({ success: true, message: 'Cambio programado.' });
});

describe('PlanCatalogSection', () => {
  it('shows the prices and limits the API returns, not fixed ones', async () => {
    api.getPlans.mockResolvedValue({
      ...catalog,
      plans: catalog.plans.map((plan) =>
        plan.planType === 'CLINIC_PRO'
          ? { ...plan, basePrice: 245, maxActivePatients: 777, storageGB: 8 }
          : plan,
      ),
    });
    renderSection();

    const pro = within(await card('CLINIC_PRO'));
    expect(pro.getByText('$245')).toBeInTheDocument();
    expect(pro.getByText('777')).toBeInTheDocument();
    expect(pro.getByText('8 GB')).toBeInTheDocument();

    const basic = within(await card('CLINIC_BASIC'));
    expect(basic.getByText('$99')).toBeInTheDocument();
    expect(basic.getByText('150')).toBeInTheDocument();
    expect(basic.getAllByText('Plan Actual').length).toBeGreaterThan(0);
  });

  it('offers only clinic plans to a clinic account and has no annual prices', async () => {
    renderSection();

    await card('CLINIC_BASIC');
    expect(screen.queryByTestId('plan-PERSONAL_PRO')).not.toBeInTheDocument();
    expect(screen.queryByTestId('plan-TRIAL')).not.toBeInTheDocument();
    expect(screen.queryByText(/anual/i)).not.toBeInTheDocument();
  });

  it('lets an individual account see both groups', async () => {
    useAuthStore.setState({
      tenant: { id: 'tenant-1', tenantType: TenantType.PERSONAL } as Tenant,
    });
    api.getCurrent.mockResolvedValue({ apiPlanType: 'PERSONAL_BASIC' });
    renderSection();

    expect(within(await card('PERSONAL_PRO')).getByText('$59')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Empresarial' }));
    expect(within(await card('CLINIC_PRO')).getByText('$199')).toBeInTheDocument();
  });

  it('requests an upgrade with the API plan name and says it waits for payment', async () => {
    renderSection();

    fireEvent.click(
      within(await card('CLINIC_PRO')).getByRole('button', { name: /Solicitar mejora/ }),
    );
    expect(screen.getByText(/no cambia hasta que confirmemos el pago/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(api.upgrade).toHaveBeenCalledWith({ newPlan: 'CLINIC_PRO' }));
    expect(api.downgrade).not.toHaveBeenCalled();
  });

  it('schedules a lower plan as a downgrade', async () => {
    api.getCurrent.mockResolvedValue({ apiPlanType: 'CLINIC_PRO' });
    renderSection();

    fireEvent.click(
      within(await card('CLINIC_BASIC')).getByRole('button', { name: 'Cambiar a este plan' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(api.downgrade).toHaveBeenCalledWith({ newPlan: 'CLINIC_BASIC' }));
    expect(api.upgrade).not.toHaveBeenCalled();
  });

  it('shows a pending payment and keeps settled ones out', async () => {
    api.getPayments.mockResolvedValue([
      {
        id: 'p1',
        kind: 'PLAN_UPGRADE',
        status: 'PENDING',
        amount: '50.00',
        currency: 'USD',
        targetPlan: 'CLINIC_PRO',
        periodStart: null,
        periodEnd: null,
        expiresAt: '2026-10-23T12:00:00.000Z',
        createdAt: '2026-10-16T12:00:00.000Z',
      },
      {
        id: 'p0',
        kind: 'PLAN_UPGRADE',
        status: 'CONFIRMED',
        amount: '99.00',
        currency: 'USD',
        targetPlan: 'CLINIC_BASIC',
        periodStart: null,
        periodEnd: null,
        expiresAt: null,
        createdAt: '2026-09-16T12:00:00.000Z',
      },
    ]);
    renderSection();

    expect(
      await screen.findByText('Mejora a Empresarial Pro pendiente de pago'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Importe: \$50 USD/)).toBeInTheDocument();
    expect(screen.queryByText(/Empresarial Básico pendiente/)).not.toBeInTheDocument();
  });
});
