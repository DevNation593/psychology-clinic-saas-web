export const TAX_ID_TYPES = ['CEDULA', 'RUC', 'PASSPORT'] as const;
export type TaxIdType = (typeof TAX_ID_TYPES)[number];

export const TAX_ID_TYPE_LABELS: Record<TaxIdType, string> = {
  CEDULA: 'Cédula',
  RUC: 'RUC',
  PASSPORT: 'Pasaporte',
};

export interface BillingCustomer {
  name: string;
  taxIdType: TaxIdType | '';
  taxId: string;
  email: string;
  address: string;
}
export type BillingCustomerErrors = Partial<Record<keyof BillingCustomer, string>>;

export const EMPTY_BILLING_CUSTOMER: BillingCustomer = {
  name: '', taxIdType: '', taxId: '', email: '', address: '',
};

interface PatientBillingSource {
  firstName: string;
  lastName: string;
  email: string | null;
  billingName: string | null;
  billingTaxIdType: string | null;
  billingTaxId: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
}

// Mirrors the API rules: format only, no check digit.
const TAX_ID_PATTERNS: Record<TaxIdType, RegExp> = {
  CEDULA: /^\d{10}$/,
  RUC: /^\d{13}$/,
  PASSPORT: /^[A-Z0-9]{5,20}$/,
};
const TAX_ID_HINTS: Record<TaxIdType, string> = {
  CEDULA: 'La cédula tiene 10 dígitos.',
  RUC: 'El RUC tiene 13 dígitos.',
  PASSPORT: 'El pasaporte tiene de 5 a 20 letras o números.',
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeTaxId(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

function isTaxIdType(value: string | null): value is TaxIdType {
  return !!value && (TAX_ID_TYPES as readonly string[]).includes(value);
}

export function hasSavedTaxId(patient: PatientBillingSource): boolean {
  return isTaxIdType(patient.billingTaxIdType) && !!patient.billingTaxId;
}

/** The payer to show for a patient: what is stored, else the patient's own name and e-mail. */
export function customerFromPatient(patient: PatientBillingSource): BillingCustomer {
  return {
    name: patient.billingName || `${patient.firstName} ${patient.lastName}`.trim(),
    taxIdType: isTaxIdType(patient.billingTaxIdType) ? patient.billingTaxIdType : '',
    taxId: patient.billingTaxId ?? '',
    email: patient.billingEmail || patient.email || '',
    address: patient.billingAddress ?? '',
  };
}

function formatErrors(customer: BillingCustomer): BillingCustomerErrors {
  const errors: BillingCustomerErrors = {};
  const name = customer.name.trim();
  const email = customer.email.trim();
  const taxId = normalizeTaxId(customer.taxId);
  if (name && name.length < 2) errors.name = 'Escribe el nombre o la razón social.';
  if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Correo inválido.';
  if (customer.taxIdType && taxId && !TAX_ID_PATTERNS[customer.taxIdType].test(taxId)) {
    errors.taxId = TAX_ID_HINTS[customer.taxIdType];
  }
  return errors;
}

/** Everything an invoice needs; used before issuing. */
export function invoiceCustomerErrors(customer: BillingCustomer): BillingCustomerErrors {
  const errors = formatErrors(customer);
  if (!customer.name.trim()) errors.name = 'Escribe el nombre o la razón social.';
  if (!customer.taxIdType) errors.taxIdType = 'Selecciona el tipo de identificación.';
  if (!normalizeTaxId(customer.taxId)) errors.taxId = 'Escribe el número de identificación.';
  if (!customer.email.trim()) errors.email = 'Escribe el correo del receptor.';
  return errors;
}

/** Billing data on a patient is optional, but what is entered must be consistent. */
export function patientBillingErrors(customer: BillingCustomer): BillingCustomerErrors {
  const errors = formatErrors(customer);
  const taxId = normalizeTaxId(customer.taxId);
  if (customer.taxIdType && !taxId) errors.taxId = 'Escribe el número de identificación.';
  if (!customer.taxIdType && taxId) errors.taxIdType = 'Selecciona el tipo de identificación.';
  return errors;
}
