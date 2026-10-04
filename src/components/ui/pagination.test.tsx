import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from '@/components/ui/pagination';

describe('Pagination', () => {
  it('renders nothing when everything fits on one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the current page and the range of rows on it', () => {
    render(<Pagination page={2} totalPages={3} total={45} pageSize={20} onPageChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.getByText('21–40 de 45')).toBeInTheDocument();
  });

  it('ends the range at the total on the last page', () => {
    render(<Pagination page={3} totalPages={3} total={45} pageSize={20} onPageChange={vi.fn()} />);
    expect(screen.getByText('41–45 de 45')).toBeInTheDocument();
  });

  it('asks for the previous and the next page', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onPageChange.mock.calls).toEqual([[1], [3]]);
  });

  it('disables the buttons at both ends', () => {
    const { rerender } = render(<Pagination page={1} totalPages={2} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
    rerender(<Pagination page={2} totalPages={2} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });
});
