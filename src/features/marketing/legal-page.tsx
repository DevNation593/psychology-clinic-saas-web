import type { ReactNode } from 'react';
import type { LegalEntity } from '@/content/site';
import { Breadcrumbs } from './breadcrumbs';
import { PAGES, type PageKey } from './seo';

export function LegalPage({ page, legal, children }: { page: PageKey; legal: LegalEntity; children: ReactNode }) {
  return (
    <>
      <Breadcrumbs page={page} />
      <article className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold">{PAGES[page].label}</h1>
        {!legal.reviewed && (
          <p role="note" className="mt-4 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            Borrador pendiente de revisión legal. Este texto aún no es definitivo.
          </p>
        )}
        <div className="mt-6 space-y-4 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </>
  );
}
