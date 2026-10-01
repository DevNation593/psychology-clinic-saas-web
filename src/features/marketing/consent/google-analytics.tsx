'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { useConsent } from './consent';

export function GoogleAnalytics({ measurementId }: { measurementId: string | undefined }) {
  const consent = useConsent();
  // The ID is interpolated into an inline script, so only a well-formed one is used.
  const id = measurementId && /^G-[A-Z0-9]+$/.test(measurementId) ? measurementId : null;
  const active = consent === 'accepted' && id !== null;

  useEffect(() => {
    if (!active) return;
    // gtag stays loaded after a client-side navigation, so measurement is switched off
    // whenever the public layout unmounts (e.g. entering login or the dashboard).
    const flags = window as unknown as Record<string, boolean>;
    flags[`ga-disable-${id}`] = false;
    return () => {
      flags[`ga-disable-${id}`] = true;
    };
  }, [active, id]);

  if (!active) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
