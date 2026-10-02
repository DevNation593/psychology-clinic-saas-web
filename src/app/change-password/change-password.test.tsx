import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { UserRole, type User } from '@/types';
import ChangePasswordPage from './page';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/endpoints', () => ({ authApi: { changePassword: vi.fn() } }));

const signIn = (role: UserRole) =>
  useAuthStore.setState({
    user: { id: 'user-1', tenantId: 'tenant-1', role, mustChangePassword: true } as User,
    isAuthenticated: true,
    hasHydrated: true,
  });

function fill(current: string, next: string, confirm: string) {
  fireEvent.change(screen.getByLabelText(/contraseña actual/i), { target: { value: current } });
  fireEvent.change(screen.getByLabelText(/^nueva contraseña/i), { target: { value: next } });
  fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: /guardar contraseña/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn(UserRole.MASTER);
});

describe('ChangePasswordPage', () => {
  it('requires the confirmation to match and at least 8 characters', async () => {
    render(<ChangePasswordPage />);
    fill('temporal-1', 'short', 'other');
    expect(await screen.findByText(/al menos 8 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('rejects a new password equal to the current one', async () => {
    render(<ChangePasswordPage />);
    fill('same-password', 'same-password', 'same-password');
    expect(await screen.findByText('La nueva contraseña debe ser distinta de la actual')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('clears the flag in the store and goes to the route of the role after saving', async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue(undefined);
    signIn(UserRole.ADMIN);
    render(<ChangePasswordPage />);
    fill('temporal-1', 'nueva-clave-9', 'nueva-clave-9');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/platform'));
    expect(authApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'temporal-1',
      newPassword: 'nueva-clave-9',
    });
    expect(useAuthStore.getState().user?.mustChangePassword).toBe(false);
  });

  it('goes to the dashboard for a clinic user', async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue(undefined);
    render(<ChangePasswordPage />);
    fill('temporal-1', 'nueva-clave-9', 'nueva-clave-9');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows the API message when the current password is wrong', async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue({
      status: 401,
      message: 'La contraseña actual es incorrecta',
    });
    render(<ChangePasswordPage />);
    fill('wrong-pass', 'nueva-clave-9', 'nueva-clave-9');
    expect(await screen.findByText('La contraseña actual es incorrecta')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.mustChangePassword).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('redirects to /login when there is no session', async () => {
    useAuthStore.setState({ user: null, isAuthenticated: false, hasHydrated: true });
    render(<ChangePasswordPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
  });

  it('offers to sign out', () => {
    const logout = vi.fn();
    useAuthStore.setState({ logout });
    render(<ChangePasswordPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).toHaveBeenCalled();
  });
});
