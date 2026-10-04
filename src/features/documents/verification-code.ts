// Mirrors api/src/specialty-records/verification-code.ts. Update both together.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 16;

/** `ABCD-EFGH-JKMN-PQRS`, as the code is printed and typed. */
export function formatVerificationCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase().match(/.{1,4}/g)?.join('-') ?? code;
}

/**
 * The code as a person typed it, without separators and with the letters that are easily
 * confused read as the digits they look like. Null when it cannot be a code.
 */
export function normalizeVerificationCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return code.length === CODE_LENGTH && [...code].every((char) => ALPHABET.includes(char))
    ? code
    : null;
}
