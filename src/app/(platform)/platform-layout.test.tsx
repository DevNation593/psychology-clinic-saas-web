import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { UserRole, type User } from '@/types';
import PlatformLayout from './layout';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/platform',
}));
vi.mock('@/components/layout/header', () => ({ Header: () => <header /> }));

const signIn = (user: Partial<User>) =>
  useAuthStore.setState({
    user: { id: 'user-1', firstName: 'Ana', lastName: 'Vega', email: 'a@x.com', ...user } as User,
    isAuthenticated: true,
    hasHydrated: true,
  });

const renderLayout = () =>
  render(
    <PlatformLayout>
      <p>content</p>
    </PlatformLayout>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null, tenant: null, isAuthenticated: false, hasHydrated: true });
});

describe('PlatformLayout routing', () => {
  it('sends a visitor without session to /login', () => {
    renderLayout();
    expect(router.replace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it.each([UserRole.MASTER, UserRole.PROFESIONAL, UserRole.ASISTENTE, UserRole.SOPORTE])(
    'sends %s to /dashboard',
    (role) => {
      signIn({ role });
      renderLayout();
      expect(router.replace).toHaveBeenCalledWith('/dashboard');
      expect(screen.queryByText('content')).not.toBeInTheDocument();
    },
  );

  it('sends an ADMIN with a temporary password to /change-password', () => {
    signIn({ role: UserRole.ADMIN, mustChangePassword: true });
    renderLayout();
    expect(router.replace).toHaveBeenCalledWith('/change-password');
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('renders the Panel de control menu with Resumen, Consultorios and Pagos for an ADMIN', () => {
    signIn({ role: UserRole.ADMIN, mustChangePassword: false });
    renderLayout();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByText('Panel de control')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Resumen/ })).toHaveAttribute('href', '/platform');
    expect(screen.getByRole('link', { name: /Consultorios/ })).toHaveAttribute(
      'href',
      '/platform/tenants',
    );
    expect(screen.getByRole('link', { name: /Pagos/ })).toHaveAttribute(
      'href',
      '/platform/payments',
    );
  });
});
