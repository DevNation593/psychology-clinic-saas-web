'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  documentTemplatesApi,
  documentVerificationApi,
  recordDocumentsApi,
  type DocumentTemplateInput,
  type DocumentTemplateUpdate,
} from '@/lib/api/documents-api';
import { QUERY_KEYS } from '@/lib/constants';
import { requireTenantId, useTenantId } from '@/hooks/useTenantScope';
import type { ApiError } from '@/types';

const templatesKey = (tenantId: string, moduleKey?: string) =>
  ['tenant', 'document-templates', tenantId, moduleKey ?? 'all'] as const;

/** Templates of the clinic; with `moduleKey`, the ones for that kind of document. */
export function useDocumentTemplates(moduleKey?: string, enabled = true) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: templatesKey(tenantId ?? '', moduleKey),
    queryFn: () => documentTemplatesApi.list(requireTenantId(tenantId), moduleKey),
    enabled: !!tenantId && enabled,
  });
}

const TEMPLATE_ERRORS: Record<string, string> = {
  TEMPLATE_NAME_TAKEN: 'Ya existe una plantilla con ese nombre para este tipo de documento.',
  TEMPLATE_LIMIT_REACHED: 'El consultorio alcanzó el máximo de plantillas.',
};

/** Creates a template, or updates it when `templateId` is given. */
export function useSaveDocumentTemplate() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId?: string;
      data: DocumentTemplateInput | DocumentTemplateUpdate;
    }) =>
      templateId
        ? documentTemplatesApi.update(requireTenantId(tenantId), templateId, data)
        : documentTemplatesApi.create(requireTenantId(tenantId), data as DocumentTemplateInput),
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: ['tenant', 'document-templates', tenantId] });
      }
    },
    onError: (error: ApiError) => {
      toast.error(
        TEMPLATE_ERRORS[error.code ?? ''] || error.message || 'No fue posible guardar la plantilla',
      );
    },
  });
}

const SAVE_ERRORS: Record<string, string> = {
  STORAGE_LIMIT_REACHED: 'El consultorio alcanzó el almacenamiento de su plan.',
  FEATURE_NOT_AVAILABLE: 'El plan del consultorio no incluye archivos adjuntos.',
  MODULE_NOT_AVAILABLE: 'Los archivos adjuntos no están habilitados para el consultorio.',
};

/** Saves a record as a PDF among the files of the patient. */
export function useSaveRecordDocument(patientId: string) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: (recordId: string) =>
      recordDocumentsApi.save(requireTenantId(tenantId), patientId, recordId),
    onSuccess: (file) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PATIENT_FILES(patientId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORAGE_FILES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORAGE_BREAKDOWN });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION_USAGE });
      toast.success(`«${file.fileName}» se guardó en los archivos del paciente`);
    },
    onError: (error: ApiError) => {
      toast.error(SAVE_ERRORS[error.code ?? ''] || error.message || 'No fue posible guardar el PDF');
    },
  });
}

/** Public check of a document by its code. */
export function useDocumentVerification(code: string) {
  return useQuery({
    queryKey: ['public', 'document-verification', code],
    queryFn: () => documentVerificationApi.verify(code),
    enabled: !!code,
    retry: false,
  });
}
