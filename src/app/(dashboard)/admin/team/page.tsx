'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, extractArray } from '@/lib/api/endpoints';
import { QUERY_KEYS, ROLE_LABELS } from '@/lib/constants';
import type { User } from '@/types';
import { countActiveProfessionalProfiles } from '@/lib/professional-profiles';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonTable } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { UserPlus, UserX } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { isClinicPlan } from '@/types/guards';
import { formatRelativeDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const tenant = useAuthStore((state) => state.tenant);
  const router = useRouter();
  const hasTeamModule = isClinicPlan(tenant);

  const { data: usersData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.USERS,
    queryFn: async (): Promise<User[]> => {
      const response = await usersApi.list();
      return extractArray(response);
    },
    enabled: hasTeamModule,
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      toast.success('Usuario desactivado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al desactivar usuario');
    },
  });

  // Redirect personal plan users away from team page
  if (!hasTeamModule) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Módulo de Equipo no disponible</h2>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Tu plan actual es individual y solo permite un usuario. Para gestionar un equipo
              de profesionales, actualiza a un plan de clínica.
            </p>
            <Button onClick={() => router.push('/admin/subscription')}>
              Ver Planes de Clínica
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDeactivate = (userId: string) => {
    if (confirm('¿Estás seguro de desactivar este usuario?')) {
      deactivateMutation.mutate(userId);
    }
  };

  const professionalsCount = countActiveProfessionalProfiles(usersData ?? []);
  const seatsAvailable = (tenant?.subscription?.plan?.limits?.maxPsychologists || 0) - professionalsCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Equipo</h1>
          <p className="text-muted-foreground mt-1">
            Administra los usuarios de tu clínica
          </p>
        </div>
      </div>

      {/* Seats Usage Alert */}
      <Alert
        variant={seatsAvailable > 2 ? 'default' : seatsAvailable > 0 ? 'warning' : 'destructive'}
        title="Uso de Licencias"
        description={`Estás usando ${professionalsCount} de ${tenant?.subscription?.plan?.limits?.maxPsychologists || 0} licencias de profesionales. ${
          seatsAvailable > 0
            ? `Te quedan ${seatsAvailable} disponibles.`
            : 'Has alcanzado el límite. Actualiza tu plan para agregar más profesionales.'
        }`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Miembros del Equipo ({usersData?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : usersData && usersData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Nombre</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Rol</th>
                    <th className="text-left py-3 px-4 font-medium">Estado</th>
                    <th className="text-left py-3 px-4 font-medium">Último Acceso</th>
                    <th className="text-right py-3 px-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.isActive ? 'success' : 'secondary'}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                        {user.managedByProvider && !user.isActive && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Pendiente de aprobacion del proveedor
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {user.lastLogin
                          ? formatRelativeDate(user.lastLogin)
                          : 'Nunca'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(user.id)}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Desactivar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay usuarios registrados</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
