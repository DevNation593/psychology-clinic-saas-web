import { describe, expect, it } from 'vitest';
import type { FormSchema } from '@/types/clinical';
import { formatFieldValue, initialValues, issuesByField, toRecordData } from './form-values';

const schema: FormSchema = {
  sections: [
    {
      key: 'main',
      title: 'Principal',
      fields: [
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'weightKg', label: 'Peso', type: 'decimal', unit: 'kg' },
        { key: 'pain', label: 'Dolor', type: 'scale', min: 0, max: 10 },
        { key: 'bmi', label: 'IMC', type: 'calculated', formula: 'weightKg' },
        { key: 'smoker', label: 'Fuma', type: 'checkbox' },
        {
          key: 'areas',
          label: 'Áreas',
          type: 'multiselect',
          options: [
            { value: 'A', label: 'Área A' },
            { value: 'B', label: 'Área B' },
          ],
        },
        {
          key: 'items',
          label: 'Ítems',
          type: 'table',
          columns: [
            { key: 'drug', label: 'Medicamento', type: 'text' },
            { key: 'dose', label: 'Dosis', type: 'decimal' },
            { key: 'chronic', label: 'Crónico', type: 'checkbox' },
          ],
        },
      ],
    },
  ],
};

describe('initialValues', () => {
  it('starts every input empty and leaves calculated fields out', () => {
    expect(initialValues(schema)).toEqual({
      name: '',
      weightKg: '',
      pain: '',
      smoker: false,
      areas: [],
      items: [],
    });
  });

  it('turns stored data into input state for a correction', () => {
    expect(
      initialValues(schema, {
        name: 'Ana',
        weightKg: 70.5,
        bmi: 24.4,
        smoker: true,
        areas: ['B'],
        items: [{ drug: 'Ibuprofeno', dose: 400 }],
      }),
    ).toEqual({
      name: 'Ana',
      weightKg: '70.5',
      pain: '',
      smoker: true,
      areas: ['B'],
      items: [{ drug: 'Ibuprofeno', dose: '400', chronic: false }],
    });
  });
});

describe('toRecordData', () => {
  it('sends typed values and leaves out what was not filled in', () => {
    expect(
      toRecordData(schema, {
        name: '  Ana ',
        weightKg: '70,5',
        pain: '7',
        bmi: '99',
        smoker: false,
        areas: [],
        items: [
          { drug: ' Ibuprofeno ', dose: '400', chronic: true },
          { drug: '', dose: '', chronic: false },
        ],
      }),
    ).toEqual({
      name: 'Ana',
      weightKg: 70.5,
      pain: 7,
      items: [{ drug: 'Ibuprofeno', dose: 400, chronic: true }],
    });
  });

  it('sends text that is not a number as typed so the API reports it on its field', () => {
    expect(toRecordData(schema, { weightKg: 'setenta' })).toEqual({ weightKg: 'setenta' });
  });
});

describe('formatFieldValue', () => {
  const [name, weight, , , smoker, areas] = schema.sections[0].fields;

  it('reads stored values with their labels and units', () => {
    expect(formatFieldValue(weight, 70.5)).toBe('70.5 kg');
    expect(formatFieldValue(smoker, true)).toBe('Sí');
    expect(formatFieldValue(areas, ['A', 'B'])).toBe('Área A, Área B');
    expect(formatFieldValue({ key: 'd', label: 'Fecha', type: 'date' }, '2026-10-03')).toBe('03/10/2026');
    expect(
      formatFieldValue(
        {
          key: 'q1',
          label: 'Ítem',
          type: 'scale',
          min: 0,
          max: 3,
          options: [{ value: '2', label: 'Más de la mitad de los días' }],
        },
        2,
      ),
    ).toBe('2 · Más de la mitad de los días');
    expect(formatFieldValue(name, '')).toBe('—');
  });

  it('falls back to the stored value for an option the definition no longer lists', () => {
    expect(formatFieldValue(areas, ['Z'])).toBe('Z');
  });
});

describe('issuesByField', () => {
  it('keys the issues by the path the API reports', () => {
    expect(
      issuesByField([
        { field: 'weightKg', message: 'Debe ser un número' },
        { field: 'items[0].dose', message: 'Debe ser mayor o igual a 0' },
      ]),
    ).toEqual({ weightKg: 'Debe ser un número', 'items[0].dose': 'Debe ser mayor o igual a 0' });
    expect(issuesByField()).toEqual({});
  });
});
