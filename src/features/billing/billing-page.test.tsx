import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import BillingPage from '@/app/(dashboard)/admin/billing/page';
import { useAuthStore } from '@/store/authStore';
import { UserRole, type Invoice, type User } from '@/types';

const api = vi.hoisted(() => ({ listInvoices: vi.fn(), createInvoice: vi.fn() }));
vi.mock('@/lib/api/endpoints', () => ({
  billingApi: { listInvoices: api.listInvoices, createInvoice: api.createInvoice },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'invoice-1',
    status: 'ISSUED',
    issueDate: '2026-10-01T15:00:00.000Z',
    customerName: 'Centro Vida',
    description: 'Consulta',
    subtotal: 100,
    tax: 15,
    total: 115,
    ...overrides,
  };
}

function renderPage(role: UserRole = UserRole.ADMIN) {
  useAuthStore.setState({ user: { id: 'user-1', role, tenantId: 'tenant-1' } as User });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BillingPage />
    </QueryClientProvider>,
  );
}

function fillForm(subtotal: string, taxRate: string, description = 'Consulta general') {
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: description } });
  fireEvent.change(screen.getByLabelText('Subtotal (USD)'), { target: { value: subtotal } });
  fireEvent.change(screen.getByLabelText('Impuesto (%)'), { target: { value: taxRate } });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listInvoices.mockResolvedValue([]);
  api.createInvoice.mockResolvedValue(invoice({}));
});

describe('BillingPage form', () => {
  it('shows the tax amount and total before issuing', () => {
    renderPage();
    fillForm('100', '15');
    const summary = screen.getByRole('group', { name: 'Resumen del comprobante' });
    expect(within(summary).getByText('$100.00')).toBeInTheDocument();
    expect(within(summary).getByText('$15.00')).toBeInTheDocument();
    expect(within(summary).getByText('$115.00')).toBeInTheDocument();
  });

  it('sends the tax as an amount rounded to cents', async () => {
    renderPage();
    fillForm('19.99', '15');
    fireEvent.click(screen.getByRole('button', { name: 'Emitir factura' }));

    await waitFor(() => expect(api.createInvoice).toHaveBeenCalled());
    expect(api.createInvoice.mock.calls[0][0]).toMatchObject({
      subtotal: 19.99,
      tax: 3,
      description: 'Consulta general',
    });
  });

  it('confirms a successful issue and clears the form', async () => {
    renderPage();
    fillForm('100', '15');
    fireEvent.click(screen.getByRole('button', { name: 'Emitir factura' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Factura emitida'));
    expect(screen.getByLabelText('Descripción')).toHaveValue('');
    expect(screen.getByLabelText('Subtotal (USD)')).toHaveValue(null);
  });

  it('keeps the form and reports the reason when issuing fails', async () => {
    api.createInvoice.mockRejectedValue(new Error('La configuración de Faktur está incompleta.'));
    renderPage();
    fillForm('100', '15');
    fireEvent.click(screen.getByRole('button', { name: 'Emitir factura' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('La configuración de Faktur está incompleta.'));
    expect(screen.getByLabelText('Descripción')).toHaveValue('Consulta general');
  });

  it.each([
    ['', '15'],
    ['0', '15'],
    ['-5', '15'],
    ['100', '-1'],
    ['100', '101'],
  ])('does not allow issuing with subtotal "%s" and tax rate "%s"', (subtotal, taxRate) => {
    renderPage();
    fillForm(subtotal, taxRate);
    expect(screen.getByRole('button', { name: 'Emitir factura' })).toBeDisabled();
  });

  it('states that the receipt is issued in the name of the practice', () => {
    renderPage();
    expect(screen.getByText(/se emite a nombre del consultorio/)).toBeInTheDocument();
  });
});

describe('BillingPage settings link', () => {
  it('is a plain link for administrators', () => {
    renderPage(UserRole.ADMIN);
    const link = screen.getByRole('link', { name: 'Configurar Faktur' });
    expect(link).toHaveAttribute('href', '/admin/settings');
    expect(link.closest('button')).toBeNull();
  });

  it('is hidden from non-administrators', () => {
    renderPage(UserRole.PROFESIONAL);
    expect(screen.queryByRole('link', { name: 'Configurar Faktur' })).not.toBeInTheDocument();
  });
});

describe('BillingPage history', () => {
  it('links to the PDF and XML of an issued invoice', async () => {
    api.listInvoices.mockResolvedValue([
      invoice({ pdfUrl: 'https://files.example.com/a.pdf', xmlUrl: 'https://files.example.com/a.xml' }),
    ]);
    renderPage();
    const pdf = await screen.findByRole('link', { name: 'PDF' });
    expect(pdf).toHaveAttribute('href', 'https://files.example.com/a.pdf');
    expect(pdf).toHaveAttribute('target', '_blank');
    expect(pdf).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'XML' })).toHaveAttribute('href', 'https://files.example.com/a.xml');
  });

  it('shows why a failed invoice failed', async () => {
    api.listInvoices.mockResolvedValue([
      invoice({ status: 'FAILED', errorMessage: 'RUC del emisor no autorizado' }),
    ]);
    renderPage();
    expect(await screen.findByText('RUC del emisor no autorizado')).toBeInTheDocument();
    expect(screen.getByText('Fallida')).toBeInTheDocument();
  });

  it('offers no document links when the invoice has none or they are not web addresses', async () => {
    api.listInvoices.mockResolvedValue([
      invoice({ id: 'a' }),
      invoice({ id: 'b', pdfUrl: 'javascript:alert(1)', xmlUrl: '' }),
    ]);
    renderPage();
    await screen.findAllByText('Centro Vida');
    expect(screen.queryByRole('link', { name: 'PDF' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'XML' })).not.toBeInTheDocument();
  });

  it('offers a retry when the history cannot be loaded', async () => {
    api.listInvoices.mockRejectedValueOnce(new Error('sin conexión'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(api.listInvoices).toHaveBeenCalledTimes(2));
  });
});
