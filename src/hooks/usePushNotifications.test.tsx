import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePushNotifications } from './usePushNotifications';

const api = vi.hoisted(() => ({
  getWebPushKey: vi.fn(),
  subscribeWebPush: vi.fn(),
  unsubscribeWebPush: vi.fn(),
}));

vi.mock('@/lib/api/endpoints', () => ({ notificationsApi: api }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const subscriptionJson = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'browser-public-key', auth: 'browser-auth' },
};

describe('usePushNotifications', () => {
  let current: { endpoint: string; toJSON: () => object; unsubscribe: ReturnType<typeof vi.fn> } | null;
  const pushManager = {
    getSubscription: vi.fn(async () => current),
    subscribe: vi.fn(async () => {
      current = {
        endpoint: subscriptionJson.endpoint,
        toJSON: () => subscriptionJson,
        unsubscribe: vi.fn(async () => {
          current = null;
          return true;
        }),
      };
      return current;
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    current = null;
    const registration = { pushManager };
    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn(async () => 'granted'),
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: vi.fn(async () => registration), ready: Promise.resolve(registration) },
    });
    api.getWebPushKey.mockResolvedValue({ enabled: true, publicKey: 'BPubKey_-0' });
    api.subscribeWebPush.mockResolvedValue(undefined);
    api.unsubscribeWebPush.mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('subscribes with the key served by the API and registers the whole subscription', async () => {
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    await act(async () => {
      expect(await result.current.requestPermission()).toBe(true);
    });

    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    // Endpoint and keys: the endpoint alone cannot be used to send anything.
    expect(api.subscribeWebPush).toHaveBeenCalledWith(subscriptionJson);
    expect(result.current.isSubscribed).toBe(true);
  });

  it('does not leave a browser subscription the server does not know about', async () => {
    api.subscribeWebPush.mockRejectedValue(new Error('Este módulo no está habilitado'));
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    await act(async () => {
      expect(await result.current.requestPermission()).toBe(false);
    });

    expect(current).toBeNull();
    expect(result.current.isSubscribed).toBe(false);
  });

  it('does not subscribe while the API has Web Push turned off', async () => {
    api.getWebPushKey.mockResolvedValue({ enabled: false, publicKey: null });
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    await act(async () => {
      expect(await result.current.requestPermission()).toBe(false);
    });

    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(api.subscribeWebPush).not.toHaveBeenCalled();
  });

  it('removes this browser from the server when unsubscribing', async () => {
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSupported).toBe(true));
    await act(async () => {
      await result.current.requestPermission();
    });

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(api.unsubscribeWebPush).toHaveBeenCalledWith(subscriptionJson.endpoint);
    expect(current).toBeNull();
    expect(result.current.isSubscribed).toBe(false);
  });
});
