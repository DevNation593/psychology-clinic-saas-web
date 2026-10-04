import { describe, expect, it } from 'vitest';
import { generatePassword } from './generate-password';

describe('generatePassword', () => {
  it('returns 16 characters with upper case, lower case and a digit', () => {
    for (let i = 0; i < 50; i++) {
      const value = generatePassword();
      expect(value).toHaveLength(16);
      expect(value).toMatch(/[A-Z]/);
      expect(value).toMatch(/[a-z]/);
      expect(value).toMatch(/[0-9]/);
    }
  });

  it('returns a different value on each call', () => {
    const values = new Set(Array.from({ length: 20 }, () => generatePassword()));
    expect(values.size).toBe(20);
  });
});
