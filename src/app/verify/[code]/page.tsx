'use client';

import { useParams } from 'next/navigation';
import { DocumentVerificationResult } from '@/features/documents/document-verification-result';

/** Public page: anyone holding a clinical document checks it here by the code printed on it. */
export default function VerifyDocumentPage() {
  const params = useParams();
  const code = decodeURIComponent(String(params.code ?? ''));

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-center text-xl font-semibold">Verificación de documento clínico</h1>
      <DocumentVerificationResult code={code} />
    </main>
  );
}
