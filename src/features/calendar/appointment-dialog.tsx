'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { appointmentSchema, type AppointmentFormData } from '@/lib/validations/schemas';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { usersApi, extractArray } from '@/lib/api/endpoints';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { UserRole } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date | null;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  initialDate,
}: AppointmentDialogProps) {
  const { mutate: createAppointment, isPending } = useCreateAppointment();
  const { data: patientsData } = usePatients();
  const { data: psychologistsData } = useQuery({
    queryKey: [...QUERY_KEYS.USERS, { role: UserRole.PSYCHOLOGIST }],
    queryFn: async () => {
      const response = await usersApi.list({ role: UserRole.PSYCHOLOGIST });
      return extractArray(response);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      isOnline: false,
      startTime: initialDate ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : '',
      duration: 60,
    },
  });

  const isOnline = watch('isOnline');

  const onSubmit = (data: AppointmentFormData) => {
    createAppointment(data, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Cita</DialogTitle>
          <DialogDescription>
            Programa una nueva cita con un paciente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientId" required>
                Paciente
              </Label>
              <select
                id="patientId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('patientId')}
              >
                <option value="">Seleccionar paciente</option>
                {patientsData?.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </option>
                ))}
              </select>
              {errors.patientId && (
                <p className="text-sm text-destructive">{errors.patientId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="psychologistId" required>
                Psicólogo/a
              </Label>
              <select
                id="psychologistId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('psychologistId')}
              >
                <option value="">Seleccionar psicólogo</option>
                {psychologistsData?.map((psychologist) => (
                  <option key={psychologist.id} value={psychologist.id}>
                    {psychologist.firstName} {psychologist.lastName}
                  </option>
                ))}
              </select>
              {errors.psychologistId && (
                <p className="text-sm text-destructive">{errors.psychologistId.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" required>
              Título de la Cita
            </Label>
            <Input
              id="title"
              placeholder="Sesión de terapia"
              {...register('title')}
              error={errors.title?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Notas adicionales sobre la cita..."
              {...register('description')}
              error={errors.description?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" required>
                Fecha y Hora de Inicio
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                {...register('startTime')}
                error={errors.startTime?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" required>
                Duración (minutos)
              </Label>
              <select
                id="duration"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('duration', { valueAsNumber: true })}
              >
                <option value={30}>30</option>
                <option value={45}>45</option>
                <option value={50}>50</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
              </select>
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isOnline"
              className="h-4 w-4 rounded border-input"
              {...register('isOnline')}
            />
            <Label htmlFor="isOnline">Sesión en línea</Label>
          </div>

          {isOnline && (
            <div className="space-y-2">
              <Label htmlFor="meetingUrl">URL de la Reunión</Label>
              <Input
                id="meetingUrl"
                type="url"
                placeholder="https://meet.google.com/..."
                {...register('meetingUrl')}
                error={errors.meetingUrl?.message}
              />
            </div>
          )}

          {!isOnline && (
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                placeholder="Consultorio 101"
                {...register('location')}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending}>
              Crear Cita
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
