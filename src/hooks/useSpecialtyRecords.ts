'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { specialtyRecordsApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { toast } from 'sonner';

export function usePatientSpecialtyRecords(patientId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENT_SPECIALTY_RECORDS(patientId),
    queryFn: () => specialtyRecordsApi.list(patientId),
    enabled: Boolean(patientId),
  });
}

export function useCreateSpecialtyRecord(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof specialtyRecordsApi.create>[1]) =>
      specialtyRecordsApi.create(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_SPECIALTY_RECORDS(patientId) });
      toast.success('Registro especializado guardado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'No fue posible guardar el registro');
    },
  });
}