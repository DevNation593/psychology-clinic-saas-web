'use client';

import { useRouter } from 'next/navigation';
import { Users, UserPlus, Database, HardDrive } from 'lucide-react';
import { UsageCard } from './usage-card';
import { useSubscription, useUsageMetrics } from '@/hooks/useSubscription';
import { getRemainingSeats, getRemainingPatients, getRemainingStorageGB } from '@/types/guards';
import { ROUTES } from '@/lib/constants';

export function PsychologistsUsageWidget() {
  const router = useRouter();
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsageMetrics();

  if (!subscription || !usage) return null;

  const activePsychologists = usage.users.psychologists.active;
  const limit = subscription.plan.limits.maxPsychologists;
  const remaining = getRemainingSeats(usage);

  const handleUpgrade = () => {
    router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=upgrade&reason=seats`);
  };

  const handleManage = () => {
    router.push(ROUTES.ADMIN_TEAM);
  };

  return (
    <UsageCard
      title="Psicólogos"
      description="Miembros del equipo activos"
      icon={Users}
      current={activePsychologists}
      limit={limit}
      unit="psicólogos"
      onUpgrade={handleUpgrade}
      onManage={handleManage}
      manageLabel="Ver Equipo"
    />
  );
}

export function PatientsUsageWidget() {
  const router = useRouter();
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsageMetrics();

  if (!subscription || !usage) return null;

  const activePatients = usage.patients.active;
  const limit = subscription.plan.limits.maxPatients;
  const remaining = getRemainingPatients(usage);

  const handleUpgrade = () => {
    router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=upgrade&reason=patients`);
  };

  const handleManage = () => {
    router.push('/patients'); // Asume ruta de gestión de pacientes
  };

  return (
    <UsageCard
      title="Pacientes"
      description="Expedientes activos"
      icon={UserPlus}
      current={activePatients}
      limit={limit}
      unit="pacientes"
      onUpgrade={handleUpgrade}
      onManage={handleManage}
      manageLabel="Ver Pacientes"
    />
  );
}

export function StorageUsageWidget() {
  const router = useRouter();
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsageMetrics();

  if (!subscription || !usage) return null;

  const usedGB = usage.storage.usedGB;
  const limitGB = subscription.plan.limits.storageGB;
  const remainingGB = getRemainingStorageGB(usage);

  const handleUpgrade = () => {
    router.push(`${ROUTES.ADMIN_SUBSCRIPTION}?action=upgrade&reason=storage`);
  };

  const handleManage = () => {
    router.push(ROUTES.ADMIN_STORAGE);
  };

  const formatGB = (gb: number) => {
    if (gb < 1) {
      return `${(gb * 1024).toFixed(0)} MB`;
    }
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <UsageCard
      title="Almacenamiento"
      description="Archivos y documentos"
      icon={HardDrive}
      current={usedGB}
      limit={limitGB}
      unit="GB"
      formatValue={formatGB}
      onUpgrade={handleUpgrade}
      onManage={handleManage}
      manageLabel="Gestionar Archivos"
    />
  );
}

// Combined widget for dashboard overview
export function UsageOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <PsychologistsUsageWidget />
      <PatientsUsageWidget />
      <StorageUsageWidget />
    </div>
  );
}
