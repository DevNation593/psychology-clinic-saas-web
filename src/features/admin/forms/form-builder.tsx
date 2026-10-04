'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DynamicFormFields } from '@/features/clinical-forms/dynamic-form-fields';
import { initialValues, type FormValues } from '@/features/clinical-forms/form-values';
import type { ApiError } from '@/types';
import type {
  FormAlertLevel,
  FormDefinition,
  FormDefinitionInput,
  FormFieldType,
  FormIssue,
} from '@/types/clinical';
import {
  ALERT_LEVEL_LABELS,
  COLUMN_TYPES,
  draftToSchema,
  emptyDraft,
  FIELD_TYPE_LABELS,
  issueTargets,
  newAlert,
  newField,
  newSection,
  previewKeys,
  schemaToDraft,
  type DraftAlert,
  type DraftField,
  type DraftSection,
  type FormDraft,
} from './form-draft';

const SELECT_CLASS = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const CHOICE_TYPES: FormFieldType[] = ['radio', 'select', 'multiselect'];
const NUMERIC_TYPES: FormFieldType[] = ['integer', 'decimal', 'scale'];

export interface FormBuilderProps {
  /** The form being edited; absent when creating one. */
  form?: FormDefinition;
  /** Specialties enabled for the clinic, to restrict who can fill the form. */
  specialties: { code: string; name: string }[];
  isSaving: boolean;
  /** Rejects with the API error when the definition is refused. */
  onSave: (data: FormDefinitionInput) => Promise<unknown>;
  onCancel: () => void;
}

const move = <T,>(items: T[], index: number, offset: number): T[] => {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

function FieldEditor({
  field,
  position,
  count,
  keyPreview,
  issues,
  isColumn = false,
  onChange,
  onMove,
  onRemove,
}: {
  field: DraftField;
  position: number;
  count: number;
  keyPreview?: string;
  issues: string[];
  isColumn?: boolean;
  onChange: (field: DraftField) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  const id = `builder-${field.id}`;
  const name = field.label.trim() || `${isColumn ? 'columna' : 'campo'} ${position + 1}`;
  const set = (changes: Partial<DraftField>) => onChange({ ...field, ...changes });
  const types = isColumn ? COLUMN_TYPES : (Object.keys(FIELD_TYPE_LABELS) as FormFieldType[]);

  return (
    <div className="space-y-3 rounded-md border border-input p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
        <div>
          <Label htmlFor={`${id}-label`} className="text-xs">
            {isColumn ? 'Columna' : 'Etiqueta del campo'}
          </Label>
          <Input
            id={`${id}-label`}
            value={field.label}
            onChange={(event) => set({ label: event.target.value })}
            placeholder={isColumn ? 'Medicamento' : 'Tipo de lesión'}
          />
          {keyPreview && (
            <p className="mt-1 text-xs text-muted-foreground">
              Clave para fórmulas y alertas: <code className="font-mono">{keyPreview}</code>
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={`${id}-type`} className="text-xs">
            Tipo
          </Label>
          <select
            id={`${id}-type`}
            value={field.type}
            onChange={(event) => set({ type: event.target.value as FormFieldType })}
            className={SELECT_CLASS}
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {FIELD_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={position === 0}
            onClick={() => onMove(-1)}
            aria-label={`Subir ${name}`}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={position === count - 1}
            onClick={() => onMove(1)}
            aria-label={`Bajar ${name}`}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={count === 1}
            onClick={onRemove}
            aria-label={`Quitar ${name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {field.type !== 'calculated' && (
          <label className="flex min-h-[40px] items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) => set({ required: event.target.checked })}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Obligatorio
          </label>
        )}
        {NUMERIC_TYPES.includes(field.type) && (
          <>
            <div className="w-28">
              <Label htmlFor={`${id}-min`} className="text-xs">
                Mínimo{field.type === 'scale' && ' *'}
              </Label>
              <Input
                id={`${id}-min`}
                type="number"
                step="any"
                value={field.min}
                onChange={(event) => set({ min: event.target.value })}
              />
            </div>
            <div className="w-28">
              <Label htmlFor={`${id}-max`} className="text-xs">
                Máximo{field.type === 'scale' && ' *'}
              </Label>
              <Input
                id={`${id}-max`}
                type="number"
                step="any"
                value={field.max}
                onChange={(event) => set({ max: event.target.value })}
              />
            </div>
          </>
        )}
        {(NUMERIC_TYPES.includes(field.type) || field.type === 'calculated') && !isColumn && (
          <div className="w-28">
            <Label htmlFor={`${id}-unit`} className="text-xs">
              Unidad
            </Label>
            <Input
              id={`${id}-unit`}
              value={field.unit}
              onChange={(event) => set({ unit: event.target.value })}
              placeholder="kg"
            />
          </div>
        )}
      </div>

      {CHOICE_TYPES.includes(field.type) && (
        <div>
          <Label htmlFor={`${id}-options`} className="text-xs">
            Opciones (una por línea)
          </Label>
          <Textarea
            id={`${id}-options`}
            rows={3}
            value={field.options}
            onChange={(event) => set({ options: event.target.value })}
            placeholder={'Traumática\nDeportiva\nLaboral'}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Cambiar el texto de una opción la convierte en una opción nueva para los próximos registros.
          </p>
        </div>
      )}

      {field.type === 'calculated' && (
        <div>
          <Label htmlFor={`${id}-formula`} className="text-xs">
            Fórmula
          </Label>
          <Input
            id={`${id}-formula`}
            value={field.formula}
            onChange={(event) => set({ formula: event.target.value })}
            placeholder="round(peso / ((talla / 100) ^ 2), 1)"
            className="font-mono"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Usa las claves de campos numéricos anteriores, + − * / ^ y las funciones sum, avg, min,
            max, round y abs.
          </p>
        </div>
      )}

      {field.type === 'table' && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Columnas de la tabla</p>
          {field.columns.map((column, index) => (
            <FieldEditor
              key={column.id}
              field={column}
              position={index}
              count={field.columns.length}
              issues={[]}
              isColumn
              onChange={(next) =>
                set({ columns: field.columns.map((current) => (current.id === next.id ? next : current)) })
              }
              onMove={(offset) => set({ columns: move(field.columns, index, offset) })}
              onRemove={() => set({ columns: field.columns.filter((current) => current.id !== column.id) })}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set({ columns: [...field.columns, newField()] })}
          >
            <Plus className="mr-1 h-4 w-4" />
            Agregar columna
          </Button>
        </div>
      )}

      {issues.map((issue) => (
        <p key={issue} className="text-sm text-destructive">
          {issue}
        </p>
      ))}
    </div>
  );
}

/**
 * Editor of a form designed by the clinic. Saving a form whose fields changed adds a version;
 * the records already written keep the version they were filled with.
 */
export function FormBuilder({ form, specialties, isSaving, onSave, onCancel }: FormBuilderProps) {
  const saved = form?.versions.find((version) => version.version === form.currentVersion)?.schema;
  const [name, setName] = useState(form?.name ?? '');
  const [description, setDescription] = useState(form?.description ?? '');
  const [category, setCategory] = useState(form?.category ?? '');
  const [specialtyCode, setSpecialtyCode] = useState(form?.specialty?.code ?? '');
  const [draft, setDraft] = useState<FormDraft>(() => (saved ? schemaToDraft(saved) : emptyDraft()));
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [error, setError] = useState('');
  const [previewValues, setPreviewValues] = useState<FormValues>({});

  const schema = useMemo(() => draftToSchema(draft, saved), [draft, saved]);
  const keys = useMemo(() => previewKeys(draft), [draft]);
  const targetOf = useMemo(() => issueTargets(draft, schema), [draft, schema]);

  const issuesOfField = (fieldId: string) =>
    issues.filter((issue) => targetOf(issue.field) === fieldId).map((issue) => issue.message);
  const generalIssues = issues.filter((issue) => !targetOf(issue.field));

  const setSection = (section: DraftSection) =>
    setDraft({
      ...draft,
      sections: draft.sections.map((current) => (current.id === section.id ? section : current)),
    });
  const setAlert = (alert: DraftAlert) =>
    setDraft({
      ...draft,
      alerts: draft.alerts.map((current) => (current.id === alert.id ? alert : current)),
    });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setIssues([]);
    setError('');
    if (name.trim().length < 2) {
      setError('El nombre del formulario debe tener al menos 2 caracteres.');
      return;
    }
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        specialtyCode: specialtyCode || null,
        schema,
      });
    } catch (caught) {
      const apiError = caught as ApiError | undefined;
      setIssues(apiError?.issues ?? []);
      setError(apiError?.message || 'No fue posible guardar el formulario.');
    }
  };

  // The preview is drawn from what would be sent; fields still missing a label are left out.
  const previewSchema = {
    ...schema,
    sections: schema.sections
      .map((section) => ({ ...section, fields: section.fields.filter((field) => field.label) }))
      .filter((section) => section.fields.length > 0),
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{form ? `Editar ${form.name}` : 'Nuevo formulario'}</CardTitle>
          <CardDescription>
            {form
              ? `Versión actual: ${form.currentVersion}. Si cambias los campos se guarda una versión nueva; los registros anteriores conservan la suya.`
              : 'Define los campos que tus profesionales llenarán en la historia del paciente.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="form-name" required>
              Nombre
            </Label>
            <Input id="form-name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="form-category">Categoría</Label>
            <Input
              id="form-category"
              value={category}
              maxLength={60}
              placeholder="Evaluación, seguimiento, consentimiento…"
              onChange={(event) => setCategory(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="form-description">Descripción</Label>
            <Input
              id="form-description"
              value={description}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="form-specialty">Quién puede llenarlo</Label>
            <select
              id="form-specialty"
              value={specialtyCode}
              onChange={(event) => setSpecialtyCode(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Cualquier profesional del consultorio</option>
              {specialties.map((specialty) => (
                <option key={specialty.code} value={specialty.code}>
                  Solo {specialty.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {draft.sections.map((section, sectionIndex) => (
        <Card key={section.id}>
          <CardHeader>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <Label htmlFor={`builder-${section.id}-title`}>Título de la sección {sectionIndex + 1}</Label>
                <Input
                  id={`builder-${section.id}-title`}
                  value={section.title}
                  onChange={(event) => setSection({ ...section, title: event.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draft.sections.length === 1}
                onClick={() =>
                  setDraft({ ...draft, sections: draft.sections.filter((current) => current.id !== section.id) })
                }
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Quitar sección
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {section.fields.map((field, fieldIndex) => (
              <FieldEditor
                key={field.id}
                field={field}
                position={fieldIndex}
                count={section.fields.length}
                keyPreview={keys.get(field.id)}
                issues={issuesOfField(field.id)}
                onChange={(next) =>
                  setSection({
                    ...section,
                    fields: section.fields.map((current) => (current.id === next.id ? next : current)),
                  })
                }
                onMove={(offset) => setSection({ ...section, fields: move(section.fields, fieldIndex, offset) })}
                onRemove={() =>
                  setSection({ ...section, fields: section.fields.filter((current) => current.id !== field.id) })
                }
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSection({ ...section, fields: [...section.fields, newField()] })}
            >
              <Plus className="mr-1 h-4 w-4" />
              Agregar campo
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => setDraft({ ...draft, sections: [...draft.sections, newSection()] })}
      >
        <Plus className="mr-1 h-4 w-4" />
        Agregar sección
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Alertas clínicas</CardTitle>
          <CardDescription>
            Reglas que avisan al profesional cuando un registro cumple una condición, por ejemplo{' '}
            <code className="font-mono">total &gt;= 20</code> o{' '}
            <code className="font-mono">riesgo == &apos;ALTO&apos;</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {draft.alerts.map((alert, index) => (
            <div
              key={alert.id}
              className="grid grid-cols-1 gap-3 rounded-md border border-input p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_auto]"
            >
              <div>
                <Label htmlFor={`builder-${alert.id}-when`} className="text-xs">
                  Condición
                </Label>
                <Input
                  id={`builder-${alert.id}-when`}
                  value={alert.when}
                  className="font-mono"
                  onChange={(event) => setAlert({ ...alert, when: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`builder-${alert.id}-level`} className="text-xs">
                  Nivel
                </Label>
                <select
                  id={`builder-${alert.id}-level`}
                  value={alert.level}
                  onChange={(event) => setAlert({ ...alert, level: event.target.value as FormAlertLevel })}
                  className={SELECT_CLASS}
                >
                  {(Object.keys(ALERT_LEVEL_LABELS) as FormAlertLevel[]).map((level) => (
                    <option key={level} value={level}>
                      {ALERT_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor={`builder-${alert.id}-message`} className="text-xs">
                  Mensaje
                </Label>
                <Input
                  id={`builder-${alert.id}-message`}
                  value={alert.message}
                  onChange={(event) => setAlert({ ...alert, message: event.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setDraft({ ...draft, alerts: draft.alerts.filter((current) => current.id !== alert.id) })
                  }
                  aria-label={`Quitar alerta ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDraft({ ...draft, alerts: [...draft.alerts, newAlert()] })}
          >
            <Plus className="mr-1 h-4 w-4" />
            Agregar alerta
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vista previa</CardTitle>
          <CardDescription>Así lo verá el profesional al registrar. Nada de lo que escribas aquí se guarda.</CardDescription>
        </CardHeader>
        <CardContent>
          {previewSchema.sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Agrega la etiqueta de un campo para ver la vista previa.</p>
          ) : (
            <DynamicFormFields
              schema={previewSchema}
              values={{ ...initialValues(previewSchema), ...previewValues }}
              onChange={setPreviewValues}
              idPrefix="preview"
            />
          )}
        </CardContent>
      </Card>

      {(error || generalIssues.length > 0) && (
        <Alert variant="destructive" title={error || 'Revisa la definición del formulario'}>
          {generalIssues.length > 0 && (
            <ul className="list-disc pl-4">
              {generalIssues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSaving}>
          {form ? 'Guardar cambios' : 'Crear formulario'}
        </Button>
      </div>
    </form>
  );
}
