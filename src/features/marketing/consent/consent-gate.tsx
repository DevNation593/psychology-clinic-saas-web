'use client';

import type { ReactNode } from 'react';
import { useConsent } from './consent';

/** Renders third-party embeds only after the visitor accepts cookies. */
export function ConsentGate({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return <>{useConsent() === 'accepted' ? children : fallback}</>;
}
