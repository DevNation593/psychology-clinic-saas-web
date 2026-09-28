'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';

export const SPECIALTY_FIELD_LABELS: Record<string, string> = {
  testName: 'Nombre de prueba',
  score: 'Puntaje',
  interpretation: 'Interpretación',
  weightKg: 'Peso (kg)',
  heightCm: 'Altura (cm)',
  bmi: 'IMC',
  dietaryGoals: 'Objetivos alimenticios',
  dailyCalories: 'Calorías diarias',
  meals: 'Comidas sugeridas',
  painLevel: 'Nivel de dolor (0-10)',
  mobility: 'Movilidad',
  progress: 'Evolución',
  exercises: 'Ejercicios',
  frequency: 'Frecuencia',
  repetitions: 'Repeticiones',
  procedure: 'Procedimiento',
  tooth: 'Pieza dental',
  treatmentStatus: 'Estado del tratamiento',
  findings: 'Hallazgos',
  surfaces: 'Superficies',
};

export const SPECIALTY_MODULE_FIELDS: Record<string, string[]> = {
  'psychology.assessments': ['testName', 'score', 'interpretation'],
  'nutrition.assessments': ['weightKg', 'heightCm', 'bmi'],
  'nutrition.diet-plans': ['dailyCalories', 'meals', 'dietaryGoals'],
  'physiotherapy.evolution': ['painLevel', 'mobility', 'progress'],
  'physiotherapy.exercise-plans': ['exercises', 'frequency', 'repetitions'],
  'dentistry.treatments': ['procedure', 'tooth', 'treatmentStatus'],
  'dentistry.odontogram': ['findings', 'surfaces'],
};

export interface SpecialtyRecordModuleOption {
  code: string;
  name: string;
  moduleKey: string;
}

export interface SpecialtyRecordEntryPayload {
  specialtyCode: string;
  moduleKey: string;
  data: Record<string, unknown>;
  notes?: string;
}

export interface SpecialtyRecordEntryFormProps {
  tenantId: string | null;
  patientId: string;
  configurationStatus: 'loading' | 'error' | 'ready';
  configurationError?: string;
  moduleOptions: SpecialtyRecordModuleOption[];
  isSaving: boolean;
  onSubmit: (payload: SpecialtyRecordEntryPayload) => void | Promise<unknown>;
}

export function SpecialtyRecordEntryForm(props: SpecialtyRecordEntryFormProps) {
  const stateKey = `${props.tenantId ?? 'no-tenant'}:${props.patientId}`;
  return <SpecialtyRecordEntryFormState key={stateKey} {...props} />;
}

function SpecialtyRecordEntryFormState({
  tenantId,
  configurationStatus,
  configurationError,
  moduleOptions,
  isSaving,
  onSubmit,
}: SpecialtyRecordEntryFormProps) {
  const [selectedModule, setSelectedModule] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const selectedOption = moduleOptions.find((option) => option.moduleKey === selectedModule);
  const fields = selectedModule ? SPECIALTY_MODULE_FIELDS[selectedModule] || [] : [];
  const configurationReady = configurationStatus === 'ready' && Boolean(tenantId);

  const handleModuleChange = (moduleKey: string) => {
    setSelectedModule(moduleKey);
    setFormData({});
  };

  const handleSubmit = async () => {
    if (!configurationReady || isSaving || !selectedOption) return;
    try {
      await onSubmit({
        specialtyCode: selectedOption.code,
        moduleKey: selectedOption.moduleKey,
        data: Object.fromEntries(fields.map((field) => [field, formData[field] || ''])),
        notes: notes.trim() || undefined,
      });
      setFormData({});
      setNotes('');
    } catch {
      // Keep the attempted form values available for correction or retry.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar evolución especializada</CardTitle>
        <CardDescription>
          Guarda evaluaciones, planes y evoluciones según la especialidad habilitada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {configurationStatus === 'loading' && (
          <p role="status" className="text-sm text-muted-foreground">
            Cargando la configuración de especialidades del consultorio…
          </p>
        )}
        {configurationStatus === 'error' && (
          <Alert variant="destructive" title="No se pudo cargar la configuración">
            {configurationError || 'Intenta nuevamente cuando la configuración esté disponible.'}
          </Alert>
        )}
        <div>
          <Label htmlFor="specialty-module">Módulo</Label>
          <select
            id="specialty-module"
            value={selectedModule}
            onChange={(event) => handleModuleChange(event.target.value)}
            disabled={!configurationReady}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
          >
            <option value="">Selecciona un módulo</option>
            {moduleOptions.map((option) => (
              <option key={option.moduleKey} value={option.moduleKey}>
                {option.name} · {option.moduleKey.split('.')[1]}
              </option>
            ))}
          </select>
        </div>
        {selectedModule && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {fields.map((field) => (
                <div key={field}>
                  <Label htmlFor={`specialty-${field}`}>{SPECIALTY_FIELD_LABELS[field] || field}</Label>
                  <Input
                    id={`specialty-${field}`}
                    required
                    disabled={!configurationReady}
                    value={formData[field] || ''}
                    onChange={(event) => setFormData({ ...formData, [field]: event.target.value })}
                  />
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="specialty-notes">Notas adicionales</Label>
              <Textarea
                id="specialty-notes"
                disabled={!configurationReady}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Indicaciones, observaciones o seguimiento..."
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!configurationReady || isSaving}
              loading={isSaving}
            >
              Guardar registro
            </Button>
          </>
        )}
        {moduleOptions.length === 0 && configurationStatus === 'ready' && (
          <p className="text-sm text-muted-foreground">
            No hay módulos especializados habilitados para este consultorio.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
