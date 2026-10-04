import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormSchema } from '@/types/clinical';
import { DynamicFormFields } from './dynamic-form-fields';
import { initialValues, toRecordData, type FormValues } from './form-values';

const search = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useCatalogs', () => ({ useLookupSearch: () => search }));

const schema: FormSchema = {
  sections: [
    {
      key: 'diagnoses',
      title: 'Diagnósticos',
      fields: [
        {
          key: 'diagnoses',
          label: 'Diagnósticos',
          type: 'table',
          columns: [
            {
              key: 'system',
              label: 'Clasificación',
              type: 'select',
              options: [
                { value: 'CIE10', label: 'CIE-10' },
                { value: 'CIE11', label: 'CIE-11' },
              ],
            },
            { key: 'code', label: 'Código', type: 'text', lookup: 'diagnosis' },
            { key: 'description', label: 'Descripción', type: 'text' },
          ],
        },
      ],
    },
  ],
};

function Harness({ onValues }: { onValues: (values: FormValues) => void }) {
  const [values, setValues] = useState(() => initialValues(schema));
  return (
    <DynamicFormFields
      schema={schema}
      values={values}
      onChange={(next) => {
        setValues(next);
        onValues(next);
      }}
    />
  );
}

const typeCode = async (value: string) => {
  const input = screen.getByRole('combobox', { name: 'Código, fila 1' });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  // The search waits for the typing to pause.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
  return input;
};

beforeEach(() => {
  vi.useFakeTimers();
  search.mockReset();
  search.mockResolvedValue([
    {
      value: 'F32.1',
      detail: 'Episodio depresivo moderado',
      fill: { description: 'Episodio depresivo moderado', system: 'CIE10', unknownColumn: 'x' },
    },
    { value: 'F32.2', detail: 'Episodio depresivo grave', fill: { description: 'Episodio depresivo grave', system: 'CIE10' } },
  ]);
});
afterEach(() => vi.useRealTimers());

describe('catalog lookup in a form', () => {
  it('fills the code and the sibling columns the catalog knows when a suggestion is chosen', async () => {
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar fila' }));

    await typeCode('f32');
    expect(search).toHaveBeenCalledWith('f32');
    fireEvent.mouseDown(screen.getByRole('option', { name: /F32\.1/ }));

    expect(toRecordData(schema, onValues.mock.lastCall![0])).toEqual({
      diagnoses: [{ system: 'CIE10', code: 'F32.1', description: 'Episodio depresivo moderado' }],
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('chooses a suggestion with the keyboard', async () => {
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar fila' }));

    const input = await typeCode('f32');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: /F32\.2/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(toRecordData(schema, onValues.mock.lastCall![0])).toEqual({
      diagnoses: [{ system: 'CIE10', code: 'F32.2', description: 'Episodio depresivo grave' }],
    });
  });

  it('keeps what was typed when nothing is chosen: the catalog only suggests', async () => {
    const onValues = vi.fn();
    search.mockResolvedValue([]);
    render(<Harness onValues={onValues} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar fila' }));

    await typeCode('Z99.9');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(toRecordData(schema, onValues.mock.lastCall![0])).toEqual({ diagnoses: [{ code: 'Z99.9' }] });
  });

  it('does not search for a single character or after a failed request', async () => {
    render(<Harness onValues={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar fila' }));

    await typeCode('f');
    expect(search).not.toHaveBeenCalled();

    search.mockRejectedValue(new Error('offline'));
    await typeCode('f32');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
