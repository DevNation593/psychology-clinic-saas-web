'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { patientTeamApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { invalidateScopedLists } from './queryInvalidation';
import { requireTenantId, useTenantId } from './useTenantScope';
import { useTenantMutation } from './useTenantMutation';

export function usePatientTeam(patientId: string) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: QUERY_KEYS.PATIENT_TEAM(tenantId ?? '', patientId),
    queryFn: () => patientTeamApi.list(requireTenantId(tenantId), patientId),
    enabled: !!tenantId && !!patientId,
  });
}

export function useEligiblePatientProfessionals(patientId: string, specialtyId?: string) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: QUERY_KEYS.PATIENT_TEAM_ELIGIBLE(tenantId ?? '', patientId, specialtyId),
    queryFn: () => patientTeamApi.listEligible(requireTenantId(tenantId), patientId, specialtyId),
    enabled: !!tenantId && !!patientId,
  });
}

function useTeamMutation(patientId: string, action: 'assign' | 'remove') {
  const client = useQueryClient();
  return useTenantMutation({
    captureResource: () => patientId,
    mutationFn: (professionalId: string, tenantId: string, capturedPatientId: string) => {
      if (!capturedPatientId) throw new Error('Patient ID is required.');
      return patientTeamApi[action](tenantId, capturedPatientId, professionalId);
    },
    onSuccess: async (_result, _professionalId, scopedTenant, capturedPatientId) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_TEAM(scopedTenant, capturedPatientId), exact: true }),
        client.invalidateQueries({ queryKey: ['patient-team', scopedTenant, capturedPatientId, 'eligible'] }),
        invalidateScopedLists(client, 'appointments', scopedTenant),
      ]);
    },
  });
}

export function useAssignPatientProfessional(patientId: string) {
  return useTeamMutation(patientId, 'assign');
}

export function useRemovePatientProfessional(patientId: string) {
  return useTeamMutation(patientId, 'remove');
}
