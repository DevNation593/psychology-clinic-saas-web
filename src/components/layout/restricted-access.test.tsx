import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RestrictedAccess } from './restricted-access';

describe('RestrictedAccess', () => {
  it('tells the user who can open the page', () => {
    render(<RestrictedAccess />);
    expect(screen.getByText('Acceso restringido')).toBeInTheDocument();
    expect(
      screen.getByText('Solo el titular de la cuenta puede acceder a esta sección.'),
    ).toBeInTheDocument();
  });
});
