import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import {
  User,
  Patient,
  PatientDetail,
  Appointment,
  AppointmentCreateInput,
  Task,
  ClinicalNote,
  SessionPlan,
  Notification,
  UsageMetrics,
  Tenant,
  Subscription,
  LoginCredentials,
  AuthResponse,
  PaginatedResponse,
  OnboardingTenantInput,
  OnboardingAdminInput,
  OnboardingInviteInput,
  UpgradeRequest,
  UpgradeResponse,
  DowngradeRequest,
  DowngradeResponse,
  PlanTier,
  SubscriptionStatus,
  FeatureFlags,
  ResourceLimits,
  Plan,
  TenantSettings,
  WorkingHours,
  ReminderRule,
} from '@/types';

// ==========================================
// HELPER: Get tenantId from auth store
// ==========================================

function getTenantId(): string {
  const state = useAuthStore.getState();
  const tenantId = state.tenant?.id || state.user?.tenantId;
  if (!tenantId) {
    throw new Error('No tenant ID available. User must be authenticated.');
  }
  return tenantId;
}

function mapPlanType(apiPlan: string): PlanTier {
  switch (apiPlan) {
    case 'PRO':
      return PlanTier.PROFESSIONAL;
    case 'CUSTOM':
      return PlanTier.ENTERPRISE;
    case 'BASIC':
      return PlanTier.BASIC;
    default:
      return PlanTier.TRIAL;
  }
}

function mapSubscriptionStatus(apiStatus: string): SubscriptionStatus {
  switch (apiStatus) {
    case 'TRIALING':
      return SubscriptionStatus.TRIAL;
    case 'ACTIVE':
      return SubscriptionStatus.ACTIVE;
    case 'PAST_DUE':
      return SubscriptionStatus.PAST_DUE;
    case 'CANCELED':
      return SubscriptionStatus.CANCELED;
    case 'INCOMPLETE':
    case 'UNPAID':
      return SubscriptionStatus.SUSPENDED;
    default:
      return SubscriptionStatus.ARCHIVED;
  }
}

function defaultFeatureFlags(): FeatureFlags {
  return {
    dashboard: true,
    calendar: true,
    appointments: true,
    patients: true,
    clinicalNotes: false,
    tasks: false,
    attachments: false,
    sessionPlans: false,
    inAppNotifications: true,
    emailNotifications: true,
    webPush: false,
    smsNotifications: false,
    basicStats: true,
    advancedAnalytics: false,
    customReports: false,
    dataExport: false,
    googleCalendarSync: false,
    videoIntegration: false,
    apiAccess: 'none',
    webhooks: false,
    mfa: false,
    sso: false,
    auditLogs: false,
    customBranding: false,
  };
}

function normalizeSubscription(raw: any): Subscription {
  if (!raw) {
    throw new Error('Subscription data is missing');
  }

  // Already normalized shape.
  if (raw.plan && raw.plan.limits) {
    return raw as Subscription;
  }

  const planType = mapPlanType(raw.planType);
  const limits: ResourceLimits = {
    maxPsychologists: raw.seatsPsychologistsMax ?? 1,
    maxAssistants: null,
    maxPatients: raw.maxActivePatients ?? 10,
    storageGB: raw.storageGB ?? 0,
    maxEmailsPerMonth: raw.monthlyNotificationsLimit ?? 0,
    maxPushPerMonth: raw.monthlyNotificationsLimit ?? 0,
    maxSmsPerMonth: raw.monthlyNotificationsLimit ?? 0,
    maxApiRequestsPerHour: null,
  };

  const features = {
    ...defaultFeatureFlags(),
    clinicalNotes: !!raw.featureClinicalNotes || !!raw.features?.clinicalNotes,
    tasks: !!raw.featureTasks || !!raw.features?.tasks,
    attachments: !!raw.featureAttachments || !!raw.features?.attachments,
    sessionPlans: !!raw.featureTasks || !!raw.features?.sessionPlans,
    webPush: !!raw.featureWebPush || !!raw.features?.webPush,
    smsNotifications: !!raw.featureWhatsAppIntegration || !!raw.features?.smsNotifications,
    advancedAnalytics: !!raw.featureAdvancedAnalytics || !!raw.features?.advancedAnalytics,
    customReports: !!raw.featureCustomReports || !!raw.features?.customReports,
    dataExport: !!raw.featureCustomReports || !!raw.features?.dataExport,
    googleCalendarSync: !!raw.featureCalendarSync || !!raw.features?.googleCalendarSync,
    videoIntegration: !!raw.featureVideoConsultation || !!raw.features?.videoIntegration,
    apiAccess: raw.featureAPIAccess || raw.features?.apiAccess ? 'full' : 'none',
    webhooks: !!raw.featureAPIAccess || !!raw.features?.webhooks,
    mfa: !!raw.featureSSO || !!raw.features?.mfa,
    sso: !!raw.featureSSO || !!raw.features?.sso,
    auditLogs: !!raw.featureAdvancedAnalytics || !!raw.features?.auditLogs,
    customBranding: !!raw.featureWhatsAppIntegration || !!raw.features?.customBranding,
  } as FeatureFlags;

  const plan: Plan = {
    id: `plan-${planType.toLowerCase()}`,
    planType,
    name: planType,
    description: `${planType} plan`,
    basePrice: Math.round(Number(raw.basePrice ?? 0) * 100),
    currency: 'EUR',
    billingInterval: 'MONTHLY',
    limits,
    features,
    pricePerSeatMonthly: Math.round(Number(raw.pricePerSeat ?? 0) * 100),
    pricePerSeatYearly: Math.round(Number(raw.pricePerSeat ?? 0) * 100 * 12),
  };

  return {
    id: raw.id,
    tenantId: raw.tenantId,
    plan,
    status: mapSubscriptionStatus(raw.status),
    trialEndsAt: raw.trialEndsAt ?? null,
    currentPeriodStart: raw.currentPeriodStart ?? raw.startDate ?? new Date().toISOString(),
    currentPeriodEnd: raw.currentPeriodEnd ?? raw.endDate ?? new Date().toISOString(),
    canceledAt: raw.canceledAt ?? null,
    cancelAtPeriodEnd: !!raw.cancelAt,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeWorkingHours(raw: any): WorkingHours {
  const defaultDay = { enabled: false, startTime: '09:00', endTime: '18:00' };
  const enabledDays = new Set<string>(raw?.workingDays ?? []);
  const start = raw?.workingHoursStart ?? '09:00';
  const end = raw?.workingHoursEnd ?? '18:00';

  const toDay = (apiDay: string) => ({
    ...defaultDay,
    enabled: enabledDays.has(apiDay),
    startTime: start,
    endTime: end,
  });

  return {
    monday: toDay('MONDAY'),
    tuesday: toDay('TUESDAY'),
    wednesday: toDay('WEDNESDAY'),
    thursday: toDay('THURSDAY'),
    friday: toDay('FRIDAY'),
    saturday: toDay('SATURDAY'),
    sunday: toDay('SUNDAY'),
  };
}

function normalizeTenantSettings(raw: any): TenantSettings {
  if (!raw) {
    return {
      workingHours: normalizeWorkingHours(null),
      defaultSessionDuration: 60,
      reminderRules: [],
      timezone: 'America/Mexico_City',
      locale: 'es-MX',
    };
  }

  // Already frontend shape.
  if (raw.workingHours) {
    return raw as TenantSettings;
  }

  const reminderRules: ReminderRule[] = (raw.reminderRules ?? []).map((r: string, i: number) => {
    const value = String(r).toLowerCase();
    let minutesBefore = 60;
    if (value.endsWith('h')) minutesBefore = Number(value.replace('h', '')) * 60;
    if (value.endsWith('m')) minutesBefore = Number(value.replace('m', ''));
    return {
      id: `${i + 1}`,
      type: 'PUSH',
      minutesBefore,
      enabled: !!raw.reminderEnabled,
    };
  });

  return {
    workingHours: normalizeWorkingHours(raw),
    defaultSessionDuration: raw.defaultAppointmentDuration ?? 60,
    reminderRules,
    timezone: raw.timezone ?? 'America/Mexico_City',
    locale: raw.locale ?? 'es-MX',
  };
}

function normalizeTenant(raw: any): Tenant {
  return {
    ...raw,
    settings: normalizeTenantSettings(raw.settings),
    subscription: normalizeSubscription(raw.subscription),
  } as Tenant;
}

function normalizeUser(raw: any): User {
  return {
    ...raw,
    isActive: raw?.isActive ?? true,
    emailVerified: raw?.emailVerified ?? true,
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
  } as User;
}

// ==========================================
// AUTH API (public, no tenantId required)
// ==========================================

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<AuthResponse>(API_ENDPOINTS.LOGIN, credentials).then((raw) => ({
      ...raw,
      user: normalizeUser(raw.user),
    })),

  refresh: (refreshToken: string) =>
    apiClient
      .post<{ accessToken: string; refreshToken: string; user?: User }>(API_ENDPOINTS.REFRESH, {
        refreshToken,
      })
      .then((raw) => ({
        accessToken: raw.accessToken,
        refreshToken: raw.refreshToken,
      })),

  logout: (refreshToken: string) =>
    apiClient.post<void>(API_ENDPOINTS.LOGOUT, { refreshToken }),

  logoutAll: () =>
    apiClient.post<void>(API_ENDPOINTS.LOGOUT_ALL),
};

// ==========================================
// TENANTS API
// ==========================================

export const tenantsApi = {
  create: (data: OnboardingTenantInput & OnboardingAdminInput) =>
    apiClient.post<Tenant>(API_ENDPOINTS.TENANT_CREATE, {
      name: (data as any).clinicName ?? (data as any).name,
      slug: (data as any).slug,
      email: (data as any).contactEmail ?? (data as any).email,
      phone: (data as any).contactPhone ?? (data as any).phone,
      address: (data as any).address,
      adminFirstName: (data as any).firstName,
      adminLastName: (data as any).lastName,
      adminEmail: (data as any).email,
      adminPassword: (data as any).password,
    }),

  get: (tenantId?: string) =>
    apiClient
      .get<Tenant>(API_ENDPOINTS.TENANT(tenantId ?? getTenantId()))
      .then((raw) => normalizeTenant(raw)),

  update: (data: Partial<Tenant>, tenantId?: string) =>
    apiClient
      .patch<Tenant>(API_ENDPOINTS.TENANT_UPDATE(tenantId ?? getTenantId()), data)
      .then((raw) => normalizeTenant(raw)),

  completeOnboarding: (_data?: { invites?: OnboardingInviteInput[] }, tenantId?: string) =>
    apiClient.post<void>(API_ENDPOINTS.TENANT_COMPLETE_ONBOARDING(tenantId ?? getTenantId())),

  getSubscription: (tenantId?: string) =>
    apiClient
      .get<any>(API_ENDPOINTS.TENANT_SUBSCRIPTION(tenantId ?? getTenantId()))
      .then((raw) => normalizeSubscription(raw)),
};

export const tenantSettingsApi = {
  get: () =>
    apiClient
      .get<any>(API_ENDPOINTS.TENANT_SETTINGS(getTenantId()))
      .then((raw) => normalizeTenantSettings(raw)),

  update: (settings: Partial<TenantSettings>) => {
    const workingDays: string[] = [];
    const workingHours = settings.workingHours;
    if (workingHours) {
      if (workingHours.monday?.enabled) workingDays.push('MONDAY');
      if (workingHours.tuesday?.enabled) workingDays.push('TUESDAY');
      if (workingHours.wednesday?.enabled) workingDays.push('WEDNESDAY');
      if (workingHours.thursday?.enabled) workingDays.push('THURSDAY');
      if (workingHours.friday?.enabled) workingDays.push('FRIDAY');
      if (workingHours.saturday?.enabled) workingDays.push('SATURDAY');
      if (workingHours.sunday?.enabled) workingDays.push('SUNDAY');
    }

    const payload: Record<string, unknown> = {
      timezone: settings.timezone,
      locale: settings.locale,
      defaultAppointmentDuration: settings.defaultSessionDuration,
      reminderEnabled:
        settings.reminderRules !== undefined
          ? settings.reminderRules.some((r) => r.enabled)
          : undefined,
      reminderRules:
        settings.reminderRules?.map((r) => {
          if (r.minutesBefore % 60 === 0) return `${r.minutesBefore / 60}h`;
          return `${r.minutesBefore}m`;
        }) ?? undefined,
    };

    if (workingHours) {
      const firstEnabled =
        workingHours.monday?.enabled
          ? workingHours.monday
          : workingHours.tuesday?.enabled
            ? workingHours.tuesday
            : workingHours.wednesday?.enabled
              ? workingHours.wednesday
              : workingHours.thursday?.enabled
                ? workingHours.thursday
                : workingHours.friday?.enabled
                  ? workingHours.friday
                  : workingHours.saturday?.enabled
                    ? workingHours.saturday
                    : workingHours.sunday;

      payload.workingHoursStart = firstEnabled?.startTime ?? '09:00';
      payload.workingHoursEnd = firstEnabled?.endTime ?? '18:00';
      payload.workingDays = workingDays;
    }

    return apiClient
      .patch<any>(API_ENDPOINTS.TENANT_SETTINGS(getTenantId()), payload)
      .then((raw) => normalizeTenantSettings(raw));
  },
};

// ==========================================
// USERS API (tenant-scoped)
// ==========================================

export const usersApi = {
  list: (params?: { role?: string; isActive?: boolean; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<User>>(API_ENDPOINTS.USERS(getTenantId()), { params }),

  get: (userId: string) =>
    apiClient.get<User>(API_ENDPOINTS.USER_DETAIL(getTenantId(), userId)),

  create: (data: Partial<User>) =>
    apiClient.post<User>(API_ENDPOINTS.USERS(getTenantId()), data),

  invite: (data: OnboardingInviteInput) =>
    apiClient.post<User>(API_ENDPOINTS.USER_INVITE(getTenantId()), data),

  update: (userId: string, data: Partial<User>) =>
    apiClient.patch<User>(API_ENDPOINTS.USER_DETAIL(getTenantId(), userId), data),

  delete: (userId: string) =>
    apiClient.delete<void>(API_ENDPOINTS.USER_DETAIL(getTenantId(), userId)),

  activate: (userId: string) =>
    apiClient.post<void>(API_ENDPOINTS.USER_ACTIVATE(getTenantId(), userId)),
};

// ==========================================
// PATIENTS API (tenant-scoped)
// ==========================================

export const patientsApi = {
  list: (params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Patient>>(API_ENDPOINTS.PATIENTS(getTenantId()), { params }),

  get: (patientId: string) =>
    apiClient.get<PatientDetail>(API_ENDPOINTS.PATIENT_DETAIL(getTenantId(), patientId)),

  create: (data: Partial<Patient>) =>
    apiClient.post<Patient>(API_ENDPOINTS.PATIENTS(getTenantId()), data),

  update: (patientId: string, data: Partial<Patient>) =>
    apiClient.patch<Patient>(API_ENDPOINTS.PATIENT_DETAIL(getTenantId(), patientId), data),

  delete: (patientId: string) =>
    apiClient.delete<void>(API_ENDPOINTS.PATIENT_DETAIL(getTenantId(), patientId)),
};

// ==========================================
// APPOINTMENTS API (tenant-scoped)
// ==========================================

export const appointmentsApi = {
  list: (params?: { psychologistId?: string; patientId?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Appointment>>(API_ENDPOINTS.APPOINTMENTS(getTenantId()), { params }),

  get: (appointmentId: string) =>
    apiClient.get<Appointment>(API_ENDPOINTS.APPOINTMENT_DETAIL(getTenantId(), appointmentId)),

  create: (data: AppointmentCreateInput) =>
    apiClient.post<Appointment>(API_ENDPOINTS.APPOINTMENTS(getTenantId()), data),

  update: (appointmentId: string, data: Partial<AppointmentCreateInput>) =>
    apiClient.patch<Appointment>(API_ENDPOINTS.APPOINTMENT_DETAIL(getTenantId(), appointmentId), data),

  cancel: (appointmentId: string, reason: string) =>
    apiClient.post<Appointment>(API_ENDPOINTS.APPOINTMENT_CANCEL(getTenantId(), appointmentId), { reason }),
};

// ==========================================
// CLINICAL NOTES API (tenant-scoped)
// ==========================================

export const clinicalNotesApi = {
  list: (params?: { patientId?: string; psychologistId?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<ClinicalNote>>(API_ENDPOINTS.CLINICAL_NOTES(getTenantId()), { params }),

  get: (noteId: string) =>
    apiClient.get<ClinicalNote>(API_ENDPOINTS.CLINICAL_NOTE_DETAIL(getTenantId(), noteId)),

  create: (data: Partial<ClinicalNote>) =>
    apiClient.post<ClinicalNote>(API_ENDPOINTS.CLINICAL_NOTES(getTenantId()), data),

  update: (noteId: string, data: Partial<ClinicalNote>) =>
    apiClient.patch<ClinicalNote>(API_ENDPOINTS.CLINICAL_NOTE_DETAIL(getTenantId(), noteId), data),

  delete: (noteId: string) =>
    apiClient.delete<void>(API_ENDPOINTS.CLINICAL_NOTE_DETAIL(getTenantId(), noteId)),
};

// ==========================================
// NEXT SESSION PLANS API (tenant-scoped)
// ==========================================

export const sessionPlansApi = {
  create: (data: Partial<SessionPlan>) =>
    apiClient.post<SessionPlan>(API_ENDPOINTS.SESSION_PLANS(getTenantId()), data),

  list: (params?: { psychologistId?: string }) =>
    apiClient.get<PaginatedResponse<SessionPlan>>(API_ENDPOINTS.SESSION_PLANS(getTenantId()), { params }),

  getByPatient: (patientId: string) =>
    apiClient.get<SessionPlan>(API_ENDPOINTS.SESSION_PLAN_BY_PATIENT(getTenantId(), patientId)),

  updateByPatient: (patientId: string, data: Partial<SessionPlan>) =>
    apiClient.patch<SessionPlan>(API_ENDPOINTS.SESSION_PLAN_BY_PATIENT(getTenantId(), patientId), data),

  deleteByPatient: (patientId: string) =>
    apiClient.delete<void>(API_ENDPOINTS.SESSION_PLAN_BY_PATIENT(getTenantId(), patientId)),
};

// ==========================================
// TASKS API (tenant-scoped)
// ==========================================

export const tasksApi = {
  list: (params?: { patientId?: string; assignedToId?: string; status?: string; priority?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Task>>(API_ENDPOINTS.TASKS(getTenantId()), { params }),

  get: (taskId: string) =>
    apiClient.get<Task>(API_ENDPOINTS.TASK_DETAIL(getTenantId(), taskId)),

  create: (data: Partial<Task>) =>
    apiClient.post<Task>(API_ENDPOINTS.TASKS(getTenantId()), data),

  update: (taskId: string, data: Partial<Task>) =>
    apiClient.patch<Task>(API_ENDPOINTS.TASK_DETAIL(getTenantId(), taskId), data),

  delete: (taskId: string) =>
    apiClient.delete<void>(API_ENDPOINTS.TASK_DETAIL(getTenantId(), taskId)),
};

// ==========================================
// NOTIFICATIONS API (tenant-scoped)
// ==========================================

export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Notification>>(API_ENDPOINTS.NOTIFICATIONS(getTenantId()), { params }),

  registerFcmToken: (token: string) =>
    apiClient.post<void>(`${API_ENDPOINTS.NOTIFICATIONS(getTenantId())}/fcm-token`, { token }),

  removeFcmToken: () =>
    apiClient.delete<void>(`${API_ENDPOINTS.NOTIFICATIONS(getTenantId())}/fcm-token`),

  markAsRead: (notificationId: string) =>
    apiClient.post<void>(API_ENDPOINTS.NOTIFICATION_READ(getTenantId(), notificationId)),

  markAllAsRead: () =>
    apiClient.post<void>(API_ENDPOINTS.NOTIFICATIONS_READ_ALL(getTenantId())),
};

// ==========================================
// SUBSCRIPTION API (tenant-scoped)
// ==========================================

export const subscriptionApi = {
  getCurrent: () =>
    apiClient.get<any>(API_ENDPOINTS.SUBSCRIPTION(getTenantId())).then((raw) => {
      // API may return { subscription, tenant } or a direct subscription object.
      return normalizeSubscription(raw.subscription ?? raw);
    }),

  getUsage: (params?: { period?: 'current' | 'previous' | string }) =>
    apiClient.get<any>(API_ENDPOINTS.SUBSCRIPTION_USAGE(getTenantId()), { params }).then((raw) => {
      // API shape: { period, usage, activity, warnings }
      if (raw?.users && raw?.patients && raw?.storage) {
        return raw as UsageMetrics;
      }

      const usage = raw?.usage ?? {};
      return {
        tenantId: getTenantId(),
        period: {
          start: raw?.period?.start ?? new Date().toISOString(),
          end: raw?.period?.end ?? new Date().toISOString(),
        },
        users: {
          admins: { total: 0, active: 0 },
          psychologists: {
            total: usage?.seats?.used ?? 0,
            active: usage?.seats?.used ?? 0,
            inactive: 0,
            limit: usage?.seats?.limit ?? 0,
            percentUsed: usage?.seats?.percentage ?? 0,
          },
          assistants: {
            total: 0,
            active: 0,
            limit: null,
          },
        },
        patients: {
          total: usage?.patients?.active ?? 0,
          active: usage?.patients?.active ?? 0,
          archived: 0,
          limit: usage?.patients?.limit ?? 0,
          percentUsed: usage?.patients?.percentage ?? 0,
        },
        storage: {
          usedGB: usage?.storage?.usedGB ?? 0,
          limitGB: usage?.storage?.limitGB ?? 0,
          percentUsed: usage?.storage?.percentage ?? 0,
          breakdown: {
            attachments: 0,
            avatars: 0,
            exports: 0,
          },
        },
        notifications: {
          email: {
            sent: usage?.notifications?.sentThisMonth ?? 0,
            limit: usage?.notifications?.limit ?? 0,
            percentUsed: usage?.notifications?.percentage ?? 0,
          },
          push: {
            sent: usage?.notifications?.sentThisMonth ?? 0,
            limit: usage?.notifications?.limit ?? 0,
            percentUsed: usage?.notifications?.percentage ?? 0,
          },
          sms: {
            sent: 0,
            limit: usage?.notifications?.limit ?? 0,
            percentUsed: 0,
          },
        },
        appointments: {
          total: raw?.activity?.appointmentsThisMonth ?? 0,
          completed: 0,
          upcoming: 0,
          canceled: 0,
        },
        api: {
          requests: 0,
          limit: null,
        },
      } as UsageMetrics;
    }),

  upgrade: (data: UpgradeRequest) =>
    apiClient.post<any>(API_ENDPOINTS.SUBSCRIPTION_UPGRADE(getTenantId()), {
      newPlan: data.targetTier === 'CUSTOM' ? 'CUSTOM' : 'PRO',
    }) as Promise<UpgradeResponse>,

  downgrade: (data: DowngradeRequest) =>
    apiClient.post<any>(API_ENDPOINTS.SUBSCRIPTION_DOWNGRADE(getTenantId()), {
      newPlan: data.targetTier === 'BASIC' ? 'BASIC' : 'TRIAL',
    }) as Promise<DowngradeResponse>,
};

// ==========================================
// AUDIT LOGS API (tenant-scoped)
// ==========================================

export const auditLogsApi = {
  list: (params?: { entity?: string; userId?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<any>>(API_ENDPOINTS.AUDIT_LOGS(getTenantId()), { params }),

  getByEntity: (entity: string, entityId: string) =>
    apiClient.get<any[]>(API_ENDPOINTS.AUDIT_LOG_ENTITY(getTenantId(), entity, entityId)),
};

// ==========================================
// UTILITY: Extract array from paginated or direct response
// ==========================================

export function extractArray<T>(response: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(response) ? response : (response.data ?? []);
}
