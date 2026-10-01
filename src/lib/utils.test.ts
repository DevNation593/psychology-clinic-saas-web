import { describe, expect, it } from 'vitest';

import { formatFileSize, safeJsonParse, truncate } from '@/lib/utils';

describe('formatFileSize', () => {
  it('keeps zero in bytes and converts an exact kibibyte to KB', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
  });
});

describe('safeJsonParse', () => {
  it('returns parsed JSON but falls back when parsing fails', () => {
    expect(safeJsonParse('{"active":true}', { active: false })).toEqual({ active: true });
    expect(safeJsonParse('not-json', { active: false })).toEqual({ active: false });
  });
});

describe('truncate', () => {
  it('preserves short text and appends an ellipsis after the configured limit', () => {
    expect([truncate('Hola', 4), truncate('Psicologia', 5)]).toEqual(['Hola', 'Psico...']);
  });
});
