'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { AppointmentDialog } from '@/features/calendar/appointment-dialog';
import { AppointmentDetailsDialog } from '@/features/calendar/appointment-details-dialog';
import { useAppointments, useUpdateAppointment } from '@/hooks/useAppointments';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useAuthStore } from '@/store/authStore';
import { canEditAppointment } from '@/types/guards';
import type { Appointment } from '@/types';
import { Button } from '@/components/ui/button';

const FullCalendarComponent = dynamic(() => import('@/features/calendar/calendar-view'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] items-center justify-center" role="status" aria-label="Cargando calendario">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  ),
});

interface RescheduleRequest {
  id: string;
  startTime: string;
  duration: number;
}

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const deepLinkedAppointmentId = searchParams.get('appointmentId') ?? '';
  const user = useAuthStore((state) => state.user);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [rescheduleRequest, setRescheduleRequest] = useState<RescheduleRequest | null>(null);
  const appointments = useAppointments();
  const { data: settings } = useTenantSettings();
  const updateAppointment = useUpdateAppointment(rescheduleRequest?.id ?? '');
  const updateAppointmentRef = useRef(updateAppointment.mutate);
  updateAppointmentRef.current = updateAppointment.mutate;
  const handledDeepLinkRef = useRef('');

  useEffect(() => {
    if (appointments.isLoading || !deepLinkedAppointmentId) return;
    // Open each deep link once; later refetches must not reopen a dismissed appointment.
    if (handledDeepLinkRef.current === deepLinkedAppointmentId) return;
    const match = appointments.data?.find((appointment) => appointment.id === deepLinkedAppointmentId);
    if (!match) return;
    handledDeepLinkRef.current = deepLinkedAppointmentId;
    setSelectedAppointment(match);
  }, [appointments.data, appointments.isLoading, deepLinkedAppointmentId]);

  useEffect(() => {
    if (!rescheduleRequest) return;
    const { startTime, duration } = rescheduleRequest;
    updateAppointmentRef.current({ startTime, duration });
    setRescheduleRequest(null);
  }, [rescheduleRequest]);

  const actorCanEdit = (appointment: Appointment) =>
    !!user && canEditAppointment(user, appointment);

  const handleDateSelect = (date: Date) => {
    setEditingAppointment(null);
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setIsDialogOpen(nextOpen);
    if (!nextOpen) {
      setEditingAppointment(null);
      setSelectedDate(null);
    }
  };

  const handleReschedule = (appointmentId: string, newStart: string, newEnd: string) => {
    const appointment = appointments.data?.find((item) => item.id === appointmentId);
    if (!appointment || !actorCanEdit(appointment)) return;
    const start = new Date(newStart).getTime();
    const end = new Date(newEnd).getTime();
    const duration = Math.max(15, Math.round((end - start) / 60000));
    setRescheduleRequest({ id: appointmentId, startTime: newStart, duration });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          <p className="mt-1 text-muted-foreground">Gestiona las citas de tus pacientes</p>
        </div>
        <Button onClick={() => {
          setEditingAppointment(null);
          setSelectedDate(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva cita
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        {appointments.isLoading ? (
          <div className="flex h-96 items-center justify-center" role="status">Cargando citas...</div>
        ) : appointments.isError ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3" role="alert">
            <p>No se pudieron cargar las citas.</p>
            <Button type="button" variant="outline" onClick={() => appointments.refetch()}>
              Reintentar citas
            </Button>
          </div>
        ) : (
          <FullCalendarComponent
            events={appointments.data ?? []}
            onDateSelect={handleDateSelect}
            onEventClick={setSelectedAppointment}
            onEventDrop={handleReschedule}
            onEventResize={handleReschedule}
            canEdit={actorCanEdit}
            settings={settings}
          />
        )}
      </div>

      <AppointmentDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        appointment={editingAppointment}
        initialDate={selectedDate}
      />

      <AppointmentDetailsDialog
        open={!!selectedAppointment}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onEdit={(appointment) => {
          setSelectedAppointment(null);
          setEditingAppointment(appointment);
          setSelectedDate(null);
          setIsDialogOpen(true);
        }}
      />
    </div>
  );
}
