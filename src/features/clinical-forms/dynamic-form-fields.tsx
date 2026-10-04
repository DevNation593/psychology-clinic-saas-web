'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FormField, FormSchema } from '@/types/clinical';
import { emptyRow, type FormValues, type TableRow } from './form-values';
import { LookupInput } from './lookup-input';
import { SignaturePad } from './signature-pad';

const SELECT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50';
const WIDE_TYPES = ['textarea', 'table', 'radio', 'multiselect', 'scale', 'signature'];
// A scale up to this many points is answered by choosing a point; a longer one is typed.
const MAX_SCALE_POINTS = 11;

export interface DynamicFormFieldsProps {
  schema: FormSchema;
  values: FormValues;
  onChange: (values: FormValues) => void;
  /** Problems reported by the API, keyed by field path. */
  issues?: Record<string, string>;
  disabled?: boolean;
  /** Keeps input ids unique when several forms share a page. */
  idPrefix?: string;
}

interface ControlProps {
  field: FormField;
  id: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  invalid: boolean;
  /** Set for table cells, which have no visible label of their own. */
  ariaLabel?: string;
  /** A catalog suggestion was chosen: the value of this field and what it knows of its siblings. */
  onPick?: (value: string, fill: Record<string, string>) => void;
}

/** The catalog values that have a field to go to. */
const fillFor = (fill: Record<string, string>, fields: FormField[]) =>
  Object.fromEntries(
    Object.entries(fill).filter(([key, value]) => value && fields.some((field) => field.key === key)),
  );

function scalePoints(field: FormField): number[] | null {
  if (field.min === undefined || field.max === undefined) return null;
  const count = field.max - field.min + 1;
  if (!Number.isInteger(count) || count < 2 || count > MAX_SCALE_POINTS) return null;
  return Array.from({ length: count }, (_, index) => field.min! + index);
}

function ChoiceGroup({
  field,
  id,
  options,
  selected,
  multiple,
  onToggle,
  disabled,
}: {
  field: FormField;
  id: string;
  options: { value: string; label: string }[];
  selected: string[];
  multiple: boolean;
  onToggle: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={cn(
              'flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
              checked ? 'border-primary bg-primary/10 text-foreground' : 'border-input hover:bg-accent',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={multiple ? `${id}-${option.value}` : id}
              value={option.value}
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(option.value)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              aria-label={`${field.label}: ${option.label}`}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function FieldControl({
  field,
  id,
  value,
  onChange,
  disabled,
  invalid,
  ariaLabel,
  onPick,
}: ControlProps) {
  const text = typeof value === 'string' ? value : '';
  const common = {
    id,
    disabled,
    'aria-invalid': invalid || undefined,
    'aria-label': ariaLabel,
    'aria-describedby': invalid ? `${id}-error` : undefined,
  };

  switch (field.type) {
    case 'signature':
      return (
        <SignaturePad
          id={id}
          label={ariaLabel ?? field.label}
          value={text}
          onChange={onChange}
          disabled={disabled}
          invalid={invalid}
        />
      );

    case 'textarea':
      return (
        <Textarea
          {...common}
          rows={ariaLabel ? 2 : 3}
          value={text}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case 'integer':
    case 'decimal':
      return (
        <Input
          {...common}
          type="number"
          inputMode={field.type === 'integer' ? 'numeric' : 'decimal'}
          step={field.type === 'integer' ? 1 : 'any'}
          min={field.min}
          max={field.max}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case 'date':
    case 'time':
      return (
        <Input
          {...common}
          type={field.type}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case 'checkbox':
      return (
        <input
          {...common}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5 accent-[hsl(var(--primary))]"
        />
      );

    case 'select':
      return (
        <select
          {...common}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Selecciona…</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <ChoiceGroup
          field={field}
          id={id}
          options={field.options ?? []}
          selected={text ? [text] : []}
          multiple={false}
          onToggle={onChange}
          disabled={disabled}
        />
      );

    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <ChoiceGroup
          field={field}
          id={id}
          options={field.options ?? []}
          selected={selected}
          multiple
          onToggle={(option) =>
            onChange(
              selected.includes(option)
                ? selected.filter((item) => item !== option)
                : [...selected, option],
            )
          }
          disabled={disabled}
        />
      );
    }

    case 'scale': {
      const points = scalePoints(field);
      if (!points) {
        return (
          <Input
            {...common}
            type="number"
            inputMode="numeric"
            step={1}
            min={field.min}
            max={field.max}
            value={text}
            onChange={(event) => onChange(event.target.value)}
          />
        );
      }
      return (
        <ChoiceGroup
          field={field}
          id={id}
          options={points.map((point) => ({
            value: String(point),
            label:
              field.options?.find((option) => option.value === String(point))?.label ??
              String(point),
          }))}
          selected={text ? [text] : []}
          multiple={false}
          onToggle={onChange}
          disabled={disabled}
        />
      );
    }

    default:
      if (field.lookup) {
        return (
          <LookupInput
            id={id}
            lookup={field.lookup}
            value={text}
            disabled={disabled}
            invalid={invalid}
            ariaLabel={ariaLabel}
            maxLength={field.maxLength}
            onChange={onChange}
            onPick={(suggestion) =>
              onPick ? onPick(suggestion.value, suggestion.fill) : onChange(suggestion.value)
            }
          />
        );
      }
      return (
        <Input
          {...common}
          type="text"
          value={text}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}

function TableField({
  field,
  id,
  rows,
  onChange,
  issues,
  disabled,
}: {
  field: FormField;
  id: string;
  rows: TableRow[];
  onChange: (rows: TableRow[]) => void;
  issues: Record<string, string>;
  disabled?: boolean;
}) {
  const columns = field.columns ?? [];
  const canAdd = rows.length < (field.maxRows ?? 100);

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin filas. Agrega la primera.</p>
      )}
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="rounded-md border border-input p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Fila {rowIndex + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(rows.filter((_, index) => index !== rowIndex))}
              aria-label={`Quitar fila ${rowIndex + 1} de ${field.label}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {columns.map((column) => {
              const cellId = `${id}-${rowIndex}-${column.key}`;
              const issue = issues[`${field.key}[${rowIndex}].${column.key}`];
              return (
                <div key={column.key} className={cn(column.type === 'textarea' && 'md:col-span-2 lg:col-span-3')}>
                  <Label htmlFor={cellId} className="text-xs">
                    {column.label}
                    {column.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <FieldControl
                    field={column}
                    id={cellId}
                    value={row[column.key]}
                    disabled={disabled}
                    invalid={Boolean(issue)}
                    ariaLabel={`${column.label}, fila ${rowIndex + 1}`}
                    onPick={(value, fill) =>
                      onChange(
                        rows.map((current, index) =>
                          index === rowIndex
                            ? { ...current, ...fillFor(fill, columns), [column.key]: value }
                            : current,
                        ),
                      )
                    }
                    onChange={(value) =>
                      onChange(
                        rows.map((current, index) =>
                          index === rowIndex ? { ...current, [column.key]: value } : current,
                        ),
                      )
                    }
                  />
                  {issue && (
                    <p id={`${cellId}-error`} className="mt-1 text-xs text-destructive">
                      {issue}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || !canAdd}
        onClick={() => onChange([...rows, emptyRow(field)])}
      >
        <Plus className="mr-1 h-4 w-4" />
        Agregar fila
      </Button>
    </div>
  );
}

/** Renders the inputs of a form schema. The values and their changes belong to the caller. */
export function DynamicFormFields({
  schema,
  values,
  onChange,
  issues = {},
  disabled,
  idPrefix = 'field',
}: DynamicFormFieldsProps) {
  const setValue = (key: string, value: unknown) => onChange({ ...values, [key]: value });
  const showTitles = schema.sections.length > 1;

  return (
    <div className="space-y-6">
      {schema.sections.map((section) => (
        <section key={section.key} className="space-y-3">
          {showTitles && <h4 className="text-sm font-semibold">{section.title}</h4>}
          {section.description && (
            <p className="text-sm text-muted-foreground">{section.description}</p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {section.fields.map((field) => {
              const id = `${idPrefix}-${field.key}`;
              const issue = issues[field.key];
              const grouped = ['radio', 'multiselect', 'scale', 'table', 'signature'].includes(field.type);

              return (
                <div
                  key={field.key}
                  className={cn(WIDE_TYPES.includes(field.type) && 'md:col-span-2 lg:col-span-3')}
                  role={grouped ? 'group' : undefined}
                  aria-labelledby={grouped ? `${id}-label` : undefined}
                >
                  {grouped || field.type === 'calculated' ? (
                    <p id={`${id}-label`} className="mb-1.5 text-sm font-medium leading-snug">
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </p>
                  ) : (
                    <Label htmlFor={id}>
                      {field.label}
                      {field.unit && <span className="text-muted-foreground"> ({field.unit})</span>}
                      {field.required && <span className="text-destructive"> *</span>}
                    </Label>
                  )}

                  {field.type === 'calculated' ? (
                    <p
                      aria-labelledby={`${id}-label`}
                      className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
                    >
                      Se calcula al guardar
                    </p>
                  ) : field.type === 'table' ? (
                    <TableField
                      field={field}
                      id={id}
                      rows={Array.isArray(values[field.key]) ? (values[field.key] as TableRow[]) : []}
                      onChange={(rows) => setValue(field.key, rows)}
                      issues={issues}
                      disabled={disabled}
                    />
                  ) : (
                    <div className={cn(!grouped && 'mt-1')}>
                      <FieldControl
                        field={field}
                        id={id}
                        value={values[field.key]}
                        disabled={disabled}
                        invalid={Boolean(issue)}
                        onChange={(value) => setValue(field.key, value)}
                        onPick={(value, fill) =>
                          onChange({
                            ...values,
                            ...fillFor(fill, section.fields),
                            [field.key]: value,
                          })
                        }
                      />
                    </div>
                  )}

                  {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
                  {issue && (
                    <p id={`${id}-error`} className="mt-1 text-sm text-destructive">
                      {issue}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
