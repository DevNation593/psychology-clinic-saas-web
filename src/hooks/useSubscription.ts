'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { toast } from 'sonner';
import type { 
  Subscription, 
  UpgradeRequest, 
  DowngradeRequest, 
} from '@/types';
import { PlanTier } from '@/types';

// ==========================================
// GET QUERIES
// ==========================================

export function useSubscription() {
  return useQuery({
    queryKey: QUERY_KEYS.SUBSCRIPTION,
    queryFn: async () => {
      const response = await subscriptionApi.getCurrent();
      return response;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePlanCatalog() {
  return useQuery({
    queryKey: QUERY_KEYS.PLANS,
    queryFn: () => subscriptionApi.getPlans(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSubscriptionPayments() {
  return useQuery({
    queryKey: QUERY_KEYS.SUBSCRIPTION_PAYMENTS,
    queryFn: () => subscriptionApi.getPayments(),
  });
}

export function useUsageMetrics(period?: 'current' | 'previous' | string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SUBSCRIPTION_USAGE, period],
    queryFn: async () => {
      const response = await subscriptionApi.getUsage({ period });
      return response;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

// ==========================================
// MUTATIONS
// ==========================================

export function useUpgradePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpgradeRequest) => subscriptionApi.upgrade(data),
    onSuccess: (response) => {
      // The plan itself does not change yet: only the pending payment appears.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION });

      toast.success(response.message || 'Solicitud registrada. Pendiente de pago.');
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || error.message || 'Error al solicitar la mejora';
      toast.error(message);
    },
  });
}

export function useDowngradePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DowngradeRequest) => subscriptionApi.downgrade(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION_USAGE });

      toast.success(response.message || 'Cambio programado para el fin del período actual');
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Error al programar el cambio de plan';
      toast.error(message);
    },
  });
}

// ==========================================
// COMPUTED/HELPER HOOKS
// ==========================================

export function useFeatureAccess(feature: keyof Subscription['plan']['features']) {
  const { data: subscription } = useSubscription();
  
  if (!subscription) return false;
  
  return subscription.plan.features[feature] === true || 
         subscription.plan.features[feature] === 'full';
}

export function useCanUpgrade(): boolean {
  const { data: subscription } = useSubscription();
  
  if (!subscription) return false;
  
  // Can upgrade if on BASIC or PRO (not CUSTOM)
  return [PlanTier.TRIAL, PlanTier.BASIC, PlanTier.PROFESSIONAL].includes(subscription.plan.planType);
}

export function useCanAddSeats(): boolean {
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsageMetrics();
  
  if (!subscription || !usage) return false;
  
  // Can add seats only on PRO plan and if under limit
  return (
    subscription.plan.planType === PlanTier.PROFESSIONAL &&
    usage.users.psychologists.active < usage.users.psychologists.limit
  );
}

export function useSubscriptionStatus() {
  const { data: subscription } = useSubscription();
  
  return {
    isActive: subscription?.status === 'ACTIVE',
    isTrial: subscription?.status === 'TRIAL',
    isPastDue: subscription?.status === 'PAST_DUE',
    isSuspended: subscription?.status === 'SUSPENDED',
    isCanceled: subscription?.status === 'CANCELED',
    canCreateRecords: ['ACTIVE', 'TRIAL'].includes(subscription?.status || ''),
  };
}
