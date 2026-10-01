import { describe, expect, it } from 'vitest';
import {
  customerFromPatient, hasSavedTaxId, invoiceCustomerErrors, normalizeTaxId, patientBillingErrors,
  type BillingCustomer,
} from './billing-customer';

const patient = {
  firstName: 'Ana', lastName: 'Vega', email: 'ana@example.com', address: 'Centro',
  billingName: null, billingTaxIdType: null, billingTaxId: null, billingEmail: null, billingAddress: null,
};
const complete: BillingCustomer = {
  name: 'Luis Vega', taxIdType: 'CEDULA', taxId: '1712345678', email: 'luis@example.com', address: '',
};

describe('customerFromPatient', () => {
  it('starts from the patient name and e-mail when no payer is stored', () => {
    expect(customerFromPatient(patient)).toEqual({
      name: 'Ana Vega', taxIdType: '', taxId: '', email: 'ana@example.com', address: '',
    });
    expect(hasSavedTaxId(patient)).toBe(false);
  });

  it('uses the stored payer when there is one', () => {
    const stored = {
      ...patient, billingName: 'Luis Vega', billingTaxIdType: 'CEDULA', billingTaxId: '1712345678',
      billingEmail: 'luis@example.com', billingAddress: 'Av. 1',
    };
    expect(customerFromPatient(stored)).toEqual({
      name: 'Luis Vega', taxIdType: 'CEDULA', taxId: '1712345678', email: 'luis@example.com', address: 'Av. 1',
    });
    expect(hasSavedTaxId(stored)).toBe(true);
  });

  it('ignores a stored type the form does not know', () => {
    expect(customerFromPatient({ ...patient, billingTaxIdType: 'DNI', billingTaxId: '1' }).taxIdType).toBe('');
  });
});

describe('normalizeTaxId', () => {
  it('removes the separators people type', () => {
    expect(normalizeTaxId(' 171 234-5678 ')).toBe('1712345678');
    expect(normalizeTaxId('ab12345')).toBe('AB12345');
  });
});

describe('invoiceCustomerErrors', () => {
  it('accepts a complete payer, including a number typed with separators', () => {
    expect(invoiceCustomerErrors(complete)).toEqual({});
    expect(invoiceCustomerErrors({ ...complete, taxId: '171 234 5678' })).toEqual({});
    expect(invoiceCustomerErrors({ ...complete, taxIdType: 'RUC', taxId: '1790-000000-001' })).toEqual({});
  });

  it.each([
    ['name', { name: 'A' }],
    ['taxIdType', { taxIdType: '' as const }],
    ['taxId', { taxId: '123' }],
    ['taxId', { taxIdType: 'RUC' as const }],
    ['email', { email: 'nope' }],
    ['email', { email: '' }],
  ])('requires a valid %s', (field, change) => {
    expect(Object.keys(invoiceCustomerErrors({ ...complete, ...change }))).toContain(field);
  });
});

describe('patientBillingErrors', () => {
  const empty: BillingCustomer = { name: '', taxIdType: '', taxId: '', email: '', address: '' };

  it('allows a patient with no billing data at all', () => {
    expect(patientBillingErrors(empty)).toEqual({});
  });

  it('allows a name and e-mail without an identification', () => {
    expect(patientBillingErrors({ ...empty, name: 'Luis Vega', email: 'luis@example.com' })).toEqual({});
  });

  it.each([
    ['taxId', { taxIdType: 'CEDULA' as const }],
    ['taxIdType', { taxId: '1712345678' }],
    ['taxId', { taxIdType: 'CEDULA' as const, taxId: '12' }],
    ['email', { email: 'nope' }],
    ['name', { name: 'A' }],
  ])('flags %s when what was entered is inconsistent', (field, change) => {
    expect(Object.keys(patientBillingErrors({ ...empty, ...change }))).toContain(field);
  });
});
