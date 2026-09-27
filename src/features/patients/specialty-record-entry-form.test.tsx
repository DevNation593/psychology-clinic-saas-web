import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpecialtyRecordEntryForm, type SpecialtyRecordEntryFormProps } from './specialty-record-entry-form';

const moduleOptions = [
  { code: 'PSYCHOLOGY', name: 'Psicología', moduleKey: 'psychology.assessments' },
];

function props(overrides: Partial<Omit<SpecialtyRecordEntryFormProps, 'patientId'>> = {}): SpecialtyRecordEntryFormProps {
  return {
    tenantId: 'tenant-a',
    patientId: 'patient-1',
    configurationStatus: 'ready',
    moduleOptions,
    isSaving: false,
    onSubmit: vi.fn(),
    ...overrides,
  };
}

describe('SpecialtyRecordEntryForm', () => {
  it('resets module and unsaved clinical data when the tenant changes', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const view = render(<SpecialtyRecordEntryForm {...props({ onSubmit })} />);

    fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'psychology.assessments' } });
    fireEvent.change(screen.getByLabelText('Nombre de prueba'), { target: { value: 'A assessment' } });
    fireEvent.change(screen.getByLabelText('Notas adicionales'), { target: { value: 'A private note' } });

    view.rerender(<SpecialtyRecordEntryForm {...props({
      tenantId: 'tenant-b',
      configurationStatus: 'loading',
      onSubmit,
    })} />);

    expect(screen.getByLabelText('Módulo')).toHaveValue('');
    expect(screen.getByLabelText('Módulo')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar registro' })).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    view.rerender(<SpecialtyRecordEntryForm {...props({ tenantId: 'tenant-b', onSubmit })} />);

    expect(screen.getByLabelText('Módulo')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'psychology.assessments' } });
    expect(screen.getByLabelText('Nombre de prueba')).toHaveValue('');
    expect(screen.getByLabelText('Notas adicionales')).toHaveValue('');

    fireEvent.change(screen.getByLabelText('Nombre de prueba'), { target: { value: 'B assessment' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' })));

    expect(onSubmit).toHaveBeenCalledWith({
      specialtyCode: 'PSYCHOLOGY',
      moduleKey: 'psychology.assessments',
      data: { testName: 'B assessment', score: '', interpretation: '' },
      notes: undefined,
    });
    expect(onSubmit).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ testName: 'A assessment' }),
      notes: 'A private note',
    }));
  });

  it.each([
    ['loading', undefined],
    ['error', 'No se pudo cargar la configuración del consultorio.'],
  ] as const)('prevents submission while tenant configuration is %s', (configurationStatus, configurationError) => {
    const onSubmit = vi.fn();
    const view = render(<SpecialtyRecordEntryForm {...props({ onSubmit })} />);
    fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'psychology.assessments' } });

    view.rerender(<SpecialtyRecordEntryForm {...props({ configurationStatus, configurationError, onSubmit })} />);

    expect(screen.getByLabelText('Módulo')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar registro' })).toBeDisabled();
    if (configurationError) expect(screen.getByRole('alert')).toHaveTextContent(configurationError);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
