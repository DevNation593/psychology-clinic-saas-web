'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatVerificationCode } from '@/features/documents/verification-code';

/** The public page where anyone holding the document checks it. */
export function verificationUrl(code: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/verify/${formatVerificationCode(code)}`;
}

/** The QR and the code a third party checks the document with. */
export function VerificationBlock({ code }: { code: string }) {
  const [origin, setOrigin] = useState('');
  const [qr, setQr] = useState<string | null>(null);

  // The address of the page is only known in the browser.
  useEffect(() => setOrigin(window.location.origin), []);
  const url = origin ? verificationUrl(code, origin) : '';

  useEffect(() => {
    if (!url) return;
    let current = true;
    QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })
      .then((svg) => {
        if (current) setQr(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
      })
      // Without the QR the document still carries the code and the address in text.
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [url]);

  return (
    <div className="flex items-center gap-4 text-left text-xs">
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element -- generated in the browser
        <img src={qr} alt="Código QR de verificación del documento" className="h-20 w-20 bg-white" />
      )}
      <div className="space-y-0.5">
        <p className="font-semibold">Verificación del documento</p>
        <p className="text-muted-foreground">
          Escanea el código o entra en la dirección para comprobar que el consultorio emitió este
          documento y que sigue vigente.
        </p>
        {url && <p className="break-all">{url}</p>}
        <p className="font-semibold">Código: {formatVerificationCode(code)}</p>
      </div>
    </div>
  );
}
