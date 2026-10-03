import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import {
  User,
  CreateTenantUserInput,
  UpdateTenantUserInput,
  Patient,
  PatientDetail,
  PatientInput,
  PatientTeamMember,
  EligiblePatientProfessional,
  Appointment,
  AppointmentProfessional,
  AppointmentCreateInput,
  AppointmentUpdateInput,
  AppointmentFilters,
  Task,
  ClinicalNote,
  ClinicalNoteCorrection,
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
  UpgradeRequest,
  PlanCatalog,
  SubscriptionPayment,
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
  TenantSpecialty,
  SpecialtyCatalogItem,
  SpecialtySelectionResult,
  TenantModule,
  ClinicOnboardingResult,
  CreateClinicOnboardingInput,
  Invoice,
  SpecialtyRecord,
  UpdateSelfProfileInput,
  PlatformPayment,
  PlatformSummary,
  PlatformTenantList,
  PlatformTenantListParams,
  PlatformTenantDetail,
  SectionCatalog,
  SectionKey,
  CreatePlatformTenantInput,
  UpdatePlatformTenantInput,
  ChangePlatformPlanInput,
} from '@/types';

// ==========================================
// HELPER: Get tenantId from auth store
// ==========================================

function getTenantId(tenantIdOverride?: string): string {
  const state = useAuthStore.getState();
  const tenantId = tenantIdOverride === undefined
    ? state.tenant?.id || state.user?.tenantId
    : tenantIdOverride;
  if (!tenantId) {
    throw new Error('No tenant ID available. User must be authenticated.');
  }
  return tenantId;
}

function mapPlanType(apiPlan: string): PlanTier {
  switch (apiPlan) {
    case 'PRO':
    case 'PERSONAL_PRO':
    case 'CLINIC_PRO':
      return PlanTier.PROFESSIONAL;
    case 'CUSTOM':
    case 'CLINIC_ENTERPRISE':
      return PlanTier.ENTERPRISE;
    case 'BASIC':
    case 'PERSONAL_BASIC':
    case 'CLINIC_BASIC':
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

  const specialtyPricing =
    raw.includedSpecialties != null && raw.specialtyPrice != null && Array.isArray(raw.specialties)
      ? {
          includedSpecialties: Number(raw.includedSpecialties),
          selectedSpecialties: raw.specialties.length,
          specialtyUnitPrice: Number(raw.specialtyPrice),
          ...(typeof raw.currency === 'string' ? { currency: raw.currency } : {}),
        }
      : undefined;

  // Already normalized shape.
  if (raw.plan && raw.plan.limits) {
    return { ...raw, ...(specialtyPricing ? { specialtyPricing } : {}) } as Subscription;
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
    currency: typeof raw.currency === 'string' ? raw.currency : 'USD',
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
    apiPlanType: raw.planType,
    status: mapSubscriptionStatus(raw.status),
    trialEndsAt: raw.trialEndsAt ?? null,
    currentPeriodStart: raw.currentPeriodStart ?? raw.startDate ?? new Date().toISOString(),
    currentPeriodEnd: raw.currentPeriodEnd ?? raw.endDate ?? new Date().toISOString(),
    canceledAt: raw.canceledAt ?? null,
    cancelAtPeriodEnd: !!raw.cancelAt,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    ...(specialtyPricing ? { specialtyPricing } : {}),
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
    legalName: raw.legalName ?? '',
    taxIdentificationType: raw.taxIdentificationType ?? 'RUC',
    taxIdentificationNumber: raw.taxIdentificationNumber ?? '',
    fakturApiKey: raw.fakturApiKey ?? '',
    fakturApiUrl: raw.fakturApiUrl ?? '',
    fakturInvoicePath: raw.fakturInvoicePath ?? '/invoices',
    fakturEnvironment: raw.fakturEnvironment ?? 'TEST',
    fakturEstablishment: raw.fakturEstablishment ?? '',
    fakturEmissionPoint: raw.fakturEmissionPoint ?? '',
    fakturNextSequential: raw.fakturNextSequential ?? 1,
    fakturBusinessName: raw.fakturBusinessName ?? '',
    fakturBusinessAddress: raw.fakturBusinessAddress ?? '',
    fakturSpecialTaxpayer: !!raw.fakturSpecialTaxpayer,
    fakturAccountingRequired: !!raw.fakturAccountingRequired,
    fakturWithholdingAgent: !!raw.fakturWithholdingAgent,
    fakturEnabled: !!raw.fakturEnabled,
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
    email: raw?.email ?? raw?.contactEmail,
    phone: raw?.phone ?? raw?.contactPhone,
    settings: normalizeTenantSettings(raw.settings),
    subscription: normalizeSubscription(raw.subscription),
  } as Tenant;
}

function normalizeUser(raw: any): User {
  return {
    ...raw,
    mustChangePassword: raw?.mustChangePassword ?? false,
    isActive: raw?.isActive ?? true,
    emailVerified: raw?.emailVerified ?? true,
    managedByProvider: raw?.managedByProvider ?? false,
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

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    apiClient.post<void>(API_ENDPOINTS.CHANGE_PASSWORD, input),
};

// ==========================================
// TENANTS API
// ==========================================

export const tenantsApi = {
  create: (data: OnboardingTenantInput & OnboardingAdminInput) =>
    apiClient.post<Tenant>(API_ENDPOINTS.TENANT_CREATE, {
      name: (data as any).clinicName ?? (data as any).name,
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

  completeOnboarding: (tenantId?: string) =>
    apiClient.post<void>(API_ENDPOINTS.TENANT_COMPLETE_ONBOARDING(tenantId ?? getTenantId())),

  getSubscription: (tenantId?: string) =>
    apiClient
      .get<any>(API_ENDPOINTS.TENANT_SUBSCRIPTION(tenantId ?? getTenantId()))
      .then((raw) => normalizeSubscription(raw)),
};

export const specialtyCatalogApi = {
  list: () => apiClient.get<SpecialtyCatalogItem[]>(API_ENDPOINTS.SPECIALTY_CATALOG),
};

export const tenantSpecialtiesApi = {
  list: (tenantId?: string) =>
    apiClient.get<TenantSpecialty[]>(API_ENDPOINTS.TENANT_SPECIALTIES(tenantId ?? getTenantId())),
  replace: (specialtyCodes: string[], tenantId?: string) =>
    apiClient.put<SpecialtySelectionResult>(
      API_ENDPOINTS.TENANT_SPECIALTIES(tenantId ?? getTenantId()),
      { specialtyCodes },
    ),
};

export const platformApi = {
  getSummary: () => apiClient.get<PlatformSummary>(API_ENDPOINTS.PLATFORM_SUMMARY),
  listTenants: (params?: PlatformTenantListParams) =>
    apiClient.get<PlatformTenantList>(API_ENDPOINTS.PLATFORM_TENANTS, { params }),
  getTenant: (id: string) =>
    apiClient.get<PlatformTenantDetail>(API_ENDPOINTS.PLATFORM_TENANT(id)),
  getSectionCatalog: () =>
    apiClient.get<SectionCatalog>(API_ENDPOINTS.PLATFORM_SECTION_CATALOG),
  createTenant: (input: CreatePlatformTenantInput) =>
    apiClient.post<PlatformTenantDetail>(API_ENDPOINTS.PLATFORM_TENANTS, input),
  updateTenant: (id: string, input: UpdatePlatformTenantInput) =>
    apiClient.patch<PlatformTenantDetail>(API_ENDPOINTS.PLATFORM_TENANT(id), input),
  changePlan: (id: string, input: ChangePlatformPlanInput) =>
    apiClient.patch<PlatformTenantDetail>(`${API_ENDPOINTS.PLATFORM_TENANT(id)}/subscription`, input),
  suspendTenant: (id: string, reason: string) =>
    apiClient.post<PlatformTenantDetail>(`${API_ENDPOINTS.PLATFORM_TENANT(id)}/suspend`, { reason }),
  reactivateTenant: (id: string) =>
    apiClient.post<PlatformTenantDetail>(`${API_ENDPOINTS.PLATFORM_TENANT(id)}/reactivate`),
  setSections: (id: string, sections: SectionKey[]) =>
    apiClient.put<PlatformTenantDetail>(`${API_ENDPOINTS.PLATFORM_TENANT(id)}/sections`, { sections }),
  resetMasterPassword: (id: string, temporaryPassword: string) =>
    apiClient.post<void>(`${API_ENDPOINTS.PLATFORM_TENANT(id)}/master/reset-password`, { temporaryPassword }),
  listPayments: (status?: SubscriptionPayment['status']) =>
    apiClient.get<PlatformPayment[]>(API_ENDPOINTS.PLATFORM_PAYMENTS, { params: status ? { status } : undefined }),
  confirmPayment: (id: string, input: { reference: string; note?: string }) =>
    apiClient.post<void>(`${API_ENDPOINTS.PLATFORM_PAYMENTS}/${id}/confirm`, input),
  rejectPayment: (id: string, reason: string) =>
    apiClient.post<void>(`${API_ENDPOINTS.PLATFORM_PAYMENTS}/${id}/reject`, { reason }),
};

export const tenantModulesApi = {
  list: (tenantId?: string) =>
    apiClient.get<TenantModule[]>(API_ENDPOINTS.TENANT_MODULES(tenantId ?? getTenantId())),
  setEnabled: (moduleKey: string, enabled: boolean, tenantId?: string) =>
    apiClient.patch<TenantModule>(
      API_ENDPOINTS.TENANT_MODULE(tenantId ?? getTenantId(), moduleKey),
      { enabled },
    ),
};

export const onboardingApi = {
  createClinic: (input: CreateClinicOnboardingInput) =>
    apiClient.post<ClinicOnboardingResult>(API_ENDPOINTS.CLINIC_ONBOARDING, input),
};

export const specialtiesApi = {
  list: (tenantId?: string) => tenantSpecialtiesApi.list(tenantId),
  modules: (tenantId?: string) => tenantModulesApi.list(tenantId),
  setModuleEnabled: (moduleKey: string, enabled: boolean, tenantId?: string) =>
    tenantModulesApi.setEnabled(moduleKey, enabled, tenantId),
  setForTenant: (specialtyCodes: string[], tenantId?: string) =>
    tenantSpecialtiesApi.replace(specialtyCodes, tenantId),
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
      legalName: settings.legalName,
      taxIdentificationType: settings.taxIdentificationType,
      taxIdentificationNumber: settings.taxIdentificationNumber,
      fakturApiKey: settings.fakturApiKey,
      fakturApiUrl: settings.fakturApiUrl,
      fakturInvoicePath: settings.fakturInvoicePath,
      fakturEnvironment: settings.fakturEnvironment,
      fakturEstablishment: settings.fakturEstablishment,
      fakturEmissionPoint: settings.fakturEmissionPoint,
      fakturNextSequential: settings.fakturNextSequential,
      fakturBusinessName: settings.fakturBusinessName,
      fakturBusinessAddress: settings.fakturBusinessAddress,
      fakturSpecialTaxpayer: settings.fakturSpecialTaxpayer,
      fakturAccountingRequired: settings.fakturAccountingRequired,
      fakturWithholdingAgent: settings.fakturWithholdingAgent,
      fakturEnabled: settings.fakturEnabled,
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

export interface CreateInvoiceInput {
  patientId: string;
  subtotal: number;
  tax?: number;
  description: string;
  idempotencyKey?: string;
  /** Recipient for this invoice; anything omitted comes from the patient record. */
  customer?: Partial<Record<'name' | 'taxIdType' | 'taxId' | 'email' | 'address', string>>;
  saveCustomerToPatient?: boolean;
}

export const billingApi = {
  listInvoices: (params?: { patientId?: string }) =>
    apiClient.get<Invoice[]>(
      API_ENDPOINTS.BILLING_INVOICES(getTenantId()),
      params?.patientId ? { params: { patientId: params.patientId } } : undefined,
    ),
  createInvoice: (data: CreateInvoiceInput) =>
    apiClient.post<Invoice>(API_ENDPOINTS.BILLING_INVOICES(getTenantId()), data),
};

export const specialtyRecordsApi = {
  list: (patientId: string, moduleKey?: string) =>
    apiClient.get<SpecialtyRecord[]>(
      API_ENDPOINTS.PATIENT_SPECIALTY_RECORDS(getTenantId(), patientId),
      moduleKey ? { params: { moduleKey } } : undefined,
    ),
  create: (patientId: string, data: {
    specialtyCode: string;
    moduleKey: string;
    data: Record<string, unknown>;
    notes?: string;
    recordDate?: string;
    appointmentId?: string;
  }) => apiClient.post<SpecialtyRecord>(
    API_ENDPOINTS.PATIENT_SPECIALTY_RECORDS(getTenantId(), patientId),
    data,
  ),
};

// ==========================================
// USERS API (tenant-scoped)
// ==========================================

export const usersApi = {
  list: (params?: { role?: string; isActive?: boolean; page?: number; limit?: number }, tenantId?: string) =>
    apiClient
      .get<PaginatedResponse<User> | User[]>(API_ENDPOINTS.USERS(getTenantId(tenantId)), { params })
      .then((raw) =>
        Array.isArray(raw)
          ? raw.map(normalizeUser)
          : {
              ...raw,
              data: (raw.data ?? []).map(normalizeUser),
            }
      ),

  get: (userId: string) =>
    apiClient
      .get<User>(API_ENDPOINTS.USER_DETAIL(getTenantId(), userId))
      .then((raw) => normalizeUser(raw)),

  create: (data: CreateTenantUserInput, tenantId?: string) =>
    apiClient
      .post<User>(API_ENDPOINTS.USERS(getTenantId(tenantId)), data)
      .then((raw) => normalizeUser(raw)),


  update: (userId: string, data: UpdateTenantUserInput, tenantId?: string) =>
    apiClient
      .patch<User>(API_ENDPOINTS.USER_DETAIL(getTenantId(tenantId), userId), data)
      .then((raw) => normalizeUser(raw)),

  updateSelf: (data: UpdateSelfProfileInput) =>
    apiClient
      .patch<User>(API_ENDPOINTS.USER_SELF_PROFILE(getTenantId()), data)
      .then((raw) => normalizeUser(raw)),

  delete: (userId: string, tenantId?: string) =>
    apiClient.delete<void>(API_ENDPOINTS.USER_DETAIL(getTenantId(tenantId), userId)),

  activate: (userId: string, password: string) =>
    apiClient.post<void>(API_ENDPOINTS.USER_ACTIVATE(getTenantId(), userId), { password }),

  activateWithTenant: (tenantId: string, userId: string, password: string) =>
    apiClient.post<void>(API_ENDPOINTS.USER_ACTIVATE(tenantId, userId), { password }),
};

// ==========================================
// PATIENTS API (tenant-scoped)
// ==========================================

export const patientsApi = {
  list: (params?: { search?: string; isActive?: boolean; page?: number; limit?: number }, tenantId?: string) =>
    apiClient.get<PaginatedResponse<Patient>>(API_ENDPOINTS.PATIENTS(getTenantId(tenantId)), { params }),

  get: (patientId: string, tenantId?: string) =>
    apiClient.get<PatientDetail>(API_ENDPOINTS.PATIENT_DETAIL(getTenantId(tenantId), patientId)),

  create: (data: Partial<PatientInput>, tenantId?: string) =>
    apiClient.post<Patient>(API_ENDPOINTS.PATIENTS(getTenantId(tenantId)), patientPayload(data)),

  update: (patientId: string, data: Partial<PatientInput>, tenantId?: string) =>
    apiClient.patch<Patient>(API_ENDPOINTS.PATIENT_DETAIL(getTenantId(tenantId), patientId), patientPayload(data)),

  delete: (patientId: string, tenantId?: string) =>
    apiClient.delete<void>(API_ENDPOINTS.PATIENT_DETAIL(getTenantId(tenantId), patientId)),
};

const patientFields = [
  'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender', 'address',
  'emergencyContactName', 'emergencyContactPhone', 'notes',
  'billingName', 'billingTaxIdType', 'billingTaxId', 'billingEmail', 'billingAddress',
] as const;

function patientPayload(data: Partial<PatientInput>): Partial<PatientInput> {
  return Object.fromEntries(patientFields.filter((field) => field in data).map((field) => [field, data[field]]));
}

export const patientTeamApi = {
  list: (tenantId: string, patientId: string) =>
    apiClient.get<PatientTeamMember[]>(API_ENDPOINTS.PATIENT_TEAM(tenantId, patientId)),
  listEligible: (tenantId: string, patientId: string, specialtyId?: string) =>
    specialtyId
      ? apiClient.get<EligiblePatientProfessional[]>(API_ENDPOINTS.PATIENT_TEAM_ELIGIBLE(tenantId, patientId), { params: { specialtyId } })
      : apiClient.get<EligiblePatientProfessional[]>(API_ENDPOINTS.PATIENT_TEAM_ELIGIBLE(tenantId, patientId)),
  assign: (tenantId: string, patientId: string, professionalId: string) =>
    apiClient.put<PatientTeamMember>(API_ENDPOINTS.PATIENT_TEAM_PROFESSIONAL(tenantId, patientId, professionalId)),
  remove: (tenantId: string, patientId: string, professionalId: string) =>
    apiClient.delete<PatientTeamMember>(API_ENDPOINTS.PATIENT_TEAM_PROFESSIONAL(tenantId, patientId, professionalId)),
};

// ==========================================
// APPOINTMENTS API (tenant-scoped)
// ==========================================

export const appointmentsApi = {
  list: (params?: AppointmentFilters, tenantId?: string) =>
    apiClient.get<PaginatedResponse<AppointmentResponse> | AppointmentResponse[]>(
      API_ENDPOINTS.APPOINTMENTS(getTenantId(tenantId)), { params: appointmentFilterParams(params) })
      .then((response) => Array.isArray(response)
        ? response.map(normalizeAppointment)
        : { ...response, data: response.data.map(normalizeAppointment) }),

  get: (appointmentId: string, tenantId?: string) =>
    apiClient.get<AppointmentResponse>(API_ENDPOINTS.APPOINTMENT_DETAIL(getTenantId(tenantId), appointmentId))
      .then(normalizeAppointment),

  create: (data: AppointmentCreateInput, tenantId?: string) =>
    apiClient.post<AppointmentResponse>(API_ENDPOINTS.APPOINTMENTS(getTenantId(tenantId)), appointmentPayload(data))
      .then(normalizeAppointment),

  update: (appointmentId: string, data: AppointmentUpdateInput, tenantId?: string) =>
    apiClient.patch<AppointmentResponse>(API_ENDPOINTS.APPOINTMENT_DETAIL(getTenantId(tenantId), appointmentId), appointmentPayload(data))
      .then(normalizeAppointment),

  cancel: (appointmentId: string, reason: string, tenantId?: string) =>
    apiClient.post<AppointmentResponse>(API_ENDPOINTS.APPOINTMENT_CANCEL(getTenantId(tenantId), appointmentId), { reason })
      .then(normalizeAppointment),
};

const appointmentFilterFields = [
  'professionalId', 'specialtyId', 'patientId', 'status', 'from', 'to',
] as const;

function appointmentFilterParams(filters?: AppointmentFilters): AppointmentFilters | undefined {
  if (!filters) return undefined;
  return Object.fromEntries(appointmentFilterFields
    .filter((field) => field in filters)
    .map((field) => [field, filters[field]]));
}

const appointmentFields = [
  'patientId', 'professionalId', 'specialtyId', 'title', 'description', 'startTime',
  'duration', 'isOnline', 'meetingUrl', 'location', 'status',
] as const;

function appointmentPayload(data: AppointmentUpdateInput): AppointmentUpdateInput {
  return Object.fromEntries(appointmentFields.filter((field) => field in data).map((field) => [field, data[field]]));
}

type AppointmentResponse = Omit<Appointment, 'professionalId' | 'professional' | 'psychologistId' | 'psychologist'> & {
  professionalId?: string | null;
  professional?: AppointmentProfessional | null;
  psychologistId: string;
  psychologist?: AppointmentProfessional | null;
};

function normalizeAppointment(raw: AppointmentResponse): Appointment {
  const professionalId = raw.professionalId || raw.psychologistId;
  const professional = [raw.professional, raw.psychologist]
    .find((candidate) => candidate?.id === professionalId) ?? null;
  return {
    ...raw,
    professionalId,
    professional,
    psychologistId: professionalId,
    psychologist: professional,
  };
}

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

  // A correction needs a reason and cannot move the note to another patient or appointment.
  update: (noteId: string, data: ClinicalNoteCorrection) =>
    apiClient.patch<ClinicalNote>(API_ENDPOINTS.CLINICAL_NOTE_DETAIL(getTenantId(), noteId), data),

  // Soft delete: the API keeps the note for audit and requires the reason.
  delete: (noteId: string, reason: string) =>
    apiClient.delete<void>(API_ENDPOINTS.CLINICAL_NOTE_DETAIL(getTenantId(), noteId), {
      data: { reason },
    }),
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

  // Web Push. The FCM token endpoints belong to the mobile app: a browser endpoint is not a token.
  getWebPushKey: () =>
    apiClient.get<{ enabled: boolean; publicKey: string | null }>(
      `${API_ENDPOINTS.NOTIFICATIONS(getTenantId())}/web-push/public-key`,
    ),

  subscribeWebPush: (subscription: PushSubscriptionJSON) =>
    apiClient.post<void>(
      `${API_ENDPOINTS.NOTIFICATIONS(getTenantId())}/web-push/subscriptions`,
      { endpoint: subscription.endpoint, keys: subscription.keys },
    ),

  unsubscribeWebPush: (endpoint: string) =>
    apiClient.delete<void>(
      `${API_ENDPOINTS.NOTIFICATIONS(getTenantId())}/web-push/subscriptions`,
      { data: { endpoint } },
    ),

  markAsRead: (notificationId: string) =>
    apiClient.post<void>(API_ENDPOINTS.NOTIFICATION_READ(getTenantId(), notificationId)),

  markAllAsRead: () =>
    apiClient.post<void>(API_ENDPOINTS.NOTIFICATIONS_READ_ALL(getTenantId())),
};

// ==========================================
// SUBSCRIPTION API (tenant-scoped)
// ==========================================

export const subscriptionApi = {
  getCurrent: (tenantId?: string) =>
    apiClient.get<any>(API_ENDPOINTS.SUBSCRIPTION(getTenantId(tenantId))).then((raw) => {
      // API may return { subscription, tenant } or a direct subscription object.
      return normalizeSubscription(raw.subscription ?? raw);
    }),

  getUsage: (params?: { period?: 'current' | 'previous' | string }, tenantId?: string) =>
    apiClient.get<any>(API_ENDPOINTS.SUBSCRIPTION_USAGE(getTenantId(tenantId)), { params }).then((raw) => {
      // API shape: { period, usage, activity, warnings }
      if (raw?.users && raw?.patients && raw?.storage) {
        const professionals = raw.users.professionals ?? raw.users.psychologists;
        return {
          ...raw,
          users: { ...raw.users, professionals, psychologists: professionals },
        } as UsageMetrics;
      }

      const usage = raw?.usage ?? {};
      const professionals = {
        total: usage?.seats?.used ?? 0,
        active: usage?.seats?.used ?? 0,
        inactive: 0,
        limit: usage?.seats?.limit ?? 0,
        percentUsed: usage?.seats?.percentage ?? 0,
      };
      return {
        tenantId: getTenantId(tenantId),
        period: {
          start: raw?.period?.start ?? new Date().toISOString(),
          end: raw?.period?.end ?? new Date().toISOString(),
        },
        users: {
          admins: { total: 0, active: 0 },
          professionals,
          psychologists: professionals,
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

  // Plans, prices and limits. Every screen that shows them reads this catalog.
  getPlans: () => apiClient.get<PlanCatalog>(API_ENDPOINTS.SUBSCRIPTION_PLANS(getTenantId())),

  getPayments: () =>
    apiClient.get<SubscriptionPayment[]>(API_ENDPOINTS.SUBSCRIPTION_PAYMENTS(getTenantId())),

  // Registers a pending payment; the plan changes when support confirms it.
  upgrade: (data: UpgradeRequest) =>
    apiClient.post<UpgradeResponse>(API_ENDPOINTS.SUBSCRIPTION_UPGRADE(getTenantId()), data),

  // Scheduled for the end of the current period.
  downgrade: (data: DowngradeRequest) =>
    apiClient.post<DowngradeResponse>(API_ENDPOINTS.SUBSCRIPTION_DOWNGRADE(getTenantId()), data),
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
