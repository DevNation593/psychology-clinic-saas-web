import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionGate } from './section-gate';

const sections = vi.hoisted(() => ({
  state: {} as { isEnabled: (key: string) => boolean; isLoading: boolean; isError: boolean; refetch: () => void },
}));
vi.mock('@/hooks/useSections', () => ({ useSections: () => sections.state }));

beforeEach(() => {
  sections.state = { isEnabled: () => true, isLoading: false, isError: false, refetch: vi.fn() };
});

const renderGate = () =>
  render(<SectionGate section="core.tasks"><p>Contenido</p></SectionGate>);

describe('SectionGate', () => {
  it('renders nothing while the sections load', () => {
    sections.state = { ...sections.state, isEnabled: () => false, isLoading: true };
    const { container } = renderGate();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the retry alert, not the disabled notice, when the request fails', () => {
    sections.state = { ...sections.state, isEnabled: () => false, isError: true };
    renderGate();
    expect(screen.getByText('No se pudieron cargar las secciones')).toBeInTheDocument();
    expect(screen.queryByText('Sección no disponible')).not.toBeInTheDocument();
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(sections.state.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the disabled notice when the section is off', () => {
    sections.state = { ...sections.state, isEnabled: () => false };
    renderGate();
    expect(screen.getByText('Sección no disponible')).toBeInTheDocument();
    expect(screen.getByText('Esta sección no está habilitada para tu consultorio')).toBeInTheDocument();
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });

  it('renders the children when the section is on', () => {
    renderGate();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
