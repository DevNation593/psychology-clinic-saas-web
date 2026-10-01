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
