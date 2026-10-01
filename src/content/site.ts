export interface ImageAsset {
  src: string;
  /** Required: describes the image for screen readers and search engines. */
  alt: string;
}

export interface Plan {
  id: string;
  name: string;
  audience: 'personal' | 'clinic';
  summary: string;
  /** USD per month; null means custom pricing. */
  priceMonthly: number | null;
  pricePerExtraSeat: number | null;
  seatsIncluded: number | null;
  maxActivePatients: number | null;
  storageGB: number | null;
  monthlyNotifications: number | null;
  highlighted?: boolean;
}

export interface Faq { question: string; answer: string }
export interface Review { author: string; role: string; quote: string; rating: 1 | 2 | 3 | 4 | 5; photo?: ImageAsset }
export interface CaseStudy { clinic: string; challenge: string; result: string; image?: ImageAsset }
export interface TeamMember { name: string; role: string; photo: ImageAsset }
export interface SiteLocation {
  address: string; city: string; country: string;
  latitude: number; longitude: number;
  directions: string;
}
export interface ContactInfo { whatsappNumber: string; email: string; responseTime: string }
export interface LegalEntity {
  companyName: string; taxId: string; address: string; dataContactEmail: string;
  /** Set to true only after a lawyer has reviewed the four legal texts. */
  reviewed: boolean;
}
export interface HowItWorksStep { title: string; description: string }
export interface ProductModule { title: string; description: string }

export interface SiteContent {
  brand: { name: string; tagline: string; description: string; baseUrl: string };
  contact: ContactInfo;
  hero: { title: string; subtitle: string };
  howItWorks: HowItWorksStep[];
  modules: ProductModule[];
  plans: Plan[];
  faq: Faq[];
  reviews: Review[];
  caseStudies: CaseStudy[];
  team: TeamMember[];
  location: SiteLocation | null;
  legal: LegalEntity;
}

const FALLBACK_BASE_URL = 'http://localhost:4200';

/** Always returns a parseable absolute URL without a trailing slash. */
export function normalizeBaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim().replace(/\/+$/, '');
  if (!value) return FALLBACK_BASE_URL;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    new URL(candidate);
    return candidate;
  } catch {
    return FALLBACK_BASE_URL;
  }
}

/** True when the value contains a dialable number, not just formatting characters. */
export function hasWhatsappNumber(value: string): boolean {
  return /\d/.test(value);
}

export function resolveContactChannel(contact: ContactInfo): 'whatsapp' | 'email' | 'none' {
  if (hasWhatsappNumber(contact.whatsappNumber)) return 'whatsapp';
  if (contact.email.trim()) return 'email';
  return 'none';
}

if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL) {
  // Canonical URLs, the sitemap and sharing tags would otherwise point at localhost.
  console.warn('NEXT_PUBLIC_APP_URL is not set: public URLs fall back to ' + FALLBACK_BASE_URL);
}

export const site: SiteContent = {
  brand: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Consultorios de Salud',
    tagline: 'La gestión de tu consultorio, en un solo lugar',
    description:
      'Agenda, historias clínicas, equipo tratante y facturación electrónica para consultorios y profesionales de la salud.',
    baseUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL),
  },
  // Owner-supplied. Leave empty until real values exist; the UI adapts.
  contact: {
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '',
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
    responseTime: 'Te respondemos en menos de 24 horas hábiles.',
  },
  hero: {
    title: 'Menos administración, más tiempo con tus pacientes',
    subtitle:
      'Organiza citas por especialidad y profesional, lleva la historia clínica y factura electrónicamente desde una sola plataforma.',
  },
  howItWorks: [
    { title: 'Configura tu consultorio', description: 'Registra tus especialidades, horarios de atención y a los profesionales de tu equipo.' },
    { title: 'Registra a tus pacientes', description: 'Crea la ficha de cada paciente y asígnale su equipo tratante.' },
    { title: 'Agenda por especialidad', description: 'Programa citas eligiendo paciente, especialidad y profesional; el sistema evita choques de horario.' },
    { title: 'Atiende y documenta', description: 'Registra notas clínicas, planes de sesión y tareas de seguimiento.' },
    { title: 'Factura y da seguimiento', description: 'Emite facturas electrónicas y envía recordatorios automáticos de las citas.' },
  ],
  modules: [
    { title: 'Agenda multiespecialidad', description: 'Calendario por profesional y especialidad con control de conflictos y horario laboral.' },
    { title: 'Pacientes y equipo tratante', description: 'Ficha del paciente con los profesionales que lo atienden.' },
    { title: 'Notas clínicas', description: 'Registros clínicos visibles solo para los roles autorizados.' },
    { title: 'Tareas y seguimiento', description: 'Pendientes asignados por paciente con prioridad y fecha límite.' },
    { title: 'Recordatorios', description: 'Avisos automáticos antes de cada cita.' },
    { title: 'Facturación electrónica', description: 'Emisión de comprobantes electrónicos desde el consultorio.' },
  ],
  // Mirrors api/src/subscription/subscription-pricing.ts. Update both together.
  plans: [
    { id: 'trial', name: 'Prueba', audience: 'personal', summary: 'Para conocer la plataforma.', priceMonthly: 0, pricePerExtraSeat: null, seatsIncluded: 1, maxActivePatients: 10, storageGB: null, monthlyNotifications: 100 },
    { id: 'personal-basic', name: 'Personal Básico', audience: 'personal', summary: 'Para un profesional independiente.', priceMonthly: 29, pricePerExtraSeat: null, seatsIncluded: 1, maxActivePatients: 50, storageGB: null, monthlyNotifications: 300 },
    { id: 'personal-pro', name: 'Personal Pro', audience: 'personal', summary: 'Para una consulta individual en crecimiento.', priceMonthly: 59, pricePerExtraSeat: null, seatsIncluded: 1, maxActivePatients: 200, storageGB: 1, monthlyNotifications: 1000 },
    { id: 'clinic-basic', name: 'Clínica Básica', audience: 'clinic', summary: 'Para equipos pequeños.', priceMonthly: 99, pricePerExtraSeat: 15, seatsIncluded: 3, maxActivePatients: 150, storageGB: 1, monthlyNotifications: 500, highlighted: true },
    { id: 'clinic-pro', name: 'Clínica Pro', audience: 'clinic', summary: 'Para clínicas con varias especialidades.', priceMonthly: 199, pricePerExtraSeat: 12, seatsIncluded: 10, maxActivePatients: 500, storageGB: 5, monthlyNotifications: 2000 },
    { id: 'enterprise', name: 'Enterprise', audience: 'clinic', summary: 'Para redes de clínicas con necesidades a medida.', priceMonthly: null, pricePerExtraSeat: null, seatsIncluded: null, maxActivePatients: null, storageGB: null, monthlyNotifications: null },
  ],
  faq: [
    { question: '¿Para qué tipo de consultorio sirve?', answer: 'Para profesionales independientes y clínicas con una o varias especialidades de salud, como psicología o nutrición.' },
    { question: '¿Puedo probarlo antes de pagar?', answer: 'Sí. El plan Prueba permite usar la plataforma con hasta 10 pacientes activos, y puedes solicitar una demo guiada.' },
    { question: '¿Quién puede ver las notas clínicas?', answer: 'Solo los roles clínicos autorizados de tu consultorio. El personal administrativo gestiona agenda y pacientes sin acceder a las notas.' },
    { question: '¿Cómo se cobran los usuarios adicionales?', answer: 'Los planes de clínica incluyen un número de usuarios y cada usuario adicional tiene un costo mensual fijo indicado en la tabla de planes.' },
    { question: '¿Qué pasa con mis datos si cancelo?', answer: 'Tus datos te pertenecen. Consulta la política de tratamiento de datos para conocer plazos de conservación y cómo solicitarlos.' },
  ],
  reviews: [],
  caseStudies: [],
  team: [],
  location: null,
  legal: { companyName: '', taxId: '', address: '', dataContactEmail: '', reviewed: false },
};
