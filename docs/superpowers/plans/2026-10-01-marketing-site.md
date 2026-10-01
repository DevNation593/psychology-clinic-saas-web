# Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/` redirect with a public Spanish-language site that presents the product, its plans and a demo-request flow, with SEO, legal pages and cookie consent.

**Architecture:** A `(marketing)` route group inside the existing Next.js 14 App Router app, rendered as server components. All editable copy lives in one typed content module; sections that need real-world material render nothing while their data is empty. Client code is limited to the demo form, the consent store/banner, analytics loading and the header's auth-aware link.

**Tech Stack:** Next.js 14 (App Router, Metadata API, `next/og`, `next/script`), React 18, TypeScript, Tailwind, zod + react-hook-form, lucide-react, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-01-marketing-site-design.md`

## Global Constraints

- Work in the worktree `web/.worktrees/marketing-site`, branch `feat/marketing-site`. Run `npm ci` there once before Task 1.
- All user-facing copy is Spanish. Code identifiers and comments are English.
- No new dependencies.
- No network requests from the demo form. Nothing is stored server-side.
- Never write invented reviews, case studies, team members, addresses or legal-entity data. `reviews`, `caseStudies`, `team` stay `[]` and `location` stays `null`.
- Exactly five FAQ entries.
- Every image type carries a required non-empty `alt`.
- Plan prices are exactly: Prueba 0; Personal Básico 29; Personal Pro 59; Clínica Básica 99 (+15 per extra user, 3 included); Clínica Pro 199 (+12, 10 included); Enterprise custom.
- Google Analytics and the embedded map load only when consent is `accepted`. GA additionally requires `NEXT_PUBLIC_GA_ID`.
- Legal pages and `/gracias` are `noindex`; legal pages become indexable only when `site.legal.reviewed` is true.
- Nothing under `(auth)`, `(dashboard)`, `onboarding` or `activate` changes.
- Tests are behavioral: render and assert on output or returned values; never assert on source text.
- Lint must pass with `--max-warnings=0`; `npm run type-check` must pass.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **WhatsApp number typed with spaces, `+` or dashes** (`+593 99 123-4567`): the generated link must still be `https://wa.me/593991234567?...`. → Task 4 test.
2. **Demo form free text containing `&`, `#`, line breaks or emoji**: the message must arrive intact, i.e. fully URL-encoded. → Task 4 test.
3. **`localStorage` throws** (private mode, blocked site data): the site must render, treat consent as unset and not load analytics. → Task 3 test.
4. **Popup blocked when opening WhatsApp**: the visitor must stay on the form and get a manual link, not land on `/gracias` believing the request was sent. → Task 4 test.
5. **`NEXT_PUBLIC_APP_URL` missing or with a trailing slash**: canonical URLs, sitemap and Open Graph must still be well-formed absolute URLs with no `//`. → Task 1 test (`normalizeBaseUrl`) and Task 2 test (`absoluteUrl`).

---

## File Structure

```
src/content/site.ts                          types + the single editable content object
src/content/site.test.ts
src/content/legal/terms.tsx                  body of each legal text
src/content/legal/privacy.tsx
src/content/legal/cookies.tsx
src/content/legal/data-processing.tsx
src/features/marketing/seo.ts                page registry, buildMetadata, JSON-LD builders
src/features/marketing/seo.test.ts
src/features/marketing/json-ld.tsx           <JsonLd data={...} />
src/features/marketing/consent/consent.ts    storage + useConsent
src/features/marketing/consent/consent.test.tsx
src/features/marketing/consent/cookie-banner.tsx
src/features/marketing/consent/google-analytics.tsx
src/features/marketing/consent/consent-gate.tsx
src/features/marketing/consent/cookie-preferences-button.tsx
src/features/marketing/demo-request.ts       schema, message builder, link builders
src/features/marketing/demo-request.test.ts
src/features/marketing/demo-request-form.tsx
src/features/marketing/demo-request-form.test.tsx
src/features/marketing/site-header.tsx
src/features/marketing/auth-link.tsx
src/features/marketing/site-footer.tsx
src/features/marketing/breadcrumbs.tsx
src/features/marketing/mobile-cta.tsx
src/features/marketing/shell.test.tsx
src/features/marketing/legal-page.tsx
src/features/marketing/sections/hero.tsx
src/features/marketing/sections/how-it-works.tsx
src/features/marketing/sections/modules.tsx
src/features/marketing/sections/plans.tsx
src/features/marketing/sections/faq.tsx
src/features/marketing/sections/reviews.tsx
src/features/marketing/sections/case-studies.tsx
src/features/marketing/sections/team.tsx
src/features/marketing/sections/location.tsx
src/features/marketing/sections/contact-cta.tsx
src/features/marketing/sections/sections.test.tsx
src/app/(marketing)/layout.tsx
src/app/(marketing)/page.tsx                 replaces src/app/page.tsx (deleted)
src/app/(marketing)/planes/page.tsx
src/app/(marketing)/como-funciona/page.tsx
src/app/(marketing)/casos-de-exito/page.tsx
src/app/(marketing)/nosotros/page.tsx
src/app/(marketing)/contacto/page.tsx
src/app/(marketing)/gracias/page.tsx
src/app/(marketing)/terminos/page.tsx
src/app/(marketing)/privacidad/page.tsx
src/app/(marketing)/cookies/page.tsx
src/app/(marketing)/tratamiento-de-datos/page.tsx
src/app/not-found.tsx
src/app/not-found.test.tsx
src/app/robots.ts
src/app/sitemap.ts
src/app/opengraph-image.tsx
```

---

### Task 1: Content model

**Files:**
- Create: `src/content/site.ts`
- Test: `src/content/site.test.ts`

**Interfaces:**
- Produces: types `ImageAsset`, `Plan`, `Faq`, `Review`, `CaseStudy`, `TeamMember`, `SiteLocation`, `ContactInfo`, `LegalEntity`, `HowItWorksStep`, `ProductModule`, `SiteContent`; constant `site: SiteContent`; `resolveContactChannel(contact: ContactInfo): 'whatsapp' | 'email' | 'none'`; `normalizeBaseUrl(raw: string | undefined): string`.

- [ ] **Step 1: Write the failing test**

```ts
// src/content/site.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeBaseUrl, resolveContactChannel, site } from './site';

describe('site content', () => {
  it('has exactly five frequently asked questions with text', () => {
    expect(site.faq).toHaveLength(5);
    for (const item of site.faq) {
      expect(item.question.trim()).not.toBe('');
      expect(item.answer.trim()).not.toBe('');
    }
  });

  it('publishes the plan prices charged by the API', () => {
    const summary = site.plans.map((plan) => [
      plan.name, plan.priceMonthly, plan.pricePerExtraSeat, plan.seatsIncluded,
    ]);
    expect(summary).toEqual([
      ['Prueba', 0, null, 1],
      ['Personal Básico', 29, null, 1],
      ['Personal Pro', 59, null, 1],
      ['Clínica Básica', 99, 15, 3],
      ['Clínica Pro', 199, 12, 10],
      ['Enterprise', null, null, null],
    ]);
  });

  it('ships without invented real-world content', () => {
    expect(site.reviews).toEqual([]);
    expect(site.caseStudies).toEqual([]);
    expect(site.team).toEqual([]);
    expect(site.location).toBeNull();
    expect(site.legal.reviewed).toBe(false);
  });

  it('gives every image alternative text', () => {
    const images = [
      ...site.team.map((member) => member.photo),
      ...site.reviews.flatMap((review) => (review.photo ? [review.photo] : [])),
      ...site.caseStudies.flatMap((item) => (item.image ? [item.image] : [])),
    ];
    for (const image of images) expect(image.alt.trim()).not.toBe('');
  });
});

describe('resolveContactChannel', () => {
  const base = { responseTime: 'x' };
  it('prefers WhatsApp, then email, then none', () => {
    expect(resolveContactChannel({ ...base, whatsappNumber: '593991234567', email: 'a@b.co' })).toBe('whatsapp');
    expect(resolveContactChannel({ ...base, whatsappNumber: '', email: 'a@b.co' })).toBe('email');
    expect(resolveContactChannel({ ...base, whatsappNumber: ' ', email: '' })).toBe('none');
  });
});

describe('normalizeBaseUrl', () => {
  it('falls back to localhost and strips trailing slashes', () => {
    expect(normalizeBaseUrl(undefined)).toBe('http://localhost:4200');
    expect(normalizeBaseUrl('')).toBe('http://localhost:4200');
    expect(normalizeBaseUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizeBaseUrl('https://example.com///')).toBe('https://example.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/content/site.test.ts`
Expected: FAIL, cannot resolve `./site`.

- [ ] **Step 3: Write the content module**

```ts
// src/content/site.ts
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

export function normalizeBaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim().replace(/\/+$/, '');
  return value || 'http://localhost:4200';
}

export function resolveContactChannel(contact: ContactInfo): 'whatsapp' | 'email' | 'none' {
  if (contact.whatsappNumber.trim()) return 'whatsapp';
  if (contact.email.trim()) return 'email';
  return 'none';
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/content/site.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Document the new environment variables and commit**

Append to `.env.local.example`, before the `# INTERNAL` block:

```
# ==================
# PUBLIC SITE
# ==================

# WhatsApp number for demo requests, digits with country code (e.g. 593991234567)
# NEXT_PUBLIC_WHATSAPP_NUMBER=
# Contact e-mail shown on the public site
# NEXT_PUBLIC_CONTACT_EMAIL=
```

```bash
git add src/content .env.local.example
git commit -m "feat(web): add public site content model"
```

---

### Task 2: SEO helpers, robots and sitemap

**Files:**
- Create: `src/features/marketing/seo.ts`, `src/features/marketing/json-ld.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`
- Test: `src/features/marketing/seo.test.ts`

**Interfaces:**
- Consumes: `site`, `SiteContent`, `Faq` from `@/content/site`.
- Produces:
  - `type PageKey = 'home' | 'plans' | 'howItWorks' | 'caseStudies' | 'about' | 'contact' | 'thanks' | 'terms' | 'privacy' | 'cookies' | 'dataProcessing'`
  - `PAGES: Record<PageKey, { path: string; title: string; description: string; label: string; kind: 'public' | 'legal' | 'utility' }>`
  - `buildMetadata(key: PageKey, content?: SiteContent): Metadata`
  - `isIndexable(key: PageKey, content?: SiteContent): boolean`
  - `absoluteUrl(path: string, content?: SiteContent): string`
  - `softwareApplicationLd(content?)`, `faqLd(faq: Faq[])`, `localBusinessLd(content?): object | null`, `breadcrumbLd(items: { label: string; path: string }[], content?)`
  - `<JsonLd data={object} />`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/marketing/seo.test.ts
import { describe, expect, it } from 'vitest';
import { site, type SiteContent } from '@/content/site';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import {
  PAGES, absoluteUrl, breadcrumbLd, buildMetadata, faqLd, isIndexable,
  localBusinessLd, softwareApplicationLd, type PageKey,
} from './seo';

const keys = Object.keys(PAGES) as PageKey[];
const withContent = (overrides: Partial<SiteContent>): SiteContent => ({ ...site, ...overrides });

describe('page metadata', () => {
  it('gives every page a unique title and description', () => {
    const titles = keys.map((key) => PAGES[key].title);
    const descriptions = keys.map((key) => PAGES[key].description);
    expect(new Set(titles).size).toBe(keys.length);
    expect(new Set(descriptions).size).toBe(keys.length);
    for (const description of descriptions) expect(description.length).toBeLessThanOrEqual(160);
  });

  it('builds canonical, Open Graph and Twitter data', () => {
    const metadata = buildMetadata('plans');
    expect(metadata.title).toBe(PAGES.plans.title);
    expect(metadata.alternates?.canonical).toBe(`${site.brand.baseUrl}/planes`);
    expect(metadata.openGraph).toMatchObject({ url: `${site.brand.baseUrl}/planes`, locale: 'es_EC' });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('joins the base URL and path with exactly one slash', () => {
    const content = withContent({ brand: { ...site.brand, baseUrl: 'https://example.com' } });
    expect(absoluteUrl('/', content)).toBe('https://example.com/');
    expect(absoluteUrl('/planes', content)).toBe('https://example.com/planes');
    expect(absoluteUrl('planes', content)).toBe('https://example.com/planes');
  });
});

describe('indexability', () => {
  it('never indexes the thank-you page', () => {
    expect(isIndexable('thanks')).toBe(false);
    expect(buildMetadata('thanks').robots).toMatchObject({ index: false });
  });

  it('indexes legal pages only after legal review', () => {
    expect(isIndexable('privacy')).toBe(false);
    expect(isIndexable('privacy', withContent({ legal: { ...site.legal, reviewed: true } }))).toBe(true);
  });

  it('indexes case studies only when some exist', () => {
    expect(isIndexable('caseStudies')).toBe(false);
    const content = withContent({ caseStudies: [{ clinic: 'A', challenge: 'B', result: 'C' }] });
    expect(isIndexable('caseStudies', content)).toBe(true);
  });
});

describe('structured data', () => {
  it('describes the product with fixed-price offers only', () => {
    const data = softwareApplicationLd();
    expect(data['@type']).toBe('SoftwareApplication');
    expect(data.offers.map((offer: { price: string }) => offer.price)).toEqual(['0', '29', '59', '99', '199']);
    expect(data).not.toHaveProperty('aggregateRating');
  });

  it('adds ratings only from real reviews', () => {
    const data = softwareApplicationLd(withContent({
      reviews: [
        { author: 'A', role: 'R', quote: 'Q', rating: 5 },
        { author: 'B', role: 'R', quote: 'Q', rating: 4 },
      ],
    }));
    expect(data.aggregateRating).toMatchObject({ ratingValue: '4.5', reviewCount: 2 });
  });

  it('builds a FAQ page entity', () => {
    const data = faqLd(site.faq);
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(5);
  });

  it('omits the local business without a location', () => {
    expect(localBusinessLd()).toBeNull();
    const data = localBusinessLd(withContent({
      location: { address: 'Av. 1', city: 'Quito', country: 'EC', latitude: -0.18, longitude: -78.47, directions: 'x' },
    }));
    expect(data).toMatchObject({ '@type': 'LocalBusiness', geo: { latitude: -0.18, longitude: -78.47 } });
  });

  it('builds breadcrumbs starting at home', () => {
    const data = breadcrumbLd([{ label: 'Planes', path: '/planes' }]);
    expect(data.itemListElement.map((item: { name: string }) => item.name)).toEqual(['Inicio', 'Planes']);
    expect(data.itemListElement[1].position).toBe(2);
  });
});

describe('robots and sitemap', () => {
  it('disallows private areas and links the sitemap', () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.disallow).toEqual(expect.arrayContaining(['/dashboard', '/login', '/gracias', '/onboarding', '/activate']));
    expect(result.sitemap).toBe(`${site.brand.baseUrl}/sitemap.xml`);
  });

  it('lists only indexable pages', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(`${site.brand.baseUrl}/`);
    expect(urls).toContain(`${site.brand.baseUrl}/planes`);
    expect(urls).not.toContain(`${site.brand.baseUrl}/gracias`);
    expect(urls).not.toContain(`${site.brand.baseUrl}/privacidad`);
    expect(urls).not.toContain(`${site.brand.baseUrl}/casos-de-exito`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/marketing/seo.test.ts`
Expected: FAIL, cannot resolve `./seo`.

- [ ] **Step 3: Implement the helpers**

```ts
// src/features/marketing/seo.ts
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
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    robots: { index: indexable, follow: indexable },
    openGraph: {
      type: 'website', url, title: page.title, description: page.description,
      siteName: content.brand.name, locale: 'es_EC',
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description },
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
```

```tsx
// src/features/marketing/json-ld.tsx
export function JsonLd({ data }: { data: object }) {
  // "<" is escaped so content can never close the script element.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
```

```ts
// src/app/robots.ts
import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/features/marketing/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard', '/patients', '/calendar', '/tasks', '/profile', '/admin',
        '/login', '/forgot-password', '/reset-password', '/onboarding', '/activate', '/gracias',
      ],
    }],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
```

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { PAGES, absoluteUrl, isIndexable, type PageKey } from '@/features/marketing/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return (Object.keys(PAGES) as PageKey[])
    .filter((key) => isIndexable(key))
    .map((key) => ({
      url: absoluteUrl(PAGES[key].path),
      changeFrequency: 'monthly' as const,
      priority: key === 'home' ? 1 : 0.7,
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/marketing/seo.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/marketing/seo.ts src/features/marketing/seo.test.ts src/features/marketing/json-ld.tsx src/app/robots.ts src/app/sitemap.ts
git commit -m "feat(web): add public site metadata, structured data, robots and sitemap"
```

---

### Task 3: Cookie consent and gated analytics

**Files:**
- Create: `src/features/marketing/consent/consent.ts`, `cookie-banner.tsx`, `google-analytics.tsx`, `consent-gate.tsx`, `cookie-preferences-button.tsx` (all under `src/features/marketing/consent/`)
- Test: `src/features/marketing/consent/consent.test.tsx`

**Interfaces:**
- Produces:
  - `type ConsentState = 'unset' | 'accepted' | 'rejected'`
  - `readConsent(): ConsentState`, `writeConsent(next: 'accepted' | 'rejected'): void`, `resetConsent(): void`, `useConsent(): ConsentState`
  - `<CookieBanner />`, `<GoogleAnalytics measurementId={string | undefined} />`, `<ConsentGate fallback={ReactNode}>{children}</ConsentGate>`, `<CookiePreferencesButton />`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/marketing/consent/consent.test.tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentGate } from './consent-gate';
import { CookieBanner } from './cookie-banner';
import { CookiePreferencesButton } from './cookie-preferences-button';
import { GoogleAnalytics } from './google-analytics';
import { readConsent, resetConsent, writeConsent } from './consent';

vi.mock('next/script', () => ({
  default: ({ src, id }: { src?: string; id?: string }) => <div data-testid="script" data-src={src} data-id={id} />,
}));

beforeEach(() => {
  window.localStorage.clear();
  act(() => resetConsent());
});
afterEach(() => vi.restoreAllMocks());

describe('consent storage', () => {
  it('starts unset and persists a choice', () => {
    expect(readConsent()).toBe('unset');
    act(() => writeConsent('accepted'));
    expect(readConsent()).toBe('accepted');
    expect(window.localStorage.getItem('cookie-consent')).toBe('accepted');
  });

  it('ignores unknown stored values', () => {
    window.localStorage.setItem('cookie-consent', 'maybe');
    expect(readConsent()).toBe('unset');
  });

  it('treats unavailable storage as no consent without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readConsent()).toBe('unset');
    expect(() => act(() => writeConsent('accepted'))).not.toThrow();
  });
});

describe('CookieBanner', () => {
  it('asks once and hides after either choice', () => {
    render(<CookieBanner />);
    expect(screen.getByRole('region', { name: 'Aviso de cookies' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Política de cookies' })).toHaveAttribute('href', '/cookies');

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));

    expect(screen.queryByRole('region', { name: 'Aviso de cookies' })).not.toBeInTheDocument();
    expect(readConsent()).toBe('rejected');
  });

  it('reopens from the preferences button', () => {
    act(() => writeConsent('accepted'));
    render(<><CookieBanner /><CookiePreferencesButton /></>);
    expect(screen.queryByRole('region', { name: 'Aviso de cookies' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preferencias de cookies' }));

    expect(screen.getByRole('region', { name: 'Aviso de cookies' })).toBeInTheDocument();
  });
});

describe('GoogleAnalytics', () => {
  it('loads nothing without consent or without an ID', () => {
    const { rerender } = render(<GoogleAnalytics measurementId="G-TEST" />);
    expect(screen.queryByTestId('script')).not.toBeInTheDocument();
    act(() => writeConsent('rejected'));
    rerender(<GoogleAnalytics measurementId="G-TEST" />);
    expect(screen.queryByTestId('script')).not.toBeInTheDocument();
    act(() => writeConsent('accepted'));
    rerender(<GoogleAnalytics measurementId={undefined} />);
    expect(screen.queryByTestId('script')).not.toBeInTheDocument();
  });

  it('loads gtag after acceptance', () => {
    act(() => writeConsent('accepted'));
    render(<GoogleAnalytics measurementId="G-TEST" />);
    const sources = screen.getAllByTestId('script').map((node) => node.getAttribute('data-src'));
    expect(sources).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST');
  });
});

describe('ConsentGate', () => {
  it('shows the fallback until consent is accepted', () => {
    render(<ConsentGate fallback={<p>Ver en Google Maps</p>}><p>Mapa</p></ConsentGate>);
    expect(screen.getByText('Ver en Google Maps')).toBeInTheDocument();
    expect(screen.queryByText('Mapa')).not.toBeInTheDocument();

    act(() => writeConsent('accepted'));

    expect(screen.getByText('Mapa')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/marketing/consent`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement consent**

```ts
// src/features/marketing/consent/consent.ts
'use client';

import { useSyncExternalStore } from 'react';

export type ConsentState = 'unset' | 'accepted' | 'rejected';

const STORAGE_KEY = 'cookie-consent';
const listeners = new Set<() => void>();
// True while the visitor has reopened the banner to change a stored choice.
let reviewing = false;

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readConsent(): ConsentState {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'accepted' || value === 'rejected' ? value : 'unset';
  } catch {
    // Storage can be blocked (private mode); behave as if nothing was chosen.
    return 'unset';
  }
}

export function writeConsent(next: 'accepted' | 'rejected'): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Nothing to persist to; the choice lasts for this page view only.
  }
  reviewing = false;
  notify();
}

export function resetConsent(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore: storage unavailable.
  }
  reviewing = false;
  notify();
}

export function openConsentReview(): void {
  reviewing = true;
  notify();
}

export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribe, readConsent, () => 'unset');
}

export function useConsentReview(): boolean {
  return useSyncExternalStore(subscribe, () => reviewing, () => false);
}
```

```tsx
// src/features/marketing/consent/cookie-banner.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { readConsent, useConsent, useConsentReview, writeConsent } from './consent';

export function CookieBanner() {
  const consent = useConsent();
  const reviewing = useConsentReview();
  if (consent !== 'unset' && !reviewing) return null;

  const choose = (next: 'accepted' | 'rejected') => {
    const wasAccepted = readConsent() === 'accepted';
    writeConsent(next);
    // Analytics is already running; a reload is the only way to unload it.
    if (wasAccepted && next === 'rejected') window.location.reload();
  };

  return (
    <section
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-3xl px-4 md:bottom-4"
    >
      <div className="rounded-lg border bg-background p-4 shadow-lg">
        <p className="text-sm text-muted-foreground">
          Usamos cookies de analítica para entender cómo se usa el sitio. Solo se activan si las aceptas.
          Consulta la <Link href="/cookies" className="text-primary underline">Política de cookies</Link>.
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => choose('rejected')}>Rechazar</Button>
          <Button type="button" onClick={() => choose('accepted')}>Aceptar</Button>
        </div>
      </div>
    </section>
  );
}
```

```tsx
// src/features/marketing/consent/cookie-preferences-button.tsx
'use client';

import { openConsentReview } from './consent';

export function CookiePreferencesButton() {
  return (
    <button type="button" onClick={openConsentReview} className="text-left text-sm hover:underline">
      Preferencias de cookies
    </button>
  );
}
```

```tsx
// src/features/marketing/consent/google-analytics.tsx
'use client';

import Script from 'next/script';
import { useConsent } from './consent';

export function GoogleAnalytics({ measurementId }: { measurementId: string | undefined }) {
  const consent = useConsent();
  if (consent !== 'accepted' || !measurementId) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
```

```tsx
// src/features/marketing/consent/consent-gate.tsx
'use client';

import type { ReactNode } from 'react';
import { useConsent } from './consent';

/** Renders third-party embeds only after the visitor accepts cookies. */
export function ConsentGate({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return <>{useConsent() === 'accepted' ? children : fallback}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/marketing/consent`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/marketing/consent
git commit -m "feat(web): add cookie consent and consent-gated analytics"
```

---

### Task 4: Demo request form, contact and thank-you pages

**Files:**
- Create: `src/features/marketing/demo-request.ts`, `src/features/marketing/demo-request-form.tsx`, `src/app/(marketing)/contacto/page.tsx`, `src/app/(marketing)/gracias/page.tsx`
- Test: `src/features/marketing/demo-request.test.ts`, `src/features/marketing/demo-request-form.test.tsx`

**Interfaces:**
- Consumes: `site`, `ContactInfo`, `resolveContactChannel` (Task 1); `buildMetadata`, `PAGES` (Task 2); `Breadcrumbs` is added in Task 5, so these two pages import it then — in this task they render without breadcrumbs.
- Produces:
  - `demoRequestSchema`, `type DemoRequest`
  - `buildDemoMessage(data: DemoRequest): string`
  - `whatsappUrl(number: string, text: string): string`
  - `mailtoUrl(email: string, subject: string, body: string): string`
  - `<DemoRequestForm contact={ContactInfo} />`

- [ ] **Step 1: Write the failing unit test**

```ts
// src/features/marketing/demo-request.test.ts
import { describe, expect, it } from 'vitest';
import { buildDemoMessage, demoRequestSchema, mailtoUrl, whatsappUrl } from './demo-request';

const valid = {
  name: 'Ana Vega', clinic: 'Centro Vida', email: 'ana@example.com', phone: '0991234567',
  teamSize: '2-5', message: '', acceptPrivacy: true,
};

describe('demoRequestSchema', () => {
  it('accepts a complete request', () => {
    expect(demoRequestSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['name', { name: 'A' }],
    ['clinic', { clinic: '' }],
    ['email', { email: 'not-an-email' }],
    ['phone', { phone: '12' }],
    ['teamSize', { teamSize: '' }],
    ['acceptPrivacy', { acceptPrivacy: false }],
  ])('rejects an invalid %s', (field, override) => {
    const result = demoRequestSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path[0]).toBe(field);
  });
});

describe('link builders', () => {
  it('normalizes a formatted WhatsApp number to digits', () => {
    expect(whatsappUrl('+593 99 123-4567', 'Hola')).toBe('https://wa.me/593991234567?text=Hola');
  });

  it('encodes reserved characters, line breaks and emoji so the message arrives intact', () => {
    const text = 'Clínica A&B #1\nGracias 🙂';
    const url = new URL(whatsappUrl('593991234567', text));
    expect(url.searchParams.get('text')).toBe(text);
    expect(url.hash).toBe('');
  });

  it('builds a mailto link with encoded subject and body', () => {
    const url = mailtoUrl('ventas@example.com', 'Demo & más', 'Línea 1\nLínea 2');
    expect(url).toBe('mailto:ventas@example.com?subject=Demo%20%26%20m%C3%A1s&body=L%C3%ADnea%201%0AL%C3%ADnea%202');
  });
});

describe('buildDemoMessage', () => {
  it('lists the submitted fields and omits an empty message', () => {
    const message = buildDemoMessage(valid);
    expect(message).toContain('Ana Vega');
    expect(message).toContain('Centro Vida');
    expect(message).toContain('ana@example.com');
    expect(message).toContain('0991234567');
    expect(message).toContain('2-5');
    expect(message).not.toContain('Mensaje:');
    expect(buildDemoMessage({ ...valid, message: 'Atendemos nutrición' })).toContain('Mensaje: Atendemos nutrición');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/features/marketing/demo-request.test.ts`
Expected: FAIL, cannot resolve `./demo-request`.

- [ ] **Step 3: Implement the logic**

```ts
// src/features/marketing/demo-request.ts
import { z } from 'zod';

export const TEAM_SIZES = ['1', '2-5', '6-15', '16+'] as const;

export const demoRequestSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre'),
  clinic: z.string().trim().min(2, 'Escribe el nombre de tu consultorio'),
  email: z.string().trim().email('Correo inválido'),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,}$/, 'Teléfono inválido'),
  teamSize: z.string().min(1, 'Selecciona el tamaño de tu equipo'),
  message: z.string().trim().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  acceptPrivacy: z.boolean().refine((value) => value, 'Debes aceptar la política de privacidad'),
});

export type DemoRequest = z.infer<typeof demoRequestSchema>;

export function buildDemoMessage(data: DemoRequest): string {
  const lines = [
    'Hola, quiero solicitar una demo.',
    `Nombre: ${data.name}`,
    `Consultorio: ${data.clinic}`,
    `Correo: ${data.email}`,
    `Teléfono: ${data.phone}`,
    `Tamaño del equipo: ${data.teamSize}`,
  ];
  if (data.message) lines.push(`Mensaje: ${data.message}`);
  return lines.join('\n');
}

export function whatsappUrl(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- src/features/marketing/demo-request.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Write the failing form test**

```tsx
// src/features/marketing/demo-request-form.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoRequestForm } from './demo-request-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const whatsapp = { whatsappNumber: '593991234567', email: 'ventas@example.com', responseTime: 'En 24 horas.' };

function fill() {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana Vega' } });
  fireEvent.change(screen.getByLabelText('Consultorio o clínica'), { target: { value: 'Centro Vida' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '0991234567' } });
  fireEvent.change(screen.getByLabelText('Tamaño del equipo'), { target: { value: '2-5' } });
  fireEvent.click(screen.getByLabelText(/Acepto la/));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('DemoRequestForm', () => {
  it('shows field errors and sends nothing when the form is empty', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<DemoRequestForm contact={whatsapp} />);
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar demo' }));

    expect(await screen.findByText('Escribe tu nombre')).toBeInTheDocument();
    expect(screen.getByText('Debes aceptar la política de privacidad')).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('opens WhatsApp with the request and goes to the thank-you page', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ opener: {} } as unknown as Window);
    render(<DemoRequestForm contact={whatsapp} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar demo' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/gracias'));
    const url = new URL(open.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://wa.me/593991234567');
    expect(url.searchParams.get('text')).toContain('Centro Vida');
  });

  it('keeps the visitor on the form with a manual link when the popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    render(<DemoRequestForm contact={whatsapp} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar demo' }));

    const link = await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    expect(link.getAttribute('href')).toContain('https://wa.me/593991234567');
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Vega');
  });

  it('falls back to e-mail when there is no WhatsApp number', () => {
    render(<DemoRequestForm contact={{ ...whatsapp, whatsappNumber: '' }} />);
    expect(screen.getByText(/Se abrirá tu aplicación de correo/)).toBeInTheDocument();
  });

  it('renders a notice instead of a form when no contact channel exists', () => {
    render(<DemoRequestForm contact={{ whatsappNumber: '', email: '', responseTime: 'x' }} />);
    expect(screen.queryByRole('button', { name: 'Solicitar demo' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Pronto habilitaremos');
  });

  it('shows the response-time promise', () => {
    render(<DemoRequestForm contact={whatsapp} />);
    expect(screen.getByText('En 24 horas.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test -- src/features/marketing/demo-request-form.test.tsx`
Expected: FAIL, cannot resolve `./demo-request-form`.

- [ ] **Step 7: Implement the form**

```tsx
// src/features/marketing/demo-request-form.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resolveContactChannel, type ContactInfo } from '@/content/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  TEAM_SIZES, buildDemoMessage, demoRequestSchema, mailtoUrl, whatsappUrl, type DemoRequest,
} from './demo-request';

export function DemoRequestForm({ contact }: { contact: ContactInfo }) {
  const router = useRouter();
  const channel = resolveContactChannel(contact);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<DemoRequest>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: { name: '', clinic: '', email: '', phone: '', teamSize: '', message: '', acceptPrivacy: false },
  });

  if (channel === 'none') {
    return (
      <p role="status" className="rounded-md border bg-muted p-4 text-sm">
        Pronto habilitaremos el formulario de solicitud de demo.
      </p>
    );
  }

  const onSubmit = (data: DemoRequest) => {
    const message = buildDemoMessage(data);
    if (channel === 'email') {
      window.location.href = mailtoUrl(contact.email, 'Solicitud de demo', message);
      router.push('/gracias');
      return;
    }
    const url = whatsappUrl(contact.whatsappNumber, message);
    const opened = window.open(url, '_blank');
    if (!opened) {
      // Popup blocked: do not claim the request was sent.
      setManualUrl(url);
      return;
    }
    opened.opener = null;
    router.push('/gracias');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="demo-name">Nombre</Label>
          <Input id="demo-name" autoComplete="name" {...register('name')} error={errors.name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-clinic">Consultorio o clínica</Label>
          <Input id="demo-clinic" autoComplete="organization" {...register('clinic')} error={errors.clinic?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-email">Correo electrónico</Label>
          <Input id="demo-email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-phone">Teléfono</Label>
          <Input id="demo-phone" type="tel" autoComplete="tel" {...register('phone')} error={errors.phone?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-team">Tamaño del equipo</Label>
        <select
          id="demo-team"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register('teamSize')}
        >
          <option value="">Seleccionar</option>
          {TEAM_SIZES.map((size) => <option key={size} value={size}>{size} profesionales</option>)}
        </select>
        {errors.teamSize && <p role="alert" className="text-sm text-destructive">{errors.teamSize.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-message">Mensaje (opcional)</Label>
        <Textarea id="demo-message" {...register('message')} />
        {errors.message && <p role="alert" className="text-sm text-destructive">{errors.message.message}</p>}
      </div>

      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <input id="demo-privacy" type="checkbox" className="mt-1 h-4 w-4 rounded border-input" {...register('acceptPrivacy')} />
          <label htmlFor="demo-privacy" className="text-sm">
            Acepto la <Link href="/privacidad" className="text-primary underline">política de privacidad</Link>
          </label>
        </div>
        {errors.acceptPrivacy && <p role="alert" className="text-sm text-destructive">{errors.acceptPrivacy.message}</p>}
      </div>

      {manualUrl && (
        <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm">
          No pudimos abrir WhatsApp automáticamente.{' '}
          <a href={manualUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Abrir WhatsApp</a>
        </p>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto">Solicitar demo</Button>
      <p className="text-sm text-muted-foreground">{contact.responseTime}</p>
      {channel === 'email' && (
        <p className="text-sm text-muted-foreground">Se abrirá tu aplicación de correo con la solicitud lista para enviar.</p>
      )}
    </form>
  );
}
```

Check `src/components/ui/label.tsx` and `textarea.tsx` before use: if `Textarea` does not forward `ref`, register it through `Controller` instead; if `Label` requires extra props, pass them.

- [ ] **Step 8: Run it to verify it passes**

Run: `npm test -- src/features/marketing/demo-request-form.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 9: Add the contact and thank-you pages**

```tsx
// src/app/(marketing)/contacto/page.tsx
import { site } from '@/content/site';
import { DemoRequestForm } from '@/features/marketing/demo-request-form';
import { PAGES, buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('contact');

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Solicita una demo</h1>
      <p className="mt-2 text-muted-foreground">{PAGES.contact.description}</p>
      <div className="mt-8">
        <DemoRequestForm contact={site.contact} />
      </div>
      {site.contact.email && (
        <p className="mt-8 text-sm">
          También puedes escribirnos a{' '}
          <a href={`mailto:${site.contact.email}`} className="text-primary underline">{site.contact.email}</a>.
        </p>
      )}
    </div>
  );
}
```

```tsx
// src/app/(marketing)/gracias/page.tsx
import Link from 'next/link';
import { site } from '@/content/site';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('thanks');

export default function ThanksPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">¡Gracias por tu solicitud!</h1>
      <p className="mt-4 text-muted-foreground">
        Si enviaste el mensaje, ya lo tenemos. {site.contact.responseTime}
      </p>
      <ul className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
        <li><Link href="/como-funciona" className="text-primary underline">Ver cómo funciona</Link></li>
        <li><Link href="/planes" className="text-primary underline">Comparar planes</Link></li>
        <li><Link href="/" className="text-primary underline">Volver al inicio</Link></li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 10: Type-check and commit**

Run: `npm run type-check`
Expected: no errors.

```bash
git add src/features/marketing/demo-request.ts src/features/marketing/demo-request.test.ts src/features/marketing/demo-request-form.tsx src/features/marketing/demo-request-form.test.tsx "src/app/(marketing)/contacto" "src/app/(marketing)/gracias"
git commit -m "feat(web): add demo request form with contact and thank-you pages"
```

---

### Task 5: Site shell and 404

**Files:**
- Create: `src/features/marketing/site-header.tsx`, `auth-link.tsx`, `site-footer.tsx`, `breadcrumbs.tsx`, `mobile-cta.tsx` (under `src/features/marketing/`), `src/app/(marketing)/layout.tsx`, `src/app/not-found.tsx`
- Modify: `src/app/(marketing)/contacto/page.tsx`, `src/app/(marketing)/gracias/page.tsx` (add breadcrumbs), `src/app/layout.tsx` (metadata base)
- Test: `src/features/marketing/shell.test.tsx`, `src/app/not-found.test.tsx`

**Interfaces:**
- Consumes: `site`, `resolveContactChannel` (Task 1); `PAGES`, `PageKey`, `breadcrumbLd`, `isIndexable` (Task 2); `JsonLd` (Task 2); `CookieBanner`, `GoogleAnalytics`, `CookiePreferencesButton` (Task 3); `whatsappUrl` (Task 4).
- Produces: `<SiteHeader />`, `<SiteFooter />`, `<MobileCta contact={ContactInfo} />`, `<Breadcrumbs page={PageKey} />`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/marketing/shell.test.tsx
import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { Breadcrumbs } from './breadcrumbs';
import { MobileCta } from './mobile-cta';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

beforeEach(() => {
  act(() => useAuthStore.setState({ isAuthenticated: false, hasHydrated: true }));
});

describe('SiteHeader', () => {
  it('links to the public sections, login and the demo request', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Planes' })).toHaveAttribute('href', '/planes');
    expect(within(nav).getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '/como-funciona');
    expect(within(nav).queryByRole('link', { name: 'Casos de éxito' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Solicitar demo' })).toHaveAttribute('href', '/contacto');
  });

  it('offers the dashboard to a signed-in visitor', () => {
    act(() => useAuthStore.setState({ isAuthenticated: true, hasHydrated: true }));
    render(<SiteHeader />);
    expect(screen.getByRole('link', { name: 'Ir al panel' })).toHaveAttribute('href', '/dashboard');
  });

  it('shows the login link until the session has hydrated', () => {
    act(() => useAuthStore.setState({ isAuthenticated: true, hasHydrated: false }));
    render(<SiteHeader />);
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});

describe('SiteFooter', () => {
  it('links to every legal page and the cookie preferences', () => {
    render(<SiteFooter />);
    for (const [name, href] of [
      ['Términos y condiciones', '/terminos'],
      ['Política de privacidad', '/privacidad'],
      ['Política de cookies', '/cookies'],
      ['Tratamiento de datos', '/tratamiento-de-datos'],
    ]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
    expect(screen.getByRole('button', { name: 'Preferencias de cookies' })).toBeInTheDocument();
  });
});

describe('Breadcrumbs', () => {
  it('shows the trail with the current page unlinked', () => {
    render(<Breadcrumbs page="plans" />);
    const nav = screen.getByRole('navigation', { name: 'Ruta de navegación' });
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(within(nav).getByText('Planes')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Planes' })).not.toBeInTheDocument();
  });
});

describe('MobileCta', () => {
  it('offers the demo request and WhatsApp', () => {
    render(<MobileCta contact={{ whatsappNumber: '593991234567', email: '', responseTime: '' }} />);
    expect(screen.getByRole('link', { name: 'Solicitar demo' })).toHaveAttribute('href', '/contacto');
    expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toContain('https://wa.me/593991234567');
  });

  it('hides WhatsApp when there is no number', () => {
    render(<MobileCta contact={{ whatsappNumber: '', email: 'a@b.co', responseTime: '' }} />);
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar demo' })).toBeInTheDocument();
  });
});
```

```tsx
// src/app/not-found.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFound from './not-found';

describe('NotFound', () => {
  it('explains the error and links back into the site', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: 'No encontramos esta página' })).toBeInTheDocument();
    for (const [name, href] of [
      ['Ir al inicio', '/'], ['Ver planes', '/planes'], ['Contacto', '/contacto'], ['Iniciar sesión', '/login'],
    ]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/features/marketing/shell.test.tsx src/app/not-found.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the shell components**

```tsx
// src/features/marketing/auth-link.tsx
'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export function AuthLink() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const signedIn = hasHydrated && isAuthenticated;
  return (
    <Link href={signedIn ? '/dashboard' : '/login'} className="text-sm font-medium hover:underline">
      {signedIn ? 'Ir al panel' : 'Iniciar sesión'}
    </Link>
  );
}
```

```tsx
// src/features/marketing/site-header.tsx
import Link from 'next/link';
import { site } from '@/content/site';
import { AuthLink } from './auth-link';
import { PAGES, isIndexable, type PageKey } from './seo';

const NAV: PageKey[] = ['howItWorks', 'plans', 'caseStudies', 'about', 'contact'];
const cta = 'inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90';

export function SiteHeader() {
  // Pages without content (e.g. case studies) stay out of the navigation.
  const links = NAV.filter((key) => isIndexable(key));
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-lg font-bold">{site.brand.name}</Link>
        <nav aria-label="Principal" className="hidden gap-6 md:flex">
          {links.map((key) => (
            <Link key={key} href={PAGES[key].path} className="text-sm text-muted-foreground hover:text-foreground">
              {PAGES[key].label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <AuthLink />
          <Link href="/contacto" className={`${cta} hidden sm:inline-flex`}>Solicitar demo</Link>
        </div>
      </div>
    </header>
  );
}
```

The test expects a "Solicitar demo" link in the header at every width in jsdom (classes do not hide it there); on real phones the fixed mobile CTA covers it.

```tsx
// src/features/marketing/site-footer.tsx
import Link from 'next/link';
import { site } from '@/content/site';
import { CookiePreferencesButton } from './consent/cookie-preferences-button';
import { PAGES, isIndexable, type PageKey } from './seo';

const SITE_LINKS: PageKey[] = ['howItWorks', 'plans', 'caseStudies', 'about', 'contact'];
const LEGAL_LINKS: PageKey[] = ['terms', 'privacy', 'cookies', 'dataProcessing'];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-semibold">{site.brand.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{site.brand.description}</p>
        </div>
        <nav aria-label="Sitio" className="flex flex-col gap-2 text-sm">
          {SITE_LINKS.filter((key) => isIndexable(key)).map((key) => (
            <Link key={key} href={PAGES[key].path} className="hover:underline">{PAGES[key].label}</Link>
          ))}
        </nav>
        <nav aria-label="Legal" className="flex flex-col gap-2 text-sm">
          {LEGAL_LINKS.map((key) => (
            <Link key={key} href={PAGES[key].path} className="hover:underline">{PAGES[key].label}</Link>
          ))}
          <CookiePreferencesButton />
        </nav>
      </div>
      <p className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {site.legal.companyName || site.brand.name}
      </p>
    </footer>
  );
}
```

```tsx
// src/features/marketing/breadcrumbs.tsx
import Link from 'next/link';
import { JsonLd } from './json-ld';
import { PAGES, breadcrumbLd, type PageKey } from './seo';

export function Breadcrumbs({ page }: { page: PageKey }) {
  const current = PAGES[page];
  return (
    <>
      <nav aria-label="Ruta de navegación" className="mx-auto max-w-6xl px-4 pt-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:underline">{PAGES.home.label}</Link></li>
          <li aria-hidden="true">/</li>
          <li><span aria-current="page" className="text-foreground">{current.label}</span></li>
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd([{ label: current.label, path: current.path }])} />
    </>
  );
}
```

```tsx
// src/features/marketing/mobile-cta.tsx
import Link from 'next/link';
import type { ContactInfo } from '@/content/site';
import { whatsappUrl } from './demo-request';

export function MobileCta({ contact }: { contact: ContactInfo }) {
  const hasWhatsapp = contact.whatsappNumber.trim() !== '';
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t bg-background p-3 md:hidden">
      <Link
        href="/contacto"
        className="flex h-11 flex-1 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
      >
        Solicitar demo
      </Link>
      {hasWhatsapp && (
        <a
          href={whatsappUrl(contact.whatsappNumber, 'Hola, quiero información sobre la plataforma.')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 flex-1 items-center justify-center rounded-md border text-sm font-medium"
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add the layout and the 404 page**

```tsx
// src/app/(marketing)/layout.tsx
import { site } from '@/content/site';
import { CookieBanner } from '@/features/marketing/consent/cookie-banner';
import { GoogleAnalytics } from '@/features/marketing/consent/google-analytics';
import { MobileCta } from '@/features/marketing/mobile-cta';
import { SiteFooter } from '@/features/marketing/site-footer';
import { SiteHeader } from '@/features/marketing/site-header';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:p-2">
        Saltar al contenido
      </a>
      <SiteHeader />
      {/* Bottom padding keeps content clear of the fixed mobile CTA. */}
      <main id="contenido" className="flex-1 pb-20 md:pb-0">{children}</main>
      <SiteFooter />
      <MobileCta contact={site.contact} />
      <CookieBanner />
      <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_ID} />
    </div>
  );
}
```

```tsx
// src/app/not-found.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/content/site';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  description: 'La página que buscas no existe o cambió de dirección.',
  robots: { index: false, follow: false },
};

const link = 'inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-primary">{site.brand.name} · Error 404</p>
      <h1 className="mt-2 text-3xl font-bold">No encontramos esta página</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Puede que el enlace esté desactualizado o que la dirección tenga un error. Estas secciones sí existen:
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={`${link} bg-primary text-primary-foreground hover:bg-primary/90`}>Ir al inicio</Link>
        <Link href="/planes" className={link}>Ver planes</Link>
        <Link href="/contacto" className={link}>Contacto</Link>
        <Link href="/login" className={link}>Iniciar sesión</Link>
      </div>
    </main>
  );
}
```

In `src/app/layout.tsx`, replace the `metadata` export so relative Open Graph image URLs resolve and inner pages get a title suffix:

```tsx
import { site } from '@/content/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.brand.baseUrl),
  title: { default: site.brand.name, template: `%s | ${site.brand.name}` },
  description: 'Gestión modular para consultorios y profesionales de la salud',
};
```

Add `<Breadcrumbs page="contact" />` as the first child of the wrapper in `contacto/page.tsx` and `<Breadcrumbs page="thanks" />` in `gracias/page.tsx` (wrap the existing root `div` in a fragment and place the breadcrumbs above it).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/features/marketing/shell.test.tsx src/app/not-found.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 6: Type-check and commit**

Run: `npm run type-check`
Expected: no errors.

```bash
git add src/features/marketing "src/app/(marketing)" src/app/not-found.tsx src/app/not-found.test.tsx src/app/layout.tsx
git commit -m "feat(web): add public site shell, breadcrumbs, mobile CTA and 404 page"
```

---

### Task 6: Sections and home page

**Files:**
- Create: `hero.tsx`, `how-it-works.tsx`, `modules.tsx`, `plans.tsx`, `faq.tsx`, `reviews.tsx`, `case-studies.tsx`, `team.tsx`, `location.tsx`, `contact-cta.tsx` (under `src/features/marketing/sections/`), `src/app/(marketing)/page.tsx`
- Delete: `src/app/page.tsx`
- Test: `src/features/marketing/sections/sections.test.tsx`

**Interfaces:**
- Consumes: content types (Task 1); `JsonLd`, `softwareApplicationLd`, `faqLd`, `localBusinessLd`, `buildMetadata` (Task 2); `ConsentGate` (Task 3); `whatsappUrl` (Task 4).
- Produces: `<Hero hero contact />`, `<HowItWorks steps />`, `<Modules modules />`, `<Plans plans />`, `<FaqSection faq />`, `<Reviews reviews />`, `<CaseStudies items />`, `<Team members />`, `<LocationSection location />`, `<ContactCta contact />`, `formatPlanPrice(plan: Plan): string`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/marketing/sections/sections.test.tsx
import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { site } from '@/content/site';
import { resetConsent, writeConsent } from '../consent/consent';
import { CaseStudies } from './case-studies';
import { FaqSection } from './faq';
import { Hero } from './hero';
import { LocationSection } from './location';
import { Plans, formatPlanPrice } from './plans';
import { Reviews } from './reviews';
import { Team } from './team';

beforeEach(() => act(() => resetConsent()));

describe('Hero', () => {
  it('shows the headline with the demo and WhatsApp calls to action', () => {
    render(<Hero hero={site.hero} contact={{ whatsappNumber: '593991234567', email: '', responseTime: 'En 24 horas.' }} />);
    expect(screen.getByRole('heading', { level: 1, name: site.hero.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar demo' })).toHaveAttribute('href', '/contacto');
    expect(screen.getByRole('link', { name: 'Escribir por WhatsApp' }).getAttribute('href')).toContain('wa.me/593991234567');
    expect(screen.getByText('En 24 horas.')).toBeInTheDocument();
  });

  it('omits WhatsApp without a number', () => {
    render(<Hero hero={site.hero} contact={{ whatsappNumber: '', email: '', responseTime: '' }} />);
    expect(screen.queryByRole('link', { name: 'Escribir por WhatsApp' })).not.toBeInTheDocument();
  });
});

describe('Plans', () => {
  it('formats prices', () => {
    expect(formatPlanPrice(site.plans[0])).toBe('Gratis');
    expect(formatPlanPrice(site.plans[1])).toBe('$29');
    expect(formatPlanPrice(site.plans[5])).toBe('A medida');
  });

  it('lists every plan with its limits and extra-seat price', () => {
    render(<Plans plans={site.plans} />);
    const card = screen.getByRole('article', { name: 'Clínica Básica' });
    expect(within(card).getByText('$99')).toBeInTheDocument();
    expect(within(card).getByText('3 usuarios incluidos')).toBeInTheDocument();
    expect(within(card).getByText('$15 por usuario adicional')).toBeInTheDocument();
    expect(within(card).getByText('Hasta 150 pacientes activos')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });
});

describe('FaqSection', () => {
  it('renders each question with its answer', () => {
    render(<FaqSection faq={site.faq} />);
    expect(screen.getAllByRole('group')).toHaveLength(5);
    expect(screen.getByText(site.faq[0].answer)).toBeInTheDocument();
  });
});

describe('sections that need real content', () => {
  it('render nothing while empty', () => {
    const { container } = render(
      <><Reviews reviews={[]} /><CaseStudies items={[]} /><Team members={[]} /><LocationSection location={null} /></>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('render reviews, cases and team once content exists', () => {
    render(
      <>
        <Reviews reviews={[{ author: 'Ana Vega', role: 'Psicóloga', quote: 'Ordenó mi agenda.', rating: 5 }]} />
        <CaseStudies items={[{ clinic: 'Centro Vida', challenge: 'Agenda en papel', result: 'Menos ausencias' }]} />
        <Team members={[{ name: 'Luis Paz', role: 'Soporte', photo: { src: '/team/luis.jpg', alt: 'Retrato de Luis Paz' } }]} />
      </>,
    );
    expect(screen.getByText('Ordenó mi agenda.')).toBeInTheDocument();
    expect(screen.getByLabelText('5 de 5 estrellas')).toBeInTheDocument();
    expect(screen.getByText('Menos ausencias')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Retrato de Luis Paz' })).toBeInTheDocument();
  });
});

describe('LocationSection', () => {
  const location = { address: 'Av. Amazonas 100', city: 'Quito', country: 'Ecuador', latitude: -0.18, longitude: -78.47, directions: 'Frente al parque.' };

  it('shows the address and a maps link without loading the embed before consent', () => {
    render(<LocationSection location={location} />);
    expect(screen.getByText(/Av. Amazonas 100/)).toBeInTheDocument();
    expect(screen.getByText('Frente al parque.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver en Google Maps' }).getAttribute('href')).toContain('-0.18,-78.47');
    expect(screen.queryByTitle('Mapa de ubicación')).not.toBeInTheDocument();
  });

  it('embeds the map after consent', () => {
    act(() => writeConsent('accepted'));
    render(<LocationSection location={location} />);
    expect(screen.getByTitle('Mapa de ubicación')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/features/marketing/sections`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the sections**

Shared wrapper conventions: each section is `<section aria-labelledby="…">` with an `h2`, inside `mx-auto max-w-6xl px-4 py-16`.

```tsx
// src/features/marketing/sections/hero.tsx
import Link from 'next/link';
import type { ContactInfo, SiteContent } from '@/content/site';
import { whatsappUrl } from '../demo-request';

export function Hero({ hero, contact }: { hero: SiteContent['hero']; contact: ContactInfo }) {
  return (
    <section className="bg-gradient-to-b from-blue-50 to-background">
      {/* Compact vertical padding keeps both CTAs above the fold on small phones. */}
      <div className="mx-auto max-w-6xl px-4 py-12 text-center md:py-24">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">{hero.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">{hero.subtitle}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/contacto" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Solicitar demo
          </Link>
          {contact.whatsappNumber.trim() !== '' && (
            <a
              href={whatsappUrl(contact.whatsappNumber, 'Hola, quiero información sobre la plataforma.')}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md border px-8 text-sm font-medium hover:bg-accent"
            >
              Escribir por WhatsApp
            </a>
          )}
        </div>
        {contact.responseTime && <p className="mt-3 text-sm text-muted-foreground">{contact.responseTime}</p>}
      </div>
    </section>
  );
}
```

```tsx
// src/features/marketing/sections/how-it-works.tsx
import type { HowItWorksStep } from '@/content/site';

export function HowItWorks({ steps }: { steps: HowItWorksStep[] }) {
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="how-title" className="text-2xl font-bold">Cómo funciona</h2>
      <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-lg border p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
            <h3 className="mt-3 font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

```tsx
// src/features/marketing/sections/modules.tsx
import type { ProductModule } from '@/content/site';

export function Modules({ modules }: { modules: ProductModule[] }) {
  return (
    <section aria-labelledby="modules-title" className="bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="modules-title" className="text-2xl font-bold">Todo lo que necesita tu consultorio</h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <li key={module.title} className="rounded-lg border bg-background p-5">
              <h3 className="font-semibold">{module.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

```tsx
// src/features/marketing/sections/plans.tsx
import Link from 'next/link';
import type { Plan } from '@/content/site';

export function formatPlanPrice(plan: Plan): string {
  if (plan.priceMonthly === null) return 'A medida';
  return plan.priceMonthly === 0 ? 'Gratis' : `$${plan.priceMonthly}`;
}

function limits(plan: Plan): string[] {
  const lines: string[] = [];
  if (plan.seatsIncluded !== null) lines.push(plan.seatsIncluded === 1 ? '1 usuario incluido' : `${plan.seatsIncluded} usuarios incluidos`);
  if (plan.pricePerExtraSeat !== null) lines.push(`$${plan.pricePerExtraSeat} por usuario adicional`);
  if (plan.maxActivePatients !== null) lines.push(`Hasta ${plan.maxActivePatients} pacientes activos`);
  if (plan.storageGB !== null) lines.push(`${plan.storageGB} GB de almacenamiento`);
  if (plan.monthlyNotifications !== null) lines.push(`${plan.monthlyNotifications} notificaciones al mes`);
  if (lines.length === 0) lines.push('Usuarios, pacientes y almacenamiento según tu operación');
  return lines;
}

export function Plans({ plans, heading = 'Planes' }: { plans: Plan[]; heading?: string }) {
  return (
    <section aria-labelledby="plans-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="plans-title" className="text-2xl font-bold">{heading}</h2>
      <p className="mt-2 text-sm text-muted-foreground">Precios en USD por mes.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.id}
            aria-label={plan.name}
            className={`flex flex-col rounded-lg border p-6 ${plan.highlighted ? 'border-primary shadow-md' : ''}`}
          >
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.summary}</p>
            <p className="mt-4">
              <span className="text-3xl font-bold">{formatPlanPrice(plan)}</span>
              {plan.priceMonthly !== null && plan.priceMonthly > 0 && <span className="text-sm text-muted-foreground"> USD/mes</span>}
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {limits(plan).map((line) => <li key={line}>{line}</li>)}
            </ul>
            <Link href="/contacto" className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {plan.priceMonthly === null ? 'Hablar con ventas' : 'Solicitar demo'}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
```

Six cards each carry a "Solicitar demo"/"Hablar con ventas" link; that is intentional. Tests that look for a single "Solicitar demo" link render the hero or header alone.

```tsx
// src/features/marketing/sections/faq.tsx
import type { Faq } from '@/content/site';

export function FaqSection({ faq }: { faq: Faq[] }) {
  return (
    <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 py-16">
      <h2 id="faq-title" className="text-2xl font-bold">Preguntas frecuentes</h2>
      <div className="mt-6 divide-y rounded-lg border">
        {faq.map((item) => (
          <details key={item.question} className="p-4">
            <summary className="cursor-pointer font-medium">{item.question}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
```

`<details>` exposes the `group` role, which the test counts; collapsed answers stay in the DOM, so they are indexable and found by `getByText`.

```tsx
// src/features/marketing/sections/reviews.tsx
import type { Review } from '@/content/site';

export function Reviews({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="reviews-title" className="bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="reviews-title" className="text-2xl font-bold">Lo que dicen nuestros clientes</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {reviews.map((review) => (
            <li key={`${review.author}-${review.quote}`} className="rounded-lg border bg-background p-5">
              <p aria-label={`${review.rating} de 5 estrellas`} className="text-amber-500">
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </p>
              <blockquote className="mt-3 text-sm">{review.quote}</blockquote>
              <p className="mt-3 text-sm font-medium">{review.author}</p>
              <p className="text-xs text-muted-foreground">{review.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

```tsx
// src/features/marketing/sections/case-studies.tsx
import type { CaseStudy } from '@/content/site';

export function CaseStudies({ items }: { items: CaseStudy[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="cases-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="cases-title" className="text-2xl font-bold">Casos de éxito</h2>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.clinic} className="rounded-lg border p-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied static asset */}
            {item.image && <img src={item.image.src} alt={item.image.alt} className="mb-4 h-40 w-full rounded object-cover" loading="lazy" />}
            <h3 className="font-semibold">{item.clinic}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.challenge}</p>
            <p className="mt-2 text-sm font-medium">{item.result}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// src/features/marketing/sections/team.tsx
import type { TeamMember } from '@/content/site';

export function Team({ members }: { members: TeamMember[] }) {
  if (members.length === 0) return null;
  return (
    <section aria-labelledby="team-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="team-title" className="text-2xl font-bold">Nuestro equipo</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((member) => (
          <li key={member.name} className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied static asset */}
            <img src={member.photo.src} alt={member.photo.alt} className="mx-auto h-32 w-32 rounded-full object-cover" loading="lazy" />
            <p className="mt-3 font-medium">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.role}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// src/features/marketing/sections/location.tsx
import type { SiteLocation } from '@/content/site';
import { ConsentGate } from '../consent/consent-gate';

export function LocationSection({ location }: { location: SiteLocation | null }) {
  if (!location) return null;
  const coordinates = `${location.latitude},${location.longitude}`;
  // Numeric coordinates need no encoding; keeping the comma readable.
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
  return (
    <section aria-labelledby="location-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="location-title" className="text-2xl font-bold">Dónde estamos</h2>
      <address className="mt-4 not-italic">{location.address}, {location.city}, {location.country}</address>
      <p className="mt-2 text-sm text-muted-foreground">{location.directions}</p>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-primary underline">Ver en Google Maps</a>
      <div className="mt-6">
        {/* The embed sets third-party cookies, so it waits for consent. */}
        <ConsentGate fallback={<p className="text-sm text-muted-foreground">Acepta las cookies para ver el mapa aquí.</p>}>
          <iframe
            title="Mapa de ubicación"
            src={`https://www.google.com/maps?q=${encodeURIComponent(coordinates)}&output=embed`}
            className="h-80 w-full rounded-lg border"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </ConsentGate>
      </div>
    </section>
  );
}
```

```tsx
// src/features/marketing/sections/contact-cta.tsx
import Link from 'next/link';
import type { ContactInfo } from '@/content/site';

export function ContactCta({ contact }: { contact: ContactInfo }) {
  return (
    <section aria-labelledby="cta-title" className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 id="cta-title" className="text-2xl font-bold">¿Listo para verlo en tu consultorio?</h2>
        <p className="mt-2 text-sm opacity-90">{contact.responseTime}</p>
        <Link href="/contacto" className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-background px-8 text-sm font-medium text-foreground hover:bg-background/90">
          Agendar una demo
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/features/marketing/sections`
Expected: PASS (9 tests).

- [ ] **Step 5: Replace the root page**

```bash
git rm src/app/page.tsx
```

```tsx
// src/app/(marketing)/page.tsx
import Link from 'next/link';
import { site } from '@/content/site';
import { JsonLd } from '@/features/marketing/json-ld';
import { buildMetadata, faqLd, localBusinessLd, softwareApplicationLd } from '@/features/marketing/seo';
import { CaseStudies } from '@/features/marketing/sections/case-studies';
import { ContactCta } from '@/features/marketing/sections/contact-cta';
import { FaqSection } from '@/features/marketing/sections/faq';
import { Hero } from '@/features/marketing/sections/hero';
import { HowItWorks } from '@/features/marketing/sections/how-it-works';
import { Modules } from '@/features/marketing/sections/modules';
import { Plans } from '@/features/marketing/sections/plans';
import { Reviews } from '@/features/marketing/sections/reviews';

// The home title is absolute so the root layout's "%s | brand" template does not duplicate the brand.
export const metadata = { ...buildMetadata('home'), title: { absolute: buildMetadata('home').title as string } };

export default function HomePage() {
  const localBusiness = localBusinessLd();
  return (
    <>
      <Hero hero={site.hero} contact={site.contact} />
      <HowItWorks steps={site.howItWorks} />
      <p className="mx-auto -mt-8 max-w-6xl px-4 text-sm">
        <Link href="/como-funciona" className="text-primary underline">Ver el recorrido completo</Link>
      </p>
      <Modules modules={site.modules} />
      <Plans plans={site.plans.filter((plan) => plan.id !== 'trial' && plan.id !== 'enterprise')} />
      <p className="mx-auto -mt-8 max-w-6xl px-4 pb-8 text-sm">
        <Link href="/planes" className="text-primary underline">Comparar todos los planes</Link>
      </p>
      <CaseStudies items={site.caseStudies} />
      <Reviews reviews={site.reviews} />
      <FaqSection faq={site.faq} />
      <ContactCta contact={site.contact} />
      <JsonLd data={softwareApplicationLd()} />
      <JsonLd data={faqLd(site.faq)} />
      {localBusiness && <JsonLd data={localBusiness} />}
    </>
  );
}
```

- [ ] **Step 6: Verify and commit**

Run: `npm run type-check && npm run lint && npm test`
Expected: all pass; the full suite count grows by the tests added so far and no existing test fails.

```bash
git add -A src/app src/features/marketing/sections
git commit -m "feat(web): add public home page and content sections"
```

---

### Task 7: Inner pages

**Files:**
- Create: `src/app/(marketing)/planes/page.tsx`, `como-funciona/page.tsx`, `casos-de-exito/page.tsx`, `nosotros/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1, 2, 5 and 6. No new exports.

- [ ] **Step 1: Write the pages**

```tsx
// src/app/(marketing)/planes/page.tsx
import { site } from '@/content/site';
import { Breadcrumbs } from '@/features/marketing/breadcrumbs';
import { ContactCta } from '@/features/marketing/sections/contact-cta';
import { FaqSection } from '@/features/marketing/sections/faq';
import { Plans } from '@/features/marketing/sections/plans';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('plans');

export default function PlansPage() {
  const personal = site.plans.filter((plan) => plan.audience === 'personal');
  const clinic = site.plans.filter((plan) => plan.audience === 'clinic');
  return (
    <>
      <Breadcrumbs page="plans" />
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <h1 className="text-3xl font-bold">Planes y precios</h1>
        <p className="mt-2 text-muted-foreground">Elige según trabajes de forma independiente o con un equipo.</p>
      </div>
      <Plans plans={personal} heading="Para profesionales independientes" />
      <Plans plans={clinic} heading="Para clínicas y equipos" />
      <FaqSection faq={site.faq} />
      <ContactCta contact={site.contact} />
    </>
  );
}
```

`Plans` renders its heading with a fixed `id="plans-title"`; two instances on one page would duplicate the id. Change `Plans` to derive the id with React's `useId()` (it is a server-safe hook) and use it for both `id` and `aria-labelledby`.

```tsx
// src/app/(marketing)/como-funciona/page.tsx
import Link from 'next/link';
import { site } from '@/content/site';
import { Breadcrumbs } from '@/features/marketing/breadcrumbs';
import { ContactCta } from '@/features/marketing/sections/contact-cta';
import { Modules } from '@/features/marketing/sections/modules';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('howItWorks');

export default function HowItWorksPage() {
  return (
    <>
      <Breadcrumbs page="howItWorks" />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold">Cómo funciona</h1>
        <p className="mt-2 text-muted-foreground">El recorrido diario de un consultorio en la plataforma, en cinco pasos.</p>
        <ol className="mt-8 space-y-8">
          {site.howItWorks.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{index + 1}</span>
              <div>
                <h2 className="text-xl font-semibold">{step.title}</h2>
                <p className="mt-1 text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm">
          ¿Quieres saber cuánto cuesta? <Link href="/planes" className="text-primary underline">Revisa los planes</Link>.
        </p>
      </div>
      <Modules modules={site.modules} />
      <ContactCta contact={site.contact} />
    </>
  );
}
```

```tsx
// src/app/(marketing)/casos-de-exito/page.tsx
import { notFound } from 'next/navigation';
import { site } from '@/content/site';
import { Breadcrumbs } from '@/features/marketing/breadcrumbs';
import { CaseStudies } from '@/features/marketing/sections/case-studies';
import { ContactCta } from '@/features/marketing/sections/contact-cta';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('caseStudies');

export default function CaseStudiesPage() {
  // Without real cases this page must not exist.
  if (site.caseStudies.length === 0) notFound();
  return (
    <>
      <Breadcrumbs page="caseStudies" />
      <h1 className="mx-auto max-w-6xl px-4 pt-8 text-3xl font-bold">Casos de éxito</h1>
      <CaseStudies items={site.caseStudies} />
      <ContactCta contact={site.contact} />
    </>
  );
}
```

```tsx
// src/app/(marketing)/nosotros/page.tsx
import { site } from '@/content/site';
import { Breadcrumbs } from '@/features/marketing/breadcrumbs';
import { JsonLd } from '@/features/marketing/json-ld';
import { ContactCta } from '@/features/marketing/sections/contact-cta';
import { LocationSection } from '@/features/marketing/sections/location';
import { Team } from '@/features/marketing/sections/team';
import { buildMetadata, localBusinessLd } from '@/features/marketing/seo';

export const metadata = buildMetadata('about');

export default function AboutPage() {
  const localBusiness = localBusinessLd();
  return (
    <>
      <Breadcrumbs page="about" />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold">Nosotros</h1>
        <p className="mt-4 text-muted-foreground">{site.brand.description}</p>
        <p className="mt-4 text-muted-foreground">
          Construimos la plataforma para que los profesionales de la salud dediquen su tiempo a atender, no a administrar.
        </p>
      </div>
      <Team members={site.team} />
      <LocationSection location={site.location} />
      <ContactCta contact={site.contact} />
      {localBusiness && <JsonLd data={localBusiness} />}
    </>
  );
}
```

- [ ] **Step 2: Add a test for the duplicate-id fix**

Append to `src/features/marketing/sections/sections.test.tsx` inside `describe('Plans', …)`:

```tsx
  it('labels each instance with its own heading when rendered twice', () => {
    render(
      <>
        <Plans plans={site.plans.slice(0, 1)} heading="Para profesionales independientes" />
        <Plans plans={site.plans.slice(3, 4)} heading="Para clínicas y equipos" />
      </>,
    );
    expect(screen.getByRole('region', { name: 'Para profesionales independientes' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Para clínicas y equipos' })).toBeInTheDocument();
  });
```

Run: `npm test -- src/features/marketing/sections` → the new test FAILS before the `useId()` change (both regions resolve to the first heading) and PASSES after it.

- [ ] **Step 3: Build to verify the routes**

Run: `npm run build`
Expected: build succeeds and the route table lists `/`, `/planes`, `/como-funciona`, `/casos-de-exito`, `/nosotros`, `/contacto`, `/gracias`, `/robots.txt`, `/sitemap.xml`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)" src/features/marketing/sections
git commit -m "feat(web): add plans, how-it-works, about and case-study pages"
```

---

### Task 8: Legal pages

**Files:**
- Create: `src/features/marketing/legal-page.tsx`, `src/content/legal/terms.tsx`, `privacy.tsx`, `cookies.tsx`, `data-processing.tsx`, and `page.tsx` under `src/app/(marketing)/terminos/`, `privacidad/`, `cookies/`, `tratamiento-de-datos/`
- Test: `src/features/marketing/legal-page.test.tsx`

**Interfaces:**
- Consumes: `site`, `LegalEntity` (Task 1); `PAGES`, `PageKey`, `buildMetadata` (Task 2); `Breadcrumbs` (Task 5).
- Produces: `<LegalPage page={PageKey} legal={LegalEntity}>{body}</LegalPage>`; each content file default-exports a component taking `{ legal: LegalEntity; brand: string }`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/marketing/legal-page.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CookiesText from '@/content/legal/cookies';
import DataProcessingText from '@/content/legal/data-processing';
import PrivacyText from '@/content/legal/privacy';
import TermsText from '@/content/legal/terms';
import { LegalPage } from './legal-page';

const draft = { companyName: '', taxId: '', address: '', dataContactEmail: '', reviewed: false };
const reviewed = { companyName: 'Salud SA', taxId: '1790000000001', address: 'Quito', dataContactEmail: 'datos@example.com', reviewed: true };

describe('LegalPage', () => {
  it('warns that an unreviewed text is a draft', () => {
    render(<LegalPage page="privacy" legal={draft}><p>Cuerpo</p></LegalPage>);
    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Borrador pendiente de revisión legal');
  });

  it('drops the warning once reviewed', () => {
    render(<LegalPage page="privacy" legal={reviewed}><p>Cuerpo</p></LegalPage>);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});

describe('legal texts', () => {
  it.each([
    ['terms', TermsText],
    ['privacy', PrivacyText],
    ['cookies', CookiesText],
    ['data processing', DataProcessingText],
  ])('%s names the responsible party and never prints empty fields', (_name, Text) => {
    const filled = render(<Text legal={reviewed} brand="Marca" />);
    expect(filled.container).toHaveTextContent('Salud SA');
    filled.unmount();

    const empty = render(<Text legal={draft} brand="Marca" />);
    expect(empty.container).toHaveTextContent('[pendiente]');
    expect(empty.container.querySelectorAll('h2').length).toBeGreaterThanOrEqual(5);
  });

  it('the cookie policy names the analytics cookies and how to change the choice', () => {
    const { container } = render(<CookiesText legal={reviewed} brand="Marca" />);
    expect(container).toHaveTextContent('Google Analytics');
    expect(container).toHaveTextContent('Preferencias de cookies');
    expect(container).toHaveTextContent('cookie-consent');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/features/marketing/legal-page.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the wrapper**

```tsx
// src/features/marketing/legal-page.tsx
import type { ReactNode } from 'react';
import type { LegalEntity } from '@/content/site';
import { Breadcrumbs } from './breadcrumbs';
import { PAGES, type PageKey } from './seo';

export function LegalPage({ page, legal, children }: { page: PageKey; legal: LegalEntity; children: ReactNode }) {
  return (
    <>
      <Breadcrumbs page={page} />
      <article className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold">{PAGES[page].label}</h1>
        {!legal.reviewed && (
          <p role="note" className="mt-4 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            Borrador pendiente de revisión legal. Este texto aún no es definitivo.
          </p>
        )}
        <div className="mt-6 space-y-4 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </>
  );
}
```

`PAGES.dataProcessing.label` is "Tratamiento de datos" and the others match the footer link names tested in Task 5; do not rename them.

- [ ] **Step 4: Write the four texts**

Each file default-exports `function XText({ legal, brand }: { legal: LegalEntity; brand: string })` returning a fragment of `<h2>`/`<p>`/`<ul>`. Define once per file:

```tsx
const or = (value: string) => value.trim() || '[pendiente]';
```

and use `or(legal.companyName)`, `or(legal.taxId)`, `or(legal.address)`, `or(legal.dataContactEmail)` wherever the responsible party is named. Write plain, complete Spanish prose (no lorem ipsum, no "TODO"). These are drafts for a lawyer to review; state only what the product actually does. Required sections and the facts each must state:

**`terms.tsx` — Términos y condiciones**
1. *Quiénes somos*: the service is operated by `companyName`, tax ID, address.
2. *Objeto del servicio*: software for managing health practices (appointments, patients, clinical records, tasks, e-invoicing); it is a management tool and does not provide medical advice.
3. *Cuentas y acceso*: the practice administrator creates users and is responsible for their credentials and roles.
4. *Planes y pagos*: monthly plans in USD as published on `/planes`; extra users billed per plan; prices may change with prior notice.
5. *Uso aceptable*: lawful use only; no sharing of credentials; no attempts to access other tenants' data.
6. *Responsabilidad del consultorio sobre los datos clínicos*: the practice is responsible for the patient data it records and for its legal basis.
7. *Disponibilidad y limitación de responsabilidad*: service provided with reasonable effort, no guarantee of uninterrupted availability.
8. *Terminación*: either party may cancel; refer to the data-processing policy for what happens to data.
9. *Contacto*: `dataContactEmail`.

**`privacy.tsx` — Política de privacidad** (covers visitors to the public site)
1. *Responsable*: company name, tax ID, address, contact e-mail.
2. *Datos que recopilamos*: demo-form fields (name, practice, e-mail, phone, team size, message); these are **not stored by this site** — the form opens WhatsApp or the visitor's e-mail app and the data travels through that channel; usage analytics only with consent.
3. *Finalidad*: answer demo requests; measure site usage.
4. *Base legal*: consent.
5. *Terceros*: WhatsApp (Meta) when the visitor sends the message; Google Analytics when accepted; Google Maps when the map is shown.
6. *Conservación*: messages kept while the commercial conversation lasts; analytics per Google's retention settings.
7. *Tus derechos*: access, rectification, deletion, objection, portability; exercised by writing to `dataContactEmail`.
8. *Cambios*: the policy may be updated; date of last update.

**`cookies.tsx` — Política de cookies**
1. *Qué son las cookies*.
2. *Cookies y almacenamiento esenciales*: the key `cookie-consent` in local storage remembers the visitor's choice; the application's own session storage after login.
3. *Cookies de analítica*: Google Analytics (`_ga`, `_ga_*`), loaded only after acceptance, with IP anonymization.
4. *Cookies de terceros en el mapa*: the embedded Google Maps loads only after acceptance; otherwise a plain link is shown.
5. *Cómo aceptar, rechazar o cambiar*: the banner on first visit, and "Preferencias de cookies" in the footer at any time; rejecting after accepting reloads the page to unload analytics.
6. *Contacto*: `companyName`, `dataContactEmail`.

**`data-processing.tsx` — Política de tratamiento de datos personales** (covers data practices put into the platform)
1. *Roles*: the practice is the controller (responsable) of its patients' data; `companyName` acts as processor (encargado).
2. *Datos tratados*: patient identification and contact data, appointments, clinical notes, tasks, invoices; clinical data is sensitive health data.
3. *Finalidad*: provide the management service to the practice.
4. *Acceso y roles*: data is isolated per practice; clinical notes are visible only to authorized clinical roles.
5. *Seguridad*: access control by role, encrypted transport, isolation between practices.
6. *Subencargados*: hosting and database providers, electronic-invoicing provider, notification delivery.
7. *Conservación y devolución*: data kept while the subscription is active; on cancellation the practice may request export and deletion.
8. *Derechos de los pacientes*: exercised through the practice; `companyName` assists the practice.
9. *Contacto*: `dataContactEmail`.

- [ ] **Step 5: Add the four route pages**

Each follows this shape (shown for privacy; repeat with `terms`/`TermsText`/`terminos`, `cookies`/`CookiesText`/`cookies`, `dataProcessing`/`DataProcessingText`/`tratamiento-de-datos`):

```tsx
// src/app/(marketing)/privacidad/page.tsx
import PrivacyText from '@/content/legal/privacy';
import { site } from '@/content/site';
import { LegalPage } from '@/features/marketing/legal-page';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('privacy');

export default function PrivacyPage() {
  return (
    <LegalPage page="privacy" legal={site.legal}>
      <PrivacyText legal={site.legal} brand={site.brand.name} />
    </LegalPage>
  );
}
```

```tsx
// src/app/(marketing)/terminos/page.tsx
import TermsText from '@/content/legal/terms';
import { site } from '@/content/site';
import { LegalPage } from '@/features/marketing/legal-page';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('terms');

export default function TermsPage() {
  return (
    <LegalPage page="terms" legal={site.legal}>
      <TermsText legal={site.legal} brand={site.brand.name} />
    </LegalPage>
  );
}
```

```tsx
// src/app/(marketing)/cookies/page.tsx
import CookiesText from '@/content/legal/cookies';
import { site } from '@/content/site';
import { LegalPage } from '@/features/marketing/legal-page';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('cookies');

export default function CookiesPage() {
  return (
    <LegalPage page="cookies" legal={site.legal}>
      <CookiesText legal={site.legal} brand={site.brand.name} />
    </LegalPage>
  );
}
```

```tsx
// src/app/(marketing)/tratamiento-de-datos/page.tsx
import DataProcessingText from '@/content/legal/data-processing';
import { site } from '@/content/site';
import { LegalPage } from '@/features/marketing/legal-page';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('dataProcessing');

export default function DataProcessingPage() {
  return (
    <LegalPage page="dataProcessing" legal={site.legal}>
      <DataProcessingText legal={site.legal} brand={site.brand.name} />
    </LegalPage>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/features/marketing/legal-page.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 7: Commit**

```bash
git add src/features/marketing/legal-page.tsx src/features/marketing/legal-page.test.tsx src/content/legal "src/app/(marketing)"
git commit -m "feat(web): add legal pages as reviewable drafts"
```

---

### Task 9: Social image and full verification

**Files:**
- Create: `src/app/opengraph-image.tsx`
- Modify: `docs/ROUTE_MAP.md` (add the public routes)

**Interfaces:**
- Consumes: `site` (Task 1).

- [ ] **Step 1: Add the Open Graph image**

```tsx
// src/app/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { site } from '@/content/site';

export const alt = `${site.brand.name}: ${site.brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: 80, color: '#ffffff',
          background: 'linear-gradient(135deg, #1d4ed8 0%, #312e81 100%)',
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.85 }}>{site.brand.name}</div>
        <div style={{ fontSize: 72, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>{site.brand.tagline}</div>
        <div style={{ fontSize: 30, marginTop: 32, opacity: 0.9 }}>Agenda · Pacientes · Notas clínicas · Facturación</div>
      </div>
    ),
    size,
  );
}
```

Placed at the app root, Next attaches it as `og:image` and `twitter:image` to every route, with `alt` as its alternative text.

- [ ] **Step 2: Document the routes**

Add a "Sitio público" section to `docs/ROUTE_MAP.md` listing `/`, `/planes`, `/como-funciona`, `/casos-de-exito` (only with content), `/nosotros`, `/contacto`, `/gracias`, the four legal routes, `/robots.txt`, `/sitemap.xml`, and noting that `src/content/site.ts` is where the owner loads contact data, reviews, cases, team, location and legal-entity data.

- [ ] **Step 3: Run the full quality matrix**

```bash
npm run lint
npm run type-check
npm test
npm run build
```

Expected: zero lint warnings, zero type errors, every test passes (the pre-existing suite plus the tests added in Tasks 1–8), build succeeds.

- [ ] **Step 4: Verify in the browser**

Start `npm run dev` (port 4200) and check, at desktop width and at 375×812:

- `/` shows the hero heading and "Solicitar demo" without scrolling at both sizes; the fixed bottom CTA appears only on mobile and does not cover the footer or the cookie banner.
- The cookie banner appears on first visit; after "Rechazar" no request goes to `googletagmanager.com`; with `NEXT_PUBLIC_GA_ID` set and "Aceptar", one does.
- Reviews, case studies, team and map are absent; "Casos de éxito" is not in the header or footer; `/casos-de-exito` and `/no-existe` show the branded 404.
- `/contacto` with no `NEXT_PUBLIC_WHATSAPP_NUMBER` and no `NEXT_PUBLIC_CONTACT_EMAIL` shows the "Pronto habilitaremos" notice; with a number set, submitting opens WhatsApp and lands on `/gracias`.
- Each legal page shows the draft notice.
- View source on `/`: one `<title>`, a meta description, canonical, `og:image`, and JSON-LD for `SoftwareApplication` and `FAQPage`. `/robots.txt` and `/sitemap.xml` respond.
- `/login` and `/dashboard` behave as before.

Record anything that fails as a defect, fix it with a regression test first, and rerun Step 3.

- [ ] **Step 5: Commit**

```bash
git add src/app/opengraph-image.tsx docs/ROUTE_MAP.md
git commit -m "feat(web): add social sharing image and document public routes"
```

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| Content file, conditional sections, plan prices, five FAQ, alt text | 1, 6 |
| Unique titles, metadescriptions, canonical, OG/Twitter | 2 |
| robots.txt, sitemap | 2 |
| Structured data (software, FAQ, local business, breadcrumbs, reviews only when real) | 2, 5, 6, 7 |
| Consent, gated Google Analytics, gated map | 3, 6 |
| Demo form, WhatsApp/e-mail fallback, no network, thank-you page, response-time promise | 4 |
| Header with auth-aware link, footer with internal and legal links, breadcrumbs, fixed mobile CTA | 5 |
| Branded 404 | 5 |
| Home with CTA above the fold | 6, 9 |
| Plans, how-it-works, about, case-study pages; case studies 404 when empty | 7 |
| Terms, privacy, cookies, data-processing drafts with notice and noindex | 2, 8 |
| Social sharing image | 9 |
| Final lint/type/test/build and visual check | 9 |

## Deferred, not in this plan

- Storing leads or e-mail notification.
- Self-service clinic sign-up.
- The price mismatch in `src/app/(dashboard)/admin/subscription/page.tsx`.
- Blog, internationalization.
