'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FileText, Settings } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { billingApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { Invoice } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_LABELS: Record<Invoice['status'], string> = {
  PENDING: 'Pendiente',
  ISSUED: 'Emitida',
  FAILED: 'Fallida',
  VOIDED: 'Anulada',
};

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [tax, setTax] = useState('0');
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.TENANT, 'billing', 'invoices'],
    queryFn: billingApi.listInvoices,
  });
  const createInvoice = useMutation({
    mutationFn: () => billingApi.createInvoice({
      subtotal: Number(subtotal),
      tax: Number(tax || 0),
      description,
      idempotencyKey: `manual-${Date.now()}`,
    }),
    onSuccess: () => {
      setDescription('');
      setSubtotal('');
      setTax('0');
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.TENANT, 'billing', 'invoices'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'No fue posible emitir la factura');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Facturación
          </h1>
          <p className="text-muted-foreground mt-1">
            Consulta los comprobantes electrónicos emitidos mediante Faktur.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/settings">
            <Settings className="h-4 w-4 mr-2" />
            Configurar Faktur
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emitir comprobante</CardTitle>
          <CardDescription>La configuración debe estar activa y completa para emitir con Faktur.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            onSubmit={(event) => {
              event.preventDefault();
              createInvoice.mutate();
            }}
          >
            <div className="md:col-span-2">
              <Label htmlFor="invoice-description">Descripción</Label>
              <Input
                id="invoice-description"
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Suscripción mensual"
              />
            </div>
            <div>
              <Label htmlFor="invoice-subtotal">Subtotal</Label>
              <Input
                id="invoice-subtotal"
                required
                min="0"
                step="0.01"
                type="number"
                value={subtotal}
                onChange={(event) => setSubtotal(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="invoice-tax">Impuesto</Label>
              <Input
                id="invoice-tax"
                min="0"
                step="0.01"
                type="number"
                value={tax}
                onChange={(event) => setTax(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={createInvoice.isPending || !description || !subtotal}
              loading={createInvoice.isPending}
            >
              Emitir factura
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprobantes electrónicos</CardTitle>
          <CardDescription>Historial de facturas de este consultorio.</CardDescription>
          <p className="text-sm text-muted-foreground">
            Límite incluido: <strong>50 facturas electrónicas por mes</strong>.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando comprobantes...</p>
          ) : invoices.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay comprobantes emitidos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Fecha</th>
                    <th className="p-3 font-medium">Cliente</th>
                    <th className="p-3 font-medium">Descripción</th>
                    <th className="p-3 font-medium text-right">Total</th>
                    <th className="p-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b last:border-0">
                      <td className="p-3">{formatDate(invoice.issueDate, 'dd/MM/yyyy')}</td>
                      <td className="p-3">{invoice.customerName}</td>
                      <td className="p-3">{invoice.description}</td>
                      <td className="p-3 text-right">${Number(invoice.total).toFixed(2)}</td>
                      <td className="p-3">
                        <Badge variant={invoice.status === 'ISSUED' ? 'default' : 'outline'}>
                          {STATUS_LABELS[invoice.status]}
                        </Badge>
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