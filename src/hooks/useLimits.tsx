'use client';

import { useState } from 'react';
import { useSubscription, useUsageMetrics } from './useSubscription';
import { 
  canAddPsychologist, 
  canAddPatient, 
  canUploadFile,
  isFeatureAvailable,
  getRemainingSeats,
  getRemainingPatients,
  getRemainingStorageGB,
} from '@/types/guards';
import type { FeatureFlags } from '@/types';

/**
 * Hook to check if a new psychologist can be invited
 * Opens SeatLimitModal if limit reached
 */
export function useCanInviteUser() {
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsageMetrics();
  const [showSeatLimitModal, setShowSeatLimitModal] = useState(false);

  const canInvite = subscription && usage 
    ? canAddPsychologist(usage)
    : false;

  const checkAndProceed = (onSuccess: () => void) => {
    if (canInvite) {
      onSuccess();
    } else {
      setShowSeatLimitModal(true);
    }
  };

  const remaining = subscription && usage 
    ? getRemainingSeats(usage)
    : 0;

  return {
    canInvite,
    remaining,
    checkAndProceed,
    showSeatLimitModal,
    setShowSeatLimitModal,
  };
}

/**
 * Hook to check if a new patient can be created
 * Opens PatientLimitModal if limit reached
 */
export function useCanCreatePatient() {
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsageMetrics();
  const [showPatientLimitModal, setShowPatientLimitModal] = useState(false);

  const canCreate = subscription && usage 
    ? canAddPatient(usage)
    : false;

  const checkAndProceed = (onSuccess: () => void) => {
    if (canCreate) {
      onSuccess();
    } else {
      setShowPatientLimitModal(true);
    }
  };

  const remaining = subscription && usage 
    ? getRemainingPatients(usage)
    : 0;

  return {
    canCreate,
    remaining,
    checkAndProceed,
    showPatientLimitModal,
    setShowPatientLimitModal,
  };
}

/**
 * Hook to check if a file can be uploaded
 * Opens StorageLimitModal if limit reached
 */
export function useCanUploadFile() {
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsageMetrics();
  const [showStorageLimitModal, setShowStorageLimitModal] = useState(false);
  const [rejectedFile, setRejectedFile] = useState<{ name: string; size: number } | null>(null);

  const checkAndProceed = (file: File, onSuccess: () => void) => {
    if (!subscription || !usage) {
      return;
    }

    const fileSizeGB = file.size / (1024 * 1024 * 1024);
    
    if (canUploadFile(usage, fileSizeGB * 1e9)) {
      onSuccess();
    } else {
      setRejectedFile({ name: file.name, size: file.size });
      setShowStorageLimitModal(true);
    }
  };

  const remainingGB = subscription && usage 
    ? getRemainingStorageGB(usage)
    : 0;

  return {
    checkAndProceed,
    remainingGB,
    showStorageLimitModal,
    setShowStorageLimitModal,
    rejectedFile,
  };
}

/**
 * Hook to check if a feature is available in current plan
 * Opens FeatureLockedModal if not available
 */
export function useFeatureGate(feature: keyof FeatureFlags) {
  const { data: subscription } = useSubscription();
  const [showFeatureLockedModal, setShowFeatureLockedModal] = useState(false);

  const isAvailable = subscription 
    ? isFeatureAvailable(feature, subscription)
    : false;

  const checkAndProceed = (onSuccess: () => void) => {
    if (isAvailable) {
      onSuccess();
    } else {
      setShowFeatureLockedModal(true);
    }
  };

  return {
    isAvailable,
    checkAndProceed,
    showFeatureLockedModal,
    setShowFeatureLockedModal,
  };
}

/**
 * Combined hook for all limit checks - useful for components that need multiple checks
 */
export function useLimitChecks() {
  const inviteCheck = useCanInviteUser();
  const patientCheck = useCanCreatePatient();
  const uploadCheck = useCanUploadFile();

  return {
    invite: inviteCheck,
    patient: patientCheck,
    upload: uploadCheck,
  };
}

/**
 * Hook that returns all current usage stats and remaining capacity
 */
export function useUsageStats() {
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsageMetrics();

  if (!subscription || !usage) {
    return null;
  }

  return {
    psychologists: {
      current: usage.users.psychologists.active,
      limit: subscription.plan.limits.maxPsychologists,
      remaining: getRemainingSeats(usage),
      percentage: (usage.users.psychologists.active / subscription.plan.limits.maxPsychologists) * 100,
    },
    patients: {
      current: usage.patients.active,
      limit: subscription.plan.limits.maxPatients,
      remaining: getRemainingPatients(usage),
      percentage: (usage.patients.active / subscription.plan.limits.maxPatients) * 100,
    },
    storage: {
      currentGB: usage.storage.usedGB,
      limitGB: subscription.plan.limits.storageGB,
      remainingGB: getRemainingStorageGB(usage),
      percentage: (usage.storage.usedGB / subscription.plan.limits.storageGB) * 100,
    },
  };
}
