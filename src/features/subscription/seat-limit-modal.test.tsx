import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { PlanTier, UserRole, type User } from '@/types';
import { SeatLimitModal } from './seat-limit-modal';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    data: { plan: { planType: PlanTier.BASIC, limits: { maxPsychologists: 1 } } },
  }),
}));

const userWith = (role: UserRole) => ({ id: 'user-1', role }) as User;

describe('SeatLimitModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers the upgrade to the account holder', () => {
    useAuthStore.setState({ user: userWith(UserRole.MASTER) });
    render(<SeatLimitModal open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Actualizar a PRO' })).toBeInTheDocument();
    expect(screen.queryByText('Contacta al titular de la cuenta.')).not.toBeInTheDocument();
  });

  it('points a professional to the account holder instead of the plans page', () => {
    useAuthStore.setState({ user: userWith(UserRole.PROFESIONAL) });
    render(<SeatLimitModal open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Contacta al titular de la cuenta.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actualizar a PRO' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver Planes' })).not.toBeInTheDocument();
  });
});
