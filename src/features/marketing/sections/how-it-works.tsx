import type { HowItWorksStep } from '@/content/site';

export function HowItWorks({ steps }: { steps: HowItWorksStep[] }) {
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="how-title" className="text-2xl font-bold">Cómo funciona</h2>
      <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-lg border p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
            <h3 className="mt-3 font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
