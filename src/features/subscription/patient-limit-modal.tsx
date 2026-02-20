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
import { AlertCircle, Archive, TrendingUp } from 'lucide-react';
import { useSubscription, useUsageMetrics } from '@/hooks/useSubscription';
import { getPlanDisplayName } from '@/types/guards';
import { ROUTES } from '@/lib/constants';
import { PlanTier } from '@/types';

interface PatientLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientLimitModal({ open, onOpenChange }: PatientLimitModalProps) {
  const router = useRouter();
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsageMetrics();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=upgrade&reason=patients`);
  };

  const handleManagePatients = () => {
    onOpenChange(false);
    router.push(`${ROUTES.PATIENTS}?filter=inactive`);
  };

  const currentTier = subscription?.plan.planType ?? PlanTier.BASIC;
  const activePatients = usage?.patients.active || 0;
  const patientLimit = usage?.patients.limit || 50;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Límite de Pacientes Alcanzado</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-4">
            <p>
              Has alcanzado el límite de <strong>{patientLimit} pacientes activos</strong>{' '}
              en tu plan {getPlanDisplayName(currentTier)}.
            </p>

            <p>Para continuar agregando pacientes, elige una opción:</p>

            <div className="space-y-3">
              {/* Option 1: Archive patients */}
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <Archive className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Archivar pacientes inactivos
                    </h4>
                    <p className="text-sm text-gray-600">
                      Libera espacio archivando pacientes que ya no están en tratamiento
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManagePatients}
                  className="w-full"
                >
                  Gestionar Pacientes
                </Button>
              </div>

              {/* Option 2: Upgrade */}
              {currentTier === PlanTier.BASIC && (
                <div className="border rounded-lg p-4 space-y-2 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900">
                        Actualizar a Plan PRO
                      </h4>
                      <p className="text-sm text-blue-800">
                        Aumenta tu límite a 500 pacientes
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-blue-700">
                        <li>+ Notas clínicas ilimitadas</li>
                        <li>+ 50 GB de almacenamiento</li>
                        <li>+ Gestión de tareas</li>
                      </ul>
                      <p className="mt-2 text-sm font-medium text-blue-900">
                        Desde €79/mes
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleUpgrade}
                    size="sm"
                    className="w-full"
                  >
                    Actualizar a PRO
                  </Button>
                </div>
              )}

              {currentTier === PlanTier.PROFESSIONAL && (
                <div className="border rounded-lg p-4 space-y-2 bg-purple-50 border-purple-200">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-900">
                        Plan CUSTOM
                      </h4>
                      <p className="text-sm text-purple-800">
                        Pacientes ilimitados y features empresariales
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=contact`);
                    }}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    Contactar Ventas
                  </Button>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
