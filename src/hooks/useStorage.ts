'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';
import { QUERY_KEYS } from '@/lib/constants';
import { toast } from 'sonner';
import type { StorageFile, PaginatedResponse } from '@/types';

// Clinical files are opened and removed from the patient record, where each read and
// removal is audited; this page only reports what the clinic stores.
const STORAGE_API_AVAILABLE = false;

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
    queryFn: () =>
      apiClient.get<StorageFile[] | PaginatedResponse<StorageFile>>(
        `/tenants/${getTenantId()}/storage/files`,
        { params },
      ),
    staleTime: 1000 * 30,
  });
}

export interface StorageBreakdown {
  total: number;
  attachments: number;
  avatars: number;
  exports: number;
}

const BYTES_PER_GB = 1024 * 1024 * 1024;

/** The API counts bytes; the storage page, like the plan limits, works in GB. */
export function storageBreakdownInGB(bytes: StorageBreakdown): StorageBreakdown {
  return {
    total: bytes.total / BYTES_PER_GB,
    attachments: bytes.attachments / BYTES_PER_GB,
    avatars: bytes.avatars / BYTES_PER_GB,
    exports: bytes.exports / BYTES_PER_GB,
  };
}

export function useStorageBreakdown() {
  return useQuery({
    queryKey: QUERY_KEYS.STORAGE_BREAKDOWN,
    queryFn: () =>
      apiClient.get<StorageBreakdown>(`/tenants/${getTenantId()}/storage/breakdown`),
    select: storageBreakdownInGB,
    staleTime: 1000 * 30,
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
        throw new Error('Los archivos clínicos se eliminan desde la ficha del paciente');
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
