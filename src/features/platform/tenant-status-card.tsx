'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReactivateTenant, useSuspendTenant } from '@/hooks/usePlatform';
import { suspendReasonSchema } from '@/lib/validations/schemas';
import type { ApiSubscriptionStatus, PlatformTenantDetail } from '@/types';
import { tenantStatusLabel } from './labels';

interface TenantStatusCardProps {
  tenantId: string;
  tenant: PlatformTenantDetail['tenant'];
  status: ApiSubscriptionStatus;
}

export function TenantStatusCard({ tenantId, tenant, status }: TenantStatusCardProps) {
  const suspend = useSuspendTenant(tenantId);
  const reactivate = useReactivateTenant(tenantId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setReason('');
    setError(null);
    setOpen(true);
  }

  async function confirmSuspend() {
    const parsed = suspendReasonSchema.safeParse(reason);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    try {
      await suspend.mutateAsync(parsed.data);
      setOpen(false);
    } catch (failure) {
      const message = (failure as { message?: unknown } | null)?.message;
      setError(typeof message === 'string' && message ? message : 'No se pudo suspender el consultorio');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg font-semibold">{tenantStatusLabel({ isActive: tenant.isActive, status })}</p>
        {tenant.isActive ? (
          <p className="text-sm text-muted-foreground">Al suspenderlo, nadie del consultorio podrá iniciar sesión.</p>
        ) : (
          <p className="text-sm text-muted-foreground">El consultorio está suspendido y nadie puede iniciar sesión.</p>
        )}
        {reactivate.isError && <p role="alert" className="text-sm text-destructive">{reactivate.error.message}</p>}
        {tenant.isActive ? (
          <Button type="button" variant="destructive" onClick={openDialog}>Suspender</Button>
        ) : (
          <Button type="button" loading={reactivate.isPending} onClick={() => reactivate.mutate()}>Reactivar</Button>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Suspender consultorio?</DialogTitle>
            <DialogDescription>{tenant.name} quedará sin acceso hasta que lo reactives. El motivo queda registrado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Motivo de la suspensión</Label>
            <Input id="suspend-reason" value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={!!error} aria-describedby={error ? 'suspend-reason-error' : undefined} />
            {error && <p id="suspend-reason-error" role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" loading={suspend.isPending} onClick={() => void confirmSuspend()}>Suspender consultorio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
