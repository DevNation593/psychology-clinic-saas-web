'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { readConsent, useConsent, useConsentReview, useIsClient, writeConsent } from './consent';

export function CookieBanner() {
  const consent = useConsent();
  const reviewing = useConsentReview();
  // The stored choice is unknown on the server, so the banner only appears in the browser.
  const isClient = useIsClient();
  if (!isClient || (consent !== 'unset' && !reviewing)) return null;

  const choose = (next: 'accepted' | 'rejected') => {
    const wasAccepted = readConsent() === 'accepted';
    writeConsent(next);
    // Analytics is already running; a reload is the only way to unload it.
    if (wasAccepted && next === 'rejected') window.location.reload();
  };

  return (
    <section
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-3xl px-4 md:bottom-4"
    >
      <div className="rounded-lg border bg-background p-4 shadow-lg">
        <p className="text-sm text-muted-foreground">
          Usamos cookies de analítica para entender cómo se usa el sitio. Solo se activan si las aceptas.
          Consulta la <Link href="/cookies" className="text-primary underline">Política de cookies</Link>.
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => choose('rejected')}>Rechazar</Button>
          <Button type="button" onClick={() => choose('accepted')}>Aceptar</Button>
        </div>
      </div>
    </section>
  );
}
