'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, usersApi, tenantsApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { QUERY_KEYS } from '@/lib/constants';
import { LoginCredentials } from '@/types';
import { apiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const setTenant = useAuthStore((state) => state.setTenant);
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: async (response) => {
      const { accessToken, refreshToken, user } = response;
      
      // Store tokens
      apiClient.setTokens(accessToken, refreshToken);
      
      // Set user immediately so getTenantId() works
      setUser(user);
      
      // Fetch tenant details
      try {
        const tenant = await tenantsApi.get(user.tenantId);
        setAuth(user, tenant);
      } catch {
        // If tenant fetch fails, user is still authenticated
        console.warn('Could not fetch tenant details');
      }
      
      // Redirect to dashboard
      router.push('/dashboard');
      toast.success('¡Bienvenido!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al iniciar sesión');
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await logout();
    },
    onSuccess: () => {
      queryClient.clear();
      toast.success('Sesión cerrada');
    },
  });
}

export function useCurrentUser() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: QUERY_KEYS.ME,
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const response = await usersApi.get(user.id);
      return response;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
