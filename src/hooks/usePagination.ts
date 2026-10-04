import { useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

interface PaginationOptions {
  pageSize?: number;
  /** Changes with the active search and filters, so a new filter starts on the first page. */
  resetKey?: string;
}

/** Pages a list the API returns whole; the endpoints that page themselves take `page` instead. */
export function usePagination<T>(items: T[], { pageSize = DEFAULT_PAGE_SIZE, resetKey = '' }: PaginationOptions = {}) {
  const [state, setState] = useState({ page: 1, resetKey });
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // A shorter list (a deleted row, a refetch) falls back to its last page instead of an empty one.
  const requested = state.resetKey === resetKey ? state.page : 1;
  const page = Math.min(Math.max(1, requested), totalPages);
  const start = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    totalPages,
    total: items.length,
    pageItems: items.slice(start, start + pageSize),
    setPage: (next: number) => setState({ page: next, resetKey }),
  };
}
