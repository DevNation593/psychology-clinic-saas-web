import { z } from 'zod';
import { UserRole, Gender, TaskStatus, TaskPriority, AppointmentStatus } from '@/types';
import { PASSWORD_MIN_LENGTH } from '@/lib/constants';

// ==========================================
// AUTH SCHEMAS
// ==========================================

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ==========================================
// ONBOARDING SCHEMAS
// ==========================================

export const onboardingTenantSchema = z.object({
  clinicName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  contactEmail: z.string().email('Email inválido'),
  contactPhone: z.string().optional(),
  timezone: z.string().default('America/Mexico_City'),
  locale: z.string().default('es'),
});

export const onboardingAdminSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string(),
  professionalTitle: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

const professionalProfileInputSchema = z.object({
  specialtyId: z.string().min(1),
  professionalTitle: z.string().optional(),
  licenseNumber: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const onboardingInviteSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  role: z.nativeEnum(UserRole),
  specialtyId: z.string().optional(),
  professionalProfile: professionalProfileInputSchema.optional(),
});

export type OnboardingTenantFormData = z.infer<typeof onboardingTenantSchema>;
export type OnboardingAdminFormData = z.infer<typeof onboardingAdminSchema>;
export type OnboardingInviteFormData = z.infer<typeof onboardingInviteSchema>;

const onboardingEmail = z.string().trim().toLowerCase().email('Email inválido');
const specialtyCode = z.string().trim().toUpperCase().min(1, 'Selecciona una especialidad');

export const clinicOnboardingSchema = z.object({
  clinicName: z.string().trim().min(1, 'Ingresa el nombre del consultorio'),
  contactEmail: onboardingEmail,
  contactPhone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  timezone: z.string().trim().min(1, 'Selecciona una zona horaria'),
  locale: z.string().trim().min(1, 'Selecciona un idioma'),
  specialtyCodes: z.array(specialtyCode).min(1, 'Selecciona al menos una especialidad')
    .transform((codes) => [...new Set(codes)]),
  adminFirstName: z.string().trim().min(1, 'Ingresa el nombre'),
  adminLastName: z.string().trim().min(1, 'Ingresa el apellido'),
  adminEmail: onboardingEmail,
  adminPassword: z.string().min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`),
  adminProvidesCare: z.boolean(),
  adminSpecialtyCode: specialtyCode.optional(),
  adminProfessionalTitle: z.string().trim().optional(),
  adminLicenseNumber: z.string().trim().optional(),
  adminBio: z.string().trim().optional(),
}).strict().superRefine((data, context) => {
  if (data.adminProvidesCare) {
    if (!data.adminSpecialtyCode || !data.specialtyCodes.includes(data.adminSpecialtyCode)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['adminSpecialtyCode'], message: 'Selecciona una especialidad habilitada' });
    }
  } else if (data.adminSpecialtyCode !== undefined || data.adminProfessionalTitle !== undefined ||
    data.adminLicenseNumber !== undefined || data.adminBio !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['adminProvidesCare'], message: 'Los datos clínicos requieren atención a pacientes' });
  }
});

export type ClinicOnboardingFormData = z.infer<typeof clinicOnboardingSchema>;

const teamProfileSchema = z.object({
  specialtyId: z.string().trim().min(1, 'Selecciona una especialidad'),
  professionalTitle: z.string().trim().optional(),
  licenseNumber: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  isActive: z.boolean().optional(),
}).strict();

export const tenantTeamMemberSchema = z.object({
  email: onboardingEmail,
  password: z.string().min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`),
  firstName: z.string().trim().min(1, 'Ingresa el nombre'),
  lastName: z.string().trim().min(1, 'Ingresa el apellido'),
  phone: z.string().trim().optional(),
  role: z.union([
    z.literal(UserRole.ADMIN), z.literal(UserRole.CLIENTE),
    z.literal(UserRole.PROFESIONAL), z.literal(UserRole.PSICOLOGO),
    z.literal(UserRole.ASISTENTE),
  ]),
  professionalProfile: teamProfileSchema.optional(),
}).strict().superRefine((data, context) => {
  if ([UserRole.PROFESIONAL, UserRole.PSICOLOGO].includes(data.role) && !data.professionalProfile) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['professionalProfile'], message: 'Selecciona una especialidad' });
  }
  if (data.role === UserRole.ASISTENTE && data.professionalProfile) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['professionalProfile'], message: 'El asistente no puede tener perfil clínico' });
  }
});

export type TenantTeamMemberFormData = z.infer<typeof tenantTeamMemberSchema>;

// ==========================================
// PATIENT SCHEMAS
// ==========================================

export const patientSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.nativeEnum(Gender).optional(),
  ),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  assignedPsychologistId: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().optional(),
  ),
  notes: z.string().optional(),
});

export type PatientFormData = z.infer<typeof patientSchema>;

// ==========================================
// APPOINTMENT SCHEMAS
// ==========================================

export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Selecciona un paciente'),
  psychologistId: z.string().min(1, 'Selecciona un psicólogo'),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  startTime: z.string().min(1, 'Selecciona fecha y hora de inicio'),
  duration: z.number().min(15, 'La duración mínima es 15 minutos').max(240),
  isOnline: z.boolean().default(false),
  meetingUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  location: z.string().optional(),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;

// ==========================================
// CLINICAL NOTE SCHEMAS
// ==========================================

export const clinicalNoteSchema = z.object({
  patientId: z.string().min(1, 'El paciente ID es requerido'),
  appointmentId: z.string().optional(),
  content: z.string().min(10, 'El contenido debe tener al menos 10 caracteres'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  observations: z.string().optional(),
  sessionDuration: z.number().min(1).max(240).optional(),
  sessionDate: z.string().optional(),
});

export type ClinicalNoteFormData = z.infer<typeof clinicalNoteSchema>;

// ==========================================
// SESSION PLAN SCHEMAS
// ==========================================

export const sessionPlanSchema = z.object({
  objectives: z.string().optional(),
  techniques: z.string().optional(),
  homework: z.string().optional(),
  notes: z.string().optional(),
});

export type SessionPlanFormData = z.infer<typeof sessionPlanSchema>;

// ==========================================
// TASK SCHEMAS
// ==========================================

export const taskSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  assignedToId: z.string().min(1, 'Asigna la tarea a un usuario'),
  patientId: z.string().min(1, 'Selecciona un paciente'),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: z.string().optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;

// ==========================================
// USER INVITE SCHEMA
// ==========================================

export const userInviteSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  role: z.nativeEnum(UserRole),
  professionalTitle: z.string().optional(),
  specialtyId: z.string().optional(),
  professionalProfile: professionalProfileInputSchema.optional(),
});

export type UserInviteFormData = z.infer<typeof userInviteSchema>;

// ==========================================
// SUBSCRIPTION SCHEMAS
// ==========================================

export const subscriptionUpgradeSchema = z.object({
  planId: z.string().min(1, 'Selecciona un plan'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  paymentMethodId: z.string().optional(),
});

export type SubscriptionUpgradeFormData = z.infer<typeof subscriptionUpgradeSchema>;

// ==========================================
// TENANT SETTINGS SCHEMAS
// ==========================================

export const tenantSettingsSchema = z.object({
  defaultSessionDuration: z.number().min(15, 'La duración mínima es 15 minutos').max(240),
  timezone: z.string(),
  locale: z.string(),
  workingHours: z.object({
    monday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }),
    tuesday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }),
    wednesday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }),
    thursday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }),
    friday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }),
    saturday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }),
    sunday: z.object({ enabled: z.boolean(), startTime: z.string(), endTime: z.string() }),
  }),
});

export type TenantSettingsFormData = z.infer<typeof tenantSettingsSchema>;
