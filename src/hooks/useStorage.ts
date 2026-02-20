'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';
import { QUERY_KEYS } from '@/lib/constants';
import { toast } from 'sonner';
import type { StorageFile, PaginatedResponse } from '@/types';

const STORAGE_API_AVAILABLE = false;

// ==========================================
// HELPER: Build tenant-scoped storage URL
// Storage endpoints are not yet available in the API.
// These are placeholder implementations that will work
// once the backend adds storage endpoints.
// ==========================================

function getTenantId(): string {
  const tenant = useAuthStore.getState().tenant;
  if (!tenant?.id) throw new Error('No tenant ID available');
  return tenant.id;
}

// ==========================================
// GET QUERIES
// ==========================================

export function useStorageFiles(params?: {
  category?: string;
  sortBy?: 'size' | 'date';
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.STORAGE_FILES, params],
    queryFn: async () => {
      // TODO: Replace with actual endpoint when backend adds storage support
      const response = await apiClient.get<PaginatedResponse<StorageFile>>(
        `/tenants/${getTenantId()}/storage/files`,
        { params }
      );
      return response;
    },
    staleTime: 1000 * 30,
    enabled: false, // Disabled until backend supports this
  });
}

export function useStorageBreakdown() {
  return useQuery({
    queryKey: QUERY_KEYS.STORAGE_BREAKDOWN,
    queryFn: async () => {
      // TODO: Replace with actual endpoint when backend adds storage support
      const response = await apiClient.get<{ total: number; attachments: number; avatars: number; exports: number }>(
        `/tenants/${getTenantId()}/storage/breakdown`
      );
      return response;
    },
    staleTime: 1000 * 30,
    enabled: false, // Disabled until backend supports this
  });
}

// ==========================================
// MUTATIONS
// ==========================================

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_id: string) => {
      if (!STORAGE_API_AVAILABLE) {
        throw new Error('La API de almacenamiento aún no está disponible');
      }
      return apiClient.delete<void>(`/tenants/${getTenantId()}/storage/files/${_id}`);
    },
    onSuccess: () => {
      // Invalidate both file list and breakdown
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORAGE_FILES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORAGE_BREAKDOWN });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION_USAGE });
      
      toast.success('Archivo eliminado');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar archivo';
      toast.error(message);
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      file, 
      metadata 
    }: { 
      file: File; 
      metadata: { 
        category: string; 
        relatedTo?: any 
      } 
    }) => {
      if (!STORAGE_API_AVAILABLE) {
        throw new Error('La API de almacenamiento aún no está disponible');
      }
      return apiClient.upload<StorageFile>(
        `/tenants/${getTenantId()}/storage/upload`,
        file,
        undefined,
        metadata
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORAGE_FILES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORAGE_BREAKDOWN });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION_USAGE });
      
      toast.success('Archivo subido exitosamente');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al subir archivo';
      
      if (error.response?.status === 413) {
        toast.error('Límite de almacenamiento alcanzado');
      } else {
        toast.error(message);
      }
    },
  });
}

// ==========================================
// COMPUTED/HELPER HOOKS
// ==========================================

export function useStorageUsage() {
  const { data: breakdown } = useStorageBreakdown();
  
  if (!breakdown) {
    return {
      total: 0,
      percentUsed: 0,
      remaining: 0,
    };
  }
  
  return {
    total: breakdown.total,
    percentUsed: 0, // Will be calculated with limit from usage metrics
    remaining: 0,
  };
}

export function useCanUploadFile(fileSizeBytes: number): boolean {
  const { data: breakdown } = useStorageBreakdown();
  
  // This would need to be combined with usage metrics to get limit
  // For now, just a placeholder
  return true;
}
