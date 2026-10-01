import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoRequestForm } from './demo-request-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const whatsapp = { whatsappNumber: '593991234567', email: 'ventas@example.com', responseTime: 'En 24 horas.' };

function fill() {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana Vega' } });
  fireEvent.change(screen.getByLabelText('Consultorio o clínica'), { target: { value: 'Centro Vida' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '0991234567' } });
  fireEvent.change(screen.getByLabelText('Tamaño del equipo'), { target: { value: '2-5' } });
  fireEvent.click(screen.getByLabelText(/Acepto la/));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('DemoRequestForm', () => {
  it('shows field errors and sends nothing when the form is empty', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<DemoRequestForm contact={whatsapp} />);
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar demo' }));

    expect(await screen.findByText('Escribe tu nombre')).toBeInTheDocument();
    expect(screen.getByText('Debes aceptar la política de privacidad')).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('opens WhatsApp with the request and goes to the thank-you page', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ opener: {} } as unknown as Window);
    render(<DemoRequestForm contact={whatsapp} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar demo' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/gracias'));
    const url = new URL(open.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://wa.me/593991234567');
    expect(url.searchParams.get('text')).toContain('Centro Vida');
  });

  it('keeps the visitor on the form with a manual link when the popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    render(<DemoRequestForm contact={whatsapp} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar demo' }));

    const link = await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    expect(link.getAttribute('href')).toContain('https://wa.me/593991234567');
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Vega');
  });

  it('falls back to e-mail when there is no WhatsApp number', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<DemoRequestForm contact={{ ...whatsapp, whatsappNumber: '' }} />);
    expect(screen.getByText(/Se abrirá tu aplicación de correo/)).toBeInTheDocument();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar demo' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/gracias'));
    const [url, target] = open.mock.calls[0];
    expect(target).toBe('_self');
    expect(String(url)).toMatch(/^mailto:ventas@example\.com\?subject=/);
    expect(decodeURIComponent(String(url))).toContain('Centro Vida');
  });

  it('renders a notice instead of a form when no contact channel exists', () => {
    render(<DemoRequestForm contact={{ whatsappNumber: '', email: '', responseTime: 'x' }} />);
    expect(screen.queryByRole('button', { name: 'Solicitar demo' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Pronto habilitaremos');
  });

  it('shows the response-time promise', () => {
    render(<DemoRequestForm contact={whatsapp} />);
    expect(screen.getByText('En 24 horas.')).toBeInTheDocument();
  });
});
