'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Settings } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { billingApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { Invoice } from '@/types';
import { formatDate } from '@/lib/utils';

const STATUS_LABELS: Record<Invoice['status'], string> = {
  PENDING: 'Pendiente',
  ISSUED: 'Emitida',
  FAILED: 'Fallida',
  VOIDED: 'Anulada',
};

export default function BillingPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.TENANT, 'billing', 'invoices'],
    queryFn: billingApi.listInvoices,
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
          <CardTitle>Comprobantes electrónicos</CardTitle>
          <CardDescription>Historial de facturas de este consultorio.</CardDescription>
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