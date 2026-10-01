'use client';

import { openConsentReview } from './consent';

export function CookiePreferencesButton() {
  return (
    <button type="button" onClick={openConsentReview} className="text-left text-sm hover:underline">
      Preferencias de cookies
    </button>
  );
}
