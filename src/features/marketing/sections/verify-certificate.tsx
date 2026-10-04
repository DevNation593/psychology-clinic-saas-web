'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatVerificationCode, normalizeVerificationCode } from '@/features/documents/verification-code';

/** Lets anyone holding a certificate reach its public check without scanning the QR. */
export function VerifyCertificate() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim()) {
      setError('Escribe el código que aparece en el certificado');
      return;
    }
    const normalized = normalizeVerificationCode(code);
    if (!normalized) {
      setError('El código tiene 16 letras y números, como ABCD-EFGH-JKMN-PQRS');
      return;
    }
    router.push(`/verify/${formatVerificationCode(normalized)}`);
  };

  return (
    // The offset keeps the title clear of the sticky header when the footer links here.
    <section id="verificar-certificado" aria-labelledby="verify-title" className="scroll-mt-20 border-y bg-muted/40">
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h2 id="verify-title" className="text-2xl font-bold">Verifica un certificado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Escribe el código impreso junto al QR del certificado para comprobar que el consultorio lo
          emitió y que sigue vigente.
        </p>
        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-3 text-left sm:flex-row sm:items-start">
          <div className="flex-1 space-y-2">
            <Label htmlFor="verify-code" className="sr-only">Código de verificación</Label>
            <Input
              id="verify-code"
              value={code}
              onChange={(event) => { setCode(event.target.value); setError(''); }}
              placeholder="ABCD-EFGH-JKMN-PQRS"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby={error ? 'verify-code-error' : undefined}
              error={error}
              errorId="verify-code-error"
            />
          </div>
          <Button type="submit">Verificar certificado</Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          Por privacidad, la verificación no muestra el contenido del documento ni el nombre del paciente.
        </p>
      </div>
    </section>
  );
}
