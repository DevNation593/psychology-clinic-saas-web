import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentTemplate } from '@/lib/api/documents-api';
import { fillTemplate } from '@/lib/api/documents-api';
import { TemplatesManager, unknownVariables } from './templates-manager';

const hooks = vi.hoisted(() => ({
  query: { data: [] as unknown[], isError: false, isPending: false, refetch: vi.fn() },
  save: vi.fn(),
  toggle: vi.fn(),
}));

vi.mock('@/hooks/useDocuments', () => ({
  useDocumentTemplates: () => hooks.query,
  useSaveDocumentTemplate: () => ({ mutateAsync: hooks.save, mutate: hooks.toggle, isPending: false }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const rest: DocumentTemplate = {
  id: 'template-1',
  moduleKey: 'general.certificates',
  name: 'Reposo médico',
  title: null,
  body: 'Certifico que {{paciente}} requiere reposo.',
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  hooks.query = { data: [rest], isError: false, isPending: false, refetch: vi.fn() };
  hooks.save.mockResolvedValue(undefined);
});

const submit = (name: string) => act(async () => fireEvent.click(screen.getByRole('button', { name })));

describe('template text', () => {
  it('fills the variables with the data of the patient and leaves a blank for what is missing', () => {
    expect(
      fillTemplate('{{paciente}} ({{ identificacion }}), {{edad}}.', {
        paciente: 'Ana Pérez',
        identificacion: '',
      }),
    ).toBe('Ana Pérez (__________), __________.');
  });

  it('finds the variables nobody fills in', () => {
    expect(unknownVariables('{{paciente}} vive en {{direccion}} desde {{anio}}')).toEqual([
      'direccion',
      'anio',
    ]);
  });
});

describe('TemplatesManager', () => {
  it('lists the templates with their kind of document', () => {
    hooks.query.data = [rest, { ...rest, id: 'template-2', name: 'Conducto', moduleKey: 'general.consents', isActive: false }];
    render(<TemplatesManager />);

    expect(screen.getByText('Reposo médico')).toBeInTheDocument();
    expect(screen.getByText('Certificado')).toBeInTheDocument();
    expect(screen.getByText('Consentimiento informado')).toBeInTheDocument();
    expect(screen.getByText('Inactiva')).toBeInTheDocument();
  });

  it('adds a template, inserting variables into its text', async () => {
    render(<TemplatesManager />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar plantilla' }));

    const add = screen.getAllByRole('button', { name: 'Agregar plantilla' }).at(-1)!;
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nombre de la plantilla/), { target: { value: ' Asistencia ' } });
    fireEvent.change(screen.getByLabelText(/^Texto/), { target: { value: 'Certifico que ' } });
    fireEvent.click(screen.getByRole('button', { name: '{{paciente}}' }));
    await act(async () => fireEvent.click(add));

    expect(hooks.save).toHaveBeenCalledWith({
      templateId: undefined,
      data: {
        moduleKey: 'general.certificates',
        name: 'Asistencia',
        title: null,
        body: 'Certifico que {{paciente}}',
      },
    });
  });

  it('asks for a title only in consents', () => {
    render(<TemplatesManager />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar plantilla' }));

    expect(screen.queryByLabelText('Título del consentimiento')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tipo de documento'), {
      target: { value: 'general.consents' },
    });
    expect(screen.getByLabelText('Título del consentimiento')).toBeInTheDocument();
  });

  it('does not save a text with a variable it cannot fill in', () => {
    render(<TemplatesManager />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Reposo médico' }));

    fireEvent.change(screen.getByLabelText(/^Texto/), { target: { value: 'Vive en {{direccion}}.' } });

    expect(screen.getByText(/Variable no reconocida: \{\{direccion\}\}/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Texto/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Guardar plantilla' })).toBeDisabled();
  });

  it('corrects a template without changing its kind of document', async () => {
    render(<TemplatesManager />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Reposo médico' }));

    expect(screen.getByLabelText('Tipo de documento')).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nombre de la plantilla/), { target: { value: 'Reposo' } });
    await submit('Guardar plantilla');

    expect(hooks.save).toHaveBeenCalledWith({
      templateId: 'template-1',
      data: { name: 'Reposo', title: null, body: 'Certifico que {{paciente}} requiere reposo.' },
    });
  });

  it('takes a template out of use', () => {
    render(<TemplatesManager />);

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(hooks.toggle).toHaveBeenCalledWith({ templateId: 'template-1', data: { isActive: false } });
  });

  it('explains an empty catalog and offers to retry a failed load', () => {
    hooks.query.data = [];
    const { unmount } = render(<TemplatesManager />);
    expect(screen.getByText(/Aún no hay plantillas/)).toBeInTheDocument();
    unmount();

    hooks.query = { data: [], isError: true, isPending: false, refetch: vi.fn() };
    render(<TemplatesManager />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(hooks.query.refetch).toHaveBeenCalled();
  });
});
