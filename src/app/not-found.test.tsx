import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFound from './not-found';

describe('NotFound', () => {
  it('explains the error and links back into the site', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: 'No encontramos esta página' })).toBeInTheDocument();
    for (const [name, href] of [
      ['Ir al inicio', '/'], ['Ver planes', '/planes'], ['Contacto', '/contacto'], ['Iniciar sesión', '/login'],
    ]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });
});
