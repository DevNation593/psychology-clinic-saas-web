import { PlanTier, UserRole, AppointmentStatus, TaskStatus, TaskPriority } from '@/types';

// ==========================================
// APPLICATION
// ==========================================

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Psychology Clinic SaaS';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4200';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

// ==========================================
// ROUTES
// ==========================================

export const ROUTES = {
  // Public
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Onboarding
  ONBOARDING: '/onboarding',
  
  // Dashboard
  DASHBOARD: '/dashboard',
  
  // Calendar
  CALENDAR: '/calendar',
  
  // Patients
  PATIENTS: '/patients',
  PATIENT_DETAIL: (id: string) => `/patients/${id}`,
  PATIENT_NEW: '/patients/new',
  
  // Admin
  ADMIN_TEAM: '/admin/team',
  ADMIN_SUBSCRIPTION: '/admin/subscription',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_STORAGE: '/admin/storage',
  
  // Profile
  PROFILE: '/profile',
  
  // Notifications
  NOTIFICATIONS: '/notifications',
} as const;

// ==========================================
// API ENDPOINTS
// ==========================================

export const API_ENDPOINTS = {
  // Auth (public, no tenantId)
  LOGIN: '/auth/login',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  LOGOUT_ALL: '/auth/logout-all',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  CHANGE_PASSWORD: '/auth/change-password',

  // Tenants (partially public)
  TENANT_CREATE: '/tenants',
  TENANT: (tenantId: string) => `/tenants/${tenantId}`,
  TENANT_UPDATE: (tenantId: string) => `/tenants/${tenantId}`,
  TENANT_COMPLETE_ONBOARDING: (tenantId: string) => `/tenants/${tenantId}/complete-onboarding`,
  TENANT_SUBSCRIPTION: (tenantId: string) => `/tenants/${tenantId}/subscription`,

  // Users (tenant-scoped)
  USERS: (tenantId: string) => `/tenants/${tenantId}/users`,
  USER_INVITE: (tenantId: string) => `/tenants/${tenantId}/users/invite`,
  USER_DETAIL: (tenantId: string, userId: string) => `/tenants/${tenantId}/users/${userId}`,
  USER_ACTIVATE: (tenantId: string, userId: string) => `/tenants/${tenantId}/users/${userId}/activate`,
  USER_AVATAR: (tenantId: string, userId: string) => `/tenants/${tenantId}/users/${userId}/avatar`,

  // Tenant Settings
  TENANT_SETTINGS: (tenantId: string) => `/tenants/${tenantId}/settings`,

  // Patients (tenant-scoped)
  PATIENTS: (tenantId: string) => `/tenants/${tenantId}/patients`,
  PATIENT_DETAIL: (tenantId: string, patientId: string) => `/tenants/${tenantId}/patients/${patientId}`,

  // Appointments (tenant-scoped)
  APPOINTMENTS: (tenantId: string) => `/tenants/${tenantId}/appointments`,
  APPOINTMENT_DETAIL: (tenantId: string, appointmentId: string) => `/tenants/${tenantId}/appointments/${appointmentId}`,
  APPOINTMENT_CANCEL: (tenantId: string, appointmentId: string) => `/tenants/${tenantId}/appointments/${appointmentId}/cancel`,

  // Clinical Notes (tenant-scoped)
  CLINICAL_NOTES: (tenantId: string) => `/tenants/${tenantId}/clinical-notes`,
  CLINICAL_NOTE_DETAIL: (tenantId: string, noteId: string) => `/tenants/${tenantId}/clinical-notes/${noteId}`,

  // Tasks (tenant-scoped)
  TASKS: (tenantId: string) => `/tenants/${tenantId}/tasks`,
  TASK_DETAIL: (tenantId: string, taskId: string) => `/tenants/${tenantId}/tasks/${taskId}`,

  // Next Session Plans (tenant-scoped)
  SESSION_PLANS: (tenantId: string) => `/tenants/${tenantId}/next-session-plans`,
  SESSION_PLAN_BY_PATIENT: (tenantId: string, patientId: string) => `/tenants/${tenantId}/next-session-plans/patient/${patientId}`,

  // Notifications (tenant-scoped)
  NOTIFICATIONS: (tenantId: string) => `/tenants/${tenantId}/notifications`,
  NOTIFICATION_READ: (tenantId: string, notificationId: string) => `/tenants/${tenantId}/notifications/${notificationId}/read`,
  NOTIFICATIONS_READ_ALL: (tenantId: string) => `/tenants/${tenantId}/notifications/read-all`,

  // Subscription (tenant-scoped)
  SUBSCRIPTION: (tenantId: string) => `/tenants/${tenantId}/subscription`,
  SUBSCRIPTION_USAGE: (tenantId: string) => `/tenants/${tenantId}/subscription/usage`,
  SUBSCRIPTION_UPGRADE: (tenantId: string) => `/tenants/${tenantId}/subscription/upgrade`,
  SUBSCRIPTION_DOWNGRADE: (tenantId: string) => `/tenants/${tenantId}/subscription/downgrade`,

  // Audit Logs (tenant-scoped)
  AUDIT_LOGS: (tenantId: string) => `/tenants/${tenantId}/audit-logs`,
  AUDIT_LOG_ENTITY: (tenantId: string, entity: string, entityId: string) => `/tenants/${tenantId}/audit-logs/${entity}/${entityId}`,
} as const;

// ==========================================
// LOCAL STORAGE KEYS
// ==========================================

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  TENANT: 'tenant',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  PUSH_SUBSCRIPTION: 'push_subscription',
} as const;

// ==========================================
// QUERY KEYS
// ==========================================

export const QUERY_KEYS = {
  // Auth
  ME: ['me'],
  
  // Users
  USERS: ['users'],
  USER_DETAIL: (id: string) => ['users', id],
  
  // Patients
  PATIENTS: ['patients'],
  PATIENT_DETAIL: (id: string) => ['patients', id],
  PATIENT_CLINICAL_NOTES: (patientId: string) => ['patients', patientId, 'clinical-notes'],
  PATIENT_SESSION_PLAN: (patientId: string) => ['patients', patientId, 'session-plan'],
  
  // Appointments
  APPOINTMENTS: ['appointments'],
  APPOINTMENT_DETAIL: (id: string) => ['appointments', id],
  APPOINTMENTS_TODAY: ['appointments', 'today'],
  APPOINTMENTS_UPCOMING: ['appointments', 'upcoming'],
  
  // Tasks
  TASKS: ['tasks'],
  TASK_DETAIL: (id: string) => ['tasks', id],
  TASKS_MY: ['tasks', 'my'],
  TASKS_OVERDUE: ['tasks', 'overdue'],
  
  // Notifications
  NOTIFICATIONS: ['notifications'],
  
  // Dashboard
  DASHBOARD_STATS: ['dashboard', 'stats'],
  
  // Subscription
  PLANS: ['plans'],
  SUBSCRIPTION: ['subscription'],
  SUBSCRIPTION_USAGE: ['subscription', 'usage'],
  
  // Storage
  STORAGE_FILES: ['storage', 'files'],
  STORAGE_BREAKDOWN: ['storage', 'breakdown'],
  
  // Tenant
  TENANT: ['tenant'],
  TENANT_SETTINGS: ['tenant', 'settings'],
} as const;

// ==========================================
// ROLE LABELS
// ==========================================

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.TENANT_ADMIN]: 'Administrador',
  [UserRole.PSYCHOLOGIST]: 'Psicólogo/a',
  [UserRole.ASSISTANT]: 'Asistente',
};

// ==========================================
// PLAN LABELS
// ==========================================

export const PLAN_LABELS: Record<PlanTier, string> = {
  [PlanTier.TRIAL]: 'Prueba',
  [PlanTier.BASIC]: 'Básico',
  [PlanTier.PROFESSIONAL]: 'Profesional',
  [PlanTier.ENTERPRISE]: 'Empresarial',
};

// ==========================================
// STATUS LABELS
// ==========================================

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'Programada',
  [AppointmentStatus.CONFIRMED]: 'Confirmada',
  [AppointmentStatus.CANCELLED]: 'Cancelada',
  [AppointmentStatus.COMPLETED]: 'Completada',
  [AppointmentStatus.NO_SHOW]: 'No asistió',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'Pendiente',
  [TaskStatus.IN_PROGRESS]: 'En progreso',
  [TaskStatus.COMPLETED]: 'Completada',
  [TaskStatus.CANCELLED]: 'Cancelada',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'Baja',
  [TaskPriority.MEDIUM]: 'Media',
  [TaskPriority.HIGH]: 'Alta',
  [TaskPriority.URGENT]: 'Urgente',
};

// ==========================================
// STATUS COLORS
// ==========================================

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'bg-blue-100 text-blue-800',
  [AppointmentStatus.CONFIRMED]: 'bg-green-100 text-green-800',
  [AppointmentStatus.CANCELLED]: 'bg-red-100 text-red-800',
  [AppointmentStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
  [AppointmentStatus.NO_SHOW]: 'bg-orange-100 text-orange-800',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'bg-gray-100 text-gray-800',
  [TaskPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
  [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800',
  [TaskPriority.URGENT]: 'bg-red-100 text-red-800',
};

// ==========================================
// PAGINATION
// ==========================================

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ==========================================
// VALIDATION
// ==========================================

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

// ==========================================
// DATE/TIME
// ==========================================

export const DEFAULT_SESSION_DURATION = 50; // minutes
export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00',
];

// ==========================================
// WEB PUSH
// ==========================================

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
