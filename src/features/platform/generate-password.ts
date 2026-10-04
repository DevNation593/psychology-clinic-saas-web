const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const ALL = UPPER + LOWER + DIGITS;
const LENGTH = 16;

/** Uniform integer in [0, bound), rejecting values that would bias the modulo. */
function randomIndex(bound: number): number {
  const limit = 256 - (256 % bound);
  const buffer = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % bound;
  }
}

const pick = (chars: string) => chars[randomIndex(chars.length)];

/** 16 characters with at least one upper case letter, one lower case letter and one digit. */
export function generatePassword(): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  while (chars.length < LENGTH) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
