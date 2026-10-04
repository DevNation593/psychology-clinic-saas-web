import type { ApiPlanType, PlanCatalogEntry } from '@/types';

/**
 * Presentation of the plan catalog returned by `GET /subscription/plans`.
 * Prices and limits always come from the API; this file only adds names and wording.
 */

export const PLAN_ORDER: ApiPlanType[] = [
  'TRIAL',
  'PERSONAL_BASIC',
  'PERSONAL_PRO',
  'CLINIC_BASIC',
  'CLINIC_PRO',
  'CLINIC_ENTERPRISE',
];

export type PlanGroup = 'individual' | 'clinic';

const PLAN_COPY: Record<ApiPlanType, { name: string; description: string; highlighted?: boolean }> = {
  TRIAL: { name: 'Prueba', description: 'Para conocer la plataforma.' },
  PERSONAL_BASIC: { name: 'Básico', description: 'Para un profesional independiente.' },
  PERSONAL_PRO: {
    name: 'Pro',
    description: 'Para una consulta individual en crecimiento.',
    highlighted: true,
  },
  CLINIC_BASIC: { name: 'Básico', description: 'Para equipos pequeños.', highlighted: true },
  CLINIC_PRO: { name: 'Pro', description: 'Para clínicas con varias especialidades.' },
  CLINIC_ENTERPRISE: {
    name: 'Personalizado',
    description: 'Para redes de clínicas con necesidades a medida.',
  },
};

export const MODULE_LABELS: Record<string, string> = {
  clinicalNotes: 'Notas clínicas',
  clinicalNotesEncryption: 'Cifrado de datos clínicos',
  attachments: 'Archivos adjuntos',
  tasks: 'Actividades',
  psychologicalTests: 'Pruebas psicológicas',
  webPush: 'Notificaciones en el navegador',
  fcmPush: 'Notificaciones en el móvil',
  advancedAnalytics: 'Analíticas avanzadas',
  videoConsultation: 'Videoconsulta',
  calendarSync: 'Sincronización de calendario',
  onlineSchedulingWidget: 'Agenda en línea',
  customReports: 'Reportes personalizados',
  apiAccess: 'Acceso por API',
  whatsAppIntegration: 'Integración con WhatsApp',
  sso: 'Inicio de sesión único (SSO)',
};

// The API marks "no practical limit" with these sentinels.
const UNLIMITED_SEATS = 999;
const UNLIMITED_PATIENTS = 999999;
const UNLIMITED_SPECIALTIES = 999;

export interface PlanView {
  planType: ApiPlanType;
  group: PlanGroup;
  name: string;
  description: string;
  highlighted: boolean;
  /** USD per month; null means the price is agreed with sales. */
  priceMonthly: number | null;
  pricePerExtraSeat: number | null;
  seatsIncluded: number | null;
  maxActivePatients: number | null;
  /** null means the plan has no file storage. */
  storageGB: number | null;
  monthlyNotifications: number | null;
  includedSpecialties: number | null;
  specialtyPricePerMonth: number;
  modules: string[];
}

export const planGroup = (planType: ApiPlanType): PlanGroup =>
  planType.startsWith('CLINIC_') ? 'clinic' : 'individual';

export function toPlanView(entry: PlanCatalogEntry): PlanView {
  const custom = entry.planType === 'CLINIC_ENTERPRISE';
  const copy = PLAN_COPY[entry.planType];

  return {
    planType: entry.planType,
    group: planGroup(entry.planType),
    name: copy.name,
    description: copy.description,
    highlighted: !!copy.highlighted,
    priceMonthly: custom ? null : entry.basePrice,
    pricePerExtraSeat: entry.pricePerSeat > 0 ? entry.pricePerSeat : null,
    seatsIncluded: entry.seatsIncluded >= UNLIMITED_SEATS ? null : entry.seatsIncluded,
    maxActivePatients:
      entry.maxActivePatients >= UNLIMITED_PATIENTS ? null : entry.maxActivePatients,
    storageGB: custom || entry.storageGB <= 0 ? null : entry.storageGB,
    monthlyNotifications:
      entry.monthlyNotificationsLimit >= UNLIMITED_PATIENTS ? null : entry.monthlyNotificationsLimit,
    includedSpecialties:
      entry.includedSpecialties >= UNLIMITED_SPECIALTIES ? null : entry.includedSpecialties,
    specialtyPricePerMonth: entry.specialtyPricePerMonth,
    modules: entry.includedModules.map((module) => MODULE_LABELS[module] ?? module),
  };
}

export const formatPrice = (amount: number) =>
  `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export const planLabel = (planType: ApiPlanType) => {
  const group = planGroup(planType) === 'clinic' ? 'Empresarial' : 'Individual';
  return planType === 'TRIAL' ? PLAN_COPY.TRIAL.name : `${group} ${PLAN_COPY[planType].name}`;
};

export const isPlanUpgrade = (from: ApiPlanType, to: ApiPlanType) =>
  PLAN_ORDER.indexOf(to) > PLAN_ORDER.indexOf(from);
