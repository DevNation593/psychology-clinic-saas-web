'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TemporaryPasswordNoticeProps {
  email: string;
  password: string;
  onDone: () => void;
  title?: string;
}

export function TemporaryPasswordNotice({ email, password, onDone, title = 'Consultorio creado' }: TemporaryPasswordNoticeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>Entrega estas credenciales al titular. La contraseña no se volverá a mostrar.</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="font-semibold">Correo</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt className="font-semibold">Contraseña temporal</dt>
            <dd className="font-mono">{password}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">El titular deberá cambiarla al iniciar sesión.</p>
        <Button type="button" onClick={onDone}>Listo</Button>
      </CardContent>
    </Card>
  );
}
