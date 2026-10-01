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
