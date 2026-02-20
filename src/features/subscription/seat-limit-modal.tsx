'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { getPlanDisplayName } from '@/types/guards';
import { ROUTES } from '@/lib/constants';
import { PlanTier } from '@/types';

interface SeatLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeatLimitModal({ open, onOpenChange }: SeatLimitModalProps) {
  const router = useRouter();
  const { data: subscription } = useSubscription();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=upgrade&reason=seats`);
  };

  const currentTier = subscription?.plan.planType ?? PlanTier.BASIC;
  const currentLimit = subscription?.plan.limits.maxPsychologists || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Límite de Psicólogos Alcanzado</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-4">
            <p>
              Has alcanzado el límite de tu plan {getPlanDisplayName(currentTier)}:{' '}
              <strong>{currentLimit} psicólogo{currentLimit > 1 ? 's' : ''}</strong>
            </p>

            {currentTier === PlanTier.BASIC && (
              <>
                <p>Para invitar más psicólogos, actualiza a nuestro plan PRO.</p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-blue-900">Plan PRO incluye:</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Hasta 15 psicólogos
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Notas clínicas ilimitadas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Gestión de tareas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      500 pacientes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      50 GB de almacenamiento
                    </li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600">
                  Precio: <strong className="text-gray-900">€79/mes</strong> para 2 psicólogos
                  <br />
                  <span className="text-gray-500">
                    (+€40/mes por psicólogo adicional)
                  </span>
                </p>
              </>
            )}

            {currentTier === PlanTier.PROFESSIONAL && (
              <>
                <p>
                  Has alcanzado el límite de 15 psicólogos del plan PRO.
                </p>
                <p>
                  Para agregar más psicólogos, contacta con nuestro equipo para un plan
                  CUSTOM personalizado.
                </p>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          {currentTier === PlanTier.BASIC && (
            <>
              <Button variant="secondary" onClick={() => {
                onOpenChange(false);
                router.push(ROUTES.ADMIN_SUBSCRIPTION);
              }}>
                Ver Planes
              </Button>

              <Button onClick={handleUpgrade} className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Actualizar a PRO
              </Button>
            </>
          )}

          {currentTier === PlanTier.PROFESSIONAL && (
            <Button onClick={() => {
              onOpenChange(false);
              router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=contact`);
            }} className="gap-2">
              Contactar Ventas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
