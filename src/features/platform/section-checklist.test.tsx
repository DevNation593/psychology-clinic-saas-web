import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SectionCatalog, SectionKey } from '@/types';
import { SectionChecklist } from './section-checklist';

const catalog: SectionCatalog['sections'] = [
  { key: 'core.calendar', name: 'Agenda', requires: [] },
  { key: 'core.patients', name: 'Pacientes', requires: [] },
  { key: 'core.tasks', name: 'Tareas', requires: ['core.patients'] },
  { key: 'core.clinicalNotes', name: 'Notas clínicas', requires: ['core.patients'] },
];

function Harness({ initial }: { initial: SectionKey[] }) {
  const [value, setValue] = useState<SectionKey[]>(initial);
  return <SectionChecklist catalog={catalog} value={value} onChange={setValue} />;
}

describe('SectionChecklist', () => {
  it('checks Pacientes when a section that depends on it is checked', () => {
    render(<Harness initial={[]} />);
    fireEvent.click(screen.getByLabelText('Tareas'));
    expect(screen.getByLabelText('Tareas')).toBeChecked();
    expect(screen.getByLabelText('Pacientes')).toBeChecked();
    expect(screen.getByLabelText('Agenda')).not.toBeChecked();
  });

  it('unchecks the dependent sections when Pacientes is unchecked', () => {
    render(<Harness initial={['core.calendar', 'core.patients', 'core.tasks', 'core.clinicalNotes']} />);
    fireEvent.click(screen.getByLabelText('Pacientes'));
    expect(screen.getByLabelText('Pacientes')).not.toBeChecked();
    expect(screen.getByLabelText('Tareas')).not.toBeChecked();
    expect(screen.getByLabelText('Notas clínicas')).not.toBeChecked();
    expect(screen.getByLabelText('Agenda')).toBeChecked();
  });
});
