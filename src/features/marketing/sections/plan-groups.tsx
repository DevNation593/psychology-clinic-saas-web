'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { PLAN_AUDIENCE_LABELS, type Plan, type PlanAudience } from '@/content/site';
import { PlanCard } from './plans';

const AUDIENCES: PlanAudience[] = ['individual', 'business'];
const DESCRIPTIONS: Record<PlanAudience, string> = {
  individual: 'Para profesionales que atienden por su cuenta.',
  business: 'Para clínicas y equipos con varios profesionales.',
};

export function PlanGroups({ plans, heading = 'Planes' }: { plans: Plan[]; heading?: string }) {
  const [active, setActive] = useState<PlanAudience>('individual');
  // The section can appear more than once per page, so its ids must be unique.
  const baseId = useId();
  const tabRefs = useRef<Partial<Record<PlanAudience, HTMLButtonElement | null>>>({});
  const tabId = (audience: PlanAudience) => `${baseId}-tab-${audience}`;
  const panelId = (audience: PlanAudience) => `${baseId}-panel-${audience}`;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = AUDIENCES[(AUDIENCES.indexOf(active) + step + AUDIENCES.length) % AUDIENCES.length];
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section aria-labelledby={`${baseId}-title`} className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <h2 id={`${baseId}-title`} className="text-2xl font-bold">{heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Precios en USD por mes.</p>
        <div role="tablist" aria-label="Tipo de plan" className="mt-6 inline-flex rounded-lg border bg-muted p-1">
          {AUDIENCES.map((audience) => {
            const selected = audience === active;
            return (
              <button
                key={audience}
                ref={(node) => { tabRefs.current[audience] = node; }}
                type="button"
                role="tab"
                id={tabId(audience)}
                aria-selected={selected}
                aria-controls={panelId(audience)}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(audience)}
                onKeyDown={onKeyDown}
                className={`rounded-md px-5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {PLAN_AUDIENCE_LABELS[audience]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Both groups stay in the document so search engines can read every plan. */}
      {AUDIENCES.map((audience) => (
        <div
          key={audience}
          role="tabpanel"
          id={panelId(audience)}
          aria-labelledby={tabId(audience)}
          hidden={audience !== active}
          className="mt-8"
        >
          <p className="text-center text-sm text-muted-foreground">{DESCRIPTIONS[audience]}</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {plans.filter((plan) => plan.audience === audience).map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
