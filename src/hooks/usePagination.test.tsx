import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePagination } from './usePagination';

const items = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

describe('usePagination', () => {
  it('returns the first page and the page count', () => {
    const { result } = renderHook(() => usePagination(items(45), { pageSize: 20 }));
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.total).toBe(45);
    expect(result.current.pageItems).toEqual(items(20));
  });

  it('moves to another page and returns its slice', () => {
    const { result } = renderHook(() => usePagination(items(45), { pageSize: 20 }));
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    expect(result.current.pageItems).toEqual([41, 42, 43, 44, 45]);
  });

  it('reports a single page for an empty list', () => {
    const { result } = renderHook(() => usePagination([], { pageSize: 20 }));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.pageItems).toEqual([]);
  });

  it('falls back to the last page when the list shrinks under the current page', () => {
    const { result, rerender } = renderHook(({ list }) => usePagination(list, { pageSize: 20 }), {
      initialProps: { list: items(45) },
    });
    act(() => result.current.setPage(3));
    rerender({ list: items(25) });
    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25]);
  });

  it('returns to the first page when the reset key changes', () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => usePagination(items(45), { pageSize: 20, resetKey }),
      { initialProps: { resetKey: 'all' } },
    );
    act(() => result.current.setPage(2));
    rerender({ resetKey: 'active' });
    expect(result.current.page).toBe(1);
    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);
  });

  it('ignores pages outside the range', () => {
    const { result } = renderHook(() => usePagination(items(45), { pageSize: 20 }));
    act(() => result.current.setPage(9));
    expect(result.current.page).toBe(3);
    act(() => result.current.setPage(0));
    expect(result.current.page).toBe(1);
  });
});
