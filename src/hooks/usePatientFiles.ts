'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patientFilesApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import type { ApiError } from '@/types';
import type { PatientFile } from '@/types/clinical';

export function usePatientFiles(patientId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.PATIENT_FILES(patientId),
    queryFn: () => patientFilesApi.list(patientId),
    enabled: Boolean(patientId),
  });
}

function useFilesInvalidation(patientId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_FILES(patientId) });
    // The storage page and the usage of the plan count these files.
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORAGE_FILES });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORAGE_BREAKDOWN });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION_USAGE });
  };
}

const UPLOAD_ERRORS: Record<string, string> = {
  STORAGE_LIMIT_REACHED: 'El consultorio alcanzó el almacenamiento de su plan.',
  PATIENT_FILE_TOO_LARGE: 'El archivo supera los 10 MB.',
  FEATURE_NOT_AVAILABLE: 'El plan del consultorio no incluye archivos adjuntos.',
  MODULE_NOT_AVAILABLE: 'Los archivos adjuntos no están habilitados para el consultorio.',
};

export function useUploadPatientFile(patientId: string) {
  const invalidate = useFilesInvalidation(patientId);

  return useMutation({
    mutationFn: ({
      file,
      ...metadata
    }: {
      file: File;
      category: string;
      description?: string;
      encounterId?: string;
    }) => patientFilesApi.upload(patientId, file, metadata),
    onSuccess: () => {
      invalidate();
      toast.success('Archivo guardado');
    },
    onError: (error: ApiError) => {
      toast.error(
        UPLOAD_ERRORS[error.code ?? ''] || error.message || 'No fue posible subir el archivo',
      );
    },
  });
}

/** Fetches the decrypted bytes through the API and hands them to the browser as a download. */
export function useDownloadPatientFile(patientId: string) {
  return useMutation({
    mutationFn: async (file: Pick<PatientFile, 'id' | 'fileName'>) => {
      const blob = await patientFilesApi.download(patientId, file.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'No fue posible descargar el archivo');
    },
  });
}

export function useRemovePatientFile(patientId: string) {
  const invalidate = useFilesInvalidation(patientId);

  return useMutation({
    mutationFn: ({ fileId, reason }: { fileId: string; reason: string }) =>
      patientFilesApi.remove(patientId, fileId, reason),
    onSuccess: () => {
      invalidate();
      toast.success('Archivo eliminado');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'No fue posible eliminar el archivo');
    },
  });
}
