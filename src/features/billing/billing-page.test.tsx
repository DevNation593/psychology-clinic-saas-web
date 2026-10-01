import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import BillingPage from '@/app/(dashboard)/admin/billing/page';
import { useAuthStore } from '@/store/authStore';
import { UserRole, type Invoice, type Patient, type User } from '@/types';

const api = vi.hoisted(() => ({ listInvoices: vi.fn(), createInvoice: vi.fn() }));
const patients = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false, isError: false }));
vi.mock('@/lib/api/endpoints', () => ({
  billingApi: { listInvoices: api.listInvoices, createInvoice: api.createInvoice },
}));
vi.mock('@/hooks/usePatients', () => ({ usePatients: () => patients }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const patient = (overrides: Partial<Patient>): Patient => ({
  id: 'patient-1', tenantId: 'tenant-1', firstName: 'Ana', lastName: 'Vega', email: 'ana@example.com',
  billingName: null, billingTaxIdType: null, billingTaxId: null, billingEmail: null, billingAddress: null,
  ...overrides,
} as Patient);
const withPayer = patient({
  id: 'patient-2', firstName: 'Niño', lastName: 'Mora', email: null,
  billingName: 'Rosa Mora', billingTaxIdType: 'CEDULA', billingTaxId: '0912345678',
  billingEmail: 'rosa@payer.test', billingAddress: 'Calle 2',
});
const withoutPayer = patient({});

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'invoice-1', status: 'ISSUED', issueDate: '2026-10-01T15:00:00.000Z',
    customerName: 'Rosa Mora', customerEmail: 'rosa@payer.test', customerTaxIdType: 'CEDULA',
    customerTaxId: '0912345678', description: 'Consulta', subtotal: 100, tax: 15, total: 115,
    patient: { id: 'patient-2', firstName: 'Niño', lastName: 'Mora' },
    ...overrides,
  };
}

function renderPage(role: UserRole = UserRole.MASTER) {
  useAuthStore.setState({ user: { id: 'user-1', role, tenantId: 'tenant-1' } as User });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><BillingPage /></QueryClientProvider>);
}

const choosePatient = (id: string) =>
  fireEvent.change(screen.getByLabelText('Paciente'), { target: { value: id } });
function fillAmounts(subtotal = '100', taxRate = '15', description = 'Consulta general') {
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: description } });
  fireEvent.change(screen.getByLabelText('Subtotal (USD)'), { target: { value: subtotal } });
  fireEvent.change(screen.getByLabelText('Impuesto (%)'), { target: { value: taxRate } });
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Emitir factura' }));

beforeEach(() => {
  vi.clearAllMocks();
  patients.data = [withPayer, withoutPayer];
  patients.isLoading = false;
  patients.isError = false;
  api.listInvoices.mockResolvedValue([]);
  api.createInvoice.mockResolvedValue(invoice({}));
});

describe('BillingPage patient selection', () => {
  it('lists patients by last name and asks for one before showing the payer', () => {
    renderPage();
    const options = within(screen.getByLabelText('Paciente')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Seleccionar paciente', 'Mora, Niño', 'Vega, Ana']);
    expect(screen.queryByRole('group', { name: 'Facturar a' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emitir factura' })).toBeDisabled();
  });

  it('fills the payer from the patient record', () => {
    renderPage();
    choosePatient('patient-2');
    const payer = screen.getByRole('group', { name: 'Facturar a' });
    expect(within(payer).getByLabelText('Nombre o razón social')).toHaveValue('Rosa Mora');
    expect(within(payer).getByLabelText('Tipo de identificación')).toHaveValue('CEDULA');
    expect(within(payer).getByLabelText('Número de identificación')).toHaveValue('0912345678');
    expect(within(payer).getByLabelText('Correo del receptor')).toHaveValue('rosa@payer.test');
    expect(screen.getByLabelText('Guardar en la ficha del paciente')).not.toBeChecked();
  });

  it('starts from the patient name and offers to save when no identification is stored', () => {
    renderPage();
    choosePatient('patient-1');
    expect(screen.getByLabelText('Nombre o razón social')).toHaveValue('Ana Vega');
    expect(screen.getByLabelText('Número de identificación')).toHaveValue('');
    expect(screen.getByLabelText('Guardar en la ficha del paciente')).toBeChecked();
  });

  it('reloads the payer when another patient is chosen, discarding edits', () => {
    renderPage();
    choosePatient('patient-2');
    fireEvent.change(screen.getByLabelText('Nombre o razón social'), { target: { value: 'Editado' } });
    choosePatient('patient-1');
    expect(screen.getByLabelText('Nombre o razón social')).toHaveValue('Ana Vega');
    expect(screen.getByLabelText('Número de identificación')).toHaveValue('');
  });
});

describe('BillingPage issuing', () => {
  it('sends the patient, the payer and the tax as an amount', async () => {
    renderPage();
    choosePatient('patient-2');
    fillAmounts('19.99', '15');
    submit();

    await waitFor(() => expect(api.createInvoice).toHaveBeenCalled());
    expect(api.createInvoice.mock.calls[0][0]).toMatchObject({
      patientId: 'patient-2',
      subtotal: 19.99,
      tax: 3,
      description: 'Consulta general',
      saveCustomerToPatient: false,
      customer: {
        name: 'Rosa Mora', taxIdType: 'CEDULA', taxId: '0912345678',
        email: 'rosa@payer.test', address: 'Calle 2',
      },
    });
  });

  it('accepts an identification typed with separators and sends it clean', async () => {
    renderPage();
    choosePatient('patient-1');
    fireEvent.change(screen.getByLabelText('Tipo de identificación'), { target: { value: 'CEDULA' } });
    fireEvent.change(screen.getByLabelText('Número de identificación'), { target: { value: '171 234-5678' } });
    fillAmounts();
    submit();

    await waitFor(() => expect(api.createInvoice).toHaveBeenCalled());
    expect(api.createInvoice.mock.calls[0][0]).toMatchObject({
      patientId: 'patient-1',
      saveCustomerToPatient: true,
      customer: { name: 'Ana Vega', taxIdType: 'CEDULA', taxId: '1712345678' },
    });
  });

  it('blocks issuing and explains what is missing while the payer is incomplete', () => {
    renderPage();
    choosePatient('patient-1');
    fillAmounts();
    expect(screen.getByRole('button', { name: 'Emitir factura' })).toBeDisabled();
    expect(screen.getByText('Selecciona el tipo de identificación.')).toBeInTheDocument();
    expect(screen.getByText('Escribe el número de identificación.')).toBeInTheDocument();
  });

  it('issues once when the button is clicked twice', async () => {
    let finish!: (value: Invoice) => void;
    api.createInvoice.mockReturnValue(new Promise<Invoice>((resolve) => { finish = resolve; }));
    renderPage();
    choosePatient('patient-2');
    fillAmounts();
    submit();
    submit();

    await waitFor(() => expect(api.createInvoice).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Emitir factura' })).toBeDisabled();
    finish(invoice({}));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Factura emitida'));
    expect(api.createInvoice).toHaveBeenCalledTimes(1);
  });

  const sentKeys = () => api.createInvoice.mock.calls.map(([body]) => body.idempotencyKey);

  it('does not report success when the server answers with an invoice that was not issued', async () => {
    api.createInvoice.mockResolvedValue(invoice({ status: 'FAILED', errorMessage: 'Faktur no disponible' }));
    renderPage();
    choosePatient('patient-2');
    fillAmounts();
    submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('La factura no se emitió: Faktur no disponible'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Paciente')).toHaveValue('patient-2');
    expect(screen.getByLabelText('Descripción')).toHaveValue('Consulta general');
  });

  it('uses a new key after the server rejects a request, so a retry is a real new attempt', async () => {
    api.createInvoice.mockRejectedValueOnce({ status: 502, message: 'Faktur no disponible' });
    renderPage();
    choosePatient('patient-2');
    fillAmounts();
    submit();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Faktur no disponible'));
    submit();

    await waitFor(() => expect(api.createInvoice).toHaveBeenCalledTimes(2));
    const [first, second] = sentKeys();
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it('keeps the key when no response arrived, so the retry cannot issue twice', async () => {
    api.createInvoice.mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'No se recibió respuesta del servidor.' });
    renderPage();
    choosePatient('patient-2');
    fillAmounts();
    submit();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    submit();

    await waitFor(() => expect(api.createInvoice).toHaveBeenCalledTimes(2));
    const [first, second] = sentKeys();
    expect(second).toBe(first);
  });

  it('uses a new key when the form changes after an unanswered request', async () => {
    api.createInvoice.mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'No se recibió respuesta del servidor.' });
    renderPage();
    choosePatient('patient-2');
    fillAmounts();
    submit();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Subtotal (USD)'), { target: { value: '250' } });
    submit();

    await waitFor(() => expect(api.createInvoice).toHaveBeenCalledTimes(2));
    const [first, second] = sentKeys();
    expect(second).not.toBe(first);
  });

  it('uses a new key for the next invoice after a success', async () => {
    renderPage();
    choosePatient('patient-2');
    fillAmounts();
    submit();
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    choosePatient('patient-2');
    fillAmounts();
    submit();

    await waitFor(() => expect(api.createInvoice).toHaveBeenCalledTimes(2));
    const [first, second] = sentKeys();
    expect(second).not.toBe(first);
  });

  it('sends an empty address when the user clears it, so this invoice goes out without one', async () => {
    renderPage();
    choosePatient('patient-2');
    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: '' } });
    fillAmounts();
    submit();

    await waitFor(() => expect(api.createInvoice).toHaveBeenCalled());
    expect(api.createInvoice.mock.calls[0][0].customer.address).toBe('');
  });

  it('confirms success, clears the form and keeps it on failure', async () => {
    renderPage();
    choosePatient('patient-2');
    fillAmounts();
    submit();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Factura emitida'));
    expect(screen.getByLabelText('Paciente')).toHaveValue('');
    expect(screen.getByLabelText('Descripción')).toHaveValue('');

    api.createInvoice.mockRejectedValue(new Error('Faktur no disponible'));
    choosePatient('patient-2');
    fillAmounts();
    submit();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Faktur no disponible'));
    expect(screen.getByLabelText('Paciente')).toHaveValue('patient-2');
    expect(screen.getByLabelText('Descripción')).toHaveValue('Consulta general');
  });

  it('names the missing payer data reported by the API', async () => {
    api.createInvoice.mockRejectedValue({
      code: 'INVOICE_CUSTOMER_INCOMPLETE', message: 'x', details: { fields: ['taxId', 'email'] },
    });
    renderPage();
    choosePatient('patient-2');
    fillAmounts();
    submit();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Faltan datos del receptor: número de identificación, correo.',
    ));
  });

  it('shows the total before issuing and no longer says the clinic is the recipient', () => {
    renderPage();
    choosePatient('patient-2');
    fillAmounts('100', '15');
    const summary = screen.getByRole('group', { name: 'Resumen del comprobante' });
    expect(within(summary).getByText('$115.00')).toBeInTheDocument();
    expect(screen.queryByText(/a nombre del consultorio/)).not.toBeInTheDocument();
  });
});

describe('BillingPage patients list states', () => {
  it('explains when there are no patients to invoice', () => {
    patients.data = [];
    renderPage();
    expect(screen.getByText('Registra un paciente para poder facturar.')).toBeInTheDocument();
  });

  it('reports a failure to load patients', () => {
    patients.data = undefined as unknown as unknown[];
    patients.isError = true;
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los pacientes.');
  });
});

describe('BillingPage history', () => {
  it('shows the patient and the payer of each invoice', async () => {
    api.listInvoices.mockResolvedValue([invoice({})]);
    renderPage();
    const row = (await screen.findByText('Rosa Mora')).closest('tr')!;
    expect(within(row).getByText('Niño Mora')).toBeInTheDocument();
    expect(within(row).getByText('CEDULA 0912345678')).toBeInTheDocument();
  });

  it('shows a dash for invoices issued before patients were linked', async () => {
    api.listInvoices.mockResolvedValue([invoice({ patient: null, customerName: 'Consultorio Demo' })]);
    renderPage();
    const row = (await screen.findByText('Consultorio Demo')).closest('tr')!;
    expect(within(row).getAllByRole('cell')[1]).toHaveTextContent('—');
  });

  it('keeps the failure reason, document links, retry and settings link', async () => {
    api.listInvoices.mockResolvedValue([
      invoice({ status: 'FAILED', errorMessage: 'RUC del emisor no autorizado' }),
      invoice({ id: 'b', pdfUrl: 'https://files.example.com/a.pdf', xmlUrl: 'javascript:alert(1)' }),
    ]);
    renderPage();
    expect(await screen.findByText('RUC del emisor no autorizado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PDF' })).toHaveAttribute('href', 'https://files.example.com/a.pdf');
    expect(screen.queryByRole('link', { name: 'XML' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurar Faktur' })).toHaveAttribute('href', '/admin/settings');
  });
});
