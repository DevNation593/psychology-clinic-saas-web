'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import type {
  ApiError,
  ChangePlatformPlanInput,
  CreatePlatformTenantInput,
  PlatformPayment,
  PlatformTenantDetail,
  PlatformTenantListParams,
  SectionKey,
  SubscriptionPayment,
  UpdatePlatformTenantInput,
} from '@/types';

export function usePlatformSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_SUMMARY,
    queryFn: () => platformApi.getSummary(),
  });
}

export function usePlatformTenants(params: PlatformTenantListParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_TENANTS, params],
    queryFn: () => platformApi.listTenants(params),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformTenant(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_TENANT(id),
    queryFn: () => platformApi.getTenant(id),
    enabled: !!id,
  });
}

export function useSectionCatalog() {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_SECTION_CATALOG,
    queryFn: () => platformApi.getSectionCatalog(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePlatformTenant() {
  const queryClient = useQueryClient();
  return useMutation<PlatformTenantDetail, ApiError, CreatePlatformTenantInput>({
    mutationFn: (input) => platformApi.createTenant(input),
    // The variables carry the temporary password: do not keep them in the mutation cache.
    gcTime: 0,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_TENANTS });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_SUMMARY });
    },
  });
}

/** Refreshes the clinic and every panel view that lists or counts clinics. */
function useInvalidateTenant(id: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_TENANT(id) });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_TENANTS });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_SUMMARY });
  };
}

export function useUpdatePlatformTenant(id: string) {
  const invalidate = useInvalidateTenant(id);
  return useMutation<PlatformTenantDetail, ApiError, UpdatePlatformTenantInput>({
    mutationFn: (input) => platformApi.updateTenant(id, input),
    onSuccess: invalidate,
  });
}

export function useChangeTenantPlan(id: string) {
  const invalidate = useInvalidateTenant(id);
  return useMutation<PlatformTenantDetail, ApiError, ChangePlatformPlanInput>({
    mutationFn: (input) => platformApi.changePlan(id, input),
    onSuccess: invalidate,
  });
}

export function useSuspendTenant(id: string) {
  const invalidate = useInvalidateTenant(id);
  return useMutation<PlatformTenantDetail, ApiError, string>({
    mutationFn: (reason) => platformApi.suspendTenant(id, reason),
    onSuccess: invalidate,
  });
}

export function useReactivateTenant(id: string) {
  const invalidate = useInvalidateTenant(id);
  return useMutation<PlatformTenantDetail, ApiError, void>({
    mutationFn: () => platformApi.reactivateTenant(id),
    onSuccess: invalidate,
  });
}

export function useSetTenantSections(id: string) {
  const invalidate = useInvalidateTenant(id);
  return useMutation<PlatformTenantDetail, ApiError, SectionKey[]>({
    mutationFn: (sections) => platformApi.setSections(id, sections),
    onSuccess: invalidate,
  });
}

/** The variables are the temporary password: nothing is written to the cache and the mutation is not kept. */
export function useResetMasterPassword(id: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (temporaryPassword) => platformApi.resetMasterPassword(id, temporaryPassword),
    gcTime: 0,
    // The master must now change the password, so only the clinic itself needs a refresh.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_TENANT(id) });
    },
  });
}

export function usePlatformPayments(status: SubscriptionPayment['status'] | '') {
  return useQuery<PlatformPayment[], ApiError>({
    queryKey: [...QUERY_KEYS.PLATFORM_PAYMENTS, status],
    queryFn: () => platformApi.listPayments(status || undefined),
    placeholderData: keepPreviousData,
  });
}

/** A resolved payment changes the payment lists and the summary counters. */
function useInvalidatePayments() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_PAYMENTS });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_SUMMARY });
  };
}

export function useConfirmPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation<void, ApiError, { id: string; reference: string; note?: string }>({
    mutationFn: ({ id, ...input }) => platformApi.confirmPayment(id, input),
    onSuccess: invalidate,
  });
}

export function useRejectPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation<void, ApiError, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => platformApi.rejectPayment(id, reason),
    onSuccess: invalidate,
  });
}
