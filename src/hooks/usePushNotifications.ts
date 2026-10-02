'use client';

import { useEffect, useState } from 'react';
import { notificationsApi } from '@/lib/api/endpoints';
import { toast } from 'sonner';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Web Push for this browser. The API holds the VAPID key pair: the browser subscribes with
 * the public key it serves and hands the whole subscription (endpoint and keys) back to it.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Tu navegador no soporta notificaciones push');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        toast.error('Permiso denegado para notificaciones');
        return false;
      }

      await subscribeToPush();
      toast.success('Notificaciones activadas');
      return true;
    } catch (error: any) {
      console.error('Error enabling push notifications:', error);
      toast.error(error?.message || 'No se pudieron activar las notificaciones');
      return false;
    }
  };

  const subscribeToPush = async () => {
    const { enabled, publicKey } = await notificationsApi.getWebPushKey();
    if (!enabled || !publicKey) {
      throw new Error('Las notificaciones del navegador no están disponibles en este momento');
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    try {
      await notificationsApi.subscribeWebPush(subscription.toJSON());
    } catch (error) {
      // Without the server knowing it, the browser subscription would never receive anything.
      await subscription.unsubscribe().catch(() => undefined);
      throw error;
    }
    setIsSubscribed(true);
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await notificationsApi.unsubscribeWebPush(subscription.endpoint);
        await subscription.unsubscribe();
        setIsSubscribed(false);
        toast.success('Notificaciones desactivadas');
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Error al desactivar notificaciones');
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    unsubscribe,
  };
}
