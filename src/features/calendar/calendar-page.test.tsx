import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentStatus, UserRole, type Appointment, type User } from '@/types';
import { useAuthStore } from '@/store/authStore';
import CalendarPage from '@/app/(dashboard)/calendar/page';
import { toast } from 'sonner';

const mocks = vi.hoisted(() => ({
  appointments: undefined as Appointment[] | undefined,
  isLoading: true,
  search: '',
  update: vi.fn(),
  updateHookIds: [] as string[],
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('next/dynamic', () => ({
  default: () => function CalendarMock(props: {
    events: Appointment[];
    onEventClick: (appointment: Appointment) => void;
    onEventDrop?: (id: string, start: string, end: string) => void;
  }) {
    return (
      <div>
        {props.events.map((appointment) => (
          <button key={appointment.id} onClick={() => props.onEventClick(appointment)}>
            Seleccionar {appointment.id}
          </button>
        ))}
        {props.events[0] && (
          <button onClick={() => props.onEventDrop?.(
            props.events[0].id,
            '2026-10-02T15:00:00.000Z',
            '2026-10-02T16:00:00.000Z',
          )}>
            Mover primera cita
          </button>
        )}
      </div>
    );
  },
}));
vi.mock('@/hooks/useAppointments', () => ({
  useAppointments: () => ({ data: mocks.appointments, isLoading: mocks.isLoading }),
  useUpdateAppointment: (id: string) => {
    mocks.updateHookIds.push(id);
    return { mutate: mocks.update, isPending: false };
  },
}));
vi.mock('@/hooks/useTenantSettings', () => ({
  useTenantSettings: () => ({ data: undefined }),
}));
vi.mock('./appointment-dialog', () => ({
  AppointmentDialog: () => null,
}));
vi.mock('./appointment-details-dialog', () => ({
  AppointmentDetailsDialog: ({ open, appointment, onOpenChange }: {
    open: boolean;
    appointment: Appointment | null;
    onOpenChange: (open: boolean) => void;
  }) =>
    open && appointment ? (
      <div>
        <div data-testid="selected-appointment">{appointment.id}</div>
        <button onClick={() => onOpenChange(false)}>Cerrar detalle</button>
      </div>
    ) : null,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function appointment(id: string, professionalId: string): Appointment {
  return {
    id,
    tenantId: 'tenant-1',
    patientId: 'patient-1',
    patient: { id: 'patient-1', firstName: 'Ana', lastName: 'Vega', email: null, phone: null },
    professionalId,
    professional: { id: professionalId, firstName: 'Noa', lastName: 'Paz', email: 'noa@example.com' },
    specialtyId: 'nutrition',
    specialty: { id: 'nutrition', code: 'NUTRITION', name: 'Nutrición' },
    psychologistId: professionalId,
    psychologist: null,
    title: 'Consulta',
    description: null,
    startTime: '2026-10-01T15:00:00.000Z',
    endTime: '2026-10-01T16:00:00.000Z',
    duration: 60,
    status: AppointmentStatus.SCHEDULED,
    location: null,
    isOnline: false,
    meetingUrl: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    reminderSent24h: false,
    reminderSent2h: false,
    lastReminderSentAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

const first = appointment('appointment-1', 'professional-1');
const second = appointment('appointment-2', 'professional-2');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.appointments = undefined;
  mocks.isLoading = true;
  mocks.search = '';
  mocks.updateHookIds.length = 0;
  useAuthStore.setState({
    user: { id: 'admin-1', role: UserRole.MASTER, tenantId: 'tenant-1' } as User,
  });
});

describe('CalendarPage scoped interactions', () => {
  it('selects a matching deep-linked appointment only after the scoped list loads', async () => {
    mocks.search = 'appointmentId=appointment-1';
    const view = render(<CalendarPage />);
    expect(screen.queryByTestId('selected-appointment')).not.toBeInTheDocument();

    mocks.appointments = [first, second];
    mocks.isLoading = false;
    view.rerender(<CalendarPage />);

    expect(await screen.findByTestId('selected-appointment')).toHaveTextContent('appointment-1');
  });

  it('does not clear an unrelated selection when the deep link is unknown', async () => {
    mocks.appointments = [first, second];
    mocks.isLoading = false;
    const view = render(<CalendarPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar appointment-2' }));
    expect(screen.getByTestId('selected-appointment')).toHaveTextContent('appointment-2');

    mocks.search = 'appointmentId=unknown';
    view.rerender(<CalendarPage />);

    expect(screen.getByTestId('selected-appointment')).toHaveTextContent('appointment-2');
  });

  it('does not reopen a dismissed deep-linked appointment when the list refreshes', async () => {
    mocks.search = 'appointmentId=appointment-1';
    mocks.appointments = [first, second];
    mocks.isLoading = false;
    const view = render(<CalendarPage />);
    expect(await screen.findByTestId('selected-appointment')).toHaveTextContent('appointment-1');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByTestId('selected-appointment')).not.toBeInTheDocument();

    mocks.appointments = [first, second];
    view.rerender(<CalendarPage />);

    expect(screen.queryByTestId('selected-appointment')).not.toBeInTheDocument();
  });

  it('leaves reschedule error feedback to the update hook', async () => {
    mocks.appointments = [first, second];
    mocks.isLoading = false;
    render(<CalendarPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Mover primera cita' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    mocks.update.mock.calls[0][1]?.onError?.(new Error('conflict'));

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('rechecks permission and reschedules through the scoped update hook with canonical fields', async () => {
    mocks.appointments = [first, second];
    mocks.isLoading = false;
    useAuthStore.setState({
      user: { id: 'professional-2', role: UserRole.PROFESIONAL, tenantId: 'tenant-1' } as User,
    });
    const denied = render(<CalendarPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Mover primera cita' }));
    expect(mocks.update).not.toHaveBeenCalled();
    denied.unmount();

    useAuthStore.setState({
      user: { id: 'professional-1', role: UserRole.PROFESIONAL, tenantId: 'tenant-1' } as User,
    });
    render(<CalendarPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Mover primera cita' }));

    await waitFor(() => expect(mocks.updateHookIds).toContain('appointment-1'));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.update.mock.calls[0][0]).toEqual({ startTime: '2026-10-02T15:00:00.000Z', duration: 60 });
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('psychologistId');
  });
});
