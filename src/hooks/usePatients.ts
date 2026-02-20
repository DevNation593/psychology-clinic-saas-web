'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi, extractArray } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { Patient } from '@/types';
import { toast } from 'sonner';

export function usePatients(params?: Parameters<typeof patientsApi.list>[0]) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PATIENTS, params],
    queryFn: async () => {
      const response = await patientsApi.list(params);
      return extractArray(response);
    },
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENT_DETAIL(id),
    queryFn: async () => {
      const response = await patientsApi.get(id);
      return response;
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Patient>) => patientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS });
      toast.success('Paciente creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear paciente');
    },
  });
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Patient>) => patientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_DETAIL(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS });
      toast.success('Paciente actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar paciente');
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENTS });
      toast.success('Paciente eliminado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar paciente');
    },
  });
}
