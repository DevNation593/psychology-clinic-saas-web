import Link from 'next/link';
import { site } from '@/content/site';
import { CookiePreferencesButton } from './consent/cookie-preferences-button';
import { PAGES, isIndexable, type PageKey } from './seo';

const SITE_LINKS: PageKey[] = ['howItWorks', 'plans', 'caseStudies', 'about', 'contact'];
const LEGAL_LINKS: PageKey[] = ['terms', 'privacy', 'cookies', 'dataProcessing'];

export function SiteFooter() {
  const owner = site.legal.companyName || site.brand.name;
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
          <Link href="/#verificar-certificado" className="hover:underline">Verificar certificado</Link>
        </nav>
        <nav aria-label="Legal" className="flex flex-col gap-2 text-sm">
          {LEGAL_LINKS.map((key) => (
            <Link key={key} href={PAGES[key].path} className="hover:underline">{PAGES[key].label}</Link>
          ))}
          <CookiePreferencesButton />
        </nav>
      </div>
      <p className="border-t py-4 text-center text-xs text-muted-foreground">
        {/* A company name such as "S.A.S." already ends the sentence. */}
        © {new Date().getFullYear()} {owner}{owner.endsWith('.') ? '' : '.'} Todos los derechos reservados.
      </p>
    </footer>
  );
}
