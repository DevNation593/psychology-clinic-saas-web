'use client';

import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CreditCard, 
  XCircle, 
  Clock, 
  Sparkles,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { getStatusColor } from '@/types/guards';
import { ROUTES } from '@/lib/constants';
import type { SubscriptionStatus } from '@/types';

interface StatusConfig {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant: 'default' | 'destructive' | 'warning';
  className?: string;
}

export function SubscriptionStatusBanner() {
  const router = useRouter();
  const { data: subscription } = useSubscription();

  if (!subscription) return null;

  const status = subscription.status;

  // Don't show banner for active subscriptions (including trial)
  if (status === 'ACTIVE' || status === 'TRIAL') {
    return null;
  }

  const handleUpdatePayment = () => {
    router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=update-payment`);
  };

  const handleViewSubscription = () => {
    router.push(ROUTES.ADMIN_SUBSCRIPTION);
  };

  const handleContactSupport = () => {
    router.push('/support'); // O mailto: o chat
  };

  const handleReactivate = () => {
    router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=reactivate`);
  };

  const configs: Record<SubscriptionStatus, StatusConfig | null> = {
    TRIAL: null, // No banner
    ACTIVE: null, // No banner
    
    PAST_DUE: {
      icon: AlertTriangle,
      title: 'Pago Pendiente',
      description: `Hay un problema con tu método de pago. Actualízalo antes del ${subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES') : 'final del periodo de gracia'} para evitar la suspensión del servicio.`,
      action: {
        label: 'Actualizar Pago',
        onClick: handleUpdatePayment,
      },
      variant: 'warning',
      className: 'border-orange-300 bg-orange-50',
    },

    SUSPENDED: {
      icon: XCircle,
      title: 'Cuenta Suspendida',
      description: 'Tu cuenta ha sido suspendida por falta de pago. Actualiza tu método de pago para restaurar el acceso completo.',
      action: {
        label: 'Actualizar Pago',
        onClick: handleUpdatePayment,
      },
      variant: 'destructive',
      className: 'border-red-300 bg-red-50',
    },

    CANCELED: {
      icon: Clock,
      title: 'Suscripción Cancelada',
      description: subscription.currentPeriodEnd 
        ? `Tu suscripción finalizará el ${new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES')}. Después de esta fecha, el acceso será limitado.`
        : 'Tu suscripción ha sido cancelada. Puedes reactivarla en cualquier momento.',
      action: {
        label: 'Reactivar Suscripción',
        onClick: handleReactivate,
      },
      variant: 'default',
      className: 'border-blue-300 bg-blue-50',
    },

    ARCHIVED: {
      icon: XCircle,
      title: 'Cuenta Archivada',
      description: 'Tu cuenta ha sido archivada por inactividad prolongada. Contacta con soporte para reactivarla.',
      action: {
        label: 'Contactar Soporte',
        onClick: handleContactSupport,
      },
      variant: 'default',
      className: 'border-gray-300 bg-gray-50',
    },

    DELETED: {
      icon: XCircle,
      title: 'Cuenta Eliminada',
      description: 'Esta cuenta ha sido marcada para eliminación. Por favor contacta con soporte si necesitas ayuda.',
      action: {
        label: 'Contactar Soporte',
        onClick: handleContactSupport,
      },
      variant: 'destructive',
      className: 'border-red-300 bg-red-50',
    },
  };

  const config = configs[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="sticky top-0 z-50 border-b">
      <Alert className={config.className}>
        <Icon className="h-5 w-5" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <AlertTitle className="mb-1 font-semibold">
              {config.title}
            </AlertTitle>
            <AlertDescription className="text-sm">
              {config.description}
            </AlertDescription>
          </div>
          <div className="flex gap-2">
            {config.action && (
              <Button
                onClick={config.action.onClick}
                size="sm"
                variant={status === 'PAST_DUE' || status === 'SUSPENDED' ? 'default' : 'outline'}
              >
                {config.action.label}
              </Button>
            )}
            {status !== 'DELETED' && (
              <Button
                onClick={handleViewSubscription}
                size="sm"
                variant="ghost"
              >
                Ver Detalles
              </Button>
            )}
          </div>
        </div>
      </Alert>
    </div>
  );
}

/**
 * Trial expiration warning banner
 * Shows when trial is ending soon (last 3 days)
 */
export function TrialExpirationBanner() {
  const router = useRouter();
  const { data: subscription } = useSubscription();

  if (!subscription) return null;
  if (subscription.status !== 'TRIAL') return null;
  if (!subscription.trialEndsAt) return null;

  const trialEnd = new Date(subscription.trialEndsAt);
  const now = new Date();
  const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Only show in the last 3 days
  if (daysRemaining > 3) return null;

  const handleUpgrade = () => {
    router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=upgrade`);
  };

  return (
    <div className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
      <Alert className="border-0 bg-transparent">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <AlertTitle className="mb-1 font-semibold text-blue-900">
              {daysRemaining === 0 ? '¡Último día de prueba!' : `Tu prueba termina en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}`}
            </AlertTitle>
            <AlertDescription className="text-sm text-blue-800">
              Actualiza ahora para mantener todas las funciones y evitar la pérdida de acceso.
            </AlertDescription>
          </div>
          <Button
            onClick={handleUpgrade}
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Sparkles className="h-4 w-4" />
            Ver Planes
          </Button>
        </div>
      </Alert>
    </div>
  );
}

/**
 * Combined banner component that shows the appropriate status
 * Use this in your main layout
 */
export function SubscriptionBanners() {
  return (
    <>
      <SubscriptionStatusBanner />
      <TrialExpirationBanner />
    </>
  );
}
