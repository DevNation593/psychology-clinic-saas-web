import { describe, expect, it } from 'vitest';
import type { FormSchema } from '@/types/clinical';
import {
  draftToSchema,
  emptyDraft,
  issueTargets,
  keyFromLabel,
  newAlert,
  newField,
  previewKeys,
  schemaToDraft,
  type DraftField,
} from './form-draft';

const field = (changes: Partial<DraftField>): DraftField => ({ ...newField(), ...changes });

describe('keyFromLabel', () => {
  it.each([
    ['Tipo de lesión', 'tipoDeLesion'],
    ['  Peso (kg) ', 'pesoKg'],
    ['IMC', 'imc'],
    ['1. Poco interés', 'campo1PocoInteres'],
    ['¿¡!?', ''],
  ])('turns %p into %p', (label, key) => {
    expect(keyFromLabel(label)).toBe(key);
  });
});

describe('draftToSchema', () => {
  it('gives unsaved fields a key from their label and keeps the key of saved ones', () => {
    const draft = emptyDraft();
    draft.sections[0].fields = [
      field({ key: 'weight', label: 'Peso actual', type: 'decimal', min: '1', max: '500', unit: 'kg', required: true }),
      field({ label: 'Peso' }),
      field({ label: 'Peso' }),
    ];

    expect(draftToSchema(draft).sections[0]).toEqual({
      key: 'datos',
      title: 'Datos',
      fields: [
        { key: 'weight', label: 'Peso actual', type: 'decimal', min: 1, max: 500, unit: 'kg', required: true },
        { key: 'peso', label: 'Peso', type: 'text' },
        { key: 'peso2', label: 'Peso', type: 'text' },
      ],
    });
    expect([...previewKeys(draft).values()]).toEqual(['weight', 'peso', 'peso2']);
  });

  it('builds options, table columns, formulas and alerts', () => {
    const draft = emptyDraft();
    draft.sections[0].fields = [
      field({ label: 'Tipo de lesión', type: 'select', options: 'Traumática\n\n Deportiva \nTraumática' }),
      field({
        label: 'Medicamentos',
        type: 'table',
        columns: [field({ label: 'Nombre', required: true }), field({ label: 'Dosis', type: 'decimal' })],
      }),
      field({ label: 'A', type: 'integer' }),
      field({ label: 'Total', type: 'calculated', formula: ' a * 2 ', required: true }),
    ];
    draft.alerts = [
      { ...newAlert(), when: 'total >= 10', level: 'critical', message: 'Revisar' },
      newAlert(),
    ];

    expect(draftToSchema(draft)).toEqual({
      sections: [
        {
          key: 'datos',
          title: 'Datos',
          fields: [
            {
              key: 'tipoDeLesion',
              label: 'Tipo de lesión',
              type: 'select',
              options: [
                { value: 'TRAUMATICA', label: 'Traumática' },
                { value: 'DEPORTIVA', label: 'Deportiva' },
                { value: 'TRAUMATICA2', label: 'Traumática' },
              ],
            },
            {
              key: 'medicamentos',
              label: 'Medicamentos',
              type: 'table',
              columns: [
                { key: 'nombre', label: 'Nombre', type: 'text', required: true },
                { key: 'dosis', label: 'Dosis', type: 'decimal' },
              ],
            },
            { key: 'a', label: 'A', type: 'integer' },
            // A calculated field is never required: the API computes it.
            { key: 'total', label: 'Total', type: 'calculated', formula: 'a * 2' },
          ],
        },
      ],
      // An alert left blank is not sent.
      alerts: [{ when: 'total >= 10', level: 'critical', message: 'Revisar' }],
    });
  });

  it('round-trips a saved schema without changing any key or option value', () => {
    const saved: FormSchema = {
      sections: [
        {
          key: 'injury',
          title: 'Lesión',
          fields: [
            {
              key: 'injuryType',
              label: 'Tipo de lesión',
              type: 'select',
              required: true,
              options: [
                { value: 'TRAUMA', label: 'Traumática' },
                { value: 'SPORT', label: 'Deportiva' },
              ],
            },
            { key: 'pain', label: 'Dolor', type: 'scale', min: 0, max: 10 },
            {
              key: 'items',
              label: 'Ítems',
              type: 'table',
              columns: [{ key: 'drug', label: 'Medicamento', type: 'text', required: true }],
            },
          ],
        },
      ],
      alerts: [{ when: 'pain >= 8', level: 'warning', message: 'Dolor intenso' }],
    };

    expect(draftToSchema(schemaToDraft(saved), saved)).toEqual(saved);
  });

  it('keeps the stored value of an option whose label did not change', () => {
    const saved: FormSchema = {
      sections: [
        {
          key: 's',
          title: 'S',
          fields: [
            {
              key: 'kind',
              label: 'Tipo',
              type: 'radio',
              options: [{ value: 'OLD_VALUE', label: 'Deportiva' }],
            },
          ],
        },
      ],
    };
    const draft = schemaToDraft(saved);
    draft.sections[0].fields[0].options = 'Laboral\nDeportiva';

    expect(draftToSchema(draft, saved).sections[0].fields[0].options).toEqual([
      { value: 'LABORAL', label: 'Laboral' },
      { value: 'OLD_VALUE', label: 'Deportiva' },
    ]);
  });
});

describe('issueTargets', () => {
  it('finds the draft field an API issue path refers to', () => {
    const draft = emptyDraft();
    draft.sections[0].fields = [
      field({ label: 'A', type: 'integer' }),
      field({ label: 'Total', type: 'calculated', formula: 'zzz' }),
    ];
    const targetOf = issueTargets(draft, draftToSchema(draft));

    expect(targetOf('sections[0].fields[0].label')).toBe(draft.sections[0].fields[0].id);
    expect(targetOf('sections[0].fields[1].columns[0].type')).toBe(draft.sections[0].fields[1].id);
    expect(targetOf('total.formula')).toBe(draft.sections[0].fields[1].id);
    expect(targetOf('alerts[0].when')).toBeUndefined();
    expect(targetOf('sections')).toBeUndefined();
  });
});
