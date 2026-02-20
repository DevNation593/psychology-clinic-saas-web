'use client';

import { useEffect, useState } from 'react';
import { VAPID_PUBLIC_KEY } from '@/lib/constants';
import { notificationsApi } from '@/lib/api/endpoints';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications and service workers
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register service worker
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered:', registration);

      // Check if already subscribed
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
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await subscribeToPush();
        toast.success('Notificaciones activadas');
        return true;
      } else {
        toast.error('Permiso denegado para notificaciones');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Error al solicitar permisos');
      return false;
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Subscribe to push
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }

      // API currently stores FCM tokens; we persist endpoint to keep device opt-in state.
      await notificationsApi.registerFcmToken(subscription.endpoint);

      setIsSubscribed(true);
    } catch (error) {
      console.error('Error subscribing to push:', error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await notificationsApi.removeFcmToken();
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
