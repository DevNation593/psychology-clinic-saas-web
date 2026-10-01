import { hasWhatsappNumber, type ContactInfo } from '@/content/site';
import { whatsappUrl } from './demo-request';

/** Direct channels for visitors who prefer not to fill in the form. */
export function DirectContact({ contact }: { contact: ContactInfo }) {
  const whatsapp = hasWhatsappNumber(contact.whatsappNumber);
  if (!whatsapp && !contact.email) return null;
  return (
    <div className="mt-8 space-y-2 text-sm">
      <p className="font-medium">¿Prefieres escribirnos directamente?</p>
      {whatsapp && (
        <p>
          <a
            href={whatsappUrl(contact.whatsappNumber, 'Hola, quiero información sobre la plataforma.')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Escribir por WhatsApp
          </a>
        </p>
      )}
      {contact.email && (
        <p>
          <a href={`mailto:${contact.email}`} className="text-primary underline">{contact.email}</a>
        </p>
      )}
    </div>
  );
}
