import type { Metadata } from 'next';
import { site, type Faq, type SiteContent } from '@/content/site';

export type PageKey =
  | 'home' | 'plans' | 'howItWorks' | 'caseStudies' | 'about' | 'contact'
  | 'thanks' | 'terms' | 'privacy' | 'cookies' | 'dataProcessing';

interface PageInfo {
  path: string;
  title: string;
  description: string;
  /** Short name used in navigation and breadcrumbs. */
  label: string;
  kind: 'public' | 'legal' | 'utility';
}

export const PAGES: Record<PageKey, PageInfo> = {
  home: { path: '/', label: 'Inicio', kind: 'public', title: 'Software para consultorios de salud | Agenda, pacientes y facturación', description: 'Gestiona citas por especialidad, historias clínicas, equipo tratante y facturación electrónica de tu consultorio desde una sola plataforma.' },
  plans: { path: '/planes', label: 'Planes', kind: 'public', title: 'Planes y precios para profesionales y clínicas', description: 'Compara los planes para profesionales independientes y clínicas: usuarios incluidos, pacientes activos y precio mensual en USD.' },
  howItWorks: { path: '/como-funciona', label: 'Cómo funciona', kind: 'public', title: 'Cómo funciona la plataforma paso a paso', description: 'Del alta del consultorio a la facturación: conoce en cinco pasos cómo se organiza el trabajo diario en la plataforma.' },
  caseStudies: { path: '/casos-de-exito', label: 'Casos de éxito', kind: 'public', title: 'Casos de éxito de consultorios que usan la plataforma', description: 'Resultados de consultorios y clínicas que organizaron su agenda y su atención con la plataforma.' },
  about: { path: '/nosotros', label: 'Nosotros', kind: 'public', title: 'Quiénes somos y dónde encontrarnos', description: 'Conoce al equipo detrás de la plataforma, nuestra ubicación y cómo llegar.' },
  contact: { path: '/contacto', label: 'Contacto', kind: 'public', title: 'Solicita una demo de la plataforma', description: 'Déjanos tus datos y agenda una demostración guiada para tu consultorio. Te respondemos en menos de 24 horas hábiles.' },
  thanks: { path: '/gracias', label: 'Gracias', kind: 'utility', title: 'Gracias por tu solicitud', description: 'Recibimos tu solicitud de demo y te contactaremos pronto.' },
  terms: { path: '/terminos', label: 'Términos y condiciones', kind: 'legal', title: 'Términos y condiciones de uso', description: 'Condiciones que regulan el uso de la plataforma y la relación con sus usuarios.' },
  privacy: { path: '/privacidad', label: 'Política de privacidad', kind: 'legal', title: 'Política de privacidad', description: 'Qué datos personales recopilamos en el sitio, con qué finalidad y cómo ejercer tus derechos.' },
  cookies: { path: '/cookies', label: 'Política de cookies', kind: 'legal', title: 'Política de cookies', description: 'Qué cookies usa este sitio, para qué sirven y cómo aceptar o rechazar las no esenciales.' },
  dataProcessing: { path: '/tratamiento-de-datos', label: 'Tratamiento de datos', kind: 'legal', title: 'Política de tratamiento de datos personales', description: 'Cómo tratamos los datos personales y clínicos que los consultorios gestionan en la plataforma.' },
};

export function absoluteUrl(path: string, content: SiteContent = site): string {
  return `${content.brand.baseUrl}/${path.replace(/^\/+/, '')}`;
}

export function isIndexable(key: PageKey, content: SiteContent = site): boolean {
  const page = PAGES[key];
  if (page.kind === 'utility') return false;
  if (page.kind === 'legal') return content.legal.reviewed;
  if (key === 'caseStudies') return content.caseStudies.length > 0;
  return true;
}

export function buildMetadata(key: PageKey, content: SiteContent = site): Metadata {
  const page = PAGES[key];
  const url = absoluteUrl(page.path, content);
  const indexable = isIndexable(key, content);
  // A page-level openGraph object replaces the root one, so the image must be repeated here.
  const image = {
    url: '/opengraph-image', width: 1200, height: 630,
    alt: `${content.brand.name}: ${content.brand.tagline}`,
  };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    robots: { index: indexable, follow: indexable },
    openGraph: {
      type: 'website', url, title: page.title, description: page.description,
      siteName: content.brand.name, locale: 'es_EC', images: [image],
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description, images: [image.url] },
  };
}

export function softwareApplicationLd(content: SiteContent = site) {
  const offers = content.plans
    .filter((plan) => plan.priceMonthly !== null)
    .map((plan) => ({ '@type': 'Offer', name: plan.name, price: String(plan.priceMonthly), priceCurrency: 'USD' }));
  const reviews = content.reviews;
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / (reviews.length || 1);
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: content.brand.name,
    description: content.brand.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: absoluteUrl('/', content),
    offers,
    // Ratings are emitted only from real reviews loaded in the content file.
    ...(reviews.length > 0 && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: average.toFixed(1), reviewCount: reviews.length },
      review: reviews.map((review) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: review.author },
        reviewBody: review.quote,
        reviewRating: { '@type': 'Rating', ratingValue: String(review.rating) },
      })),
    }),
  };
}

export function faqLd(faq: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question', name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function localBusinessLd(content: SiteContent = site) {
  const location = content.location;
  if (!location) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: content.brand.name,
    url: absoluteUrl('/', content),
    ...(content.contact.email && { email: content.contact.email }),
    ...(content.contact.whatsappNumber && { telephone: `+${content.contact.whatsappNumber.replace(/\D/g, '')}` }),
    address: {
      '@type': 'PostalAddress', streetAddress: location.address,
      addressLocality: location.city, addressCountry: location.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: location.latitude, longitude: location.longitude },
  };
}

export function breadcrumbLd(items: { label: string; path: string }[], content: SiteContent = site) {
  const trail = [{ label: PAGES.home.label, path: '/' }, ...items];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.label, item: absoluteUrl(item.path, content),
    })),
  };
}
