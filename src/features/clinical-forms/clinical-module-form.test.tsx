import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClinicalModuleDefinition, FormSchema } from '@/types/clinical';
import { ClinicalModuleForm, initialModuleValues, RecordDataView } from './clinical-module-form';
import { toRecordData, type FormValues } from './form-values';

const phqSchema: FormSchema = {
  sections: [
    {
      key: 'items',
      title: 'Ítems',
      fields: [
        {
          key: 'q1',
          label: '1. Poco interés',
          type: 'scale',
          min: 0,
          max: 3,
          required: true,
          options: [
            { value: '0', label: 'Nunca' },
            { value: '3', label: 'Casi todos los días' },
          ],
        },
        { key: 'pain', label: 'Dolor (0 a 10)', type: 'scale', min: 0, max: 10 },
      ],
    },
    {
      key: 'plan',
      title: 'Plan',
      fields: [
        {
          key: 'areas',
          label: 'Orientación',
          type: 'multiselect',
          options: [
            { value: 'TIEMPO', label: 'Tiempo' },
            { value: 'ESPACIO', label: 'Espacio' },
          ],
        },
        {
          key: 'meals',
          label: 'Comidas',
          type: 'table',
          maxRows: 2,
          columns: [
            { key: 'name', label: 'Comida', type: 'text', required: true },
            { key: 'time', label: 'Horario', type: 'time' },
          ],
        },
        { key: 'smoker', label: 'Fuma', type: 'checkbox' },
      ],
    },
  ],
};

const form = { renderer: 'FORM', schema: phqSchema } as const;

function Harness({
  definition = form,
  onValues,
  issues,
}: {
  definition?: Pick<ClinicalModuleDefinition, 'renderer' | 'schema'>;
  onValues: (values: FormValues) => void;
  issues?: Record<string, string>;
}) {
  const [values, setValues] = useState(() => initialModuleValues(definition));
  return (
    <ClinicalModuleForm
      definition={definition}
      values={values}
      issues={issues}
      onChange={(next) => {
        setValues(next);
        onValues(next);
      }}
    />
  );
}

describe('ClinicalModuleForm', () => {
  it('answers a scale by choosing a point, labelled when the definition names it', () => {
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);

    const item = screen.getByRole('group', { name: /1\. Poco interés/ });
    // Points without a label of their own show their number.
    expect(within(item).getAllByRole('radio')).toHaveLength(4);
    fireEvent.click(within(item).getByLabelText('1. Poco interés: Casi todos los días'));
    fireEvent.click(screen.getByLabelText('Dolor (0 a 10): 7'));

    expect(toRecordData(phqSchema, onValues.mock.lastCall![0])).toEqual({ q1: 3, pain: 7 });
  });

  it('toggles the options of a multiselect and a checkbox', () => {
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);

    fireEvent.click(screen.getByLabelText('Orientación: Tiempo'));
    fireEvent.click(screen.getByLabelText('Orientación: Espacio'));
    fireEvent.click(screen.getByLabelText('Orientación: Tiempo'));
    fireEvent.click(screen.getByLabelText('Fuma'));

    expect(toRecordData(phqSchema, onValues.mock.lastCall![0])).toEqual({
      areas: ['ESPACIO'],
      smoker: true,
    });
  });

  it('adds and removes table rows up to the limit of the definition', () => {
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);
    const add = screen.getByRole('button', { name: 'Agregar fila' });

    fireEvent.click(add);
    fireEvent.click(add);
    expect(add).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Comida, fila 1'), { target: { value: 'Desayuno' } });
    fireEvent.change(screen.getByLabelText('Horario, fila 1'), { target: { value: '07:30' } });
    fireEvent.change(screen.getByLabelText('Comida, fila 2'), { target: { value: 'Almuerzo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Quitar fila 1 de Comidas' }));

    expect(toRecordData(phqSchema, onValues.mock.lastCall![0])).toEqual({
      meals: [{ name: 'Almuerzo' }],
    });
    expect(add).toBeEnabled();
  });

  it('shows the issue of a table cell next to it', () => {
    render(<Harness onValues={vi.fn()} issues={{ 'meals[0].name': 'Este campo es obligatorio' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar fila' }));

    expect(screen.getByLabelText('Comida, fila 1')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Este campo es obligatorio')).toBeInTheDocument();
  });
});

const odontogram: Pick<ClinicalModuleDefinition, 'renderer' | 'schema'> = {
  renderer: 'ODONTOGRAM',
  schema: {
    sections: [
      {
        key: 'odontogram',
        title: 'Odontograma',
        fields: [
          {
            key: 'dentition',
            label: 'Dentición',
            type: 'select',
            required: true,
            options: [
              { value: 'PERMANENT', label: 'Permanente' },
              { value: 'TEMPORARY', label: 'Temporal' },
            ],
          },
          {
            key: 'findings',
            label: 'Hallazgos',
            type: 'table',
            columns: [
              { key: 'tooth', label: 'Pieza', type: 'text' },
              { key: 'surface', label: 'Superficie', type: 'text' },
              { key: 'state', label: 'Estado', type: 'text' },
            ],
          },
          { key: 'observations', label: 'Observaciones', type: 'textarea' },
        ],
      },
    ],
  },
};

describe('odontogram renderer', () => {
  it('starts with permanent dentition and marks surfaces with the chosen state', () => {
    const onValues = vi.fn();
    render(<Harness definition={odontogram} onValues={onValues} />);

    expect(screen.getByLabelText(/Dentición/)).toHaveValue('PERMANENT');
    expect(screen.getByText(/todas las piezas se registran sanas/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pieza 16, oclusal / incisal' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Ausente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pieza 38, vestibular' }));
    fireEvent.change(screen.getByLabelText('Observaciones'), { target: { value: 'Control en 6 meses' } });

    expect(toRecordData(odontogram.schema, onValues.mock.lastCall![0])).toEqual({
      dentition: 'PERMANENT',
      findings: [
        { tooth: '16', surface: 'O', state: 'CARIES' },
        // A state of the whole tooth is stored once, whatever surface was clicked.
        { tooth: '38', surface: 'W', state: 'MISSING' },
      ],
      observations: 'Control en 6 meses',
    });
    expect(screen.getByText(/Pieza 16 · Oclusal \/ incisal · Caries/)).toBeInTheDocument();
  });

  it('places mesial toward the midline on both sides of the mouth', () => {
    const onValues = vi.fn();
    render(<Harness definition={odontogram} onValues={onValues} />);

    // 11 and 21 are the central incisors: their mesial surfaces face each other.
    const right = screen.getByRole('button', { name: 'Pieza 11, mesial' });
    const left = screen.getByRole('button', { name: 'Pieza 21, mesial' });
    expect(right.getAttribute('d')).not.toBe(left.getAttribute('d'));
  });

  it('clears a mark by clicking it again or with the eraser, and removes findings from the list', () => {
    const onValues = vi.fn();
    render(<Harness definition={odontogram} onValues={onValues} />);
    const findings = () => toRecordData(odontogram.schema, onValues.mock.lastCall![0]).findings;

    fireEvent.click(screen.getByRole('button', { name: 'Pieza 16, oclusal / incisal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pieza 16, oclusal / incisal: Caries' }));
    expect(findings()).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'Pieza 16, mesial' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Borrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pieza 16, mesial: Caries' }));
    expect(findings()).toBeUndefined();

    fireEvent.click(screen.getByRole('radio', { name: 'Corona' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pieza 24, distal' }));
    expect(findings()).toEqual([{ tooth: '24', surface: 'W', state: 'CROWN' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar hallazgo de la pieza 24, pieza completa' }));
    expect(findings()).toBeUndefined();
  });

  it('shows primary teeth for temporary dentition', () => {
    render(<Harness definition={odontogram} onValues={vi.fn()} />);

    expect(screen.queryByRole('group', { name: 'Pieza 55' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Dentición/), { target: { value: 'TEMPORARY' } });

    expect(screen.getByRole('group', { name: 'Pieza 55' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Pieza 18' })).not.toBeInTheDocument();
  });
});

describe('RecordDataView', () => {
  it('reads a record with the labels of its definition and skips empty fields', () => {
    render(
      <RecordDataView
        definition={form}
        data={{ q1: 3, areas: ['TIEMPO'], meals: [{ name: 'Desayuno', time: '07:30' }], smoker: true }}
      />,
    );

    expect(screen.getByText('1. Poco interés')).toBeInTheDocument();
    expect(screen.getByText('3 · Casi todos los días')).toBeInTheDocument();
    expect(screen.getByText('Tiempo')).toBeInTheDocument();
    expect(screen.queryByText('Dolor (0 a 10)')).not.toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Comidas' });
    expect(within(table).getByRole('columnheader', { name: 'Horario' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'Desayuno' })).toBeInTheDocument();
  });

  it('keeps the keys a pre-definition record carries beyond its legacy fields', () => {
    render(
      <RecordDataView
        definition={{
          renderer: 'FORM',
          schema: {
            sections: [{ key: 'main', title: 'Datos', fields: [{ key: 'weightKg', label: 'Peso (kg)', type: 'text' }] }],
          },
        }}
        data={{ weightKg: 70, dietaryGoals: 'Reducir grasa corporal' }}
      />,
    );

    expect(screen.getByText('Peso (kg)')).toBeInTheDocument();
    expect(screen.getByText('dietaryGoals')).toBeInTheDocument();
    expect(screen.getByText('Reducir grasa corporal')).toBeInTheDocument();
  });

  it('draws a stored odontogram read-only', () => {
    render(
      <RecordDataView
        definition={odontogram}
        data={{ dentition: 'PERMANENT', findings: [{ tooth: '16', surface: 'O', state: 'CARIES' }] }}
      />,
    );

    expect(screen.getByText(/Pieza 16 · Oclusal \/ incisal · Caries/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Dentición/)).not.toBeInTheDocument();
  });

  it('lists raw values when the definition is unknown', () => {
    render(<RecordDataView data={{ custom: 'valor' }} />);

    expect(screen.getByText('custom')).toBeInTheDocument();
    expect(screen.getByText('valor')).toBeInTheDocument();
  });
});
