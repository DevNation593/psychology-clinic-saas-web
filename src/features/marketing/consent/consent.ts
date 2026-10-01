'use client';

import { useSyncExternalStore } from 'react';

export type ConsentState = 'unset' | 'accepted' | 'rejected';

const STORAGE_KEY = 'cookie-consent';
const listeners = new Set<() => void>();
// True while the visitor has reopened the banner to change a stored choice.
let reviewing = false;

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readConsent(): ConsentState {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'accepted' || value === 'rejected' ? value : 'unset';
  } catch {
    // Storage can be blocked (private mode); behave as if nothing was chosen.
    return 'unset';
  }
}

export function writeConsent(next: 'accepted' | 'rejected'): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Nothing to persist to; the choice lasts for this page view only.
  }
  reviewing = false;
  notify();
}

export function resetConsent(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore: storage unavailable.
  }
  reviewing = false;
  notify();
}

export function openConsentReview(): void {
  reviewing = true;
  notify();
}

export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribe, readConsent, () => 'unset');
}

export function useConsentReview(): boolean {
  return useSyncExternalStore(subscribe, () => reviewing, () => false);
}
