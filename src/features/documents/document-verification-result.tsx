'use client';

import { CheckCircle2, CircleSlash, FileQuestion } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentVerification } from '@/hooks/useDocuments';
import { formatDate } from '@/lib/utils';
import type { ApiError } from '@/types';

/**
 * What anyone holding a clinical document sees when they check its code: who issued it and
 * whether it is in force. It never shows the content of the document.
 */
export function DocumentVerificationResult({ code }: { code: string }) {
  const query = useDocumentVerification(code);

  if (query.isPending) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6" role="status" aria-label="Comprobando el documento">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (query.isError) {
    const notFound = (query.error as ApiError | null)?.status === 404;
    return (
      <Card>
        <CardHeader className="text-center">
          <FileQuestion className="mx-auto mb-2 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <CardTitle>
            {notFound ? 'No encontramos un documento con ese código' : 'No se pudo comprobar el documento'}
          </CardTitle>
          <CardDescription>
            {notFound
              ? 'Revisa que el código esté escrito como aparece en el documento. Si es correcto, el documento no fue emitido por un consultorio de esta plataforma.'
              : 'Inténtalo de nuevo en unos minutos.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const document = query.data;
  const withdrawn = document.status === 'WITHDRAWN';
  const credentials = [
    document.professional.title ?? document.specialty,
    document.professional.licenseNumber && `Registro ${document.professional.licenseNumber}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card>
      <CardHeader className="text-center">
        {withdrawn ? (
          <CircleSlash className="mx-auto mb-2 h-10 w-10 text-destructive" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-600" aria-hidden="true" />
        )}
        <CardTitle>{withdrawn ? 'Documento anulado' : 'Documento auténtico'}</CardTitle>
        <CardDescription>
          {withdrawn
            ? `El consultorio retiró este documento el ${formatDate(document.withdrawnAt!, 'dd/MM/yyyy')}. Ya no tiene validez.`
            : 'El consultorio emitió este documento y sigue vigente.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!withdrawn && document.correctedAt && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            El documento fue corregido el {formatDate(document.correctedAt, 'dd/MM/yyyy')}. Si tu copia
            es anterior, pide la versión vigente al consultorio.
          </p>
        )}
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Tipo de documento</dt>
            <dd className="font-medium">{document.documentType}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Fecha</dt>
            <dd className="font-medium">{formatDate(document.issuedAt, 'dd/MM/yyyy')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Consultorio</dt>
            <dd className="font-medium">{document.clinic}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Profesional</dt>
            <dd className="font-medium">{document.professional.name}</dd>
            {credentials && <dd className="text-muted-foreground">{credentials}</dd>}
          </div>
          <div>
            <dt className="text-muted-foreground">Iniciales del paciente</dt>
            <dd className="font-medium">{document.patientInitials}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Código</dt>
            <dd className="font-medium">{document.code}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Por privacidad, esta página no muestra el contenido del documento ni el nombre del paciente.
          Compara las iniciales, la fecha y el profesional con los del documento que tienes.
        </p>
      </CardContent>
    </Card>
  );
}
