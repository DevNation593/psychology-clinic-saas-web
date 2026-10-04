import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentVerification } from '@/lib/api/documents-api';
import { DocumentVerificationResult } from './document-verification-result';

const hooks = vi.hoisted(() => ({
  codes: [] as string[],
  query: { data: undefined as unknown, error: null as unknown, isError: false, isPending: false },
}));

vi.mock('@/hooks/useDocuments', () => ({
  useDocumentVerification: (code: string) => {
    hooks.codes.push(code);
    return hooks.query;
  },
}));

const valid: DocumentVerification = {
  code: 'ABCD-EFGH-JKMN-PQRS',
  status: 'VALID',
  documentType: 'Certificado',
  issuedAt: '2026-10-03T15:00:00.000Z',
  correctedAt: null,
  withdrawnAt: null,
  clinic: 'Centro Bienestar',
  specialty: 'Psicología',
  professional: { name: 'Sofía Ruiz', title: 'Psicóloga clínica', licenseNumber: 'MSP-123' },
  patientInitials: 'A. P.',
};

beforeEach(() => {
  hooks.codes = [];
  hooks.query = { data: valid, error: null, isError: false, isPending: false };
});

describe('DocumentVerificationResult', () => {
  it('confirms an authentic document with who issued it and the initials of the patient', () => {
    render(<DocumentVerificationResult code="abcd-efgh-jkmn-pqrs" />);

    expect(hooks.codes).toEqual(['abcd-efgh-jkmn-pqrs']);
    expect(screen.getByText('Documento auténtico')).toBeInTheDocument();
    expect(screen.getByText('Certificado')).toBeInTheDocument();
    expect(screen.getByText('Centro Bienestar')).toBeInTheDocument();
    expect(screen.getByText('Sofía Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Psicóloga clínica · Registro MSP-123')).toBeInTheDocument();
    expect(screen.getByText('A. P.')).toBeInTheDocument();
    expect(screen.getByText('03/10/2026')).toBeInTheDocument();
    expect(screen.queryByText(/fue corregido/)).not.toBeInTheDocument();
  });

  it('warns that a corrected document may differ from an older copy', () => {
    hooks.query.data = { ...valid, correctedAt: '2026-10-05T15:00:00.000Z' };
    render(<DocumentVerificationResult code="ABCD" />);

    expect(screen.getByText('Documento auténtico')).toBeInTheDocument();
    expect(screen.getByText(/El documento fue corregido el 05\/10\/2026/)).toBeInTheDocument();
  });

  it('says a withdrawn document is no longer valid', () => {
    hooks.query.data = { ...valid, status: 'WITHDRAWN', withdrawnAt: '2026-10-04T15:00:00.000Z' };
    render(<DocumentVerificationResult code="ABCD" />);

    expect(screen.getByText('Documento anulado')).toBeInTheDocument();
    expect(screen.getByText(/retiró este documento el 04\/10\/2026/)).toBeInTheDocument();
    expect(screen.queryByText('Documento auténtico')).not.toBeInTheDocument();
  });

  it('tells an unknown code apart from a failure to check', () => {
    hooks.query = { data: undefined, error: { status: 404 }, isError: true, isPending: false };
    const { unmount } = render(<DocumentVerificationResult code="0000" />);
    expect(screen.getByText('No encontramos un documento con ese código')).toBeInTheDocument();
    unmount();

    hooks.query = { data: undefined, error: { status: 500 }, isError: true, isPending: false };
    render(<DocumentVerificationResult code="0000" />);
    expect(screen.getByText('No se pudo comprobar el documento')).toBeInTheDocument();
  });

  it('announces that it is checking', () => {
    hooks.query = { data: undefined, error: null, isError: false, isPending: true };
    render(<DocumentVerificationResult code="ABCD" />);

    expect(screen.getByRole('status', { name: 'Comprobando el documento' })).toBeInTheDocument();
  });
});
