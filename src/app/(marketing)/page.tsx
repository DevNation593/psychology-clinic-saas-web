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
import { PlanGroups } from '@/features/marketing/sections/plan-groups';
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
      <PlanGroups plans={site.plans} />
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
