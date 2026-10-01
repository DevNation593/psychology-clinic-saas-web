'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FileText, Settings } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const toCents = (value: number) => Math.round(value * 100) / 100;
const money = (value: number | string) => `$${Number(value).toFixed(2)}`;
// Document links come from the invoicing provider; only real web addresses are rendered.
const isWebUrl = (value?: string) => !!value && /^https?:\/\//i.test(value);

export default function BillingPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [description, setDescription] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const invoicesQuery = useQuery({ queryKey: INVOICES_KEY, queryFn: billingApi.listInvoices });
  const invoices = invoicesQuery.data ?? [];

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
      subtotal: toCents(subtotalAmount),
      tax: taxAmount,
      description: description.trim(),
      idempotencyKey: `manual-${Date.now()}`,
    }),
    onSuccess: () => {
      setDescription('');
      setSubtotal('');
      setTaxRate('0');
      toast.success('Factura emitida');
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'No fue posible emitir la factura');
      // A failed attempt is still recorded, so the history is refreshed too.
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
    },
  });

  const canSubmit = amountsAreValid && description.trim() !== '' && !createInvoice.isPending;

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
            El comprobante se emite a nombre del consultorio, con los datos fiscales de su configuración. La
            configuración de Faktur debe estar activa y completa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) createInvoice.mutate();
            }}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="invoice-description">Descripción</Label>
                <Input
                  id="invoice-description"
                  required
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
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
                  onChange={(event) => setSubtotal(event.target.value)}
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
                  onChange={(event) => setTaxRate(event.target.value)}
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
                    <th scope="col" className="p-3 font-medium">Cliente</th>
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
                      <td className="p-3">{invoice.customerName}</td>
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
