'use client';

import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { APPOINTMENT_STATUS_LABELS } from '@/lib/constants';
import { Appointment, AppointmentStatus, TenantSettings } from '@/types';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: '#3b82f6',
  [AppointmentStatus.CONFIRMED]: '#10b981',
  [AppointmentStatus.COMPLETED]: '#6b7280',
  [AppointmentStatus.CANCELLED]: '#ef4444',
  [AppointmentStatus.NO_SHOW]: '#f97316',
};
const LEGEND_ORDER: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];
const COMPACT_BREAKPOINT = 768;

/** FullCalendar durations are HH:MM:SS; an invalid length falls back to one hour. */
export function toSlotDuration(minutes: number): string {
  const safe = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 60;
  const hours = Math.floor(safe / 60).toString().padStart(2, '0');
  const rest = (safe % 60).toString().padStart(2, '0');
  return `${hours}:${rest}:00`;
}

interface CalendarViewProps {
  events: Appointment[];
  onDateSelect: (date: Date) => void;
  onEventClick: (event: Appointment) => void;
  onEventDrop?: (appointmentId: string, newStart: string, newEnd: string) => void;
  onEventResize?: (appointmentId: string, newStart: string, newEnd: string) => void;
  canEdit?: (appointment: Appointment) => boolean;
  settings?: TenantSettings;
}

export default function CalendarView({
  events,
  onDateSelect,
  onEventClick,
  onEventDrop,
  onEventResize,
  canEdit = () => false,
  settings,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);

  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const configuredDays = dayKeys
    .map((day, index) => ({ index, schedule: settings?.workingHours?.[day] }))
    .filter(({ schedule }) => schedule?.enabled);
  const enabledDays = configuredDays.length > 0 ? configuredDays : dayKeys.map((_, index) => ({ index }));
  const hiddenDays = dayKeys
    .map((_, index) => index)
    .filter((index) => !enabledDays.some((day) => day.index === index));
  const configuredSchedules = configuredDays
    .map(({ schedule }) => schedule)
    .filter((schedule): schedule is NonNullable<typeof schedule> => Boolean(schedule));
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const remainingMinutes = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${remainingMinutes}:00`;
  };
  const firstOpening = configuredSchedules.length > 0
    ? Math.min(...configuredSchedules.map((schedule) => toMinutes(schedule.startTime)))
    : 8 * 60;
  const lastClosing = configuredSchedules.length > 0
    ? Math.max(...configuredSchedules.map((schedule) => toMinutes(schedule.endTime)))
    : 20 * 60;
  const slotDuration = toSlotDuration(settings?.defaultSessionDuration ?? 60);
  // Phones cannot fit a week grid, so they start on the agenda list with fewer view buttons.
  const isCompact = typeof window !== 'undefined' && window.innerWidth < COMPACT_BREAKPOINT;

  const calendarEvents = events.map((appointment) => ({
    id: appointment.id,
    title: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    start: appointment.startTime,
    end: appointment.endTime,
    backgroundColor: getStatusColor(appointment.status),
    borderColor: getStatusColor(appointment.status),
    editable: canEdit(appointment),
    extendedProps: {
      appointment,
    },
  }));

  function getStatusColor(status: string): string {
    return STATUS_COLORS[status as AppointmentStatus] ?? STATUS_COLORS[AppointmentStatus.SCHEDULED];
  }

  return (
    <div className="space-y-4">
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
      initialView={isCompact ? 'listWeek' : 'timeGridWeek'}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: isCompact ? 'listWeek,timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
      }}
      eventContent={(info) => {
        const appointment = info.event.extendedProps.appointment as Appointment;
        const professional = appointment.professional
          ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
          : null;
        const detail = [professional, appointment.specialty?.name].filter(Boolean).join(' · ');
        return (
          <div className="overflow-hidden px-1 leading-tight">
            {info.timeText && <span className="mr-1 text-[0.7rem] opacity-90">{info.timeText}</span>}
            <span className="font-medium">{info.event.title}</span>
            {detail && <span className="block truncate text-[0.7rem] opacity-90">{detail}</span>}
          </div>
        );
      }}
      locale={esLocale}
      events={calendarEvents}
      editable={false}
      selectable={true}
      selectMirror={true}
      dayMaxEvents={true}
      weekends={true}
      hiddenDays={hiddenDays}
      slotMinTime={formatTime(firstOpening)}
      slotMaxTime={formatTime(lastClosing)}
      scrollTime={formatTime(firstOpening)}
      slotDuration={slotDuration}
      snapDuration={slotDuration}
      height="auto"
      select={(info) => onDateSelect(info.start)}
      eventClick={(info) => {
        const appointment = info.event.extendedProps.appointment;
        onEventClick(appointment);
      }}
      eventDrop={(info) => {
        const appointment = info.event.extendedProps.appointment as Appointment;
        if (!canEdit(appointment)) {
          info.revert();
          return;
        }
        const newStart = info.event.start?.toISOString();
        const newEnd = info.event.end?.toISOString();
        if (onEventDrop && newStart && newEnd) {
          onEventDrop(appointment.id, newStart, newEnd);
        } else {
          info.revert();
        }
      }}
      eventResize={(info) => {
        const appointment = info.event.extendedProps.appointment as Appointment;
        if (!canEdit(appointment)) {
          info.revert();
          return;
        }
        const newStart = info.event.start?.toISOString();
        const newEnd = info.event.end?.toISOString();
        if (onEventResize && newStart && newEnd) {
          onEventResize(appointment.id, newStart, newEnd);
        } else {
          info.revert();
        }
      }}
    />
    <ul aria-label="Estados de las citas" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {LEGEND_ORDER.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
          {APPOINTMENT_STATUS_LABELS[status]}
        </li>
      ))}
    </ul>
    </div>
  );
}
