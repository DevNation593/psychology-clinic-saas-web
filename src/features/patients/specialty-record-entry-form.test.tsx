import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClinicalModuleDefinition } from '@/types/clinical';
import { SpecialtyRecordEntryForm, type SpecialtyRecordEntryFormProps } from './specialty-record-entry-form';

const assessment: ClinicalModuleDefinition = {
  moduleKey: 'psychology.assessments',
  scope: 'SPECIALTY',
  specialtyCode: 'PSYCHOLOGY',
  name: 'Evaluación psicológica',
  description: 'Instrumento aplicado, puntaje e interpretación.',
  category: null,
  schemaVersion: 2,
  isLatest: true,
  renderer: 'FORM',
  legacy: false,
  enabled: true,
  canRecord: true,
  schema: {
    sections: [
      {
        key: 'assessment',
        title: 'Evaluación',
        fields: [
          { key: 'instrumentName', label: 'Nombre del instrumento', type: 'text', required: true },
          { key: 'score', label: 'Puntaje', type: 'decimal', required: true },
          { key: 'interpretation', label: 'Interpretación', type: 'textarea' },
        ],
      },
    ],
  },
};

const vitals: ClinicalModuleDefinition = {
  ...assessment,
  moduleKey: 'general.vital-signs',
  scope: 'GENERAL',
  specialtyCode: null,
  name: 'Signos vitales',
  description: null,
  schemaVersion: 1,
  schema: {
    sections: [
      {
        key: 'vitals',
        title: 'Signos vitales',
        fields: [
          { key: 'weightKg', label: 'Peso', type: 'decimal', unit: 'kg' },
          { key: 'bmi', label: 'IMC', type: 'calculated', formula: 'weightKg' },
        ],
      },
    ],
  },
};

const modules = [assessment, vitals];

function props(overrides: Partial<Omit<SpecialtyRecordEntryFormProps, 'patientId'>> = {}): SpecialtyRecordEntryFormProps {
  return {
    tenantId: 'tenant-a',
    patientId: 'patient-1',
    configurationStatus: 'ready',
    modules,
    isSaving: false,
    onSubmit: vi.fn(),
    ...overrides,
  };
}

const select = (moduleKey: string) =>
  fireEvent.change(screen.getByLabelText('Tipo de registro'), { target: { value: moduleKey } });
const save = () => act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' })));

describe('SpecialtyRecordEntryForm', () => {
  it('groups the modules the professional can record by where they come from', () => {
    render(<SpecialtyRecordEntryForm {...props()} />);

    expect(screen.getByRole('group', { name: 'De mi especialidad' })).toContainElement(
      screen.getByRole('option', { name: 'Evaluación psicológica' }),
    );
    expect(screen.getByRole('group', { name: 'Generales' })).toContainElement(
      screen.getByRole('option', { name: 'Signos vitales' }),
    );
  });

  it('renders the fields of the chosen definition and sends typed data with its version', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SpecialtyRecordEntryForm {...props({ onSubmit })} />);

    select('psychology.assessments');
    fireEvent.change(screen.getByLabelText(/Nombre del instrumento/), { target: { value: ' CBCL ' } });
    fireEvent.change(screen.getByLabelText(/Puntaje/), { target: { value: '62.5' } });
    fireEvent.change(screen.getByLabelText('Notas adicionales'), { target: { value: 'Línea base' } });
    await save();

    expect(onSubmit).toHaveBeenCalledWith({
      moduleKey: 'psychology.assessments',
      schemaVersion: 2,
      data: { instrumentName: 'CBCL', score: 62.5 },
      notes: 'Línea base',
    });
    // A saved record leaves an empty form for the next one.
    expect(screen.getByLabelText(/Nombre del instrumento/)).toHaveValue('');
    expect(screen.getByLabelText('Notas adicionales')).toHaveValue('');
  });

  it('never sends a calculated field: the API computes it', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SpecialtyRecordEntryForm {...props({ onSubmit })} />);

    select('general.vital-signs');
    expect(screen.getByText('Se calcula al guardar')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Peso/), { target: { value: '70' } });
    await save();

    expect(onSubmit).toHaveBeenCalledWith({
      moduleKey: 'general.vital-signs',
      schemaVersion: 1,
      data: { weightKg: 70 },
      notes: undefined,
    });
  });

  it('shows the issues the API reports on their fields and keeps what was typed', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: 'El registro no cumple la definición del formulario.',
      code: 'CLINICAL_RECORD_INVALID',
      issues: [{ field: 'score', message: 'Este campo es obligatorio' }],
    });
    render(<SpecialtyRecordEntryForm {...props({ onSubmit })} />);

    select('psychology.assessments');
    fireEvent.change(screen.getByLabelText(/Nombre del instrumento/), { target: { value: 'CBCL' } });
    await save();

    expect(screen.getByText('Este campo es obligatorio')).toBeInTheDocument();
    expect(screen.getByLabelText(/Puntaje/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Hay 1 campo por corregir antes de guardar.');
    expect(screen.getByLabelText(/Nombre del instrumento/)).toHaveValue('CBCL');
  });

  it('resets module and unsaved clinical data when the tenant changes', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const view = render(<SpecialtyRecordEntryForm {...props({ onSubmit })} />);

    select('psychology.assessments');
    fireEvent.change(screen.getByLabelText(/Nombre del instrumento/), { target: { value: 'A assessment' } });
    fireEvent.change(screen.getByLabelText('Notas adicionales'), { target: { value: 'A private note' } });

    view.rerender(<SpecialtyRecordEntryForm {...props({
      tenantId: 'tenant-b',
      configurationStatus: 'loading',
      onSubmit,
    })} />);

    expect(screen.getByLabelText('Tipo de registro')).toHaveValue('');
    expect(screen.getByLabelText('Tipo de registro')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar registro' })).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    view.rerender(<SpecialtyRecordEntryForm {...props({ tenantId: 'tenant-b', onSubmit })} />);

    expect(screen.getByLabelText('Tipo de registro')).toHaveValue('');
    select('psychology.assessments');
    expect(screen.getByLabelText(/Nombre del instrumento/)).toHaveValue('');
    expect(screen.getByLabelText('Notas adicionales')).toHaveValue('');

    fireEvent.change(screen.getByLabelText(/Nombre del instrumento/), { target: { value: 'B assessment' } });
    await save();

    expect(onSubmit).toHaveBeenCalledWith({
      moduleKey: 'psychology.assessments',
      schemaVersion: 2,
      data: { instrumentName: 'B assessment' },
      notes: undefined,
    });
    expect(onSubmit).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ instrumentName: 'A assessment' }),
    }));
  });

  it.each([
    ['loading', undefined],
    ['error', 'No se pudo cargar la configuración del consultorio.'],
  ] as const)('prevents submission while tenant configuration is %s', (configurationStatus, configurationError) => {
    const onSubmit = vi.fn();
    const view = render(<SpecialtyRecordEntryForm {...props({ onSubmit })} />);
    select('psychology.assessments');

    view.rerender(<SpecialtyRecordEntryForm {...props({ configurationStatus, configurationError, onSubmit })} />);

    expect(screen.getByLabelText('Tipo de registro')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar registro' })).toBeDisabled();
    if (configurationError) expect(screen.getByRole('alert')).toHaveTextContent(configurationError);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('lets a tool of the module write into the fields the form has', () => {
    const renderTools = vi.fn((moduleKey: string, fill: (values: Record<string, string>) => void) => (
      <button
        type="button"
        onClick={() => fill({ interpretation: 'Texto de la plantilla', unknownField: 'ignorado' })}
      >
        Usar plantilla de {moduleKey}
      </button>
    ));
    render(<SpecialtyRecordEntryForm {...props({ renderTools })} />);
    // No module, no tools.
    expect(renderTools).not.toHaveBeenCalled();

    select('psychology.assessments');
    fireEvent.change(screen.getByLabelText(/Nombre del instrumento/), { target: { value: 'PHQ-9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Usar plantilla de psychology.assessments' }));

    expect(screen.getByLabelText('Interpretación')).toHaveValue('Texto de la plantilla');
    // What was already typed stays.
    expect(screen.getByLabelText(/Nombre del instrumento/)).toHaveValue('PHQ-9');
  });

  it('explains why nothing can be recorded when no module is available', () => {
    render(<SpecialtyRecordEntryForm {...props({ modules: [] })} />);

    expect(screen.getByText(/No tienes módulos clínicos disponibles/)).toBeInTheDocument();
  });
});
