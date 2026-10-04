'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { catalogsApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { requireTenantId, useTenantId } from '@/hooks/useTenantScope';
import type { ApiError } from '@/types';
import type { FormField, MedicationInput, MedicationUpdate } from '@/types/clinical';

/** What a catalog offers for a field: the value to write and the sibling fields it can fill. */
export interface LookupSuggestion {
  value: string;
  detail: string;
  fill: Record<string, string>;
}

/**
 * Searches the catalog behind a form field. Diagnoses fill `description` and `system` of the
 * same row; medications fill `activeIngredient` and `presentation`.
 */
export function useLookupSearch(lookup: NonNullable<FormField['lookup']>) {
  const tenantId = useTenantId();

  return useCallback(
    async (term: string): Promise<LookupSuggestion[]> => {
      if (!tenantId || term.trim().length < 2) return [];
      if (lookup === 'diagnosis') {
        const codes = await catalogsApi.searchDiagnosisCodes(tenantId, term.trim());
        return codes.map((code) => ({
          value: code.code,
          detail: code.description,
          fill: { description: code.description, system: code.system },
        }));
      }
      const medications = await catalogsApi.listMedications(tenantId, term.trim());
      return medications.map((medication) => ({
        value: [medication.commercialName, medication.concentration].filter(Boolean).join(' '),
        detail: [medication.activeIngredient, medication.presentation].filter(Boolean).join(' · '),
        fill: {
          activeIngredient: medication.activeIngredient ?? '',
          presentation: medication.presentation ?? '',
        },
      }));
    },
    [lookup, tenantId],
  );
}

/** The whole medication catalog of the clinic, inactive entries included. */
export function useMedications() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: QUERY_KEYS.MEDICATIONS(tenantId ?? ''),
    queryFn: () => catalogsApi.listMedications(requireTenantId(tenantId)),
    enabled: !!tenantId,
  });
}

/** Adds a medication, or updates it when `medicationId` is given. */
export function useSaveMedication() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: ({
      medicationId,
      data,
    }: {
      medicationId?: string;
      data: MedicationInput | MedicationUpdate;
    }) =>
      medicationId
        ? catalogsApi.updateMedication(requireTenantId(tenantId), medicationId, data)
        : catalogsApi.createMedication(requireTenantId(tenantId), data as MedicationInput),
    onSuccess: () => {
      if (tenantId) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MEDICATIONS(tenantId) });
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'No fue posible guardar el medicamento');
    },
  });
}
