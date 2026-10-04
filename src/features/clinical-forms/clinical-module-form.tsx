'use client';

import type { ClinicalModuleDefinition, FormField, FormSchema } from '@/types/clinical';
import { DynamicFormFields } from './dynamic-form-fields';
import { formatFieldValue, initialValues, listFields, type FormValues } from './form-values';
import { Odontogram } from './odontogram';
import { isSignatureImage } from './signature-pad';

// The odontogram drawing edits these two fields; the rest of its schema renders as a form.
const ODONTOGRAM_FIELDS = ['dentition', 'findings'];

type Renderable = Pick<ClinicalModuleDefinition, 'renderer' | 'schema'>;

function withoutOdontogramFields(schema: FormSchema): FormSchema {
  return {
    ...schema,
    sections: schema.sections
      .map((section) => ({
        ...section,
        fields: section.fields.filter((field) => !ODONTOGRAM_FIELDS.includes(field.key)),
      }))
      .filter((section) => section.fields.length > 0),
  };
}

/** Input state for a new record of the module, or for correcting stored data. */
export function initialModuleValues(
  definition: Renderable,
  data: Record<string, unknown> = {},
): FormValues {
  const values = initialValues(definition.schema, data);
  if (definition.renderer === 'ODONTOGRAM' && !values.dentition) values.dentition = 'PERMANENT';
  return values;
}

export interface ClinicalModuleFormProps {
  definition: Renderable;
  values: FormValues;
  onChange: (values: FormValues) => void;
  issues?: Record<string, string>;
  disabled?: boolean;
  idPrefix?: string;
}

/** The inputs of one module version, drawn by the renderer its definition names. */
export function ClinicalModuleForm({ definition, ...props }: ClinicalModuleFormProps) {
  if (definition.renderer !== 'ODONTOGRAM') {
    return <DynamicFormFields schema={definition.schema} {...props} />;
  }

  const issue = ODONTOGRAM_FIELDS.map((key) => props.issues?.[key]).find(Boolean);
  return (
    <div className="space-y-6">
      <Odontogram values={props.values} onChange={props.onChange} disabled={props.disabled} />
      {issue && <p className="text-sm text-destructive">{issue}</p>}
      <DynamicFormFields schema={withoutOdontogramFields(definition.schema)} {...props} />
    </div>
  );
}

function TableValue({ field, rows }: { field: FormField; rows: Record<string, unknown>[] }) {
  const columns = field.columns ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <caption className="sr-only">{field.label}</caption>
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            {columns.map((column) => (
              <th key={column.key} scope="col" className="py-1.5 pr-4 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b last:border-0 align-top">
              {columns.map((column) => (
                <td key={column.key} className="whitespace-pre-wrap py-1.5 pr-4">
                  {formatFieldValue(column, row?.[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const isFilled = (value: unknown) =>
  value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);

export interface RecordDataViewProps {
  /** The version the record was written under; absent when the web does not know it. */
  definition?: Renderable;
  data: Record<string, unknown>;
}

/** A stored record, read with the labels and renderer of the definition it was written under. */
export function RecordDataView({ definition, data }: RecordDataViewProps) {
  if (!definition) {
    return (
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <dt className="text-muted-foreground">{key}</dt>
            <dd className="whitespace-pre-wrap">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  const isOdontogram = definition.renderer === 'ODONTOGRAM';
  const fields = listFields(isOdontogram ? withoutOdontogramFields(definition.schema) : definition.schema);
  const known = new Set(listFields(definition.schema).map((field) => field.key));
  // Pre-definition records may carry keys the legacy version does not list.
  const extras = Object.entries(data).filter(([key, value]) => !known.has(key) && isFilled(value));

  // The record reads in the order of its definition: runs of plain fields, tables in between.
  const blocks: (FormField | FormField[])[] = [];
  for (const field of fields.filter((candidate) => isFilled(data[candidate.key]))) {
    const last = blocks.at(-1);
    if (field.type === 'table') blocks.push(field);
    else if (Array.isArray(last)) last.push(field);
    else blocks.push([field]);
  }

  return (
    <div className="space-y-4">
      {isOdontogram && <Odontogram readOnly values={data} />}
      {blocks.map((block) =>
        Array.isArray(block) ? (
          <dl
            key={block[0].key}
            className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2 lg:grid-cols-3"
          >
            {block.map((field) => (
              <div
                key={field.key}
                className={field.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : undefined}
              >
                <dt className="text-muted-foreground">{field.label}</dt>
                {field.type === 'signature' ? (
                  <dd>
                    {isSignatureImage(data[field.key]) ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a data URL kept in the record
                      <img
                        src={data[field.key] as string}
                        alt={`${field.label}: firma registrada`}
                        className="h-20 max-w-[280px] rounded border border-input bg-white object-contain"
                      />
                    ) : (
                      '—'
                    )}
                  </dd>
                ) : (
                  <dd className="whitespace-pre-wrap">{formatFieldValue(field, data[field.key])}</dd>
                )}
              </div>
            ))}
          </dl>
        ) : (
          <div key={block.key}>
            <p className="mb-1 text-sm font-medium">{block.label}</p>
            <TableValue field={block} rows={data[block.key] as Record<string, unknown>[]} />
          </div>
        ),
      )}
      {extras.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2 lg:grid-cols-3">
          {extras.map(([key, value]) => (
            <div key={key}>
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="whitespace-pre-wrap">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
