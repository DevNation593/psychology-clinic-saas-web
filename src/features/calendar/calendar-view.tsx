'use client';

import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { Appointment, TenantSettings } from '@/types';

interface CalendarViewProps {
  events: Appointment[];
  onDateSelect: (date: Date) => void;
  onEventClick: (event: Appointment) => void;
  onEventDrop?: (appointmentId: string, newStart: string, newEnd: string) => void;
  onEventResize?: (appointmentId: string, newStart: string, newEnd: string) => void;
  settings?: TenantSettings;
}

export default function CalendarView({
  events,
  onDateSelect,
  onEventClick,
  onEventDrop,
  onEventResize,
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
  const configuredDuration = settings?.defaultSessionDuration || 60;
  const slotDuration = `00:${Math.floor(configuredDuration / 60)
    .toString()
    .padStart(2, '0')}:${(configuredDuration % 60).toString().padStart(2, '0')}`;

  const calendarEvents = events.map((appointment) => ({
    id: appointment.id,
    title: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    start: appointment.startTime,
    end: appointment.endTime,
    backgroundColor: getStatusColor(appointment.status),
    borderColor: getStatusColor(appointment.status),
    extendedProps: {
      appointment,
    },
  }));

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      SCHEDULED: '#3b82f6',
      CONFIRMED: '#10b981',
      CANCELLED: '#ef4444',
      COMPLETED: '#6b7280',
      NO_SHOW: '#f97316',
    };
    return colors[status] || '#3b82f6';
  }

  return (
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
      initialView="timeGridWeek"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
      }}
      locale={esLocale}
      events={calendarEvents}
      editable={true}
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
        const newStart = info.event.start?.toISOString();
        const newEnd = info.event.end?.toISOString();
        if (onEventResize && newStart && newEnd) {
          onEventResize(appointment.id, newStart, newEnd);
        } else {
          info.revert();
        }
      }}
    />
  );
}
