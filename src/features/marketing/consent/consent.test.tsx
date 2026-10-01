import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentGate } from './consent-gate';
import { CookieBanner } from './cookie-banner';
import { CookiePreferencesButton } from './cookie-preferences-button';
import { GoogleAnalytics } from './google-analytics';
import { readConsent, resetConsent, writeConsent } from './consent';

vi.mock('next/script', () => ({
  default: ({ src, id }: { src?: string; id?: string }) => <div data-testid="script" data-src={src} data-id={id} />,
}));

beforeEach(() => {
  window.localStorage.clear();
  act(() => resetConsent());
});
afterEach(() => vi.restoreAllMocks());

describe('consent storage', () => {
  it('starts unset and persists a choice', () => {
    expect(readConsent()).toBe('unset');
    act(() => writeConsent('accepted'));
    expect(readConsent()).toBe('accepted');
    expect(window.localStorage.getItem('cookie-consent')).toBe('accepted');
  });

  it('ignores unknown stored values', () => {
    window.localStorage.setItem('cookie-consent', 'maybe');
    expect(readConsent()).toBe('unset');
  });

  it('treats unavailable storage as no consent without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readConsent()).toBe('unset');
    expect(() => act(() => writeConsent('accepted'))).not.toThrow();
  });
});

describe('CookieBanner', () => {
  it('asks once and hides after either choice', () => {
    render(<CookieBanner />);
    expect(screen.getByRole('region', { name: 'Aviso de cookies' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Política de cookies' })).toHaveAttribute('href', '/cookies');

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));

    expect(screen.queryByRole('region', { name: 'Aviso de cookies' })).not.toBeInTheDocument();
    expect(readConsent()).toBe('rejected');
  });

  it('reopens from the preferences button', () => {
    act(() => writeConsent('accepted'));
    render(<><CookieBanner /><CookiePreferencesButton /></>);
    expect(screen.queryByRole('region', { name: 'Aviso de cookies' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preferencias de cookies' }));

    expect(screen.getByRole('region', { name: 'Aviso de cookies' })).toBeInTheDocument();
  });
});

describe('GoogleAnalytics', () => {
  it('loads nothing without consent or without an ID', () => {
    const { rerender } = render(<GoogleAnalytics measurementId="G-TEST" />);
    expect(screen.queryByTestId('script')).not.toBeInTheDocument();
    act(() => writeConsent('rejected'));
    rerender(<GoogleAnalytics measurementId="G-TEST" />);
    expect(screen.queryByTestId('script')).not.toBeInTheDocument();
    act(() => writeConsent('accepted'));
    rerender(<GoogleAnalytics measurementId={undefined} />);
    expect(screen.queryByTestId('script')).not.toBeInTheDocument();
  });

  it('loads gtag after acceptance', () => {
    act(() => writeConsent('accepted'));
    render(<GoogleAnalytics measurementId="G-TEST" />);
    const sources = screen.getAllByTestId('script').map((node) => node.getAttribute('data-src'));
    expect(sources).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST');
  });
});

describe('ConsentGate', () => {
  it('shows the fallback until consent is accepted', () => {
    render(<ConsentGate fallback={<p>Ver en Google Maps</p>}><p>Mapa</p></ConsentGate>);
    expect(screen.getByText('Ver en Google Maps')).toBeInTheDocument();
    expect(screen.queryByText('Mapa')).not.toBeInTheDocument();

    act(() => writeConsent('accepted'));

    expect(screen.getByText('Mapa')).toBeInTheDocument();
  });
});
