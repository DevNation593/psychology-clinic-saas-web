'use client';

import Script from 'next/script';
import { useConsent } from './consent';

export function GoogleAnalytics({ measurementId }: { measurementId: string | undefined }) {
  const consent = useConsent();
  if (consent !== 'accepted' || !measurementId) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
