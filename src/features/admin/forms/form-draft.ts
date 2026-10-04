import type { FormAlertLevel, FormField, FormFieldType, FormSchema } from '@/types/clinical';

/** The field types a clinic can pick, in the order the builder offers them. */
export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  integer: 'Número entero',
  decimal: 'Número decimal',
  date: 'Fecha',
  time: 'Hora',
  checkbox: 'Casilla (sí / no)',
  radio: 'Opción única',
  select: 'Lista desplegable',
  multiselect: 'Selección múltiple',
  scale: 'Escala numérica',
  table: 'Tabla',
  calculated: 'Campo calculado',
  signature: 'Firma en pantalla',
};

export const COLUMN_TYPES: FormFieldType[] = [
  'text',
  'textarea',
  'integer',
  'decimal',
  'date',
  'time',
  'checkbox',
  'select',
];

export const ALERT_LEVEL_LABELS: Record<FormAlertLevel, string> = {
  info: 'Informativa',
  warning: 'Advertencia',
  critical: 'Crítica',
};

const CHOICE_TYPES: FormFieldType[] = ['radio', 'select', 'multiselect'];
const NUMERIC_TYPES: FormFieldType[] = ['integer', 'decimal', 'scale'];

/**
 * A field as the builder edits it: everything is text so half-typed values are kept.
 * `key` is empty for a field that has not been saved; saved fields keep theirs forever,
 * because the stored answers are found by it.
 */
export interface DraftField {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  unit: string;
  min: string;
  max: string;
  /** One option per line. */
  options: string;
  formula: string;
  columns: DraftField[];
}

export interface DraftSection {
  id: string;
  key: string;
  title: string;
  fields: DraftField[];
}

export interface DraftAlert {
  id: string;
  when: string;
  level: FormAlertLevel;
  message: string;
}

export interface FormDraft {
  sections: DraftSection[];
  alerts: DraftAlert[];
}

// Ids of what the user adds while editing. A draft built from a schema numbers its own items
// instead, so the server and the browser render the same ids.
let nextId = 0;
const draftId = () => `draft-${(nextId += 1)}`;
const sequence = (prefix: string) => {
  let count = 0;
  return () => `${prefix}-${(count += 1)}`;
};

export const newField = (type: FormFieldType = 'text', id: string = draftId()): DraftField => ({
  id,
  key: '',
  label: '',
  type,
  required: false,
  unit: '',
  min: '',
  max: '',
  options: '',
  formula: '',
  columns: [],
});

export const newSection = (): DraftSection => ({
  id: draftId(),
  key: '',
  title: '',
  fields: [newField()],
});

export const newAlert = (): DraftAlert => ({ id: draftId(), when: '', level: 'warning', message: '' });

export const emptyDraft = (): FormDraft => ({
  sections: [{ id: 'empty-1', key: '', title: 'Datos', fields: [newField('text', 'empty-2')] }],
  alerts: [],
});

/** `Tipo de lesión` → `tipoDeLesion`: the key a label gets when the field has none yet. */
export function keyFromLabel(label: string): string {
  const words = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const key = words
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join('')
    .slice(0, 50);
  return /^[a-zA-Z]/.test(key) ? key : key ? `campo${key}` : '';
}

function uniqueKey(base: string, used: Set<string>): string {
  let key = base || 'campo';
  for (let suffix = 2; used.has(key); suffix += 1) key = `${base || 'campo'}${suffix}`;
  used.add(key);
  return key;
}

/** The key a field has now or will get when saved, for showing it next to the label. */
export function previewKeys(draft: FormDraft): Map<string, string> {
  const used = new Set(
    draft.sections.flatMap((section) => section.fields.map((field) => field.key)).filter(Boolean),
  );
  return new Map(
    draft.sections.flatMap((section) =>
      section.fields.map((field) => [
        field.id,
        field.key || uniqueKey(keyFromLabel(field.label), used),
      ]),
    ),
  );
}

const parseOptions = (text: string) => {
  const used = new Set<string>();
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({
      value: uniqueKey(keyFromLabel(label).toUpperCase() || 'OPCION', used),
      label,
    }));
};

const optionalNumber = (text: string): number | undefined => {
  const number = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(number) ? number : undefined;
};

function toField(draft: DraftField, key: string, existingOptions?: FormField['options']): FormField {
  const field: FormField = { key, label: draft.label.trim(), type: draft.type };
  if (draft.required && draft.type !== 'calculated') field.required = true;
  if (draft.unit.trim()) field.unit = draft.unit.trim();

  if (NUMERIC_TYPES.includes(draft.type)) {
    const min = optionalNumber(draft.min);
    const max = optionalNumber(draft.max);
    if (min !== undefined) field.min = min;
    if (max !== undefined) field.max = max;
  }
  if (CHOICE_TYPES.includes(draft.type)) {
    // An option keeps the value it was saved with when only its position or wording is the same.
    const byLabel = new Map(existingOptions?.map((option) => [option.label, option.value]));
    field.options = parseOptions(draft.options).map((option) => ({
      value: byLabel.get(option.label) ?? option.value,
      label: option.label,
    }));
  }
  if (draft.type === 'calculated') field.formula = draft.formula.trim();
  if (draft.type === 'table') {
    const used = new Set(draft.columns.map((column) => column.key).filter(Boolean));
    field.columns = draft.columns.map((column) =>
      toField(column, column.key || uniqueKey(keyFromLabel(column.label), used)),
    );
  }
  return field;
}

/** The schema to send. Unsaved fields and sections get their keys here, from their labels. */
export function draftToSchema(draft: FormDraft, saved?: FormSchema): FormSchema {
  const keys = previewKeys(draft);
  const savedOptions = new Map(
    saved?.sections.flatMap((section) => section.fields.map((field) => [field.key, field.options])),
  );
  const sectionKeys = new Set(draft.sections.map((section) => section.key).filter(Boolean));

  const schema: FormSchema = {
    sections: draft.sections.map((section) => ({
      key: section.key || uniqueKey(keyFromLabel(section.title) || 'seccion', sectionKeys),
      title: section.title.trim(),
      fields: section.fields.map((field) =>
        toField(field, keys.get(field.id)!, savedOptions.get(field.key)),
      ),
    })),
  };
  const alerts = draft.alerts
    .filter((alert) => alert.when.trim() || alert.message.trim())
    .map(({ when, level, message }) => ({ when: when.trim(), level, message: message.trim() }));
  if (alerts.length > 0) schema.alerts = alerts;
  return schema;
}

function fromField(field: FormField, nextSavedId: () => string): DraftField {
  return {
    id: nextSavedId(),
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required === true,
    unit: field.unit ?? '',
    min: field.min === undefined ? '' : String(field.min),
    max: field.max === undefined ? '' : String(field.max),
    options: CHOICE_TYPES.includes(field.type)
      ? (field.options ?? []).map((option) => option.label).join('\n')
      : '',
    formula: field.formula ?? '',
    columns: (field.columns ?? []).map((column) => fromField(column, nextSavedId)),
  };
}

/** Builder state for editing a saved schema; every key is kept. */
export function schemaToDraft(schema: FormSchema): FormDraft {
  const nextSavedId = sequence('saved');
  return {
    sections: schema.sections.map((section) => ({
      id: nextSavedId(),
      key: section.key,
      title: section.title,
      fields: section.fields.map((field) => fromField(field, nextSavedId)),
    })),
    alerts: (schema.alerts ?? []).map((alert) => ({ id: nextSavedId(), ...alert })),
  };
}

/** Maps the paths the API reports (`sections[0].fields[1].label`) to the draft ids they concern. */
export function issueTargets(draft: FormDraft, schema: FormSchema): (path: string) => string | undefined {
  const byKey = new Map(
    draft.sections.flatMap((section, sectionIndex) =>
      section.fields.map((field, fieldIndex) => [
        schema.sections[sectionIndex]?.fields[fieldIndex]?.key,
        field.id,
      ]),
    ),
  );
  return (path) => {
    const indexed = /^sections\[(\d+)\]\.fields\[(\d+)\]/.exec(path);
    if (indexed) return draft.sections[Number(indexed[1])]?.fields[Number(indexed[2])]?.id;
    // Formula problems are reported as `<fieldKey>.formula`.
    return byKey.get(path.split('.')[0]);
  };
}
