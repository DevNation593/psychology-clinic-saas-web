import type { QueryClient } from '@tanstack/react-query';

// List variants use an object (or undefined) at index 3; details use an ID.
export function invalidateScopedLists(client: QueryClient, resource: 'patients' | 'appointments', tenantId: string) {
  return client.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return key[0] === resource && key[1] === 'tenant' && key[2] === tenantId
        && key.length === 4 && typeof key[3] !== 'string';
    },
  });
}
