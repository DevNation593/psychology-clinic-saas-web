'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDocumentTemplates } from '@/hooks/useDocuments';
import { usePatient } from '@/hooks/usePatients';
import { fillTemplate, TEMPLATE_MODULES, type TemplateVariable } from '@/lib/api/documents-api';
import { useAuthStore } from '@/store/authStore';

/** Whether the clinic can keep templates for the records of this module. */
export const hasTemplates = (moduleKey: string) => moduleKey in TEMPLATE_MODULES;

function ageOf(dateOfBirth: string | null | undefined, today: Date): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth ?? '');
  if (!match) return '';
  const [year, month, day] = match.slice(1).map(Number);
  const hadBirthday =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  return `${today.getFullYear() - year - (hadBirthday ? 0 : 1)} años`;
}

export interface TemplatePickerProps {
  moduleKey: string;
  patientId: string;
  /** Receives the text of the template with the data of the patient filled in. */
  onApply: (fill: { body: string; title?: string }) => void;
}

/** Prefills a certificate or consent with a template of the clinic. */
export function TemplatePicker({ moduleKey, patientId, onApply }: TemplatePickerProps) {
  const { data: templates = [] } = useDocumentTemplates(moduleKey);
  const { data: patient } = usePatient(patientId);
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const [templateId, setTemplateId] = useState('');

  const active = templates.filter((template) => template.isActive);
  if (active.length === 0) return null;

  const apply = () => {
    const template = active.find((candidate) => candidate.id === templateId);
    if (!template) return;
    const today = new Date();
    const values: Partial<Record<TemplateVariable, string>> = {
      paciente: patient ? `${patient.firstName} ${patient.lastName}` : '',
      identificacion: patient?.identificationNumber ?? '',
      edad: ageOf(patient?.dateOfBirth, today),
      fecha: format(today, "d 'de' MMMM 'de' yyyy", { locale: es }),
      profesional: user ? `${user.firstName} ${user.lastName}` : '',
      consultorio: tenant?.name ?? '',
    };
    onApply({
      body: fillTemplate(template.body, values),
      ...(template.title ? { title: fillTemplate(template.title, values) } : {}),
    });
  };

  return (
    <div className="rounded-md border border-dashed border-input p-3">
      <Label htmlFor="record-template">Plantilla del consultorio</Label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <select
          id="record-template"
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Selecciona una plantilla</option>
          {active.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" disabled={!templateId} onClick={apply}>
          Usar plantilla
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Reemplaza el texto del documento por el de la plantilla, con los datos del paciente. Revísalo
        antes de guardar.
      </p>
    </div>
  );
}
