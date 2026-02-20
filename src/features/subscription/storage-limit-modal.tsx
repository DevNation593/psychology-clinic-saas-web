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
import { AlertCircle, HardDrive, Trash2, TrendingUp } from 'lucide-react';
import { useSubscription, useUsageMetrics } from '@/hooks/useSubscription';
import { getPlanDisplayName } from '@/types/guards';
import { PlanTier } from '@/types';
import { ROUTES } from '@/lib/constants';

interface StorageLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName?: string;
  fileSize?: number; // in MB
}

export function StorageLimitModal({
  open,
  onOpenChange,
  fileName,
  fileSize,
}: StorageLimitModalProps) {
  const router = useRouter();
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsageMetrics();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=upgrade&reason=storage`);
  };

  const handleManageStorage = () => {
    onOpenChange(false);
    router.push(ROUTES.ADMIN_STORAGE);
  };

  const currentTier = subscription?.plan.planType || PlanTier.BASIC;
  const usedGB = usage?.storage.usedGB || 0;
  const limitGB = usage?.storage.limitGB || 2;
  const remainingGB = Math.max(0, limitGB - usedGB);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-orange-600">
            <HardDrive className="h-5 w-5" />
            <DialogTitle>Límite de Almacenamiento Excedido</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-4">
            {fileName && (
              <p>
                No se puede subir el archivo{' '}
                <strong className="text-gray-900">&quot;{fileName}&quot;</strong>{' '}
                {fileSize && `(${fileSize} MB)`}
              </p>
            )}

            <div className="bg-gray-100 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                Almacenamiento usado
              </h4>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {usedGB.toFixed(2)} GB
                </span>
                <span className="text-gray-600">/ {limitGB} GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${Math.min((usedGB / limitGB) * 100, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Espacio disponible: <strong>{remainingGB.toFixed(2)} GB</strong>
              </p>
            </div>

            <p className="font-medium text-gray-900">Opciones:</p>

            <div className="space-y-3">
              {/* Option 1: Delete files */}
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Eliminar archivos antiguos
                    </h4>
                    <p className="text-sm text-gray-600">
                      Revisa y elimina archivos que ya no necesitas
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageStorage}
                  className="w-full"
                >
                  Gestionar Archivos
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
                      <p className="text-sm text-blue-800 font-medium">
                        Aumenta tu almacenamiento a 50 GB
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        ¡25x más espacio!
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleUpgrade}
                    size="sm"
                    className="w-full"
                  >
                    Actualizar Plan
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
                        Hasta 500 GB de almacenamiento
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
