import Link from 'next/link';
import { Check } from 'lucide-react';
import { planFullName, type Plan } from '@/content/site';

export function formatPlanPrice(plan: Plan): string {
  return plan.priceMonthly === null ? 'A medida' : `$${plan.priceMonthly}`;
}

function limits(plan: Plan): string[] {
  const lines: string[] = [];
  if (plan.seatsIncluded !== null) lines.push(plan.seatsIncluded === 1 ? '1 usuario incluido' : `${plan.seatsIncluded} usuarios incluidos`);
  if (plan.maxActivePatients !== null) lines.push(`Hasta ${plan.maxActivePatients} pacientes activos`);
  if (plan.storageGB !== null) lines.push(`${plan.storageGB} GB de almacenamiento`);
  if (plan.monthlyNotifications !== null) lines.push(`${plan.monthlyNotifications} notificaciones al mes`);
  if (lines.length === 0) lines.push('Usuarios, pacientes y almacenamiento según tu operación');
  return lines;
}

export function PlanCard({ plan }: { plan: Plan }) {
  const hasFixedPrice = plan.priceMonthly !== null;
  return (
    <article
      // Two groups share short names ("Básico", "Pro"), so the card is labelled with the full one.
      aria-label={planFullName(plan)}
      className={`relative flex flex-col rounded-xl border bg-background p-6 ${plan.highlighted ? 'border-primary shadow-lg ring-1 ring-primary' : ''}`}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          Más elegido
        </span>
      )}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{plan.summary}</p>
      <p className="mt-5">
        <span className="text-4xl font-bold tracking-tight">{formatPlanPrice(plan)}</span>
        {hasFixedPrice && <span className="text-sm text-muted-foreground"> USD/mes</span>}
      </p>
      {plan.pricePerExtraSeat !== null && (
        <p className="mt-1 text-sm text-muted-foreground">${plan.pricePerExtraSeat} por usuario adicional</p>
      )}
      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {limits(plan).map((line) => (
          <li key={line} className="flex items-start gap-2">
            <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/contacto"
        className={`mt-6 inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium ${
          plan.highlighted
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border hover:bg-accent'
        }`}
      >
        {plan.priceMonthly === null ? 'Hablar con ventas' : 'Solicitar demo'}
      </Link>
    </article>
  );
}
