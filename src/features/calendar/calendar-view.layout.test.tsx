import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentStatus, type Appointment, type TenantSettings } from '@/types';
import CalendarView, { gridSlotMinutes, toSlotDuration } from './calendar-view';

const fullCalendar = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));
vi.mock('@fullcalendar/react', async () => {
  const React = await import('react');
  const FullCalendarMock = React.forwardRef<unknown, Record<string, unknown>>((props, _ref) => {
    fullCalendar.props = props;
    return <div>Calendario simulado</div>;
  });
  FullCalendarMock.displayName = 'FullCalendarMock';
  return { default: FullCalendarMock };
});

const appointment = {
  id: 'appointment-1',
  patient: { id: 'patient-1', firstName: 'Ana', lastName: 'Vega', email: null, phone: null },
  professionalId: 'professional-1',
  professional: { id: 'professional-1', firstName: 'Noa', lastName: 'Paz', email: 'noa@example.com' },
  specialty: { id: 'nutrition', code: 'NUTRITION', name: 'Nutrición' },
  startTime: '2026-10-01T15:00:00.000Z',
  endTime: '2026-10-01T16:00:00.000Z',
  status: AppointmentStatus.SCHEDULED,
} as unknown as Appointment;

function renderView(settings?: Partial<TenantSettings>, events: Appointment[] = [appointment]) {
  return render(
    <CalendarView
      events={events}
      onDateSelect={vi.fn()}
      onEventClick={vi.fn()}
      settings={settings as TenantSettings | undefined}
    />,
  );
}

const originalWidth = window.innerWidth;
function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

beforeEach(() => {
  fullCalendar.props = null;
  setViewportWidth(1280);
});
afterEach(() => setViewportWidth(originalWidth));

describe('toSlotDuration', () => {
  it.each([
    [60, '01:00:00'],
    [50, '00:50:00'],
    [30, '00:30:00'],
    [90, '01:30:00'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(toSlotDuration(minutes)).toBe(expected);
  });

  it.each([0, -15, Number.NaN])('falls back to one hour for %s', (minutes) => {
    expect(toSlotDuration(minutes)).toBe('01:00:00');
  });
});

describe('gridSlotMinutes', () => {
  it.each([15, 20, 30, 60])('keeps a %i minute session, which lands on every hour', (minutes) => {
    expect(gridSlotMinutes(minutes)).toBe(minutes);
  });

  it.each([45, 50, 90, 120, 0, Number.NaN])('uses half-hour rows for %s minutes', (minutes) => {
    expect(gridSlotMinutes(minutes)).toBe(30);
  });
});

describe('CalendarView layout', () => {
  it('sizes the time grid from the configured session duration', () => {
    renderView({ defaultSessionDuration: 30 });
    expect(fullCalendar.props?.slotDuration).toBe('00:30:00');
    expect(fullCalendar.props?.snapDuration).toBe('00:30:00');
  });

  it('falls back to half-hour rows when the session length does not divide the hour', () => {
    renderView({ defaultSessionDuration: 50 });
    expect(fullCalendar.props?.slotDuration).toBe('00:30:00');
    expect(fullCalendar.props?.snapDuration).toBe('00:30:00');
  });

  it('starts and ends the grid on the hour so appointments line up with the hour labels', () => {
    const halfPast = { enabled: true, startTime: '08:30', endTime: '17:30' };
    renderView({ defaultSessionDuration: 60, workingHours: { monday: halfPast } } as Partial<TenantSettings>);
    expect(fullCalendar.props?.slotMinTime).toBe('08:00:00');
    expect(fullCalendar.props?.slotMaxTime).toBe('18:00:00');
    expect(fullCalendar.props?.slotLabelInterval).toBe('01:00:00');
  });

  it('leaves working hours that already fall on the hour untouched', () => {
    const onTheHour = { enabled: true, startTime: '09:00', endTime: '19:00' };
    renderView({ workingHours: { monday: onTheHour } } as Partial<TenantSettings>);
    expect(fullCalendar.props?.slotMinTime).toBe('09:00:00');
    expect(fullCalendar.props?.slotMaxTime).toBe('19:00:00');
  });

  it('uses one-hour slots when no duration is configured', () => {
    renderView();
    expect(fullCalendar.props?.slotDuration).toBe('01:00:00');
  });

  it('opens on the weekly grid on wide screens and on the list on phones', () => {
    const wide = renderView();
    expect(fullCalendar.props?.initialView).toBe('timeGridWeek');
    wide.unmount();

    setViewportWidth(375);
    renderView();
    expect(fullCalendar.props?.initialView).toBe('listWeek');
  });

  it('shows the patient, professional and specialty on each appointment', () => {
    renderView();
    const eventContent = fullCalendar.props?.eventContent as (info: unknown) => ReactNode;
    const events = fullCalendar.props?.events as Array<{ title: string; extendedProps: unknown }>;
    const { container } = render(
      <>{eventContent({ timeText: '10:00', event: { title: events[0].title, extendedProps: events[0].extendedProps } })}</>,
    );
    expect(container).toHaveTextContent('Ana Vega');
    expect(container).toHaveTextContent('Noa Paz');
    expect(container).toHaveTextContent('Nutrición');
    expect(container).toHaveTextContent('10:00');
  });

  it('still renders an appointment whose professional and specialty are missing', () => {
    const bare = { ...appointment, professional: null, specialty: null } as unknown as Appointment;
    renderView(undefined, [bare]);
    const eventContent = fullCalendar.props?.eventContent as (info: unknown) => ReactNode;
    const events = fullCalendar.props?.events as Array<{ title: string; extendedProps: unknown }>;
    const { container } = render(
      <>{eventContent({ timeText: '', event: { title: events[0].title, extendedProps: events[0].extendedProps } })}</>,
    );
    expect(container).toHaveTextContent('Ana Vega');
  });

  it('explains the status colours with a legend', () => {
    renderView();
    const legend = screen.getByRole('list', { name: 'Estados de las citas' });
    for (const label of ['Programada', 'Confirmada', 'Completada', 'Cancelada', 'No asistió']) {
      expect(within(legend).getByText(label)).toBeInTheDocument();
    }
  });
});
