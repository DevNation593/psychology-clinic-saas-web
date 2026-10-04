'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetMasterPassword } from '@/hooks/usePlatform';
import { temporaryPasswordSchema } from '@/lib/validations/schemas';
import type { PlatformTenantDetail } from '@/types';
import { generatePassword } from './generate-password';
import { TemporaryPasswordNotice } from './temporary-password-notice';

interface TenantMasterCardProps {
  tenantId: string;
  master: PlatformTenantDetail['master'];
}

/** The temporary password lives only here, in component state, until the admin dismisses the notice. */
interface IssuedPassword {
  email: string;
  password: string;
}

export function TenantMasterCard({ tenantId, master }: TenantMasterCardProps) {
  const reset = useResetMasterPassword(tenantId);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedPassword | null>(null);

  function openDialog() {
    setPassword('');
    setShowPassword(false);
    setError(null);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setPassword('');
  }

  async function submit() {
    if (!master) return;
    const parsed = temporaryPasswordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    try {
      await reset.mutateAsync(password);
      setIssued({ email: master.email, password });
      closeDialog();
    } catch (failure) {
      const message = (failure as { message?: unknown } | null)?.message;
      setError(typeof message === 'string' && message ? message : 'No se pudo restablecer la contraseña');
    } finally {
      reset.reset(); // drops the mutation (and its variables) from the mutation cache
    }
  }

  if (issued) {
    return (
      <TemporaryPasswordNotice
        title="Contraseña restablecida"
        email={issued.email}
        password={issued.password}
        onDone={() => setIssued(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Titular de la cuenta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {master ? (
          <>
            <dl className="space-y-2">
              <div>
                <dt className="font-semibold">Nombre</dt>
                <dd>{master.firstName} {master.lastName}</dd>
              </div>
              <div>
                <dt className="font-semibold">Correo</dt>
                <dd>{master.email}</dd>
              </div>
            </dl>
            {master.mustChangePassword && (
              <p className="text-sm text-muted-foreground">El titular aún debe cambiar su contraseña temporal.</p>
            )}
            <Button type="button" variant="outline" onClick={openDialog}>Restablecer contraseña</Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Este consultorio no tiene un titular asignado.</p>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(next) => { if (!next) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva contraseña temporal</DialogTitle>
            <DialogDescription>El titular deberá cambiarla al iniciar sesión. Solo se mostrará una vez.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-password">Contraseña temporal</Label>
            <div className="flex gap-2">
              <Input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>Generar</Button>
              <Button type="button" variant="outline" onClick={() => setShowPassword((shown) => !shown)}>{showPassword ? 'Ocultar' : 'Mostrar'}</Button>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button type="button" loading={reset.isPending} onClick={() => void submit()}>Restablecer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
