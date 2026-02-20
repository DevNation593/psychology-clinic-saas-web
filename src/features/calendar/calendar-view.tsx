'use client';

import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { Appointment } from '@/types';

interface CalendarViewProps {
  events: Appointment[];
  onDateSelect: (date: Date) => void;
  onEventClick: (event: Appointment) => void;
  onEventDrop?: (appointmentId: string, newStart: string, newEnd: string) => void;
  onEventResize?: (appointmentId: string, newStart: string, newEnd: string) => void;
}

export default function CalendarView({ events, onDateSelect, onEventClick, onEventDrop, onEventResize }: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);

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
      slotMinTime="08:00:00"
      slotMaxTime="20:00:00"
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
