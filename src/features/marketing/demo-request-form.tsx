'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resolveContactChannel, type ContactInfo } from '@/content/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  TEAM_SIZES, buildDemoMessage, demoRequestSchema, mailtoUrl, whatsappUrl, type DemoRequest,
} from './demo-request';

export function DemoRequestForm({ contact }: { contact: ContactInfo }) {
  const router = useRouter();
  const channel = resolveContactChannel(contact);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<DemoRequest>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: { name: '', clinic: '', email: '', phone: '', teamSize: '', message: '', acceptPrivacy: false },
  });

  if (channel === 'none') {
    return (
      <p role="status" className="rounded-md border bg-muted p-4 text-sm">
        Pronto habilitaremos el formulario de solicitud de demo.
      </p>
    );
  }

  const onSubmit = (data: DemoRequest) => {
    const message = buildDemoMessage(data);
    if (channel === 'email') {
      window.open(mailtoUrl(contact.email, 'Solicitud de demo', message), '_self');
      router.push('/gracias');
      return;
    }
    const url = whatsappUrl(contact.whatsappNumber, message);
    const opened = window.open(url, '_blank');
    if (!opened) {
      // Popup blocked: do not claim the request was sent.
      setManualUrl(url);
      return;
    }
    opened.opener = null;
    router.push('/gracias');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="demo-name">Nombre</Label>
          <Input id="demo-name" autoComplete="name" {...register('name')} error={errors.name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-clinic">Consultorio o clínica</Label>
          <Input id="demo-clinic" autoComplete="organization" {...register('clinic')} error={errors.clinic?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-email">Correo electrónico</Label>
          <Input id="demo-email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-phone">Teléfono</Label>
          <Input id="demo-phone" type="tel" autoComplete="tel" {...register('phone')} error={errors.phone?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-team">Tamaño del equipo</Label>
        <select
          id="demo-team"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register('teamSize')}
        >
          <option value="">Seleccionar</option>
          {TEAM_SIZES.map((size) => <option key={size} value={size}>{size} profesionales</option>)}
        </select>
        {errors.teamSize && <p role="alert" className="text-sm text-destructive">{errors.teamSize.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-message">Mensaje (opcional)</Label>
        <Textarea id="demo-message" {...register('message')} />
        {errors.message && <p role="alert" className="text-sm text-destructive">{errors.message.message}</p>}
      </div>

      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <input id="demo-privacy" type="checkbox" className="mt-1 h-4 w-4 rounded border-input" {...register('acceptPrivacy')} />
          <label htmlFor="demo-privacy" className="text-sm">
            Acepto la{' '}
            {/* Opens in a new tab so the typed form is not lost. */}
            <Link href="/privacidad" target="_blank" className="text-primary underline">política de privacidad</Link>
          </label>
        </div>
        {errors.acceptPrivacy && <p role="alert" className="text-sm text-destructive">{errors.acceptPrivacy.message}</p>}
      </div>

      {manualUrl && (
        <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm">
          No pudimos abrir WhatsApp automáticamente.{' '}
          <a href={manualUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Abrir WhatsApp</a>
        </p>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto">Solicitar demo</Button>
      <p className="text-sm text-muted-foreground">{contact.responseTime}</p>
      {channel === 'email' && (
        <p className="text-sm text-muted-foreground">Se abrirá tu aplicación de correo con la solicitud lista para enviar.</p>
      )}
    </form>
  );
}
