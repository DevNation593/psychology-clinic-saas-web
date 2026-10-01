import Link from 'next/link';
import type { Plan } from '@/content/site';

export function formatPlanPrice(plan: Plan): string {
  if (plan.priceMonthly === null) return 'A medida';
  return plan.priceMonthly === 0 ? 'Gratis' : `$${plan.priceMonthly}`;
}

function limits(plan: Plan): string[] {
  const lines: string[] = [];
  if (plan.seatsIncluded !== null) lines.push(plan.seatsIncluded === 1 ? '1 usuario incluido' : `${plan.seatsIncluded} usuarios incluidos`);
  if (plan.pricePerExtraSeat !== null) lines.push(`$${plan.pricePerExtraSeat} por usuario adicional`);
  if (plan.maxActivePatients !== null) lines.push(`Hasta ${plan.maxActivePatients} pacientes activos`);
  if (plan.storageGB !== null) lines.push(`${plan.storageGB} GB de almacenamiento`);
  if (plan.monthlyNotifications !== null) lines.push(`${plan.monthlyNotifications} notificaciones al mes`);
  if (lines.length === 0) lines.push('Usuarios, pacientes y almacenamiento según tu operación');
  return lines;
}

export function Plans({ plans, heading = 'Planes' }: { plans: Plan[]; heading?: string }) {
  return (
    <section aria-labelledby="plans-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="plans-title" className="text-2xl font-bold">{heading}</h2>
      <p className="mt-2 text-sm text-muted-foreground">Precios en USD por mes.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.id}
            aria-label={plan.name}
            className={`flex flex-col rounded-lg border p-6 ${plan.highlighted ? 'border-primary shadow-md' : ''}`}
          >
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.summary}</p>
            <p className="mt-4">
              <span className="text-3xl font-bold">{formatPlanPrice(plan)}</span>
              {plan.priceMonthly !== null && plan.priceMonthly > 0 && <span className="text-sm text-muted-foreground"> USD/mes</span>}
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {limits(plan).map((line) => <li key={line}>{line}</li>)}
            </ul>
            <Link href="/contacto" className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {plan.priceMonthly === null ? 'Hablar con ventas' : 'Solicitar demo'}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
