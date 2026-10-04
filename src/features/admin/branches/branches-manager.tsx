'use client';

import { useState } from 'react';
import { Building2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useBranches,
  useClinicProfessionals,
  useSaveBranch,
  useSetBranchProfessionals,
} from '@/hooks/useBranches';
import type { Branch, BranchInput } from '@/types/clinical';

type Editing = null | 'new' | Branch;

const emptyForm = { name: '', address: '', city: '', phone: '', openingHours: '', rooms: '' };

function BranchForm({ branch, onDone }: { branch?: Branch; onDone: () => void }) {
  const save = useSaveBranch();
  const setProfessionals = useSetBranchProfessionals();
  const { data: professionals = [] } = useClinicProfessionals();
  const assigned = branch?.professionalIds ?? [];
  const [professionalIds, setProfessionalIds] = useState<string[]>(assigned);
  const [form, setForm] = useState(
    branch
      ? {
          name: branch.name,
          address: branch.address ?? '',
          city: branch.city ?? '',
          phone: branch.phone ?? '',
          openingHours: branch.openingHours ?? '',
          rooms: branch.rooms.join('\n'),
        }
      : emptyForm,
  );
  const set = (field: keyof typeof emptyForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 2 || save.isPending) return;
    const data: BranchInput = {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      phone: form.phone.trim(),
      openingHours: form.openingHours.trim(),
      rooms: form.rooms.split('\n').map((room) => room.trim()).filter(Boolean),
    };
    try {
      const saved = await save.mutateAsync({ branchId: branch?.id, data });
      const changed =
        professionalIds.length !== assigned.length ||
        professionalIds.some((id) => !assigned.includes(id));
      if (changed) {
        await setProfessionals.mutateAsync({ branchId: saved.id, userIds: professionalIds });
      }
      toast.success(branch ? 'Sede actualizada' : 'Sede creada');
      onDone();
    } catch {
      // The hook already reported the error; the form stays to retry.
    }
  };

  const prefix = branch ? `branch-${branch.id}` : 'branch-new';
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-md border border-input p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`${prefix}-name`} required>
            Nombre de la sede
          </Label>
          <Input id={`${prefix}-name`} value={form.name} maxLength={120} onChange={set('name')} />
        </div>
        <div>
          <Label htmlFor={`${prefix}-city`}>Ciudad</Label>
          <Input id={`${prefix}-city`} value={form.city} maxLength={120} onChange={set('city')} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={`${prefix}-address`}>Dirección</Label>
          <Input id={`${prefix}-address`} value={form.address} maxLength={300} onChange={set('address')} />
        </div>
        <div>
          <Label htmlFor={`${prefix}-phone`}>Teléfono</Label>
          <Input id={`${prefix}-phone`} type="tel" value={form.phone} maxLength={40} onChange={set('phone')} />
        </div>
        <div>
          <Label htmlFor={`${prefix}-hours`}>Horario</Label>
          <Input
            id={`${prefix}-hours`}
            value={form.openingHours}
            maxLength={300}
            placeholder="Lunes a viernes de 08:00 a 18:00"
            onChange={set('openingHours')}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={`${prefix}-rooms`}>Consultorios (uno por línea)</Label>
          <Textarea id={`${prefix}-rooms`} rows={3} value={form.rooms} onChange={set('rooms')} />
        </div>
      </div>
      {professionals.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Profesionales que atienden en esta sede</legend>
          <p className="text-xs text-muted-foreground">
            Un profesional sin sedes marcadas atiende en todas. Al marcarle sedes, sus citas solo se
            agendan en ellas.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {professionals.map((professional) => (
              <label key={professional.id} className="flex min-h-[36px] items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={professionalIds.includes(professional.id)}
                  onChange={() =>
                    setProfessionalIds((current) =>
                      current.includes(professional.id)
                        ? current.filter((id) => id !== professional.id)
                        : [...current, professional.id],
                    )
                  }
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                {professional.firstName} {professional.lastName}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={form.name.trim().length < 2}
          loading={save.isPending || setProfessionals.isPending}
        >
          {branch ? 'Guardar sede' : 'Crear sede'}
        </Button>
      </div>
    </form>
  );
}

/** Branches of the clinic: list, create, edit, activate and choose the main one. */
export function BranchesManager() {
  const branchesQuery = useBranches();
  const save = useSaveBranch();
  const [editing, setEditing] = useState<Editing>(null);
  const branches = branchesQuery.data ?? [];

  const change = (branch: Branch, data: { isActive?: boolean; isMain?: boolean }, message: string) =>
    save.mutate({ branchId: branch.id, data }, { onSuccess: () => toast.success(message) });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Sedes
            </CardTitle>
            <CardDescription>
              Lugares donde atiende el consultorio. Las citas y atenciones se registran en una sede.
            </CardDescription>
          </div>
          {editing === null && (
            <Button variant="outline" onClick={() => setEditing('new')}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva sede
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing === 'new' && <BranchForm onDone={() => setEditing(null)} />}

        {branchesQuery.isError ? (
          <Alert variant="destructive" title="No se pudieron cargar las sedes">
            <Button variant="outline" size="sm" className="mt-2" onClick={() => branchesQuery.refetch()}>
              Reintentar
            </Button>
          </Alert>
        ) : branchesQuery.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay sedes registradas.</p>
        ) : (
          <ul className="space-y-3">
            {branches.map((branch) =>
              editing !== null && editing !== 'new' && editing.id === branch.id ? (
                <li key={branch.id}>
                  <BranchForm branch={branch} onDone={() => setEditing(null)} />
                </li>
              ) : (
                <li
                  key={branch.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-input p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{branch.name}</p>
                      {branch.isMain && <Badge>Principal</Badge>}
                      {!branch.isActive && <Badge variant="secondary">Inactiva</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[
                        branch.address,
                        branch.city,
                        branch.phone,
                        branch.rooms.length > 0 &&
                          `${branch.rooms.length} ${branch.rooms.length === 1 ? 'consultorio' : 'consultorios'}`,
                        (branch.professionalIds?.length ?? 0) > 0 &&
                          `${branch.professionalIds!.length} ${branch.professionalIds!.length === 1 ? 'profesional asignado' : 'profesionales asignados'}`,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Sin dirección registrada'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(branch)}
                      aria-label={`Editar ${branch.name}`}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Editar
                    </Button>
                    {!branch.isMain && branch.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={save.isPending}
                        onClick={() => change(branch, { isMain: true }, 'Sede principal actualizada')}
                        aria-label={`Hacer principal ${branch.name}`}
                      >
                        Hacer principal
                      </Button>
                    )}
                    {!branch.isMain && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={save.isPending}
                        onClick={() =>
                          change(
                            branch,
                            { isActive: !branch.isActive },
                            branch.isActive ? 'Sede desactivada' : 'Sede activada',
                          )
                        }
                        aria-label={`${branch.isActive ? 'Desactivar' : 'Activar'} ${branch.name}`}
                      >
                        {branch.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
