'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { QUERY_KEYS } from '@/lib/constants';
import { User, UserProfile } from '@/types';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

export function useProfile() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: [...QUERY_KEYS.ME, 'profile'],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');
      const response = await usersApi.get(user.id);
      return response as UserProfile;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      if (!user?.id) throw new Error('No user');
      return usersApi.update(user.id, data);
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME });
      toast.success('Perfil actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar perfil');
    },
  });
}

export function useChangePassword() {
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      if (!user?.tenantId) throw new Error('No tenant');
      return apiClient.post<void>(
        `/tenants/${user.tenantId}/users/me/change-password`,
        data
      );
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cambiar contraseña');
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('No user');
      const tenantId = user.tenantId;
      return apiClient.upload<User>(
        `/tenants/${tenantId}/users/${user.id}/avatar`,
        file
      );
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME });
      toast.success('Foto de perfil actualizada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al subir foto de perfil');
    },
  });
}
