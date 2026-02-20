'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { subscriptionApi } from '@/lib/api/endpoints';
import { QUERY_KEYS, PLAN_LABELS, ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import {
  Check,
  X,
  Users,
  HardDrive,
  Calendar,
  TrendingUp,
  CreditCard,
  Shield,
  Zap,
  Crown,
  AlertTriangle,
  Clock,
  BarChart3,
  FileText,
  Video,
  Bell,
  Palette,
  Globe,
  Lock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PlanTier, type FeatureFlags } from '@/types';
import {
  getStatusDisplayName,
  getStatusColor,
  canUpgradeTo,
  getPlanDisplayName,
} from '@/types/guards';
import { useUpgradePlan } from '@/hooks/useSubscription';
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

// ==========================================
// Plan definitions for comparison table
// ==========================================

interface PlanDefinition {
  planType: PlanTier;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  highlighted?: boolean;
  limits: {
    psychologists: string;
    patients: string;
    storage: string;
  };
  features: {
    label: string;
    icon: React.ReactNode;
    included: boolean;
  }[];
}

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    planType: PlanTier.BASIC,
    name: 'Básico',
    description: 'Para consultorios individuales que están empezando.',
    priceMonthly: '$299',
    priceYearly: '$249',
    limits: {
      psychologists: '1',
      patients: '50',
      storage: '2 GB',
    },
    features: [
      { label: 'Gestión de pacientes', icon: <Users className="h-4 w-4" />, included: true },
      { label: 'Agenda y calendario', icon: <Calendar className="h-4 w-4" />, included: true },
      { label: 'Estadísticas básicas', icon: <BarChart3 className="h-4 w-4" />, included: true },
      { label: 'Notas clínicas', icon: <FileText className="h-4 w-4" />, included: false },
      { label: 'Analíticas avanzadas', icon: <TrendingUp className="h-4 w-4" />, included: false },
      { label: 'Integraciones de video', icon: <Video className="h-4 w-4" />, included: false },
      { label: 'Notificaciones push', icon: <Bell className="h-4 w-4" />, included: false },
      { label: 'Marca personalizada', icon: <Palette className="h-4 w-4" />, included: false },
      { label: 'Acceso a API', icon: <Globe className="h-4 w-4" />, included: false },
      { label: 'SSO / MFA', icon: <Lock className="h-4 w-4" />, included: false },
    ],
  },
  {
    planType: PlanTier.PROFESSIONAL,
    name: 'Profesional',
    description: 'Para clínicas en crecimiento con equipo de psicólogos.',
    priceMonthly: '$799',
    priceYearly: '$649',
    highlighted: true,
    limits: {
      psychologists: 'Hasta 15',
      patients: '500',
      storage: '50 GB',
    },
    features: [
      { label: 'Gestión de pacientes', icon: <Users className="h-4 w-4" />, included: true },
      { label: 'Agenda y calendario', icon: <Calendar className="h-4 w-4" />, included: true },
      { label: 'Estadísticas básicas', icon: <BarChart3 className="h-4 w-4" />, included: true },
      { label: 'Notas clínicas', icon: <FileText className="h-4 w-4" />, included: true },
      { label: 'Analíticas avanzadas', icon: <TrendingUp className="h-4 w-4" />, included: true },
      { label: 'Integraciones de video', icon: <Video className="h-4 w-4" />, included: true },
      { label: 'Notificaciones push', icon: <Bell className="h-4 w-4" />, included: true },
      { label: 'Marca personalizada', icon: <Palette className="h-4 w-4" />, included: false },
      { label: 'Acceso a API', icon: <Globe className="h-4 w-4" />, included: false },
      { label: 'SSO / MFA', icon: <Lock className="h-4 w-4" />, included: false },
    ],
  },
  {
    planType: PlanTier.ENTERPRISE,
    name: 'Empresarial',
    description: 'Para grandes organizaciones con necesidades avanzadas.',
    priceMonthly: 'Personalizado',
    priceYearly: 'Personalizado',
    limits: {
      psychologists: 'Ilimitados',
      patients: 'Ilimitados',
      storage: '500 GB',
    },
    features: [
      { label: 'Gestión de pacientes', icon: <Users className="h-4 w-4" />, included: true },
      { label: 'Agenda y calendario', icon: <Calendar className="h-4 w-4" />, included: true },
      { label: 'Estadísticas básicas', icon: <BarChart3 className="h-4 w-4" />, included: true },
      { label: 'Notas clínicas', icon: <FileText className="h-4 w-4" />, included: true },
      { label: 'Analíticas avanzadas', icon: <TrendingUp className="h-4 w-4" />, included: true },
      { label: 'Integraciones de video', icon: <Video className="h-4 w-4" />, included: true },
      { label: 'Notificaciones push', icon: <Bell className="h-4 w-4" />, included: true },
      { label: 'Marca personalizada', icon: <Palette className="h-4 w-4" />, included: true },
      { label: 'Acceso a API', icon: <Globe className="h-4 w-4" />, included: true },
      { label: 'SSO / MFA', icon: <Lock className="h-4 w-4" />, included: true },
    ],
  },
];

// ==========================================
// Subcomponents
// ==========================================

function UsageGauge({
  label,
  icon,
  current,
  limit,
  unit,
  formatValue,
}: {
  label: string;
  icon: React.ReactNode;
  current: number;
  limit: number;
  unit?: string;
  formatValue?: (v: number) => string;
}) {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const displayCurrent = formatValue ? formatValue(current) : current.toString();
  const displayLimit = formatValue ? formatValue(limit) : limit.toString();
  const suffix = unit ? ` ${unit}` : '';

  const getColor = (pct: number) => {
    if (pct >= 90) return 'text-red-600';
    if (pct >= 70) return 'text-orange-500';
    return 'text-primary';
  };

  const getBarColor = (pct: number) => {
    if (pct >= 90) return '[&>div]:bg-red-500';
    if (pct >= 70) return '[&>div]:bg-orange-400';
    return '';
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-sm font-medium">{label}</span>
          </div>
          {percentage >= 80 && (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          )}
        </div>
        <p className={`text-2xl font-bold ${getColor(percentage)}`}>
          {displayCurrent}
          <span className="text-sm font-normal text-muted-foreground">
            {' '}/ {displayLimit}{suffix}
          </span>
        </p>
        <Progress value={percentage} className={`mt-3 h-2 ${getBarColor(percentage)}`} />
        <p className="text-xs text-muted-foreground mt-1">
          {percentage.toFixed(0)}% utilizado
        </p>
      </CardContent>
    </Card>
  );
}

function PlanCard({
  plan,
  currentPlanType,
  isAnnual,
  onSelect,
  isLoading,
}: {
  plan: PlanDefinition;
  currentPlanType: PlanTier;
  isAnnual: boolean;
  onSelect: (planType: PlanTier) => void;
  isLoading: boolean;
}) {
  const isCurrent = plan.planType === currentPlanType;
  const isUpgrade = canUpgradeTo(currentPlanType, plan.planType);
  const price = isAnnual ? plan.priceYearly : plan.priceMonthly;

  return (
    <Card
      className={`relative flex flex-col ${
        plan.highlighted
          ? 'border-primary shadow-lg ring-2 ring-primary/20'
          : ''
      } ${isCurrent ? 'bg-primary/5' : ''}`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="gap-1">
            <Zap className="h-3 w-3" />
            Más Popular
          </Badge>
        </div>
      )}
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
          {plan.planType === PlanTier.BASIC && <Shield className="h-6 w-6 text-primary" />}
          {plan.planType === PlanTier.PROFESSIONAL && <Zap className="h-6 w-6 text-primary" />}
          {plan.planType === PlanTier.ENTERPRISE && <Crown className="h-6 w-6 text-primary" />}
        </div>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
        <div className="mt-4">
          <span className="text-3xl font-bold">{price}</span>
          {price !== 'Personalizado' && (
            <span className="text-muted-foreground text-sm"> USD/mes</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Limits */}
        <div className="space-y-2 mb-4 pb-4 border-b">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Psicólogos</span>
            <span className="font-semibold">{plan.limits.psychologists}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pacientes</span>
            <span className="font-semibold">{plan.limits.patients}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Almacenamiento</span>
            <span className="font-semibold">{plan.limits.storage}</span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-2 flex-1">
          {plan.features.map((feature) => (
            <li key={feature.label} className="flex items-center gap-2 text-sm">
              {feature.included ? (
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
              )}
              <span className="flex items-center gap-1.5">
                {feature.icon}
                <span className={feature.included ? '' : 'text-muted-foreground/60'}>
                  {feature.label}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-6">
          {isCurrent ? (
            <Button variant="outline" className="w-full" disabled>
              Plan Actual
            </Button>
          ) : plan.planType === PlanTier.ENTERPRISE ? (
            <Button variant="outline" className="w-full gap-2">
              <CreditCard className="h-4 w-4" />
              Contactar Ventas
            </Button>
          ) : isUpgrade ? (
            <Button
              className="w-full gap-2"
              onClick={() => onSelect(plan.planType)}
              disabled={isLoading}
            >
              <TrendingUp className="h-4 w-4" />
              Actualizar Plan
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onSelect(plan.planType)}
              disabled={isLoading}
            >
              Cambiar Plan
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionStatusBar({
  status,
  trialEndsAt,
  cancelAtPeriodEnd,
  currentPeriodEnd,
}: {
  status: string;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
}) {
  if (status === 'TRIAL' && trialEndsAt) {
    const daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    );
    return (
      <Alert
        variant={daysLeft <= 3 ? 'destructive' : 'warning'}
        title={`Periodo de prueba: ${daysLeft} días restantes`}
        description={`Tu periodo de prueba termina el ${formatDate(trialEndsAt, 'dd/MM/yyyy')}. Selecciona un plan para continuar sin interrupciones.`}
      />
    );
  }

  if (cancelAtPeriodEnd) {
    return (
      <Alert
        variant="warning"
        title="Suscripción programada para cancelarse"
        description={`Tu suscripción se cancelará al final del período actual (${formatDate(currentPeriodEnd, 'dd/MM/yyyy')}). Puedes reactivar en cualquier momento.`}
      />
    );
  }

  if (status === 'PAST_DUE') {
    return (
      <Alert
        variant="destructive"
        title="Pago pendiente"
        description="No pudimos procesar tu último pago. Actualiza tu método de pago para evitar la suspensión de tu cuenta."
      />
    );
  }

  if (status === 'SUSPENDED') {
    return (
      <Alert
        variant="destructive"
        title="Cuenta suspendida"
        description="Tu cuenta está suspendida por falta de pago. Actualiza tu método de pago para restaurar el acceso completo."
      />
    );
  }

  return null;
}

// ==========================================
// Main Page
// ==========================================

export default function SubscriptionPage() {
  const router = useRouter();
  const tenant = useAuthStore((state) => state.tenant);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: QUERY_KEYS.SUBSCRIPTION_USAGE,
    queryFn: async () => {
      const response = await subscriptionApi.getUsage();
      return response;
    },
  });

  const upgradeMutation = useUpgradePlan();

  // Guard: no tenant at all — still loading from persist
  if (!tenant) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const subscription = tenant.subscription ?? null;
  const currentPlan = subscription?.plan ?? null;
  const currentPlanType = currentPlan?.planType ?? PlanTier.TRIAL;
  const hasSubscriptionData = !!subscription && !!currentPlan;

  const handleSelectPlan = (planType: PlanTier) => {
    setSelectedPlan(planType);
    setUpgradeDialogOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;
    try {
      await upgradeMutation.mutateAsync({
        targetTier: selectedPlan === PlanTier.PROFESSIONAL ? 'PRO' : 'CUSTOM',
        billingInterval: billingInterval === 'annual' ? 'ANNUAL' : 'MONTHLY',
      });
      setUpgradeDialogOpen(false);
      setSelectedPlan(null);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Suscripción y Facturación</h1>
          <p className="text-muted-foreground mt-1">
            Administra tu plan, uso de recursos y facturación
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => router.push(ROUTES.ADMIN_STORAGE)}
        >
          <HardDrive className="h-4 w-4" />
          Gestionar Almacenamiento
        </Button>
      </div>

      {/* Status Alerts */}
      {hasSubscriptionData && (
        <SubscriptionStatusBar
          status={subscription!.status}
          trialEndsAt={subscription!.trialEndsAt}
          cancelAtPeriodEnd={subscription!.cancelAtPeriodEnd}
          currentPeriodEnd={subscription!.currentPeriodEnd}
        />
      )}

      {/* Current Plan Summary */}
      {hasSubscriptionData ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {currentPlanType === PlanTier.BASIC && <Shield className="h-5 w-5 text-primary" />}
                  {currentPlanType === PlanTier.PROFESSIONAL && <Zap className="h-5 w-5 text-primary" />}
                  {currentPlanType === PlanTier.ENTERPRISE && <Crown className="h-5 w-5 text-primary" />}
                  {currentPlanType === PlanTier.TRIAL && <Clock className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Plan {PLAN_LABELS[currentPlanType] || getPlanDisplayName(currentPlanType)}
                  </CardTitle>
                  <CardDescription>{currentPlan!.description || 'Tu suscripción actual'}</CardDescription>
                </div>
              </div>
              <Badge variant={getStatusColor(subscription!.status)}>
                {getStatusDisplayName(subscription!.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Inicio del período</p>
                <p className="font-semibold">
                  {subscription!.currentPeriodStart ? formatDate(subscription!.currentPeriodStart, 'dd MMM yyyy') : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Próxima facturación</p>
                <p className="font-semibold">
                  {subscription!.currentPeriodEnd
                    ? formatDate(subscription!.currentPeriodEnd, 'dd MMM yyyy')
                    : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Intervalo</p>
                <p className="font-semibold">
                  {currentPlan!.billingInterval === 'ANNUAL' ? 'Anual' : 'Mensual'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Precio por psicólogo</p>
                <p className="font-semibold">
                  ${((currentPlan!.pricePerSeatMonthly ?? 0) / 100).toLocaleString('en-US')} USD
                  <span className="text-xs text-muted-foreground font-normal"> /mes</span>
                </p>
              </div>
            </div>

            {/* Included Features */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">CARACTERÍSTICAS INCLUIDAS</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {renderFeatureList(currentPlan!.features)}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert
          variant="warning"
          title="Sin plan activo"
          description="No se encontró información de suscripción. Selecciona un plan a continuación para comenzar."
        />
      )}

      {/* Usage Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Uso de Recursos</h2>
        {usageLoading ? (
          <div className="grid md:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : usageData ? (
          <div className="grid md:grid-cols-3 gap-4">
            <UsageGauge
              label="Psicólogos"
              icon={<Users className="h-4 w-4" />}
              current={usageData?.users?.psychologists?.active ?? 0}
              limit={usageData?.users?.psychologists?.limit ?? 0}
            />
            <UsageGauge
              label="Pacientes activos"
              icon={<Users className="h-4 w-4" />}
              current={usageData?.patients?.active ?? 0}
              limit={usageData?.patients?.limit ?? 0}
            />
            <UsageGauge
              label="Almacenamiento"
              icon={<HardDrive className="h-4 w-4" />}
              current={usageData?.storage?.usedGB ?? 0}
              limit={usageData?.storage?.limitGB ?? 0}
              unit="GB"
              formatValue={(v) => v.toFixed(1)}
            />
          </div>
        ) : (
          <Alert
            variant="default"
            title="Datos de uso no disponibles"
            description="No se pudieron cargar las métricas de uso. Intenta recargar la página."
          />
        )}
      </div>

      {/* Plan Comparison */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold">Planes Disponibles</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Compara los planes y elige el que mejor se adapte a tu clínica
            </p>
          </div>
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'monthly'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setBillingInterval('monthly')}
            >
              Mensual
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                billingInterval === 'annual'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setBillingInterval('annual')}
            >
              Anual
              <Badge variant="success" className="ml-2 text-[10px]">
                -20%
              </Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLAN_DEFINITIONS.map((plan) => (
            <PlanCard
              key={plan.planType}
              plan={plan}
              currentPlanType={currentPlanType}
              isAnnual={billingInterval === 'annual'}
              onSelect={handleSelectPlan}
              isLoading={upgradeMutation.isPending}
            />
          ))}
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preguntas Frecuentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">¿Puedo cambiar de plan en cualquier momento?</h4>
              <p className="text-sm text-muted-foreground">
                Sí, puedes actualizar tu plan al instante. Los cargos se prorratean automáticamente.
                Si bajas de plan, el cambio se aplica al final del periodo de facturación.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">¿Qué pasa con mis datos al cambiar de plan?</h4>
              <p className="text-sm text-muted-foreground">
                Tus datos permanecen seguros. Si bajas de plan, podrás ver datos anteriores
                pero las funcionalidades avanzadas se desactivarán hasta que actualices.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">¿Qué métodos de pago aceptan?</h4>
              <p className="text-sm text-muted-foreground">
                Aceptamos tarjetas de crédito/débito (Visa, Mastercard, AMEX)
                y transferencias bancarias para planes Enterprise.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">¿Ofrecen descuentos para instituciones?</h4>
              <p className="text-sm text-muted-foreground">
                Sí, ofrecemos precios especiales para instituciones educativas y ONGs.
                Contacta a nuestro equipo de ventas para más información.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Confirmation Dialog */}
      <AlertDialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio de plan</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Estás a punto de cambiar al plan{' '}
                  <strong>{selectedPlan ? getPlanDisplayName(selectedPlan) : ''}</strong>
                  {billingInterval === 'annual' ? ' (facturación anual)' : ' (facturación mensual)'}.
                </p>
                <p>
                  El cargo se prorrateará sobre tu periodo actual y el nuevo precio
                  se aplicará en tu próxima factura.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUpgrade}
              disabled={upgradeMutation.isPending}
            >
              {upgradeMutation.isPending ? 'Procesando...' : 'Confirmar Cambio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==========================================
// Helper: Render feature list from FeatureFlags
// ==========================================

function renderFeatureList(features?: FeatureFlags) {
  if (!features) return null;
  const featureEntries: { key: string; label: string; value: boolean | string }[] = [
    { key: 'dashboard', label: 'Dashboard', value: features.dashboard },
    { key: 'calendar', label: 'Calendario', value: features.calendar },
    { key: 'patients', label: 'Pacientes', value: features.patients },
    { key: 'appointments', label: 'Citas', value: features.appointments },
    { key: 'clinicalNotes', label: 'Notas clínicas', value: features.clinicalNotes },
    { key: 'tasks', label: 'Tareas', value: features.tasks },
    { key: 'attachments', label: 'Adjuntos', value: features.attachments },
    { key: 'sessionPlans', label: 'Planes de sesión', value: features.sessionPlans },
    { key: 'emailNotifications', label: 'Email', value: features.emailNotifications },
    { key: 'webPush', label: 'Push', value: features.webPush },
    { key: 'advancedAnalytics', label: 'Analíticas', value: features.advancedAnalytics },
    { key: 'dataExport', label: 'Exportar datos', value: features.dataExport },
    { key: 'videoIntegration', label: 'Video', value: features.videoIntegration },
    { key: 'customBranding', label: 'Marca propia', value: features.customBranding },
    { key: 'apiAccess', label: 'API', value: features.apiAccess !== 'none' },
    { key: 'mfa', label: 'MFA', value: features.mfa },
    { key: 'sso', label: 'SSO', value: features.sso },
    { key: 'auditLogs', label: 'Auditoría', value: features.auditLogs },
  ];

  return featureEntries
    .filter((f) => f.value === true || f.value === 'full' || f.value === 'read')
    .map((f) => (
      <span
        key={f.key}
        className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded-md px-2 py-1"
      >
        <Check className="h-3 w-3" />
        {f.label}
      </span>
    ));
}
