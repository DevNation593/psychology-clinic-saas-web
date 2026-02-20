// ==========================================
// ENUMS
// ==========================================

export enum UserRole {
  TENANT_ADMIN = 'TENANT_ADMIN',
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  ASSISTANT = 'ASSISTANT',
}

export enum PlanTier {
  TRIAL = 'TRIAL',
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
  CANCELED = 'CANCELED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationType {
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_DUE = 'TASK_DUE',
  USER_INVITED = 'USER_INVITED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SYSTEM = 'SYSTEM',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

// ==========================================
// TENANT & PLAN
// ==========================================

export interface Plan {
  id: string;
  planType: PlanTier;
  name: string;
  description: string;
  basePrice: number; // cents
  currency: 'EUR';
  billingInterval: 'MONTHLY' | 'ANNUAL';
  limits: ResourceLimits;
  features: FeatureFlags;
  pricePerSeatMonthly: number; // cents
  pricePerSeatYearly: number; // cents
}

export interface ResourceLimits {
  maxPsychologists: number; // Billable seats
  maxAssistants: number | null; // null = unlimited
  maxPatients: number;
  storageGB: number;
  maxEmailsPerMonth: number;
  maxPushPerMonth: number;
  maxSmsPerMonth: number;
  maxApiRequestsPerHour: number | null;
}

export interface FeatureFlags {
  // Core features (all plans)
  dashboard: boolean;
  calendar: boolean;
  appointments: boolean;
  patients: boolean;
  
  // Advanced features
  clinicalNotes: boolean;
  tasks: boolean;
  attachments: boolean;
  sessionPlans: boolean;
  
  // Notifications
  inAppNotifications: boolean;
  emailNotifications: boolean;
  webPush: boolean;
  smsNotifications: boolean;
  
  // Analytics & Reports
  basicStats: boolean;
  advancedAnalytics: boolean;
  customReports: boolean;
  dataExport: boolean;
  
  // Integrations
  googleCalendarSync: boolean;
  videoIntegration: boolean;
  apiAccess: 'none' | 'read' | 'full';
  webhooks: boolean;
  
  // Security & Compliance
  mfa: boolean;
  sso: boolean;
  auditLogs: boolean;
  customBranding: boolean;
}

export interface Subscription {
  id: string;
  tenantId: string;
  plan: Plan;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsageMetrics {
  tenantId: string;
  period: {
    start: string;
    end: string;
  };
  users: {
    admins: {
      total: number;
      active: number;
    };
    psychologists: {
      total: number;
      active: number; // Billable count
      inactive: number;
      limit: number;
      percentUsed: number; // 0-100
    };
    assistants: {
      total: number;
      active: number;
      limit: number | null;
    };
  };
  patients: {
    total: number;
    active: number;
    archived: number;
    limit: number;
    percentUsed: number;
  };
  storage: {
    usedGB: number;
    limitGB: number;
    percentUsed: number;
    breakdown: {
      attachments: number;
      avatars: number;
      exports: number;
    };
  };
  notifications: {
    email: {
      sent: number;
      limit: number;
      percentUsed: number;
    };
    push: {
      sent: number;
      limit: number;
      percentUsed: number;
    };
    sms: {
      sent: number;
      limit: number;
      percentUsed: number;
    };
  };
  appointments: {
    total: number;
    completed: number;
    upcoming: number;
    canceled: number;
  };
  api: {
    requests: number;
    limit: number | null;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  subscription: Subscription;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  workingHours: WorkingHours;
  defaultSessionDuration: number; // minutes
  reminderRules: ReminderRule[];
  timezone: string;
  locale: string;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string;
}

export interface ReminderRule {
  id: string;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  minutesBefore: number;
  enabled: boolean;
}

// ==========================================
// USER
// ==========================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  professionalTitle?: string;
  bio?: string;
  specializations?: string[];
  licenseNumber?: string;
}

// ==========================================
// AUTHENTICATION
// ==========================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ==========================================
// PATIENT
// ==========================================

export interface Patient {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  assignedPsychologistId?: string;
  assignedPsychologist?: User;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface PatientDetail extends Patient {
  appointmentsCount: number;
  tasksCount: number;
  lastAppointmentDate?: string;
  nextAppointmentDate?: string;
}

// ==========================================
// APPOINTMENT
// ==========================================

export interface Appointment {
  id: string;
  tenantId: string;
  patientId: string;
  patient: Patient;
  psychologistId: string;
  psychologist: User;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface AppointmentCreateInput {
  patientId: string;
  psychologistId: string;
  title: string;
  description?: string;
  startTime: string;
  duration: number;
  isOnline: boolean;
  meetingUrl?: string;
  location?: string;
}

// ==========================================
// CLINICAL RECORDS
// ==========================================

export interface ClinicalNote {
  id: string;
  tenantId: string;
  patientId: string;
  psychologistId: string;
  psychologist: User;
  appointmentId?: string;
  content: string;
  diagnosis?: string;
  treatment?: string;
  observations?: string;
  sessionDuration?: number;
  sessionDate?: string;
  // Backward-compatibility fields used in some UI sections.
  title?: string;
  isConfidential?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface SessionPlan {
  id: string;
  patientId: string;
  psychologistId: string;
  objectives?: string[] | string;
  techniques?: string;
  homework?: string;
  notes?: string;
  // Backward-compatibility fields used in some UI sections.
  interventions?: string[];
  progress?: string;
  nextSteps?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// TASKS
// ==========================================

export interface Task {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToId: string;
  assignedTo: User;
  patientId?: string;
  patient?: Patient;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ==========================================
// API RESPONSE WRAPPER
// ==========================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, any>;
}

// ==========================================
// ONBOARDING
// ==========================================

export interface OnboardingTenantInput {
  clinicName: string;
  contactEmail: string;
  contactPhone?: string;
  timezone: string;
  locale: string;
}

export interface OnboardingAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  professionalTitle?: string;
}

export interface OnboardingInviteInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// ==========================================
// SUBSCRIPTION & BILLING
// ==========================================

export interface UpgradeRequest {
  targetTier: 'PRO' | 'CUSTOM';
  billingInterval?: 'MONTHLY' | 'ANNUAL';
  addSeats?: number;
  paymentMethodId?: string;
  couponCode?: string;
}

export interface UpgradeResponse {
  success: boolean;
  subscription: Subscription;
  payment: {
    proratedAmount: number; // cents
    nextBillingAmount: number;
    nextBillingDate: string;
  };
  message: string;
}

export interface DowngradeRequest {
  targetTier: 'BASIC';
  scheduledFor?: 'immediate' | 'end_of_period';
  acknowledgments: {
    dataLoss: boolean;
    featureLoss: boolean;
  };
}

export interface ConstraintViolation {
  constraint: string;
  current: number;
  limit: number;
  action: string;
}

export interface DowngradeResponse {
  success: boolean;
  scheduledDowngrade: {
    fromTier: PlanTier;
    toTier: PlanTier;
    effectiveDate: string;
    daysUntilDowngrade: number;
  };
  impactSummary: {
    featuresLost: string[];
    constraintViolations: ConstraintViolation[];
  };
  creditIssued?: number;
}

export interface AddSeatRequest {
  quantity: number;
}

export interface AddSeatResponse {
  success: boolean;
  subscription: {
    id: string;
    psychologistSeats: {
      previous: number;
      current: number;
      max: number;
    };
    pricing: {
      basePrice: number;
      pricePerSeat: number;
      addedSeats: number;
      totalMonthly: number;
    };
    proratedCharge: number;
    nextBillingAmount: number;
  };
}

// ==========================================
// STORAGE MANAGEMENT
// ==========================================

export interface StorageFile {
  id: string;
  tenantId: string;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  category: 'attachment' | 'avatar' | 'export';
  relatedTo?: {
    type: 'patient' | 'appointment' | 'clinical_note';
    id: string;
    name?: string;
  };
  uploadedBy: string;
  uploadedByUser?: User;
  createdAt: string;
  url: string;
}

export interface StorageBreakdown {
  total: number; // GB
  attachments: number;
  avatars: number;
  exports: number;
}

// ==========================================
// ERROR RESPONSES
// ==========================================

export interface SeatLimitError {
  error: 'SEAT_LIMIT_REACHED';
  message: string;
  details: {
    currentSeats: number;
    maxSeats: number;
    planTier: PlanTier;
    upgradeUrl: string;
    suggestion: string;
  };
}

export interface ConstraintViolationError {
  error: 'CONSTRAINT_VIOLATION' | 'DOWNGRADE_CONSTRAINTS_VIOLATED';
  message: string;
  details: {
    violations: ConstraintViolation[];
  };
}

export interface PaymentError {
  error: 'PAYMENT_FAILED';
  message: string;
  details: {
    code: string;
    declineCode?: string;
  };
}

// ==========================================
// STATS & DASHBOARD
// ==========================================

export interface DashboardStats {
  todayAppointments: number;
  upcomingAppointments: number;
  overdueTasks: number;
  activePatientsCount: number;
  totalPatientsThisMonth: number;
  completedAppointmentsThisWeek: number;
}

export interface AppointmentSummary {
  id: string;
  patientName: string;
  psychologistName: string;
  startTime: string;
  status: AppointmentStatus;
}

export interface TaskSummary {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDate?: string;
  patientName?: string;
}
