import { describe, expect, it } from 'vitest';
import { patientSchema } from '@/lib/validations/schemas';
import { describeIdentification, identificationErrors, isMinor } from './patient-identity';

describe('identificationErrors', () => {
  it('accepts no identification at all and a number in the format of its type', () => {
    expect(identificationErrors('', '')).toEqual({});
    expect(identificationErrors('CEDULA', '171234567-8')).toEqual({});
    expect(identificationErrors('RUC', '1712345678001')).toEqual({});
    expect(identificationErrors('PASSPORT', 'ab 12345')).toEqual({});
    expect(identificationErrors('OTHER', 'DNI-445566')).toEqual({});
  });

  it('asks for the half that is missing', () => {
    expect(identificationErrors('', '1712345678')).toEqual({
      identificationType: 'Selecciona el tipo de documento.',
    });
    expect(identificationErrors('CEDULA', ' ')).toEqual({
      identificationNumber: 'Ingresa el número de documento.',
    });
  });

  it('explains the format the type expects', () => {
    expect(identificationErrors('CEDULA', '12345')).toEqual({
      identificationNumber: 'La cédula tiene 10 dígitos.',
    });
    expect(identificationErrors('RUC', '1712345678')).toEqual({
      identificationNumber: 'El RUC tiene 13 dígitos.',
    });
  });
});

describe('isMinor', () => {
  const today = new Date(2026, 9, 3);

  it('turns 18 on the birthday', () => {
    expect(isMinor('2008-10-04', today)).toBe(true);
    expect(isMinor('2008-10-03', today)).toBe(false);
    expect(isMinor('2008-10-03T00:00:00.000Z', today)).toBe(false);
  });

  it('is false without a usable date', () => {
    expect(isMinor('', today)).toBe(false);
    expect(isMinor(undefined, today)).toBe(false);
    expect(isMinor('ayer', today)).toBe(false);
  });
});

describe('describeIdentification', () => {
  it('names the document type', () => {
    expect(describeIdentification('CEDULA', '1712345678')).toBe('Cédula 1712345678');
    expect(describeIdentification('UNKNOWN', 'X1')).toBe('X1');
    expect(describeIdentification('CEDULA', null)).toBeNull();
  });
});

describe('patientSchema', () => {
  const base = { firstName: 'Ana', lastName: 'Paz' };
  const issuesOf = (data: Record<string, unknown>) => {
    const result = patientSchema.safeParse({ ...base, ...data });
    return result.success ? {} : result.error.flatten().fieldErrors;
  };

  it('normalizes the identification number', () => {
    const result = patientSchema.safeParse({
      ...base,
      identificationType: 'CEDULA',
      identificationNumber: '171234567-8',
    });

    expect(result.success && result.data.identificationNumber).toBe('1712345678');
  });

  it('reports identification problems on their field', () => {
    expect(issuesOf({ identificationNumber: '1712345678' })).toEqual({
      identificationType: ['Selecciona el tipo de documento.'],
    });
    expect(issuesOf({ identificationType: 'CEDULA', identificationNumber: '123' })).toEqual({
      identificationNumber: ['La cédula tiene 10 dígitos.'],
    });
  });

  it('requires a guardian for a minor and nothing for an adult', () => {
    const childBirth = `${new Date().getFullYear() - 8}-01-15`;

    expect(issuesOf({ dateOfBirth: childBirth })).toEqual({
      guardianName: ['Un paciente menor de edad necesita un representante legal.'],
    });
    expect(issuesOf({ dateOfBirth: childBirth, guardianName: 'María Pérez' })).toEqual({});
    expect(issuesOf({ dateOfBirth: '1990-05-15' })).toEqual({});
  });
});
