import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { hasTemplates, TemplatePicker } from './template-picker';

const hooks = vi.hoisted(() => ({
  moduleKeys: [] as (string | undefined)[],
  templates: [] as unknown[],
  patient: undefined as unknown,
}));

vi.mock('@/hooks/useDocuments', () => ({
  useDocumentTemplates: (moduleKey?: string) => {
    hooks.moduleKeys.push(moduleKey);
    return { data: hooks.templates };
  },
}));
vi.mock('@/hooks/usePatients', () => ({ usePatient: () => ({ data: hooks.patient }) }));

const consent = {
  id: 'template-1',
  moduleKey: 'general.consents',
  name: 'Tratamiento de conducto',
  title: 'Consentimiento de {{paciente}}',
  body: 'Yo, {{paciente}} ({{identificacion}}, {{edad}}), acepto. {{fecha}}. {{profesional}}, {{consultorio}}.',
  isActive: true,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 3, 12));
  hooks.moduleKeys = [];
  hooks.templates = [consent, { ...consent, id: 'template-2', name: 'Retirada', isActive: false }];
  hooks.patient = {
    firstName: 'Ana',
    lastName: 'Pérez',
    identificationNumber: '1712345678',
    dateOfBirth: '1990-10-04T00:00:00.000Z',
  };
  useAuthStore.setState({
    user: { id: 'me', firstName: 'Sofía', lastName: 'Ruiz' } as never,
    tenant: { id: 'tenant-1', name: 'Centro Bienestar' } as never,
  });
});
afterEach(() => vi.useRealTimers());

describe('TemplatePicker', () => {
  it('offers the active templates of the module and fills them with the patient at hand', () => {
    const onApply = vi.fn();
    render(<TemplatePicker moduleKey="general.consents" patientId="patient-1" onApply={onApply} />);

    expect(hooks.moduleKeys).toContain('general.consents');
    expect(screen.queryByRole('option', { name: 'Retirada' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar plantilla' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Plantilla del consultorio'), {
      target: { value: 'template-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Usar plantilla' }));

    expect(onApply).toHaveBeenCalledWith({
      title: 'Consentimiento de Ana Pérez',
      // The birthday is tomorrow: still 35.
      body: 'Yo, Ana Pérez (1712345678, 35 años), acepto. 3 de octubre de 2026. Sofía Ruiz, Centro Bienestar.',
    });
  });

  it('leaves a blank to fill in by hand for what the patient record does not have', () => {
    hooks.patient = { firstName: 'Ana', lastName: 'Pérez' };
    const onApply = vi.fn();
    render(<TemplatePicker moduleKey="general.consents" patientId="patient-1" onApply={onApply} />);

    fireEvent.change(screen.getByLabelText('Plantilla del consultorio'), {
      target: { value: 'template-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Usar plantilla' }));

    expect(onApply.mock.calls[0][0].body).toContain('Ana Pérez (__________, __________)');
  });

  it('shows nothing when the clinic has no template for the module', () => {
    hooks.templates = [];
    const { container } = render(
      <TemplatePicker moduleKey="general.certificates" patientId="patient-1" onApply={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('exists only for the modules that are documents with a body of text', () => {
    expect(hasTemplates('general.certificates')).toBe(true);
    expect(hasTemplates('general.consents')).toBe(true);
    expect(hasTemplates('general.vital-signs')).toBe(false);
  });
});
