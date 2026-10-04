'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { encountersApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import type { ApiError } from '@/types';
import type { EncounterInput } from '@/types/clinical';

export function usePatientEncounters(patientId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENT_ENCOUNTERS(patientId),
    queryFn: () => encountersApi.list(patientId),
    enabled: Boolean(patientId),
  });
}

function useEncounterMutation<TInput>(
  patientId: string,
  mutationFn: (input: TInput) => Promise<unknown>,
  messages: { success: string; error: string },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_ENCOUNTERS(patientId) });
      // Starting and closing an encounter moves its appointment along.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS });
      toast.success(messages.success);
    },
    onError: (error: ApiError) => {
      toast.error(error.message || messages.error);
    },
  });
}

export function useStartEncounter(patientId: string) {
  return useEncounterMutation(
    patientId,
    (data: EncounterInput) => encountersApi.start(patientId, data),
    { success: 'Atención iniciada', error: 'No fue posible iniciar la atención' },
  );
}

export function useCloseEncounter(patientId: string) {
  return useEncounterMutation(
    patientId,
    ({ encounterId, summary }: { encounterId: string; summary?: string }) =>
      encountersApi.close(patientId, encounterId, summary),
    { success: 'Atención cerrada', error: 'No fue posible cerrar la atención' },
  );
}

export function useRemoveEncounter(patientId: string) {
  return useEncounterMutation(
    patientId,
    ({ encounterId, reason }: { encounterId: string; reason: string }) =>
      encountersApi.remove(patientId, encounterId, reason),
    { success: 'Atención eliminada', error: 'No fue posible eliminar la atención' },
  );
}
