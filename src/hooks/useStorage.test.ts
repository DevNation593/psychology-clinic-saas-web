import { describe, expect, it } from 'vitest';
import { storageBreakdownInGB } from './useStorage';

describe('storageBreakdownInGB', () => {
  it('turns the bytes the API counts into the GB the storage page shows', () => {
    const GB = 1024 * 1024 * 1024;

    expect(
      storageBreakdownInGB({ total: 2.5 * GB, attachments: 2 * GB, avatars: 0.5 * GB, exports: 0 }),
    ).toEqual({ total: 2.5, attachments: 2, avatars: 0.5, exports: 0 });
  });

  it('keeps a small file as a small fraction instead of thousands of GB', () => {
    // 11.8 KB once showed as «12113.00 GB».
    expect(storageBreakdownInGB({ total: 12113, attachments: 12113, avatars: 0, exports: 0 }).attachments)
      .toBeLessThan(0.001);
  });
});
