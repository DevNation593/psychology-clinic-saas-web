import { describe, expect, it } from 'vitest';
import { isFeatureLockedError } from './feature-locked-notice';

describe('isFeatureLockedError', () => {
  it.each(['FEATURE_NOT_AVAILABLE', 'MODULE_NOT_AVAILABLE'])('recognises %s', (code) => {
    expect(isFeatureLockedError({ message: 'x', status: 403, code })).toBe(true);
  });

  it.each([
    ['another 403', { message: 'x', status: 403, code: 'SEAT_LIMIT_REACHED' }],
    ['a 403 without code', { message: 'Forbidden resource', status: 403 }],
    ['a different status', { message: 'x', status: 500, code: 'FEATURE_NOT_AVAILABLE' }],
    ['no error', null],
  ])('ignores %s', (_label, error) => {
    expect(isFeatureLockedError(error)).toBe(false);
  });
});
