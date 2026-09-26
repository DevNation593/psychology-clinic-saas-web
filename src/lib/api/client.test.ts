import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';

const interceptor = vi.hoisted(() => ({
  onRejected: (error: unknown): Promise<never> => Promise.reject(error),
  responseData: {
    statusCode: 409, message: 'El correo electrónico ya está en uso',
    code: 'EMAIL_CONFLICT', field: 'adminEmail', details: { existing: true },
  } as unknown,
}));

vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: (_success: unknown, rejected: typeof interceptor.onRejected) => { interceptor.onRejected = rejected; } },
      },
      post: () => interceptor.onRejected({
        config: { url: '/onboarding/tenants' },
        response: { status: 409, data: interceptor.responseData },
      }),
    }),
  },
}));

describe('ApiClient error normalization', () => {
  beforeEach(() => {
    interceptor.responseData = {
      statusCode: 409, message: 'El correo electrónico ya está en uso',
      code: 'EMAIL_CONFLICT', field: 'adminEmail', details: { existing: true },
    };
  });

  it('preserves HTTP status without leaking the raw Axios response', async () => {
    try {
      await apiClient.post('/onboarding/tenants', {});
      throw new Error('Expected 409');
    } catch (error) {
      expect(error).toMatchObject({
        status: 409, message: 'El correo electrónico ya está en uso', code: 'EMAIL_CONFLICT',
        field: 'adminEmail', details: { existing: true },
      });
      expect(error).not.toHaveProperty('response');
      expect(error).not.toHaveProperty('config');
      expect(error).not.toHaveProperty('request');
    }
  });

  it('keeps HTTP status even when the server returns no body', async () => {
    interceptor.responseData = null;
    await expect(apiClient.post('/onboarding/tenants', {})).rejects.toMatchObject({
      status: 409, message: 'Ocurrió un error',
    });
  });

  it.each([
    ['string body', 'raw server text'],
    ['array body', [{ message: 'fake' }]],
    ['hostile object', { message: { secret: 'password' }, code: 409, field: ['adminEmail'], details: ['not a record'] }],
    ['null fields', { message: null, code: null, field: null, details: 'not a record' }],
  ])('normalizes %s without false field types or raw transport data', async (_name, body) => {
    interceptor.responseData = body;
    try {
      await apiClient.post('/onboarding/tenants', {});
      throw new Error('Expected 409');
    } catch (error) {
      expect(error).toMatchObject({ status: 409, message: 'Ocurrió un error' });
      expect(error).not.toHaveProperty('code');
      expect(error).not.toHaveProperty('field');
      expect(error).not.toHaveProperty('details');
      expect(error).not.toHaveProperty('response');
      expect(error).not.toHaveProperty('config');
      expect(error).not.toHaveProperty('request');
    }
  });
});
