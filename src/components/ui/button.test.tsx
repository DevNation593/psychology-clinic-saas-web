import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders its children through the button role', () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('keeps disabled buttons disabled and prevents their click callback', () => {
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        Guardar
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();

    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });
});
