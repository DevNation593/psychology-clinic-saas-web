'use client';

import { useMutation, type MutateOptions } from '@tanstack/react-query';
import { requireTenantId, useTenantId } from './useTenantScope';

type ScopedVariables<T> = { tenantId: string | null; input: T };

export function useTenantMutation<TData, TInput>({
  mutationFn,
  onSuccess,
  onError,
}: {
  mutationFn: (input: TInput, tenantId: string) => Promise<TData>;
  onSuccess?: (data: TData, input: TInput, tenantId: string) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  const tenantId = useTenantId();
  const mutation = useMutation<TData, Error, ScopedVariables<TInput>>({
    mutationFn: ({ input, tenantId: capturedTenantId }) => mutationFn(input, requireTenantId(capturedTenantId)),
    onSuccess: (data, { input, tenantId: capturedTenantId }) =>
      onSuccess?.(data, input, requireTenantId(capturedTenantId)),
    onError,
  });

  const adaptOptions = (options?: MutateOptions<TData, Error, TInput>):
    MutateOptions<TData, Error, ScopedVariables<TInput>> | undefined => options && ({
    onSuccess: (data, variables, result, context) =>
      options.onSuccess?.(data, variables.input, result, context),
    onError: (error, variables, result, context) =>
      options.onError?.(error, variables.input, result, context),
    onSettled: (data, error, variables, result, context) =>
      options.onSettled?.(data, error, variables.input, result, context),
  });

  return {
    ...mutation,
    variables: mutation.variables?.input,
    mutate: (input: TInput, options?: MutateOptions<TData, Error, TInput>) =>
      mutation.mutate({ tenantId, input }, adaptOptions(options)),
    mutateAsync: (input: TInput, options?: MutateOptions<TData, Error, TInput>) =>
      mutation.mutateAsync({ tenantId, input }, adaptOptions(options)),
  };
}
