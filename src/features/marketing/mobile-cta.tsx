import Link from 'next/link';
import { hasWhatsappNumber, type ContactInfo } from '@/content/site';
import { whatsappUrl } from './demo-request';

export function MobileCta({ contact }: { contact: ContactInfo }) {
  const hasWhatsapp = hasWhatsappNumber(contact.whatsappNumber);
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
