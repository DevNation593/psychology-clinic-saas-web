'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { specialtiesApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { isAdminRole } from '@/types/guards';
import { UserRole } from '@/types';

export default function SpecialtiesPage() {
  const user = useAuthStore((state) => state.user);
  const canConfigure = user ? isAdminRole(user.role) || user.role === UserRole.SOPORTE : false;
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[] | null>(null);
  const { data: specialties = [], isLoading } = useQuery({
    queryKey: ['tenant-specialties'],
    queryFn: () => specialtiesApi.list(),
  });
  const modulesQuery = useQuery({
    queryKey: QUERY_KEYS.TENANT_MODULES,
    queryFn: () => specialtiesApi.modules(),
  });
  const activeCodes = selected ?? specialties.map((specialty) => specialty.code);
  const save = useMutation({
    mutationFn: () => specialtiesApi.setForTenant(activeCodes),
    onSuccess: () => {
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['tenant-specialties'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT_MODULES });
      toast.success('Especialidades actualizadas');
    },
    onError: (error: any) => toast.error(error.message || 'No fue posible actualizar las especialidades'),
  });

  const toggle = (code: string) => {
    setSelected((current) => {
      const next = current ?? specialties.map((specialty) => specialty.code);
      return next.includes(code) ? next.filter((value) => value !== code) : [...next, code];
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Stethoscope className="h-7 w-7" /> Especialidades</h1>
        <p className="text-muted-foreground mt-1">Selecciona cualquier especialidad disponible. El plan incluye un cupo y las adicionales se cobran según la tarifa vigente.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Especialidades activas</CardTitle>
          <CardDescription>{modulesQuery.data?.length || 0} módulos clínicos habilitados para este consultorio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <p>Cargando...</p> : specialties.map((specialty) => {
            const isSelected = activeCodes.includes(specialty.code);
            return (
              <button
                key={specialty.code}
                type="button"
                onClick={() => toggle(specialty.code)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">{specialty.name}</p><p className="text-sm text-muted-foreground">{specialty.description}</p></div>
                  <Badge variant={isSelected ? 'default' : 'outline'}>{isSelected ? 'Activa' : 'Inactiva'}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(specialty.modules || []).map((module) => <Badge key={module.moduleKey} variant="secondary">{module.moduleKey}</Badge>)}
                </div>
              </button>
            );
          })}
          {canConfigure && (
            <Button onClick={() => save.mutate()} disabled={save.isPending || activeCodes.length === 0} loading={save.isPending}>Guardar especialidades</Button>
          )}
          {!canConfigure && <p className="text-sm text-muted-foreground">La selección de especialidades la administra el administrador del consultorio.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
