'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, extractArray } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { AppointmentCreateInput, AppointmentStatus, AppointmentUpdateInput } from '@/types';
import { toast } from 'sonner';
import { invalidateScopedLists } from './queryInvalidation';
import { requireTenantId, useTenantId } from './useTenantScope';
import { useTenantMutation } from './useTenantMutation';
import { getAppointmentErrorMessage } from '@/features/calendar/appointment-errors';

export function useAppointments(params?: Parameters<typeof appointmentsApi.list>[0]) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: QUERY_KEYS.APPOINTMENTS_SCOPED(tenantId ?? '', params),
    queryFn: async () => extractArray(await appointmentsApi.list(params, requireTenantId(tenantId))),
    enabled: !!tenantId,
  });
}

export function useAppointment(id: string) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: QUERY_KEYS.APPOINTMENT_DETAIL_SCOPED(tenantId ?? '', id),
    queryFn: () => appointmentsApi.get(id, requireTenantId(tenantId)),
    enabled: !!tenantId && !!id,
  });
}

export function useTodayAppointments() {
  const today = new Date().toISOString().split('T')[0];
  const tenantId = useTenantId();
  const params = { from: today, to: today };
  return useQuery({
    queryKey: QUERY_KEYS.APPOINTMENTS_SCOPED(tenantId ?? '', params),
    queryFn: async () => extractArray(await appointmentsApi.list(params, requireTenantId(tenantId))),
    enabled: !!tenantId,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useUpcomingAppointments() {
  const today = new Date().toISOString().split('T')[0];
  const tenantId = useTenantId();
  const params = { from: today, status: AppointmentStatus.SCHEDULED };
  return useQuery({
    queryKey: QUERY_KEYS.APPOINTMENTS_SCOPED(tenantId ?? '', params),
    queryFn: async () => extractArray(await appointmentsApi.list(params, requireTenantId(tenantId))),
    enabled: !!tenantId,
  });
}

export function useCreateAppointment() {
  const client = useQueryClient();
  return useTenantMutation({
    mutationFn: (data: AppointmentCreateInput, tenantId: string) => appointmentsApi.create(data, tenantId),
    onSuccess: async (_appointment, variables, scopedTenant) => {
      await Promise.all([
        invalidateScopedLists(client, 'appointments', scopedTenant),
        client.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_TEAM(scopedTenant, variables.patientId), exact: true }),
      ]);
      toast.success('Cita creada exitosamente');
    },
    onError: (error: Error) => toast.error(getAppointmentErrorMessage(error)),
  });
}

type AppointmentUpdateVariables = AppointmentUpdateInput & { previousPatientId?: string };

export function useUpdateAppointment(id: string) {
  const client = useQueryClient();
  return useTenantMutation({
    captureResource: () => id,
    mutationFn: ({ previousPatientId: _previousPatientId, ...data }: AppointmentUpdateVariables, tenantId: string, capturedId: string) =>
      appointmentsApi.update(capturedId, data, tenantId),
    onSuccess: async (_appointment, variables, scopedTenant, capturedId) => {
      const patientIds = new Set([variables.previousPatientId, variables.patientId].filter((value): value is string => !!value));
      await Promise.all([
        client.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENT_DETAIL_SCOPED(scopedTenant, capturedId), exact: true }),
        invalidateScopedLists(client, 'appointments', scopedTenant),
        ...[...patientIds].map((patientId) => client.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_TEAM(scopedTenant, patientId), exact: true })),
      ]);
      toast.success('Cita actualizada');
    },
    onError: (error: Error) => toast.error(getAppointmentErrorMessage(error)),
  });
}

export function useCancelAppointment() {
  const client = useQueryClient();
  return useTenantMutation({
    mutationFn: ({ id, reason }: { id: string; patientId: string; reason: string }, tenantId: string) =>
      appointmentsApi.cancel(id, reason, tenantId),
    onSuccess: async (_appointment, variables, scopedTenant) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENT_DETAIL_SCOPED(scopedTenant, variables.id), exact: true }),
        invalidateScopedLists(client, 'appointments', scopedTenant),
        client.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_TEAM(scopedTenant, variables.patientId), exact: true }),
      ]);
      toast.success('Cita cancelada');
    },
    onError: (error: Error) => toast.error(getAppointmentErrorMessage(error)),
  });
}
