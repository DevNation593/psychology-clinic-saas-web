import type { ProductModule } from '@/content/site';

export function Modules({ modules }: { modules: ProductModule[] }) {
  return (
    <section aria-labelledby="modules-title" className="bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="modules-title" className="text-2xl font-bold">Todo lo que necesita tu consultorio</h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <li key={module.title} className="rounded-lg border bg-background p-5">
              <h3 className="font-semibold">{module.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
