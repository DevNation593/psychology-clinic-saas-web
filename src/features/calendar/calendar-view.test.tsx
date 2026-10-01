import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentStatus, type Appointment } from '@/types';
import CalendarView from './calendar-view';

const fullCalendar = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));
vi.mock('@fullcalendar/react', async () => {
  const React = await import('react');
  const FullCalendarMock = React.forwardRef<unknown, Record<string, unknown>>((props, _ref) => {
    if (Array.isArray(props.events)) fullCalendar.props = props;
    return <button onClick={() => undefined}>Calendario simulado</button>;
  });
  FullCalendarMock.displayName = 'FullCalendarMock';
  return { default: FullCalendarMock };
});

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

beforeEach(() => {
  fullCalendar.props = null;
});

describe('CalendarView appointment permissions', () => {
  it('marks each event editable from its appointment permission', () => {
    const own = appointment('appointment-own', 'professional-1');
    const other = appointment('appointment-other', 'professional-2');
    render(
      <CalendarView
        events={[own, other]}
        onDateSelect={vi.fn()}
        onEventClick={vi.fn()}
        canEdit={(value) => value.professionalId === 'professional-1'}
      />,
    );

    const events = fullCalendar.props?.events as Array<{ id: string; editable: boolean }>;
    expect(events).toEqual([
      expect.objectContaining({ id: 'appointment-own', editable: true }),
      expect.objectContaining({ id: 'appointment-other', editable: false }),
    ]);
  });

  it('rechecks permission before drag and resize handlers', () => {
    const own = appointment('appointment-own', 'professional-1');
    const other = appointment('appointment-other', 'professional-2');
    const onDrop = vi.fn();
    const onResize = vi.fn();
    render(
      <CalendarView
        events={[own, other]}
        onDateSelect={vi.fn()}
        onEventClick={vi.fn()}
        onEventDrop={onDrop}
        onEventResize={onResize}
        canEdit={(value) => value.professionalId === 'professional-1'}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Calendario simulado' }));

    const drop = fullCalendar.props?.eventDrop as (info: Record<string, unknown>) => void;
    const resize = fullCalendar.props?.eventResize as (info: Record<string, unknown>) => void;
    const unauthorizedRevert = vi.fn();
    const unauthorizedEvent = {
      event: {
        start: new Date('2026-10-02T15:00:00.000Z'),
        end: new Date('2026-10-02T16:00:00.000Z'),
        extendedProps: { appointment: other },
      },
      revert: unauthorizedRevert,
    };
    drop(unauthorizedEvent);
    resize(unauthorizedEvent);
    expect(unauthorizedRevert).toHaveBeenCalledTimes(2);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();

    const authorizedEvent = {
      event: {
        start: new Date('2026-10-02T15:00:00.000Z'),
        end: new Date('2026-10-02T16:00:00.000Z'),
        extendedProps: { appointment: own },
      },
      revert: vi.fn(),
    };
    drop(authorizedEvent);
    resize(authorizedEvent);
    expect(onDrop).toHaveBeenCalledWith(
      'appointment-own',
      '2026-10-02T15:00:00.000Z',
      '2026-10-02T16:00:00.000Z',
    );
    expect(onResize).toHaveBeenCalledWith(
      'appointment-own',
      '2026-10-02T15:00:00.000Z',
      '2026-10-02T16:00:00.000Z',
    );
  });
});
