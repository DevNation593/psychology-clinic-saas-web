'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, extractArray } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { AppointmentCreateInput } from '@/types';
import { toast } from 'sonner';

export function useAppointments(params?: Parameters<typeof appointmentsApi.list>[0]) {
  return useQuery({
    queryKey: [...QUERY_KEYS.APPOINTMENTS, params],
    queryFn: async () => {
      const response = await appointmentsApi.list(params);
      return extractArray(response);
    },
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.APPOINTMENT_DETAIL(id),
    queryFn: async () => {
      const response = await appointmentsApi.get(id);
      return response;
    },
    enabled: !!id,
  });
}

export function useTodayAppointments() {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...QUERY_KEYS.APPOINTMENTS, 'today'],
    queryFn: async () => {
      const response = await appointmentsApi.list({ from: today, to: today });
      return extractArray(response);
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

export function useUpcomingAppointments() {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...QUERY_KEYS.APPOINTMENTS, 'upcoming'],
    queryFn: async () => {
      const response = await appointmentsApi.list({ from: today, status: 'SCHEDULED' });
      return extractArray(response);
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AppointmentCreateInput) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
      toast.success('Cita creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear cita');
    },
  });
}

export function useUpdateAppointment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<AppointmentCreateInput>) => appointmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENT_DETAIL(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
      toast.success('Cita actualizada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar cita');
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      appointmentsApi.cancel(id, reason || 'Cancelada por el usuario'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
      toast.success('Cita cancelada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cancelar cita');
    },
  });
}
