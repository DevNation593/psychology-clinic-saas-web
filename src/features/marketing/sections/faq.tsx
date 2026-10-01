import type { Faq } from '@/content/site';

export function FaqSection({ faq }: { faq: Faq[] }) {
  return (
    <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 py-16">
      <h2 id="faq-title" className="text-2xl font-bold">Preguntas frecuentes</h2>
      <div className="mt-6 divide-y rounded-lg border">
        {faq.map((item) => (
          <details key={item.question} className="p-4">
            <summary className="cursor-pointer font-medium">{item.question}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
