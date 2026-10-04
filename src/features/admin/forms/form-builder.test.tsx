import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FormDefinition } from '@/types/clinical';
import { FormBuilder, type FormBuilderProps } from './form-builder';

const specialties = [{ code: 'PHYSIOTHERAPY', name: 'Fisioterapia' }];

const savedForm: FormDefinition = {
  id: 'form-1',
  name: 'Ficha de lesión',
  description: null,
  category: 'Evaluación',
  specialtyId: 'physio',
  specialty: { id: 'physio', code: 'PHYSIOTHERAPY', name: 'Fisioterapia' },
  isActive: true,
  currentVersion: 2,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  versions: [
    {
      id: 'v1',
      version: 1,
      createdAt: '2026-10-01T10:00:00.000Z',
      schema: { sections: [{ key: 'old', title: 'Anterior', fields: [{ key: 'gone', label: 'Retirado', type: 'text' }] }] },
    },
    {
      id: 'v2',
      version: 2,
      createdAt: '2026-10-02T10:00:00.000Z',
      schema: {
        sections: [
          {
            key: 'injury',
            title: 'Lesión',
            fields: [
              {
                key: 'injuryType',
                label: 'Tipo de lesión',
                type: 'select',
                required: true,
                options: [{ value: 'SPORT', label: 'Deportiva' }],
              },
            ],
          },
        ],
      },
    },
  ],
};

function renderBuilder(overrides: Partial<FormBuilderProps> = {}) {
  const props: FormBuilderProps = {
    specialties,
    isSaving: false,
    onSave: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<FormBuilder {...props} />);
  return props;
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = (name: string) => act(async () => fireEvent.click(screen.getByRole('button', { name })));

describe('FormBuilder', () => {
  it('creates a form from labels, giving each field its key', async () => {
    const { onSave } = renderBuilder();

    type(/^Nombre/, ' Ficha de lesión ');
    type('Categoría', 'Evaluación');
    type('Etiqueta del campo', 'Tipo de lesión');
    expect(screen.getByText('tipoDeLesion')).toBeInTheDocument();
    type('Tipo', 'select');
    type('Opciones (una por línea)', 'Traumática\nDeportiva');
    fireEvent.click(screen.getByLabelText('Obligatorio'));
    await submit('Crear formulario');

    expect(onSave).toHaveBeenCalledWith({
      name: 'Ficha de lesión',
      description: null,
      category: 'Evaluación',
      specialtyCode: null,
      schema: {
        sections: [
          {
            key: 'datos',
            title: 'Datos',
            fields: [
              {
                key: 'tipoDeLesion',
                label: 'Tipo de lesión',
                type: 'select',
                required: true,
                options: [
                  { value: 'TRAUMATICA', label: 'Traumática' },
                  { value: 'DEPORTIVA', label: 'Deportiva' },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it('previews the form as the professional will see it', () => {
    renderBuilder();

    expect(screen.getByText(/Agrega la etiqueta de un campo/)).toBeInTheDocument();
    type('Etiqueta del campo', 'Dolor');
    type('Tipo', 'scale');
    type(/Mínimo/, '0');
    type(/Máximo/, '3');

    const preview = screen.getByRole('group', { name: 'Dolor' });
    expect(within(preview).getAllByRole('radio')).toHaveLength(4);
  });

  it('adds, reorders and removes fields', async () => {
    const { onSave } = renderBuilder();

    const labels = () => screen.getAllByLabelText('Etiqueta del campo');
    const savedLabels = async () => {
      await submit('Crear formulario');
      const { schema } = vi.mocked(onSave).mock.lastCall![0];
      return schema.sections[0].fields.map((field) => field.label);
    };

    type(/^Nombre/, 'Orden');
    type('Etiqueta del campo', 'Primero');
    // A form always keeps at least one field.
    expect(screen.getByRole('button', { name: 'Quitar Primero' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar campo' }));
    fireEvent.change(labels()[1], { target: { value: 'Segundo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar campo' }));
    fireEvent.change(labels()[2], { target: { value: 'Tercero' } });
    expect(screen.getByRole('button', { name: 'Subir Primero' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajar Tercero' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Subir Tercero' }));
    expect(await savedLabels()).toEqual(['Primero', 'Tercero', 'Segundo']);

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Primero' }));
    expect(await savedLabels()).toEqual(['Tercero', 'Segundo']);
  });

  it('opens a saved form on its current version and keeps keys and option values', async () => {
    const { onSave } = renderBuilder({ form: savedForm });

    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Ficha de lesión');
    expect(screen.getByLabelText('Quién puede llenarlo')).toHaveValue('PHYSIOTHERAPY');
    expect(screen.getByLabelText('Etiqueta del campo')).toHaveValue('Tipo de lesión');
    expect(screen.queryByDisplayValue('Retirado')).not.toBeInTheDocument();
    expect(screen.getByText(/Versión actual: 2/)).toBeInTheDocument();

    // Renaming the label keeps the key the stored answers are found by.
    type('Etiqueta del campo', 'Clase de lesión');
    await submit('Guardar cambios');

    const { schema, specialtyCode } = vi.mocked(onSave).mock.calls[0][0];
    expect(specialtyCode).toBe('PHYSIOTHERAPY');
    expect(schema.sections[0].fields[0]).toEqual({
      key: 'injuryType',
      label: 'Clase de lesión',
      type: 'select',
      required: true,
      options: [{ value: 'SPORT', label: 'Deportiva' }],
    });
  });

  it('shows the issues the API reports next to the field they concern', async () => {
    const onSave = vi.fn().mockRejectedValue({
      message: 'La definición del formulario no es válida.',
      issues: [
        { field: 'sections[0].fields[0].options', message: 'Agrega al menos una opción' },
        { field: 'alerts[0].when', message: 'La expresión usa un campo inexistente: zzz' },
      ],
    });
    renderBuilder({ onSave });

    type(/^Nombre/, 'Con errores');
    type('Etiqueta del campo', 'Tipo');
    await submit('Crear formulario');

    expect(screen.getByText('Agrega al menos una opción')).toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('La definición del formulario no es válida.');
    expect(alert).toHaveTextContent('La expresión usa un campo inexistente: zzz');
    expect(alert).not.toHaveTextContent('Agrega al menos una opción');
  });

  it('asks for a name before calling the API', async () => {
    const { onSave } = renderBuilder();

    await submit('Crear formulario');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('al menos 2 caracteres');
  });

  it('adds alert rules and a second section', async () => {
    const { onSave } = renderBuilder();

    type(/^Nombre/, 'Riesgo');
    type('Etiqueta del campo', 'Puntaje');
    type('Tipo', 'integer');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar alerta' }));
    type('Condición', 'puntaje >= 20');
    type('Nivel', 'critical');
    type('Mensaje', 'Puntaje alto');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar sección' }));
    type('Título de la sección 2', 'Seguimiento');
    fireEvent.change(screen.getAllByLabelText('Etiqueta del campo')[1], { target: { value: 'Próxima cita' } });
    await submit('Crear formulario');

    const { schema } = vi.mocked(onSave).mock.calls[0][0];
    expect(schema.alerts).toEqual([{ when: 'puntaje >= 20', level: 'critical', message: 'Puntaje alto' }]);
    expect(schema.sections.map((section) => [section.key, section.fields[0].key])).toEqual([
      ['datos', 'puntaje'],
      ['seguimiento', 'proximaCita'],
    ]);
  });
});
