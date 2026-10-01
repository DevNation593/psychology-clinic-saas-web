import { site } from '@/content/site';
import { Breadcrumbs } from '@/features/marketing/breadcrumbs';
import { DemoRequestForm } from '@/features/marketing/demo-request-form';
import { PAGES, buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('contact');

export default function ContactPage() {
  return (
    <>
      <Breadcrumbs page="contact" />
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
    </>
  );
}
