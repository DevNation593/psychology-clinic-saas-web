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
