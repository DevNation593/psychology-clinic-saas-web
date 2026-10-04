export const IDENTIFICATION_TYPES = ['CEDULA', 'RUC', 'PASSPORT', 'OTHER'] as const;
export type IdentificationType = (typeof IDENTIFICATION_TYPES)[number];

export const IDENTIFICATION_TYPE_LABELS: Record<IdentificationType, string> = {
  CEDULA: 'Cédula',
  RUC: 'RUC',
  PASSPORT: 'Pasaporte',
  OTHER: 'Otro documento',
};

// The same formats the API enforces; check digits are not verified.
const PATTERNS: Record<IdentificationType, RegExp> = {
  CEDULA: /^\d{10}$/,
  RUC: /^\d{13}$/,
  PASSPORT: /^[A-Z0-9]{5,20}$/,
  OTHER: /^[A-Z0-9]{3,30}$/,
};

const FORMAT_HINTS: Record<IdentificationType, string> = {
  CEDULA: 'La cédula tiene 10 dígitos.',
  RUC: 'El RUC tiene 13 dígitos.',
  PASSPORT: 'El pasaporte tiene entre 5 y 20 letras o números.',
  OTHER: 'El documento tiene entre 3 y 30 letras o números.',
};

export function normalizeIdentification(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

export interface IdentificationErrors {
  identificationType?: string;
  identificationNumber?: string;
}

/** Both fields go together, and the number follows the format of its type. */
export function identificationErrors(type: string, number: string): IdentificationErrors {
  const normalized = normalizeIdentification(number);
  if (!type && !normalized) return {};
  if (!type) return { identificationType: 'Selecciona el tipo de documento.' };
  if (!normalized) return { identificationNumber: 'Ingresa el número de documento.' };
  if (!(IDENTIFICATION_TYPES as readonly string[]).includes(type)) {
    return { identificationType: 'Tipo de documento no válido.' };
  }
  const known = type as IdentificationType;
  return PATTERNS[known].test(normalized) ? {} : { identificationNumber: FORMAT_HINTS[known] };
}

/** True when the birth date (YYYY-MM-DD) makes the patient younger than 18 today. */
export function isMinor(dateOfBirth: string | null | undefined, today: Date = new Date()): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth ?? '');
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const hadBirthday =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  return today.getFullYear() - year - (hadBirthday ? 0 : 1) < 18;
}

export function describeIdentification(
  type: string | null | undefined,
  number: string | null | undefined,
): string | null {
  if (!number) return null;
  const label = IDENTIFICATION_TYPE_LABELS[type as IdentificationType];
  return label ? `${label} ${number}` : number;
}
