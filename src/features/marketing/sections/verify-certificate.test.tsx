import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyCertificate } from './verify-certificate';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const submit = (code: string) => {
  fireEvent.change(screen.getByLabelText('Código de verificación'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Verificar certificado' }));
};

beforeEach(() => vi.clearAllMocks());

describe('VerifyCertificate', () => {
  it('is a section the footer can link to', () => {
    render(<VerifyCertificate />);
    const section = screen.getByRole('region', { name: 'Verifica un certificado' });
    expect(section).toHaveAttribute('id', 'verificar-certificado');
  });

  it('opens the public check of the code as it is printed', () => {
    render(<VerifyCertificate />);
    submit('abcd efgh jkmn pqrs');
    expect(push).toHaveBeenCalledWith('/verify/ABCD-EFGH-JKMN-PQRS');
  });

  it('reads the letters that look like digits as the digits', () => {
    render(<VerifyCertificate />);
    submit('OIL0-0000-0000-0000');
    expect(push).toHaveBeenCalledWith('/verify/0110-0000-0000-0000');
  });

  it('asks for the code when the field is empty', () => {
    render(<VerifyCertificate />);
    submit('   ');
    expect(screen.getByText('Escribe el código que aparece en el certificado')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('rejects a text that cannot be a code', () => {
    render(<VerifyCertificate />);
    submit('ABCD-EFGH');
    expect(screen.getByText('El código tiene 16 letras y números, como ABCD-EFGH-JKMN-PQRS')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
