import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { Breadcrumbs } from './breadcrumbs';
import { MobileCta } from './mobile-cta';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

beforeEach(() => {
  act(() => useAuthStore.setState({ isAuthenticated: false, hasHydrated: true }));
});

describe('SiteHeader', () => {
  it('links to the public sections, login and the demo request', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Planes' })).toHaveAttribute('href', '/planes');
    expect(within(nav).getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '/como-funciona');
    expect(within(nav).queryByRole('link', { name: 'Casos de éxito' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Solicitar demo' })).toHaveAttribute('href', '/contacto');
  });

  it('offers the dashboard to a signed-in visitor', () => {
    act(() => useAuthStore.setState({ isAuthenticated: true, hasHydrated: true }));
    render(<SiteHeader />);
    expect(screen.getByRole('link', { name: 'Ir al panel' })).toHaveAttribute('href', '/dashboard');
  });

  it('shows the login link until the session has hydrated', () => {
    act(() => useAuthStore.setState({ isAuthenticated: true, hasHydrated: false }));
    render(<SiteHeader />);
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});

describe('SiteFooter', () => {
  it('links to every legal page and the cookie preferences', () => {
    render(<SiteFooter />);
    for (const [name, href] of [
      ['Términos y condiciones', '/terminos'],
      ['Política de privacidad', '/privacidad'],
      ['Política de cookies', '/cookies'],
      ['Tratamiento de datos', '/tratamiento-de-datos'],
    ]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
    expect(screen.getByRole('button', { name: 'Preferencias de cookies' })).toBeInTheDocument();
  });

  it('links to the certificate check on the home page', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Verificar certificado' })).toHaveAttribute('href', '/#verificar-certificado');
  });

  it('reserves the rights for the company that owns the product', () => {
    render(<SiteFooter />);
    expect(
      screen.getByText(`© ${new Date().getFullYear()} DEVNATION TECHNOLOGIES S.A.S. Todos los derechos reservados.`),
    ).toBeInTheDocument();
  });
});

describe('Breadcrumbs', () => {
  it('shows the trail with the current page unlinked', () => {
    render(<Breadcrumbs page="plans" />);
    const nav = screen.getByRole('navigation', { name: 'Ruta de navegación' });
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(within(nav).getByText('Planes')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Planes' })).not.toBeInTheDocument();
  });
});

describe('MobileCta', () => {
  it('offers the demo request and WhatsApp', () => {
    render(<MobileCta contact={{ whatsappNumber: '593991234567', email: '', responseTime: '' }} />);
    expect(screen.getByRole('link', { name: 'Solicitar demo' })).toHaveAttribute('href', '/contacto');
    expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toContain('https://wa.me/593991234567');
  });

  it('hides WhatsApp when there is no number', () => {
    render(<MobileCta contact={{ whatsappNumber: '', email: 'a@b.co', responseTime: '' }} />);
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar demo' })).toBeInTheDocument();
  });
});
