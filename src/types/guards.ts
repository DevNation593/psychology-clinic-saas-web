// Type guards for runtime type checking

import { 
  User, 
  UserRole, 
  AppointmentStatus, 
  TaskStatus, 
  Subscription, 
  SubscriptionStatus,
  FeatureFlags,
  UsageMetrics,
  PlanTier,
} from './index';

export function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

export function canAccessClinicalNotes(user: User): boolean {
  return [UserRole.TENANT_ADMIN, UserRole.PSYCHOLOGIST].includes(user.role);
}

export function canManageUsers(user: User): boolean {
  return user.role === UserRole.TENANT_ADMIN;
}

export function canManageSubscription(user: User): boolean {
  return user.role === UserRole.TENANT_ADMIN;
}

export function canEditAppointment(user: User): boolean {
  return user.role !== UserRole.ASSISTANT; // All except assistant
}

export function canDeletePatient(user: User): boolean {
  return user.role === UserRole.TENANT_ADMIN;
}

export function isActiveAppointment(status: AppointmentStatus): boolean {
  return [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED].includes(status);
}

export function isOverdueTask(task: { dueDate?: string; status: TaskStatus }): boolean {
  if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
  return new Date(task.dueDate) < new Date();
}

// ==========================================
// SUBSCRIPTION & FEATURE FLAGS
// ==========================================

export function isFeatureAvailable(
  feature: keyof FeatureFlags,
  subscription: Subscription
): boolean {
  return subscription.plan.features[feature] === true;
}

export function isSubscriptionActive(subscription: Subscription): boolean {
  return [
    SubscriptionStatus.TRIAL,
    SubscriptionStatus.ACTIVE,
  ].includes(subscription.status);
}

export function isSubscriptionDegraded(subscription: Subscription): boolean {
  return [
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.SUSPENDED,
  ].includes(subscription.status);
}

export function canCreateRecords(subscription: Subscription): boolean {
  // Can create if active or in trial
  // Cannot create if past_due (after grace), suspended, canceled, archived
  return [
    SubscriptionStatus.TRIAL,
    SubscriptionStatus.ACTIVE,
  ].includes(subscription.status);
}

// ==========================================
// LIMIT CHECKERS
// ==========================================

export function canAddPsychologist(usage: UsageMetrics): boolean {
  return usage.users.psychologists.active < usage.users.psychologists.limit;
}

export function canAddPatient(usage: UsageMetrics): boolean {
  return usage.patients.active < usage.patients.limit;
}

export function canUploadFile(
  usage: UsageMetrics,
  fileSizeBytes: number
): boolean {
  const newUsageGB = usage.storage.usedGB + (fileSizeBytes / 1e9);
  return newUsageGB <= usage.storage.limitGB;
}

export function isApproachingLimit(
  used: number,
  limit: number,
  threshold: number = 80
): boolean {
  const percentUsed = (used / limit) * 100;
  return percentUsed >= threshold;
}

export function hasExceededLimit(used: number, limit: number): boolean {
  return used >= limit;
}

export function getRemainingSeats(usage: UsageMetrics): number {
  return Math.max(0, usage.users.psychologists.limit - usage.users.psychologists.active);
}

export function getRemainingPatients(usage: UsageMetrics): number {
  return Math.max(0, usage.patients.limit - usage.patients.active);
}

export function getRemainingStorageGB(usage: UsageMetrics): number {
  return Math.max(0, usage.storage.limitGB - usage.storage.usedGB);
}

// ==========================================
// PLAN COMPARISON
// ==========================================

export function canUpgradeTo(
  currentTier: PlanTier,
  targetTier: PlanTier
): boolean {
  const tierOrder: Record<PlanTier, number> = {
    [PlanTier.TRIAL]: 0,
    [PlanTier.BASIC]: 1,
    [PlanTier.PROFESSIONAL]: 2,
    [PlanTier.ENTERPRISE]: 3,
  };
  
  return tierOrder[targetTier] > tierOrder[currentTier];
}

export function canDowngradeTo(
  currentTier: PlanTier,
  targetTier: PlanTier
): boolean {
  const tierOrder: Record<PlanTier, number> = {
    [PlanTier.TRIAL]: 0,
    [PlanTier.BASIC]: 1,
    [PlanTier.PROFESSIONAL]: 2,
    [PlanTier.ENTERPRISE]: 3,
  };
  
  return tierOrder[targetTier] < tierOrder[currentTier];
}

export function getPlanDisplayName(tier: PlanTier): string {
  const names: Record<PlanTier, string> = {
    [PlanTier.TRIAL]: 'Prueba',
    [PlanTier.BASIC]: 'Básico',
    [PlanTier.PROFESSIONAL]: 'Profesional',
    [PlanTier.ENTERPRISE]: 'Empresarial',
  };
  return names[tier];
}

export function getStatusDisplayName(status: SubscriptionStatus): string {
  const names = {
    [SubscriptionStatus.TRIAL]: 'Prueba',
    [SubscriptionStatus.ACTIVE]: 'Activa',
    [SubscriptionStatus.PAST_DUE]: 'Pago Pendiente',
    [SubscriptionStatus.SUSPENDED]: 'Suspendida',
    [SubscriptionStatus.CANCELED]: 'Cancelada',
    [SubscriptionStatus.ARCHIVED]: 'Archivada',
    [SubscriptionStatus.DELETED]: 'Eliminada',
  };
  return names[status];
}

export function getStatusColor(status: SubscriptionStatus): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case SubscriptionStatus.TRIAL:
    case SubscriptionStatus.ACTIVE:
      return 'success';
    case SubscriptionStatus.PAST_DUE:
      return 'warning';
    case SubscriptionStatus.SUSPENDED:
    case SubscriptionStatus.CANCELED:
    case SubscriptionStatus.ARCHIVED:
    case SubscriptionStatus.DELETED:
      return 'destructive';
    default:
      return 'secondary';
  }
}

