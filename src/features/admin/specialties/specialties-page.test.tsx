import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SpecialtiesPage from '@/app/(dashboard)/admin/specialties/page';
import { useAuthStore } from '@/store/authStore';
import { UserRole, type User } from '@/types';

vi.mock('./specialty-manager', () => ({
  SpecialtyManager: () => <div data-testid="specialty-manager" />,
}));

const signIn = (role: UserRole) =>
  useAuthStore.setState({ user: { id: 'user-1', role, tenantId: 'tenant-1' } as User });

beforeEach(() => useAuthStore.setState({ user: null }));

describe('SpecialtiesPage access', () => {
  it.each([UserRole.ADMIN, UserRole.CLIENTE, UserRole.SOPORTE])('opens for %s', (role) => {
    signIn(role);
    render(<SpecialtiesPage />);
    expect(screen.getByTestId('specialty-manager')).toBeInTheDocument();
  });

  it.each([UserRole.ASISTENTE, UserRole.PROFESIONAL, UserRole.PSICOLOGO])(
    'tells %s the section is restricted instead of showing it',
    (role) => {
      signIn(role);
      render(<SpecialtiesPage />);
      expect(screen.queryByTestId('specialty-manager')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Solo los administradores pueden gestionar los módulos clínicos.');
    },
  );

  it('shows nothing until the session is known', () => {
    const { container } = render(<SpecialtiesPage />);
    expect(container).toBeEmptyDOMElement();
  });
});
