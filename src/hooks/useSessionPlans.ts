'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionPlansApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { SessionPlan } from '@/types';
import { toast } from 'sonner';

export function usePatientSessionPlan(patientId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENT_SESSION_PLAN(patientId),
    queryFn: () => sessionPlansApi.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useCreateSessionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SessionPlan>) => sessionPlansApi.create(data),
    onSuccess: (_, variables) => {
      if (variables.patientId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PATIENT_SESSION_PLAN(variables.patientId),
        });
      }
      toast.success('Plan de sesión creado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear plan de sesión');
    },
  });
}

export function useUpdateSessionPlan(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SessionPlan>) =>
      sessionPlansApi.updateByPatient(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PATIENT_SESSION_PLAN(patientId),
      });
      toast.success('Plan de sesión actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar plan de sesión');
    },
  });
}

export function useDeleteSessionPlan(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => sessionPlansApi.deleteByPatient(patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PATIENT_SESSION_PLAN(patientId),
      });
      toast.success('Plan de sesión eliminado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar plan de sesión');
    },
  });
}
