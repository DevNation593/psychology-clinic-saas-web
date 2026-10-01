import Link from 'next/link';
import { JsonLd } from './json-ld';
import { PAGES, breadcrumbLd, type PageKey } from './seo';

export function Breadcrumbs({ page }: { page: PageKey }) {
  const current = PAGES[page];
  return (
    <>
      <nav aria-label="Ruta de navegación" className="mx-auto max-w-6xl px-4 pt-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:underline">{PAGES.home.label}</Link></li>
          <li aria-hidden="true">/</li>
          <li><span aria-current="page" className="text-foreground">{current.label}</span></li>
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd([{ label: current.label, path: current.path }])} />
    </>
  );
}
