'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormDefinitions, useSaveFormDefinition } from '@/hooks/useClinicalModules';
import { useTenantSpecialties } from '@/hooks/useSpecialties';
import type { FormDefinition } from '@/types/clinical';
import { FormBuilder } from './form-builder';

type Editing = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; form: FormDefinition };

const fieldCount = (form: FormDefinition) =>
  form.versions
    .find((version) => version.version === form.currentVersion)
    ?.schema.sections.reduce((total, section) => total + section.fields.length, 0) ?? 0;

/** The clinic's own forms: list, create, edit (as a new version) and activate or deactivate. */
export function FormsManager() {
  const formsQuery = useFormDefinitions();
  const specialtiesQuery = useTenantSpecialties();
  const save = useSaveFormDefinition();
  const [editing, setEditing] = useState<Editing>({ mode: 'list' });

  const specialties = (specialtiesQuery.data ?? []).map(({ code, name }) => ({ code, name }));

  if (editing.mode !== 'list') {
    const form = editing.mode === 'edit' ? editing.form : undefined;
    return (
      <FormBuilder
        // A different form is a different editor: no state is carried over.
        key={form?.id ?? 'new'}
        form={form}
        specialties={specialties}
        isSaving={save.isPending}
        onCancel={() => setEditing({ mode: 'list' })}
        onSave={async (data) => {
          const saved = await save.mutateAsync({ formId: form?.id, data });
          toast.success(
            form && saved.currentVersion > form.currentVersion
              ? `Formulario guardado como versión ${saved.currentVersion}`
              : 'Formulario guardado',
          );
          setEditing({ mode: 'list' });
        }}
      />
    );
  }

  const forms = formsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Formularios</h1>
          <p className="mt-1 text-muted-foreground">
            Formularios propios del consultorio para la historia clínica de sus pacientes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/medications">
            <Button variant="outline">Catálogo de medicamentos</Button>
          </Link>
          <Link href="/admin/templates">
            <Button variant="outline">Plantillas de documentos</Button>
          </Link>
          <Button onClick={() => setEditing({ mode: 'create' })}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo formulario
          </Button>
        </div>
      </div>

      {formsQuery.isError ? (
        <Alert variant="destructive" title="No se pudieron cargar los formularios">
          <Button variant="outline" size="sm" className="mt-2" onClick={() => formsQuery.refetch()}>
            Reintentar
          </Button>
        </Alert>
      ) : formsQuery.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">Aún no tienes formularios propios</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea el primero para registrar la información que los módulos de la plataforma no cubren.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {forms.map((form) => (
            <li key={form.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{form.name}</p>
                      <Badge variant={form.isActive ? 'success' : 'secondary'}>
                        {form.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Badge variant="outline">Versión {form.currentVersion}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[
                        form.category,
                        `${fieldCount(form)} ${fieldCount(form) === 1 ? 'campo' : 'campos'}`,
                        form.specialty ? `Solo ${form.specialty.name}` : 'Cualquier profesional',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {form.description && <p className="mt-1 text-sm">{form.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing({ mode: 'edit', form })}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={save.isPending}
                      onClick={() =>
                        save.mutate(
                          { formId: form.id, data: { isActive: !form.isActive } },
                          {
                            onSuccess: () =>
                              toast.success(form.isActive ? 'Formulario desactivado' : 'Formulario activado'),
                          },
                        )
                      }
                      aria-label={`${form.isActive ? 'Desactivar' : 'Activar'} ${form.name}`}
                    >
                      {form.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
