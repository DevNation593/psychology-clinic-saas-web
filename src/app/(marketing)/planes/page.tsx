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
