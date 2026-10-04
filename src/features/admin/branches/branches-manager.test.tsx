import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Branch } from '@/types/clinical';
import { BranchesManager } from './branches-manager';

const hooks = vi.hoisted(() => ({
  branches: [] as unknown[],
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  professionals: [] as unknown[],
  setProfessionals: vi.fn(),
}));

vi.mock('@/hooks/useBranches', () => ({
  useBranches: () => ({ data: hooks.branches, isError: false, isPending: false, refetch: vi.fn() }),
  useSaveBranch: () => ({ mutate: hooks.mutate, mutateAsync: hooks.mutateAsync, isPending: false }),
  useClinicProfessionals: () => ({ data: hooks.professionals }),
  useSetBranchProfessionals: () => ({ mutateAsync: hooks.setProfessionals, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const branch = (overrides: Partial<Branch> = {}): Branch => ({
  id: 'main',
  name: 'Sede principal',
  address: 'Av. Amazonas 100',
  city: 'Quito',
  phone: null,
  openingHours: null,
  rooms: ['Consultorio 1', 'Consultorio 2'],
  isMain: true,
  isActive: true,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  hooks.mutateAsync.mockImplementation(async ({ branchId }) => ({ id: branchId ?? 'created' }));
  hooks.setProfessionals.mockResolvedValue(undefined);
  hooks.professionals = [];
  hooks.branches = [
    branch(),
    branch({ id: 'north', name: 'Sede Norte', isMain: false, rooms: [], address: null, city: null }),
    branch({ id: 'old', name: 'Sede antigua', isMain: false, isActive: false }),
  ];
});

const rowOf = (name: string) => screen.getByText(name).closest('li') as HTMLElement;

describe('BranchesManager', () => {
  it('lists the branches with their state and what is known of them', () => {
    render(<BranchesManager />);

    expect(within(rowOf('Sede principal')).getByText('Principal')).toBeInTheDocument();
    expect(within(rowOf('Sede principal')).getByText('Av. Amazonas 100 · Quito · 2 consultorios')).toBeInTheDocument();
    expect(within(rowOf('Sede Norte')).getByText('Sin dirección registrada')).toBeInTheDocument();
    expect(within(rowOf('Sede antigua')).getByText('Inactiva')).toBeInTheDocument();
  });

  it('never offers to deactivate or demote the main branch', () => {
    render(<BranchesManager />);

    const main = within(rowOf('Sede principal'));
    expect(main.queryByRole('button', { name: /Desactivar/ })).not.toBeInTheDocument();
    expect(main.queryByRole('button', { name: /Hacer principal/ })).not.toBeInTheDocument();
    // An inactive branch must be activated before it can become the main one.
    expect(within(rowOf('Sede antigua')).queryByRole('button', { name: /Hacer principal/ })).not.toBeInTheDocument();
  });

  it('makes another branch the main one and toggles a secondary branch', () => {
    render(<BranchesManager />);

    fireEvent.click(screen.getByRole('button', { name: 'Hacer principal Sede Norte' }));
    expect(hooks.mutate.mock.calls[0][0]).toEqual({ branchId: 'north', data: { isMain: true } });

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar Sede Norte' }));
    expect(hooks.mutate.mock.calls[1][0]).toEqual({ branchId: 'north', data: { isActive: false } });

    fireEvent.click(screen.getByRole('button', { name: 'Activar Sede antigua' }));
    expect(hooks.mutate.mock.calls[2][0]).toEqual({ branchId: 'old', data: { isActive: true } });
  });

  it('creates a branch with its rooms, one per line', async () => {
    render(<BranchesManager />);

    fireEvent.click(screen.getByRole('button', { name: 'Nueva sede' }));
    const create = screen.getByRole('button', { name: 'Crear sede' });
    expect(create).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Nombre de la sede/), { target: { value: ' Sede Cumbayá ' } });
    fireEvent.change(screen.getByLabelText('Consultorios (uno por línea)'), {
      target: { value: 'Consultorio A\n\n Consultorio B ' },
    });
    await act(async () => fireEvent.click(create));

    expect(hooks.mutateAsync).toHaveBeenCalledWith({
      branchId: undefined,
      data: {
        name: 'Sede Cumbayá',
        address: '',
        city: '',
        phone: '',
        openingHours: '',
        rooms: ['Consultorio A', 'Consultorio B'],
      },
    });
    expect(screen.queryByRole('button', { name: 'Crear sede' })).not.toBeInTheDocument();
  });

  describe('professionals of a branch', () => {
    beforeEach(() => {
      hooks.professionals = [
        { id: 'pro-1', firstName: 'Ana', lastName: 'Mora' },
        { id: 'pro-2', firstName: 'Luis', lastName: 'Paz' },
      ];
      hooks.branches = [
        branch({ professionalIds: ['pro-1'] }),
        branch({ id: 'north', name: 'Sede Norte', isMain: false, professionalIds: [] }),
      ];
    });

    it('shows how many are tied to each branch', () => {
      render(<BranchesManager />);

      expect(within(rowOf('Sede principal')).getByText(/1 profesional asignado/)).toBeInTheDocument();
      expect(within(rowOf('Sede Norte')).queryByText(/asignado/)).not.toBeInTheDocument();
    });

    it('saves the professionals only when the selection changed', async () => {
      render(<BranchesManager />);

      fireEvent.click(screen.getByRole('button', { name: 'Editar Sede principal' }));
      expect(screen.getByLabelText('Ana Mora')).toBeChecked();
      expect(screen.getByLabelText('Luis Paz')).not.toBeChecked();
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar sede' })));
      expect(hooks.setProfessionals).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Editar Sede principal' }));
      fireEvent.click(screen.getByLabelText('Luis Paz'));
      fireEvent.click(screen.getByLabelText('Ana Mora'));
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar sede' })));
      expect(hooks.setProfessionals).toHaveBeenCalledWith({ branchId: 'main', userIds: ['pro-2'] });
    });

    it('ties professionals to a branch as soon as it is created', async () => {
      render(<BranchesManager />);

      fireEvent.click(screen.getByRole('button', { name: 'Nueva sede' }));
      fireEvent.change(screen.getByLabelText(/Nombre de la sede/), { target: { value: 'Sede Sur' } });
      fireEvent.click(screen.getByLabelText('Ana Mora'));
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Crear sede' })));

      expect(hooks.setProfessionals).toHaveBeenCalledWith({ branchId: 'created', userIds: ['pro-1'] });
    });
  });

  it('edits a branch in place with its stored values', async () => {
    render(<BranchesManager />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar Sede principal' }));
    expect(screen.getByLabelText(/Nombre de la sede/)).toHaveValue('Sede principal');
    expect(screen.getByLabelText('Consultorios (uno por línea)')).toHaveValue('Consultorio 1\nConsultorio 2');

    fireEvent.change(screen.getByLabelText('Ciudad'), { target: { value: 'Cumbayá' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar sede' })));

    expect(hooks.mutateAsync.mock.calls[0][0]).toMatchObject({
      branchId: 'main',
      data: { name: 'Sede principal', city: 'Cumbayá' },
    });
  });
});
