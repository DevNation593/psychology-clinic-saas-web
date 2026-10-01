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
