'use client';

import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSections } from '@/hooks/useSections';
import type { SectionKey } from '@/types';

/**
 * Renders its children only when the clinic has the section enabled. A slow or failed
 * request is never reported as "not enabled": loading renders nothing and an error offers a retry.
 */
export function SectionGate({ section, children }: { section: SectionKey; children: ReactNode }) {
  const { isEnabled, isLoading, isError, refetch } = useSections();

  if (isLoading) return null;
  if (isError) {
    return (
      <Alert variant="destructive" title="No se pudieron cargar las secciones">
        <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
          Reintentar
        </Button>
      </Alert>
    );
  }
  if (!isEnabled(section)) {
    return (
      <Alert variant="warning" title="Sección no disponible">
        Esta sección no está habilitada para tu consultorio
      </Alert>
    );
  }
  return <>{children}</>;
}
