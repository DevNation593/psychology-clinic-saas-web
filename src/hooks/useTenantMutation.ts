'use client';

import { useMutation, type MutateOptions } from '@tanstack/react-query';
import { requireTenantId, useTenantId } from './useTenantScope';

type ScopedVariables<TInput, TResource> = {
  tenantId: string | null;
  input: TInput;
  resource: TResource;
};

export function useTenantMutation<TData, TInput, TResource = undefined>({
  captureResource,
  mutationFn,
  onSuccess,
  onError,
  onSettled,
}: {
  captureResource?: () => TResource;
  mutationFn: (input: TInput, tenantId: string, resource: TResource) => Promise<TData>;
  onSuccess?: (data: TData, input: TInput, tenantId: string, resource: TResource) => void | Promise<void>;
  onError?: (error: Error, input: TInput, tenantId: string | null, resource: TResource) => unknown;
  onSettled?: (data: TData | undefined, error: Error | null, input: TInput, tenantId: string | null, resource: TResource) => unknown;
}) {
  const tenantId = useTenantId();
  const mutation = useMutation<TData, Error, ScopedVariables<TInput, TResource>>({
    mutationFn: ({ input, tenantId: capturedTenantId, resource }) =>
      mutationFn(input, requireTenantId(capturedTenantId), resource),
    onSuccess: (data, { input, tenantId: capturedTenantId, resource }) =>
      onSuccess?.(data, input, requireTenantId(capturedTenantId), resource),
    onError: (error, { input, tenantId: capturedTenantId, resource }) =>
      onError?.(error, input, capturedTenantId, resource),
    onSettled: (data, error, { input, tenantId: capturedTenantId, resource }) =>
      onSettled?.(data, error, input, capturedTenantId, resource),
  });

  const adaptOptions = (options?: MutateOptions<TData, Error, TInput>):
    MutateOptions<TData, Error, ScopedVariables<TInput, TResource>> | undefined => options && ({
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
      mutation.mutate({ tenantId, input, resource: captureResource?.() as TResource }, adaptOptions(options)),
    mutateAsync: (input: TInput, options?: MutateOptions<TData, Error, TInput>) =>
      mutation.mutateAsync({ tenantId, input, resource: captureResource?.() as TResource }, adaptOptions(options)),
  };
}
