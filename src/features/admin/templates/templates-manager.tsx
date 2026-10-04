'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useDocumentTemplates, useSaveDocumentTemplate } from '@/hooks/useDocuments';
import {
  TEMPLATE_MODULES,
  TEMPLATE_VARIABLES,
  type DocumentTemplate,
} from '@/lib/api/documents-api';

type Editing = null | 'new' | DocumentTemplate;

/** The variables of a text that nobody fills in: they would reach the patient as `{{...}}`. */
export function unknownVariables(text: string): string[] {
  const unknown = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)) {
    if (!(TEMPLATE_VARIABLES as readonly string[]).includes(match[1])) unknown.add(match[1]);
  }
  return [...unknown];
}

function TemplateForm({ template, onDone }: { template?: DocumentTemplate; onDone: () => void }) {
  const save = useSaveDocumentTemplate();
  const [moduleKey, setModuleKey] = useState(template?.moduleKey ?? 'general.certificates');
  const [name, setName] = useState(template?.name ?? '');
  const [title, setTitle] = useState(template?.title ?? '');
  const [body, setBody] = useState(template?.body ?? '');

  const unknown = unknownVariables(`${title}\n${body}`);
  const valid = name.trim().length >= 2 && body.trim().length > 0 && unknown.length === 0;
  const hasTitle = moduleKey === 'general.consents';
  const prefix = template ? `template-${template.id}` : 'template-new';

  const insert = (variable: string) => setBody((current) => `${current}{{${variable}}}`);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || save.isPending) return;
    try {
      await save.mutateAsync({
        templateId: template?.id,
        data: {
          ...(template ? {} : { moduleKey }),
          name: name.trim(),
          title: hasTitle ? title.trim() || null : null,
          body: body.trim(),
        },
      });
      toast.success(template ? 'Plantilla actualizada' : 'Plantilla agregada');
      onDone();
    } catch {
      // The hook already reported the error; the form stays to retry.
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-md border border-input p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`${prefix}-module`}>Tipo de documento</Label>
          <select
            id={`${prefix}-module`}
            value={moduleKey}
            // The kind of document a template belongs to does not change once it exists.
            disabled={!!template}
            onChange={(event) => setModuleKey(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          >
            {Object.entries(TEMPLATE_MODULES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`${prefix}-name`} required>
            Nombre de la plantilla
          </Label>
          <Input
            id={`${prefix}-name`}
            value={name}
            maxLength={120}
            placeholder="Reposo médico"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      </div>

      {hasTitle && (
        <div>
          <Label htmlFor={`${prefix}-title`}>Título del consentimiento</Label>
          <Input
            id={`${prefix}-title`}
            value={title}
            maxLength={200}
            placeholder="Consentimiento para tratamiento de conducto"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
      )}

      <div>
        <Label htmlFor={`${prefix}-body`} required>
          Texto
        </Label>
        <Textarea
          id={`${prefix}-body`}
          rows={8}
          value={body}
          maxLength={10000}
          aria-invalid={unknown.length > 0 || undefined}
          aria-describedby={`${prefix}-variables${unknown.length > 0 ? ` ${prefix}-body-error` : ''}`}
          onChange={(event) => setBody(event.target.value)}
        />
        {unknown.length > 0 && (
          <p id={`${prefix}-body-error`} className="mt-1 text-sm text-destructive">
            {unknown.length === 1 ? 'Variable no reconocida' : 'Variables no reconocidas'}:{' '}
            {unknown.map((variable) => `{{${variable}}}`).join(', ')}. Usa solo las de la lista.
          </p>
        )}
        <div id={`${prefix}-variables`} className="mt-2 space-y-1">
          <p className="text-xs text-muted-foreground">
            Al usar la plantilla, estas variables se reemplazan por los datos del paciente. Pulsa una
            para agregarla al final del texto.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((variable) => (
              <Button
                key={variable}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insert(variable)}
              >
                {`{{${variable}}}`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valid} loading={save.isPending}>
          {template ? 'Guardar plantilla' : 'Agregar plantilla'}
        </Button>
      </div>
    </form>
  );
}

/** Texts the clinic reuses in its certificates and consents. */
export function TemplatesManager() {
  const templatesQuery = useDocumentTemplates();
  const save = useSaveDocumentTemplate();
  const [editing, setEditing] = useState<Editing>(null);
  const templates = templatesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/forms">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Formularios
          </Button>
        </Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Plantillas de documentos</h1>
            <p className="mt-1 text-muted-foreground">
              Textos del consultorio para certificados y consentimientos. Cada profesional los elige
              al escribir el documento y puede ajustarlos antes de guardar.
            </p>
          </div>
          {editing === null && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar plantilla
            </Button>
          )}
        </div>
      </div>

      {editing === 'new' && <TemplateForm onDone={() => setEditing(null)} />}

      {templatesQuery.isError ? (
        <Alert variant="destructive" title="No se pudieron cargar las plantillas">
          <Button variant="outline" size="sm" className="mt-2" onClick={() => templatesQuery.refetch()}>
            Reintentar
          </Button>
        </Alert>
      ) : templatesQuery.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no hay plantillas. Agrega la primera para no reescribir el mismo texto en cada
            certificado o consentimiento.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {templates.map((template) =>
            editing !== null && editing !== 'new' && editing.id === template.id ? (
              <li key={template.id}>
                <TemplateForm template={template} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={template.id} className="rounded-md border border-input p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{template.name}</p>
                      <Badge variant="outline">
                        {TEMPLATE_MODULES[template.moduleKey] ?? template.moduleKey}
                      </Badge>
                      {!template.isActive && <Badge variant="secondary">Inactiva</Badge>}
                    </div>
                    {template.title && <p className="text-sm">{template.title}</p>}
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {template.body}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={save.isPending}
                      onClick={() =>
                        save.mutate({
                          templateId: template.id,
                          data: { isActive: !template.isActive },
                        })
                      }
                    >
                      {template.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(template)}
                      aria-label={`Editar ${template.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
