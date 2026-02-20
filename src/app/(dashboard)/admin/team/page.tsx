'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, extractArray } from '@/lib/api/endpoints';
import { QUERY_KEYS, ROLE_LABELS } from '@/lib/constants';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonTable } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Plus, UserPlus, UserX } from 'lucide-react';
import { InviteUserDialog } from '@/features/admin/invite-user-dialog';
import { useAuthStore } from '@/store/authStore';
import { formatRelativeDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const tenant = useAuthStore((state) => state.tenant);

  const { data: usersData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.USERS,
    queryFn: async (): Promise<User[]> => {
      const response = await usersApi.list();
      return extractArray(response);
    },
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

  const handleDeactivate = (userId: string) => {
    if (confirm('¿Estás seguro de desactivar este usuario?')) {
      deactivateMutation.mutate(userId);
    }
  };

  const psychologistsCount = usersData?.filter(
    (u) => u.role === 'PSYCHOLOGIST'
  ).length || 0;
  const seatsAvailable = (tenant?.subscription?.plan?.limits?.maxPsychologists || 0) - psychologistsCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Equipo</h1>
          <p className="text-muted-foreground mt-1">
            Administra los usuarios de tu clínica
          </p>
        </div>
        <Button
          onClick={() => setInviteDialogOpen(true)}
          disabled={seatsAvailable <= 0}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invitar Usuario
        </Button>
      </div>

      {/* Seats Usage Alert */}
      <Alert
        variant={seatsAvailable > 2 ? 'default' : seatsAvailable > 0 ? 'warning' : 'destructive'}
        title="Uso de Licencias"
        description={`Estás usando ${psychologistsCount} de ${tenant?.subscription?.plan?.limits?.maxPsychologists || 0} licencias de psicólogos. ${
          seatsAvailable > 0
            ? `Te quedan ${seatsAvailable} disponibles.`
            : 'Has alcanzado el límite. Actualiza tu plan para agregar más psicólogos.'
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

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  );
}
