'use client';

import { useState } from 'react';
import { Check, CreditCard, Crown, Shield, TrendingUp, Zap } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useDowngradePlan,
  usePlanCatalog,
  useSubscription,
  useSubscriptionPayments,
  useUpgradePlan,
} from '@/hooks/useSubscription';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import { TenantType, type ApiPlanType, type SubscriptionPayment } from '@/types';
import {
  formatPrice,
  isPlanUpgrade,
  planLabel,
  toPlanView,
  type PlanGroup,
  type PlanView,
} from './plan-catalog';

function PendingPayments({ payments }: { payments: SubscriptionPayment[] }) {
  const pending = payments.filter((payment) => payment.status === 'PENDING');
  if (pending.length === 0) return null;

  return (
    <div className="space-y-3">
      {pending.map((payment) => (
        <Alert
          key={payment.id}
          variant="warning"
          title={
            payment.kind === 'PLAN_UPGRADE'
              ? `Mejora a ${planLabel(payment.targetPlan)} pendiente de pago`
              : `Renovación de ${planLabel(payment.targetPlan)} pendiente de pago`
          }
          description={
            payment.kind === 'PLAN_UPGRADE'
              ? `Importe: ${formatPrice(Number(payment.amount))} ${payment.currency}. El plan se activará cuando confirmemos tu pago; mientras tanto conservas tu plan actual.${
                  payment.expiresAt
                    ? ` La solicitud vence el ${formatDate(payment.expiresAt, 'dd/MM/yyyy')}.`
                    : ''
                }`
              : `Importe: ${formatPrice(Number(payment.amount))} ${payment.currency}${
                  payment.periodStart
                    ? `, para el período que inicia el ${formatDate(payment.periodStart, 'dd/MM/yyyy')}`
                    : ''
                }. Contacta a soporte para registrar tu pago.`
          }
        />
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  currentPlan,
  disabled,
  onSelect,
}: {
  plan: PlanView;
  currentPlan: ApiPlanType;
  disabled: boolean;
  onSelect: (plan: PlanView) => void;
}) {
  const isCurrent = plan.planType === currentPlan;
  const upgrade = isPlanUpgrade(currentPlan, plan.planType);
  const Icon = plan.priceMonthly === null ? Crown : plan.highlighted ? Zap : Shield;

  return (
    <Card
      data-testid={`plan-${plan.planType}`}
      className={`relative flex flex-col ${
        plan.highlighted ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''
      } ${isCurrent ? 'bg-primary/5' : ''}`}
    >
      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" />
            Plan Actual
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-4">
          {plan.priceMonthly === null ? (
            <span className="text-3xl font-bold">Personalizado</span>
          ) : (
            <>
              <span className="text-3xl font-bold">{formatPrice(plan.priceMonthly)}</span>
              <span className="text-muted-foreground text-sm"> USD/mes</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <dl className="space-y-2 mb-4 pb-4 border-b text-sm">
          <Limit label="Profesionales" value={plan.seatsIncluded ?? 'Ilimitados'} />
          {plan.pricePerExtraSeat !== null && (
            <Limit
              label="Profesional adicional"
              value={`${formatPrice(plan.pricePerExtraSeat)} USD/mes`}
            />
          )}
          <Limit label="Pacientes activos" value={plan.maxActivePatients ?? 'Ilimitados'} />
          <Limit
            label="Almacenamiento"
            value={plan.storageGB === null ? 'No incluido' : `${plan.storageGB} GB`}
          />
          <Limit
            label="Especialidades incluidas"
            value={plan.includedSpecialties ?? 'Sin límite'}
          />
          {plan.includedSpecialties !== null && (
            <Limit
              label="Especialidad adicional"
              value={`${formatPrice(plan.specialtyPricePerMonth)} USD/mes`}
            />
          )}
        </dl>

        <ul className="space-y-1.5 text-sm flex-1">
          {plan.modules.map((module) => (
            <li key={module} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              {module}
            </li>
          ))}
        </ul>

        <div className="mt-4">
          {isCurrent ? (
            <Button variant="outline" className="w-full" disabled>
              Plan Actual
            </Button>
          ) : plan.priceMonthly === null ? (
            <Button variant="outline" className="w-full gap-2" disabled>
              <CreditCard className="h-4 w-4" />
              Contactar a ventas
            </Button>
          ) : upgrade ? (
            <Button className="w-full gap-2" onClick={() => onSelect(plan)} disabled={disabled}>
              <TrendingUp className="h-4 w-4" />
              Solicitar mejora
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onSelect(plan)}
              disabled={disabled}
            >
              Cambiar a este plan
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Limit({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

/** Plans, prices and limits exactly as the API reports them, plus the payments in progress. */
export function PlanCatalogSection() {
  const tenantType = useAuthStore((state) => state.tenant?.tenantType);
  const catalog = usePlanCatalog();
  const subscription = useSubscription();
  const payments = useSubscriptionPayments();
  const upgrade = useUpgradePlan();
  const downgrade = useDowngradePlan();
  const [selected, setSelected] = useState<PlanView | null>(null);
  const [group, setGroup] = useState<PlanGroup | null>(null);

  const currentPlan = subscription.data?.apiPlanType ?? 'TRIAL';
  // A clinic account cannot move to an individual plan.
  const clinicOnly = tenantType === TenantType.CLINIC;
  const activeGroup: PlanGroup = clinicOnly
    ? 'clinic'
    : (group ?? (currentPlan.startsWith('CLINIC_') ? 'clinic' : 'individual'));
  const plans = (catalog.data?.plans ?? [])
    .filter((entry) => entry.planType !== 'TRIAL')
    .map(toPlanView)
    .filter((plan) => plan.group === activeGroup);

  const selectedIsUpgrade = !!selected && isPlanUpgrade(currentPlan, selected.planType);
  const isSaving = upgrade.isPending || downgrade.isPending;

  const confirm = async () => {
    if (!selected) return;
    try {
      const mutation = selectedIsUpgrade ? upgrade : downgrade;
      await mutation.mutateAsync({ newPlan: selected.planType });
      setSelected(null);
    } catch {
      // The mutation reports the error.
    }
  };

  return (
    <div className="space-y-6">
      <PendingPayments payments={payments.data ?? []} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Planes Disponibles</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Precios mensuales en USD. Un plan de pago se activa cuando se confirma el pago.
          </p>
        </div>
        {!clinicOnly && (
          <div className="flex items-center gap-2">
            {(['individual', 'clinic'] as const).map((option) => (
              <Button
                key={option}
                variant={activeGroup === option ? 'default' : 'outline'}
                onClick={() => setGroup(option)}
              >
                {option === 'individual' ? 'Individual' : 'Empresarial'}
              </Button>
            ))}
          </div>
        )}
      </div>

      {catalog.isLoading ? (
        <div className="grid md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : catalog.isError ? (
        <Alert
          variant="destructive"
          title="No se pudieron cargar los planes"
          description="Intenta recargar la página."
        />
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.planType}
              plan={plan}
              currentPlan={currentPlan}
              disabled={isSaving}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedIsUpgrade ? 'Solicitar mejora de plan' : 'Programar cambio de plan'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Plan seleccionado:{' '}
                  <strong>{selected ? planLabel(selected.planType) : ''}</strong>
                  {selected?.priceMonthly != null &&
                    ` (${formatPrice(selected.priceMonthly)} USD/mes)`}
                  .
                </p>
                {selectedIsUpgrade ? (
                  <p>
                    Se registrará una solicitud con el importe a pagar. Tu plan actual no cambia
                    hasta que confirmemos el pago.
                  </p>
                ) : (
                  <p>
                    El cambio se aplicará al terminar tu período actual. Hasta entonces conservas
                    tu plan y sus funciones.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Keep the dialog open until the API answers.
                event.preventDefault();
                void confirm();
              }}
              disabled={isSaving}
            >
              {isSaving ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
