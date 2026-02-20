'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, extractArray } from '@/lib/api/endpoints';
import { QUERY_KEYS, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { AppointmentDialog } from '@/features/calendar/appointment-dialog';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { Appointment } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import dynamic from 'next/dynamic';

// Dynamic import for FullCalendar to avoid SSR issues
const FullCalendarComponent = dynamic(() => import('@/features/calendar/calendar-view'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ),
});

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.APPOINTMENTS,
    queryFn: async () => {
      const response = await appointmentsApi.list();
      return extractArray(response);
    },
  });

  const reschedule = useMutation({
    mutationFn: ({ id, startTime, duration }: { id: string; startTime: string; duration: number }) =>
      appointmentsApi.update(id, { startTime, duration }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
      toast.success('Cita reprogramada');
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
      toast.error(error.message || 'Error al reprogramar cita');
    },
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const handleEventDrop = (appointmentId: string, newStart: string, newEnd: string) => {
    const start = new Date(newStart).getTime();
    const end = new Date(newEnd).getTime();
    const duration = Math.max(15, Math.round((end - start) / 60000));
    reschedule.mutate({ id: appointmentId, startTime: newStart, duration });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las citas de tus pacientes
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <FullCalendarComponent
          events={appointmentsData || []}
          onDateSelect={handleDateSelect}
          onEventClick={(appointment) => setSelectedAppointment(appointment)}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventDrop}
        />
      </div>

      <AppointmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialDate={selectedDate}
      />

      {/* Appointment Detail Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedAppointment?.title || 'Detalle de Cita'}</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Paciente</p>
                  <p className="font-medium">
                    {selectedAppointment.patient.firstName} {selectedAppointment.patient.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Psicólogo</p>
                  <p className="font-medium">
                    {selectedAppointment.psychologist.firstName} {selectedAppointment.psychologist.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inicio</p>
                  <p className="font-medium">{formatDate(selectedAppointment.startTime, 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fin</p>
                  <p className="font-medium">{formatDate(selectedAppointment.endTime, 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <Badge className={APPOINTMENT_STATUS_COLORS[selectedAppointment.status]}>
                    {APPOINTMENT_STATUS_LABELS[selectedAppointment.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Modalidad</p>
                  <p className="font-medium">{selectedAppointment.isOnline ? 'Online' : 'Presencial'}</p>
                </div>
              </div>
              {selectedAppointment.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="text-sm">{selectedAppointment.description}</p>
                </div>
              )}
              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
