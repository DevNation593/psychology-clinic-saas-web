import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserPermissions } from '@/lib/api/permissions-api';
import { UserPermissionsDialog } from './user-permissions-dialog';

const hooks = vi.hoisted(() => ({
  query: { data: undefined as unknown, isError: false, isPending: false },
  save: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  useUserPermissions: () => hooks.query,
  useSaveUserPermissions: () => ({ mutateAsync: hooks.save, isPending: false }),
}));

const assistant: UserPermissions = {
  userId: 'user-1',
  role: 'ASISTENTE',
  restrictable: true,
  effective: ['patients.create', 'appointments.create'],
  permissions: [
    { key: 'patients.create', group: 'Pacientes', label: 'Registrar pacientes', allowed: true, source: 'role' },
    { key: 'appointments.create', group: 'Agenda', label: 'Agendar citas', allowed: true, source: 'role' },
    { key: 'appointments.cancel', group: 'Agenda', label: 'Cancelar citas', allowed: false, source: 'role' },
    { key: 'billing.view', group: 'Facturación', label: 'Ver facturas', allowed: false, source: 'grant' },
    { key: 'billing.create', group: 'Facturación', label: 'Emitir facturas', allowed: false, source: 'grant' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  hooks.query = { data: assistant, isError: false, isPending: false };
  hooks.save.mockResolvedValue(undefined);
});

const renderDialog = () => {
  const onClose = vi.fn();
  render(<UserPermissionsDialog userId="user-1" userName="Paula Ríos" onClose={onClose} />);
  return onClose;
};

describe('UserPermissionsDialog', () => {
  it('lists the permissions of the role by group, checked while the user has them', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Permisos de Paula Ríos' })).toBeInTheDocument();
    const agenda = screen.getByRole('group', { name: 'Agenda' });
    expect(within(agenda).getByLabelText('Agendar citas')).toBeChecked();
    expect(within(agenda).getByLabelText('Cancelar citas')).not.toBeChecked();
    expect(within(screen.getByRole('group', { name: 'Pacientes' })).getByLabelText('Registrar pacientes')).toBeChecked();
  });

  it('saves exactly the permissions left unchecked', async () => {
    const onClose = renderDialog();

    fireEvent.click(screen.getByLabelText('Registrar pacientes'));
    fireEvent.click(screen.getByLabelText('Cancelar citas'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar permisos' })));

    expect(hooks.save).toHaveBeenCalledWith({ revoked: ['patients.create'], granted: [] });
    expect(onClose).toHaveBeenCalled();
  });

  it('marks the permissions the role lacks and gives the ones that get checked', async () => {
    renderDialog();

    const billing = screen.getByRole('group', { name: 'Facturación' });
    expect(within(billing).getAllByText('adicional')).toHaveLength(2);
    const view = within(billing).getByLabelText(/Ver facturas/);
    expect(view).not.toBeChecked();

    fireEvent.click(view);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar permisos' })));

    expect(hooks.save).toHaveBeenCalledWith({
      revoked: ['appointments.cancel'],
      granted: ['billing.view'],
    });
  });

  it('stays open when saving fails', async () => {
    hooks.save.mockRejectedValue(new Error('offline'));
    const onClose = renderDialog();

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar permisos' })));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('offers nothing to change for the account holder', () => {
    hooks.query = {
      data: { ...assistant, role: 'MASTER', restrictable: false },
      isError: false,
      isPending: false,
    };
    renderDialog();

    expect(screen.getByRole('alert')).toHaveTextContent('conserva siempre todos los permisos');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar permisos' })).toBeDisabled();
  });

  it('cannot save while the permissions could not be loaded', () => {
    hooks.query = { data: undefined, isError: true, isPending: false };
    renderDialog();

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los permisos');
    expect(screen.getByRole('button', { name: 'Guardar permisos' })).toBeDisabled();
  });
});
