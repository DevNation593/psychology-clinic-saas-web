'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, extractArray } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { useUIStore } from '@/store/uiStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Bell, BellOff, Check } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { toast } from 'sonner';

export function NotificationsPanel() {
  const queryClient = useQueryClient();
  const { notificationsPanelOpen, setNotificationsPanelOpen } = useUIStore();
  const { isSupported, permission, isSubscribed, requestPermission, unsubscribe } =
    usePushNotifications();

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    queryFn: async () => {
      const response = await notificationsApi.list({ limit: 50, unreadOnly: false });
      return extractArray(response);
    },
    enabled: notificationsPanelOpen,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
      toast.success('Todas las notificaciones marcadas como leídas');
    },
  });

  if (!notificationsPanelOpen) return null;

  const unreadCount =
    notificationsData?.filter((n) => !n.isRead).length || 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={() => setNotificationsPanelOpen(false)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-card border-l shadow-lg z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Notificaciones</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotificationsPanelOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Push Notifications Setting */}
        {isSupported && (
          <div className="p-4 border-b bg-muted/50">
            {permission === 'granted' ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Notificaciones activadas</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={unsubscribe}
                >
                  Desactivar
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Notificaciones desactivadas</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestPermission}
                >
                  Activar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="p-4 border-b">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => markAllAsReadMutation.mutate()}
              loading={markAllAsReadMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar todas como leídas
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Cargando notificaciones...
            </div>
          ) : notificationsData && notificationsData.length > 0 ? (
            <div className="divide-y">
              {notificationsData.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsReadMutation.mutate(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {!notification.isRead && (
                      <div className="h-2 w-2 rounded-full bg-blue-600 mt-2" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatRelativeDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No tienes notificaciones</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
