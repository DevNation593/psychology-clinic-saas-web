import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUERY_KEYS } from '@/lib/constants';
import { useConfirmPayment, useRejectPayment } from './usePlatform';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiClient: http }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const keys = [
    QUERY_KEYS.PLATFORM_PAYMENTS,
    QUERY_KEYS.PLATFORM_SUMMARY,
    QUERY_KEYS.PLATFORM_TENANTS,
    QUERY_KEYS.PLATFORM_TENANT('t1'),
    QUERY_KEYS.PLATFORM_TENANT('t2'),
  ];
  for (const key of keys) client.setQueryData(key, []);
  const invalidated = () => keys.filter((key) => client.getQueryState(key)?.isInvalidated);
  return { wrapper, keys, invalidated };
}

beforeEach(() => {
  vi.clearAllMocks();
  http.post.mockResolvedValue({});
  http.patch.mockResolvedValue({});
});

describe('platform payment mutations', () => {
  it('confirming a payment refreshes payments, summary, the clinic list and every clinic detail', async () => {
    const { wrapper, keys, invalidated } = setup();
    const { result } = renderHook(() => useConfirmPayment(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'p1', reference: 'REF-1' });
    });
    await waitFor(() => expect(invalidated()).toEqual(keys));
  });

  it('rejecting a payment refreshes payments, summary, the clinic list and every clinic detail', async () => {
    const { wrapper, keys, invalidated } = setup();
    const { result } = renderHook(() => useRejectPayment(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'p1', reason: 'No llegó' });
    });
    await waitFor(() => expect(invalidated()).toEqual(keys));
  });
});
