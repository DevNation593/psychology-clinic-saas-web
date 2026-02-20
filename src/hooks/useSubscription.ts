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

// Note: Plans are fetched via tenant subscription endpoint
// The subscription object already contains the plan details

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
      // Invalidate subscription and usage queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION_USAGE });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT });
      
      toast.success(response.message || '¡Plan actualizado exitosamente!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar el plan';
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
      
      toast.success('Downgrade programado para fin del período actual');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al programar downgrade';
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
