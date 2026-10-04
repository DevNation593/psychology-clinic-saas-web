'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdatePlatformTenant } from '@/hooks/usePlatform';
import { updatePlatformTenantSchema } from '@/lib/validations/schemas';
import type { PlatformTenantDetail } from '@/types';

type AccountValues = z.infer<typeof updatePlatformTenantSchema>;

const FIELDS: { name: keyof AccountValues; label: string; type?: string }[] = [
  { name: 'name', label: 'Nombre del consultorio' },
  { name: 'email', label: 'Correo del consultorio', type: 'email' },
  { name: 'phone', label: 'Teléfono', type: 'tel' },
  { name: 'address', label: 'Dirección' },
];

export function TenantAccountCard({ tenant }: { tenant: PlatformTenantDetail['tenant'] }) {
  const update = useUpdatePlatformTenant(tenant.id);
  const { register, handleSubmit, formState: { errors } } = useForm<AccountValues>({
    resolver: zodResolver(updatePlatformTenantSchema),
    values: { name: tenant.name, email: tenant.email, phone: tenant.phone ?? '', address: tenant.address ?? '' },
  });

  const submit = handleSubmit((values) => {
    update.reset();
    update.mutate(values);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del consultorio</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
          {FIELDS.map(({ name, label, type }) => (
            <div key={name} className="space-y-2">
              <Label htmlFor={`account-${name}`}>{label}</Label>
              <Input
                id={`account-${name}`}
                type={type ?? 'text'}
                aria-invalid={!!errors[name]}
                aria-describedby={errors[name] ? `account-${name}-error` : undefined}
                {...register(name)}
              />
              {errors[name] && <p id={`account-${name}-error`} role="alert" className="text-sm text-destructive">{errors[name]?.message}</p>}
            </div>
          ))}
          {update.isError && <p role="alert" className="text-sm text-destructive">{update.error.message}</p>}
          {update.isSuccess && <p role="status" className="text-sm text-muted-foreground">Datos guardados.</p>}
          <Button type="submit" loading={update.isPending}>Guardar datos</Button>
        </form>
      </CardContent>
    </Card>
  );
}
