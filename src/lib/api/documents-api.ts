import type { PatientFile } from '@/types/clinical';
import { apiClient } from './client';

/** The modules whose records are a document a clinic writes templates for. */
export const TEMPLATE_MODULES: Record<string, string> = {
  'general.certificates': 'Certificado',
  'general.consents': 'Consentimiento informado',
};

/** What a template can ask to be filled in when it is applied to a patient. */
export const TEMPLATE_VARIABLES = [
  'paciente',
  'identificacion',
  'edad',
  'fecha',
  'profesional',
  'consultorio',
] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export interface DocumentTemplate {
  id: string;
  moduleKey: string;
  name: string;
  title: string | null;
  body: string;
  isActive: boolean;
}

export interface DocumentTemplateInput {
  moduleKey: string;
  name: string;
  title?: string | null;
  body: string;
}

export type DocumentTemplateUpdate = Partial<Omit<DocumentTemplateInput, 'moduleKey'>> & {
  isActive?: boolean;
};

/** What the public verification page shows: never the content of the document. */
export interface DocumentVerification {
  code: string;
  status: 'VALID' | 'WITHDRAWN';
  documentType: string;
  issuedAt: string;
  correctedAt: string | null;
  withdrawnAt: string | null;
  clinic: string;
  specialty: string | null;
  professional: { name: string; title: string | null; licenseNumber: string | null };
  patientInitials: string;
}

const templates = (tenantId: string) => `/tenants/${tenantId}/document-templates`;

export const documentTemplatesApi = {
  /** The account holder also receives the inactive ones. */
  list: (tenantId: string, moduleKey?: string) =>
    apiClient.get<DocumentTemplate[]>(
      templates(tenantId),
      moduleKey ? { params: { moduleKey } } : undefined,
    ),
  create: (tenantId: string, data: DocumentTemplateInput) =>
    apiClient.post<DocumentTemplate>(templates(tenantId), data),
  update: (tenantId: string, templateId: string, data: DocumentTemplateUpdate) =>
    apiClient.patch<DocumentTemplate>(`${templates(tenantId)}/${templateId}`, data),
};

export const recordDocumentsApi = {
  /** Renders the record as a PDF on the server and stores it among the files of the patient. */
  save: (tenantId: string, patientId: string, recordId: string) =>
    apiClient.post<PatientFile>(
      `/tenants/${tenantId}/patients/${patientId}/specialty-records/${recordId}/document`,
    ),
};

export const documentVerificationApi = {
  /** Public: needs no session. */
  verify: (code: string) =>
    apiClient.get<DocumentVerification>(`/public/documents/${encodeURIComponent(code)}`),
};

/**
 * Replaces `{{variable}}` in a template with the values of the patient at hand. A variable
 * without a value is left as a visible blank to fill in by hand, never as `{{...}}`.
 */
export function fillTemplate(text: string, values: Partial<Record<TemplateVariable, string>>): string {
  return text.replace(/\{\{\s*([^{}]*?)\s*\}\}/g, (_match, name: string) => {
    const value = values[name as TemplateVariable]?.trim();
    return value || '__________';
  });
}
