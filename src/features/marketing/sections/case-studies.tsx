import type { CaseStudy } from '@/content/site';

export function CaseStudies({ items }: { items: CaseStudy[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="cases-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="cases-title" className="text-2xl font-bold">Casos de éxito</h2>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.clinic} className="rounded-lg border p-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied static asset */}
            {item.image && <img src={item.image.src} alt={item.image.alt} className="mb-4 h-40 w-full rounded object-cover" loading="lazy" />}
            <h3 className="font-semibold">{item.clinic}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.challenge}</p>
            <p className="mt-2 text-sm font-medium">{item.result}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
