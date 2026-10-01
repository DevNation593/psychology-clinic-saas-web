import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DirectContact } from './direct-contact';

describe('DirectContact', () => {
  it('offers WhatsApp and e-mail when both exist', () => {
    render(<DirectContact contact={{ whatsappNumber: '+593 99 123-4567', email: 'ventas@example.com', responseTime: '' }} />);
    expect(screen.getByRole('link', { name: 'Escribir por WhatsApp' }).getAttribute('href')).toContain('https://wa.me/593991234567');
    expect(screen.getByRole('link', { name: 'ventas@example.com' })).toHaveAttribute('href', 'mailto:ventas@example.com');
  });

  it('skips a WhatsApp number that has no digits', () => {
    render(<DirectContact contact={{ whatsappNumber: '+', email: 'ventas@example.com', responseTime: '' }} />);
    expect(screen.queryByRole('link', { name: 'Escribir por WhatsApp' })).not.toBeInTheDocument();
  });

  it('renders nothing without any channel', () => {
    const { container } = render(<DirectContact contact={{ whatsappNumber: '', email: '', responseTime: '' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
