import { describe, expect, it } from 'vitest';
import { formatVerificationCode, normalizeVerificationCode } from './verification-code';

describe('verification code', () => {
  it('is printed in groups of four', () => {
    expect(formatVerificationCode('abcdefghjkmnpqrs')).toBe('ABCD-EFGH-JKMN-PQRS');
    expect(formatVerificationCode('ABCD-EFGH jkmn-pqrs')).toBe('ABCD-EFGH-JKMN-PQRS');
  });

  it('is normalized the way the API stores it', () => {
    expect(normalizeVerificationCode(' abcd-efgh-jkmn-pqrs ')).toBe('ABCDEFGHJKMNPQRS');
    expect(normalizeVerificationCode('OIL0000000000000')).toBe('0110000000000000');
  });

  it('is null when the text cannot be a code', () => {
    expect(normalizeVerificationCode('')).toBeNull();
    expect(normalizeVerificationCode('ABCD-EFGH')).toBeNull();
    expect(normalizeVerificationCode('ABCD-EFGH-JKMN-PQRU')).toBeNull();
  });
});
