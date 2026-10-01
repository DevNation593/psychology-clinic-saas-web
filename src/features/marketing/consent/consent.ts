'use client';

import { useSyncExternalStore } from 'react';

export type ConsentState = 'unset' | 'accepted' | 'rejected';

const STORAGE_KEY = 'cookie-consent';
const listeners = new Set<() => void>();
// True while the visitor has reopened the banner to change a stored choice.
let reviewing = false;
// Holds the choice for this page view when storage is unavailable.
let memoryChoice: ConsentState = 'unset';

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
    // Storage can be blocked (private mode); fall back to this page view's choice.
    return memoryChoice;
  }
}

export function writeConsent(next: 'accepted' | 'rejected'): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Nothing to persist to; the choice lasts for this page view only.
    memoryChoice = next;
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
  memoryChoice = 'unset';
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

/** False during server rendering and hydration, true once running in the browser. */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function useConsentReview(): boolean {
  return useSyncExternalStore(subscribe, () => reviewing, () => false);
}
