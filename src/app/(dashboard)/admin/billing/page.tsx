'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { FileText, Settings } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BillingCustomerFields } from '@/features/billing/billing-customer-fields';
import {
  EMPTY_BILLING_CUSTOMER, customerFromPatient, hasSavedTaxId, invoiceCustomerErrors, normalizeTaxId,
  type BillingCustomer,
} from '@/features/billing/billing-customer';
import { usePatients } from '@/hooks/usePatients';
import { billingApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { Invoice } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { isAdminRole } from '@/types/guards';

const STATUS_LABELS: Record<Invoice['status'], string> = {
  PENDING: 'Pendiente',
  ISSUED: 'Emitida',
  FAILED: 'Fallida',
  VOIDED: 'Anulada',
};
const STATUS_VARIANTS: Record<Invoice['status'], 'default' | 'outline' | 'destructive' | 'secondary'> = {
  PENDING: 'secondary',
  ISSUED: 'default',
  FAILED: 'destructive',
  VOIDED: 'outline',
};
const INVOICES_KEY = [...QUERY_KEYS.TENANT, 'billing', 'invoices'];
const FIELD_NAMES: Record<string, string> = {
  name: 'nombre',
  taxIdType: 'tipo de identificación',
  taxId: 'número de identificación',
  email: 'correo',
};

const toCents = (value: number) => Math.round(value * 100) / 100;
const money = (value: number | string) => `$${Number(value).toFixed(2)}`;
// Document links come from the invoicing provider; only real web addresses are rendered.
const isWebUrl = (value?: string) => !!value && /^https?:\/\//i.test(value);
const newKey = () => `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function issueErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { code, details, message } = error as {
      code?: string;
      details?: { fields?: unknown };
      message?: string;
    };
    if (code === 'INVOICE_CUSTOMER_INCOMPLETE' && Array.isArray(details?.fields)) {
      const names = details.fields.map((field) => FIELD_NAMES[String(field)] ?? String(field));
      return `Faltan datos del receptor: ${names.join(', ')}.`;
    }
    if (message) return message;
  }
  return 'No fue posible emitir la factura';
}

export default function BillingPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const patients = usePatients();
  const [patientId, setPatientId] = useState('');
  const [customer, setCustomer] = useState<BillingCustomer>(EMPTY_BILLING_CUSTOMER);
  const [saveToPatient, setSaveToPatient] = useState(false);
  const [description, setDescription] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  // The key identifies one attempt at one form content. It survives only an unanswered
  // request (so that retry cannot issue twice) and changes whenever the form changes or the
  // server has answered, because the API replays whatever it stored under a key.
  const idempotencyKey = useRef(newKey());
  const rotateKey = () => {
    idempotencyKey.current = newKey();
  };
  // `isPending` only updates on the next render; this blocks a second click in the same tick.
  const submitting = useRef(false);
  const invoicesQuery = useQuery({ queryKey: INVOICES_KEY, queryFn: () => billingApi.listInvoices() });
  const invoices = invoicesQuery.data ?? [];

  const sortedPatients = useMemo(
    () => [...(patients.data ?? [])].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'es')),
    [patients.data],
  );
  const selectedPatient = sortedPatients.find((item) => item.id === patientId) ?? null;
  const customerErrors = selectedPatient ? invoiceCustomerErrors(customer) : {};
  const customerIsValid = !!selectedPatient && Object.keys(customerErrors).length === 0;

  const selectPatient = (id: string) => {
    rotateKey();
    setPatientId(id);
    const next = (patients.data ?? []).find((item) => item.id === id);
    // Always reload from the record so one patient's payer is never billed under another.
    setCustomer(next ? customerFromPatient(next) : EMPTY_BILLING_CUSTOMER);
    setSaveToPatient(next ? !hasSavedTaxId(next) : false);
  };

  const subtotalAmount = Number(subtotal);
  const rate = taxRate === '' ? 0 : Number(taxRate);
  const amountsAreValid =
    subtotal !== '' && Number.isFinite(subtotalAmount) && subtotalAmount > 0
    && Number.isFinite(rate) && rate >= 0 && rate <= 100;
  // The API expects the tax as an amount, so the percentage is converted here.
  const taxAmount = amountsAreValid ? toCents((subtotalAmount * rate) / 100) : 0;
  const totalAmount = amountsAreValid ? toCents(subtotalAmount + taxAmount) : 0;

  const createInvoice = useMutation({
    mutationFn: () => billingApi.createInvoice({
      patientId,
      subtotal: toCents(subtotalAmount),
      tax: taxAmount,
      description: description.trim(),
      idempotencyKey: idempotencyKey.current,
      saveCustomerToPatient: saveToPatient,
      customer: {
        name: customer.name.trim(),
        taxIdType: customer.taxIdType,
        taxId: normalizeTaxId(customer.taxId),
        email: customer.email.trim(),
        address: customer.address.trim(),
      },
    }),
    onSuccess: (invoice) => {
      if (invoice.status !== 'ISSUED') {
        // The server stored the attempt but the document was not issued; keep the form.
        rotateKey();
        toast.error(`La factura no se emitió: ${invoice.errorMessage || 'inténtalo de nuevo.'}`);
        queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
        return;
      }
      setDescription('');
      setSubtotal('');
      setTaxRate('0');
      selectPatient('');
      toast.success('Factura emitida');
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
      // The patient record may now hold the saved payer.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS });
    },
    onError: (error: unknown) => {
      // Without a response the request may still have gone through, so the key is kept.
      if ((error as { code?: string } | null)?.code !== 'NETWORK_ERROR') rotateKey();
      toast.error(issueErrorMessage(error));
      // A failed attempt is still recorded, so the history is refreshed too.
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
    },
    onSettled: () => {
      submitting.current = false;
    },
  });

  const canSubmit =
    amountsAreValid && customerIsValid && description.trim() !== '' && !createInvoice.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <FileText className="h-7 w-7" />
            Facturación
          </h1>
          <p className="mt-1 text-muted-foreground">
            Emite y consulta los comprobantes electrónicos de este consultorio.
          </p>
        </div>
        {user && isAdminRole(user.role) && (
          <Link href="/admin/settings" className={buttonVariants({ variant: 'outline' })}>
            <Settings className="h-4 w-4" />
            Configurar Faktur
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emitir comprobante</CardTitle>
          <CardDescription>
            Elige el paciente y confirma a nombre de quién sale el comprobante. La configuración de Faktur debe
            estar activa y completa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit || submitting.current) return;
              submitting.current = true;
              createInvoice.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="invoice-patient">Paciente</Label>
              <select
                id="invoice-patient"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:max-w-md"
                value={patientId}
                disabled={patients.isLoading || createInvoice.isPending}
                onChange={(event) => selectPatient(event.target.value)}
              >
                <option value="">Seleccionar paciente</option>
                {sortedPatients.map((item) => (
                  <option key={item.id} value={item.id}>{item.lastName}, {item.firstName}</option>
                ))}
              </select>
              {patients.isLoading && (
                <p role="status" className="text-sm text-muted-foreground">Cargando pacientes...</p>
              )}
              {patients.isError && (
                <p role="alert" className="text-sm text-destructive">No se pudieron cargar los pacientes.</p>
              )}
              {!patients.isLoading && !patients.isError && sortedPatients.length === 0 && (
                <p className="text-sm text-muted-foreground">Registra un paciente para poder facturar.</p>
              )}
            </div>

            {selectedPatient && (
              <fieldset className="space-y-4 rounded-lg border p-4">
                <legend className="px-1 text-sm font-semibold">Facturar a</legend>
                <p className="text-sm text-muted-foreground">
                  Puede ser el paciente u otra persona o empresa que paga. Los cambios aplican a esta factura.
                </p>
                <BillingCustomerFields
                  idPrefix="invoice-customer"
                  value={customer}
                  onChange={(next) => {
                    rotateKey();
                    setCustomer(next);
                  }}
                  errors={customerErrors}
                  disabled={createInvoice.isPending}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={saveToPatient}
                    disabled={createInvoice.isPending}
                    onChange={(event) => {
                      rotateKey();
                      setSaveToPatient(event.target.checked);
                    }}
                  />
                  Guardar en la ficha del paciente
                </label>
              </fieldset>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="invoice-description">Descripción</Label>
                <Input
                  id="invoice-description"
                  required
                  value={description}
                  onChange={(event) => {
                    rotateKey();
                    setDescription(event.target.value);
                  }}
                  placeholder="Consulta general"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-subtotal">Subtotal (USD)</Label>
                <Input
                  id="invoice-subtotal"
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  inputMode="decimal"
                  value={subtotal}
                  onChange={(event) => {
                    rotateKey();
                    setSubtotal(event.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-tax-rate">Impuesto (%)</Label>
                <Input
                  id="invoice-tax-rate"
                  min="0"
                  max="100"
                  step="0.01"
                  type="number"
                  inputMode="decimal"
                  value={taxRate}
                  onChange={(event) => {
                    rotateKey();
                    setTaxRate(event.target.value);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <dl
                role="group"
                aria-label="Resumen del comprobante"
                className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-muted p-3 text-sm"
              >
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="text-right">{money(amountsAreValid ? subtotalAmount : 0)}</dd>
                <dt className="text-muted-foreground">Impuesto</dt>
                <dd className="text-right">{money(taxAmount)}</dd>
                <dt className="font-semibold">Total</dt>
                <dd className="text-right font-semibold">{money(totalAmount)}</dd>
              </dl>
              <Button type="submit" disabled={!canSubmit} loading={createInvoice.isPending}>
                Emitir factura
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprobantes electrónicos</CardTitle>
          <CardDescription>
            Historial de este consultorio. Límite incluido: 50 facturas electrónicas por mes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesQuery.isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">Cargando comprobantes...</p>
          ) : invoicesQuery.isError ? (
            <div role="alert" className="flex flex-col items-center gap-3 py-10 text-sm">
              <p>No se pudieron cargar los comprobantes.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void invoicesQuery.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay comprobantes emitidos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="p-3 font-medium">Fecha</th>
                    <th scope="col" className="p-3 font-medium">Paciente</th>
                    <th scope="col" className="p-3 font-medium">Facturado a</th>
                    <th scope="col" className="p-3 font-medium">Emisor</th>
                    <th scope="col" className="p-3 font-medium">Descripción</th>
                    <th scope="col" className="p-3 text-right font-medium">Total</th>
                    <th scope="col" className="p-3 font-medium">Estado</th>
                    <th scope="col" className="p-3 font-medium">Documentos</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b align-top last:border-0">
                      <td className="whitespace-nowrap p-3">{formatDate(invoice.issueDate, 'dd/MM/yyyy')}</td>
                      <td className="p-3">
                        {invoice.patient ? `${invoice.patient.firstName} ${invoice.patient.lastName}` : '—'}
                      </td>
                      <td className="p-3">
                        <span className="block">{invoice.customerName}</span>
                        {invoice.customerTaxId && (
                          <span className="block text-xs text-muted-foreground">
                            {invoice.customerTaxIdType} {invoice.customerTaxId}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {invoice.issuer ? `${invoice.issuer.firstName} ${invoice.issuer.lastName}` : '—'}
                      </td>
                      <td className="p-3">{invoice.description}</td>
                      <td className="whitespace-nowrap p-3 text-right">{money(invoice.total)}</td>
                      <td className="p-3">
                        <Badge variant={STATUS_VARIANTS[invoice.status] ?? 'outline'}>
                          {STATUS_LABELS[invoice.status] ?? invoice.status}
                        </Badge>
                        {invoice.status === 'FAILED' && invoice.errorMessage && (
                          <p className="mt-1 max-w-xs text-xs text-destructive">{invoice.errorMessage}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        {isWebUrl(invoice.pdfUrl) || isWebUrl(invoice.xmlUrl) ? (
                          <span className="flex gap-3">
                            {isWebUrl(invoice.pdfUrl) && (
                              <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                PDF
                              </a>
                            )}
                            {isWebUrl(invoice.xmlUrl) && (
                              <a href={invoice.xmlUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                XML
                              </a>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
