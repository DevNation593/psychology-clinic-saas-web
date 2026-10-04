import { format, parseISO } from 'date-fns';
import type { FormField, FormIssue, FormSchema } from '@/types/clinical';

/** State of the inputs: strings for typed fields, booleans for checkboxes, arrays for the rest. */
export type FormValues = Record<string, unknown>;
export type TableRow = Record<string, unknown>;

const NUMERIC_TYPES = ['integer', 'decimal', 'scale'];

export function listFields(schema: FormSchema): FormField[] {
  return schema.sections.flatMap((section) => section.fields);
}

function inputValue(field: FormField, stored: unknown): unknown {
  switch (field.type) {
    case 'checkbox':
      return stored === true;
    case 'multiselect':
      return Array.isArray(stored) ? stored.filter((item) => typeof item === 'string') : [];
    case 'table':
      return Array.isArray(stored)
        ? stored.map((row) =>
            Object.fromEntries(
              (field.columns ?? []).map((column) => [
                column.key,
                inputValue(column, (row as TableRow | null)?.[column.key]),
              ]),
            ),
          )
        : [];
    default:
      return stored === undefined || stored === null ? '' : String(stored);
  }
}

/** Input state for an empty form, or for correcting the data of a stored record. */
export function initialValues(schema: FormSchema, data: Record<string, unknown> = {}): FormValues {
  return Object.fromEntries(
    listFields(schema)
      .filter((field) => field.type !== 'calculated')
      .map((field) => [field.key, inputValue(field, data[field.key])]),
  );
}

export function emptyRow(field: FormField): TableRow {
  return Object.fromEntries(
    (field.columns ?? []).map((column) => [column.key, inputValue(column, undefined)]),
  );
}

function outputValue(field: FormField, value: unknown): unknown {
  if (field.type === 'checkbox') return value === true ? true : undefined;
  if (field.type === 'multiselect') {
    return Array.isArray(value) && value.length > 0 ? value : undefined;
  }
  if (field.type === 'table') {
    const rows = (Array.isArray(value) ? (value as TableRow[]) : [])
      .map((row) =>
        Object.fromEntries(
          (field.columns ?? []).flatMap((column) => {
            const cell = outputValue(column, row[column.key]);
            return cell === undefined ? [] : [[column.key, cell]];
          }),
        ),
      )
      .filter((row) => Object.keys(row).length > 0);
    return rows.length > 0 ? rows : undefined;
  }

  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return undefined;
  if (NUMERIC_TYPES.includes(field.type)) {
    const number = Number(text.replace(',', '.'));
    // Text that is not a number is sent as typed so the API reports it on its field.
    return Number.isFinite(number) ? number : text;
  }
  return text;
}

/** The data to send: empty fields and calculated ones are left out; the API computes the latter. */
export function toRecordData(schema: FormSchema, values: FormValues): Record<string, unknown> {
  return Object.fromEntries(
    listFields(schema).flatMap((field) => {
      if (field.type === 'calculated') return [];
      const value = outputValue(field, values[field.key]);
      return value === undefined ? [] : [[field.key, value]];
    }),
  );
}

const optionLabel = (field: FormField, value: unknown) =>
  field.options?.find((option) => option.value === String(value))?.label;

/** How a stored value reads in the patient record. */
export function formatFieldValue(field: FormField, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';

  switch (field.type) {
    case 'checkbox':
      return value === true ? 'Sí' : 'No';
    case 'radio':
    case 'select':
      return optionLabel(field, value) ?? String(value);
    case 'multiselect':
      return Array.isArray(value)
        ? value.map((item) => optionLabel(field, item) ?? String(item)).join(', ')
        : String(value);
    case 'scale': {
      const label = optionLabel(field, value);
      return label ? `${value} · ${label}` : String(value);
    }
    case 'date': {
      const date = typeof value === 'string' ? parseISO(value) : null;
      return date && !Number.isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy') : String(value);
    }
    default:
      return field.unit ? `${value} ${field.unit}` : String(value);
  }
}

/** Issues keyed by the path the API reports: `field`, `table[0].column`. */
export function issuesByField(issues: FormIssue[] = []): Record<string, string> {
  return Object.fromEntries(issues.map((issue) => [issue.field, issue.message]));
}
