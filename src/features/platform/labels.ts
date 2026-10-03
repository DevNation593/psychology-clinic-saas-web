import type { ApiPlanType, ApiSubscriptionStatus } from '@/types';

export const PLAN_LABELS: Record<ApiPlanType, string> = {
  TRIAL: 'Prueba',
  PERSONAL_BASIC: 'Personal Básico',
  PERSONAL_PRO: 'Personal Pro',
  CLINIC_BASIC: 'Clínica Básico',
  CLINIC_PRO: 'Clínica Pro',
  CLINIC_ENTERPRISE: 'Clínica Enterprise',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<ApiSubscriptionStatus, string> = {
  TRIALING: 'En prueba',
  ACTIVE: 'Al día',
  PAST_DUE: 'Vencido',
  UNPAID: 'Bloqueado',
  CANCELED: 'Bloqueado',
  INCOMPLETE: 'Bloqueado',
};

export const SUSPENDED_LABEL = 'Suspendido';

/** An inactive clinic reads as suspended whatever its subscription says. */
export function tenantStatusLabel(tenant: {
  isActive: boolean;
  status: ApiSubscriptionStatus | null;
}): string {
  if (!tenant.isActive) return SUSPENDED_LABEL;
  return tenant.status ? SUBSCRIPTION_STATUS_LABELS[tenant.status] : 'Sin suscripción';
}
