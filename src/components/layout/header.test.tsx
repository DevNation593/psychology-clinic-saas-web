import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { UserRole, type User } from '@/types';
import { Header } from './header';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const signIn = (role: UserRole) =>
  useAuthStore.setState({
    user: { id: 'u-1', firstName: 'Ana', lastName: 'Vega', email: 'a@x.com', role } as User,
    isAuthenticated: true,
    hasHydrated: true,
  });

const renderHeader = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Header />
    </QueryClientProvider>,
  );

beforeEach(() => {
  useAuthStore.setState({ user: null, tenant: null, isAuthenticated: false, hasHydrated: true });
});

describe('Header', () => {
  it('hides the notifications and profile buttons from a platform ADMIN but keeps logout', () => {
    signIn(UserRole.ADMIN);
    renderHeader();
    expect(screen.queryByRole('button', { name: 'Notificaciones' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Perfil' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument();
  });

  it('still shows the notifications and profile buttons to a MASTER', () => {
    signIn(UserRole.MASTER);
    renderHeader();
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Perfil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });
});
