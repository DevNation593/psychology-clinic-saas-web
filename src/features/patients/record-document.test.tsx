import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SpecialtyRecord } from '@/types';
import type { ClinicalModuleDefinition } from '@/types/clinical';
import { RecordDocument, type RecordDocumentProps } from './record-document';

const definition = (
  moduleKey: string,
  name: string,
  fields: ClinicalModuleDefinition['schema']['sections'][number]['fields'],
): ClinicalModuleDefinition => ({
  moduleKey,
  scope: 'GENERAL',
  specialtyCode: null,
  name,
  description: null,
  category: null,
  schemaVersion: 1,
  isLatest: true,
  renderer: 'FORM',
  legacy: false,
  enabled: true,
  canRecord: true,
  schema: { sections: [{ key: 'main', title: name, fields }] },
});

const prescription = definition('general.prescriptions', 'Receta', [
  {
    key: 'items',
    label: 'Medicamentos',
    type: 'table',
    columns: [
      { key: 'medication', label: 'Medicamento', type: 'text' },
      { key: 'dose', label: 'Dosis', type: 'text' },
    ],
  },
  { key: 'generalInstructions', label: 'Indicaciones generales', type: 'textarea' },
]);

const certificate = definition('general.certificates', 'Certificado', [
  {
    key: 'certificateType',
    label: 'Tipo de certificado',
    type: 'select',
    options: [{ value: 'REPOSO', label: 'Certificado de reposo' }],
  },
  { key: 'body', label: 'Texto del certificado', type: 'textarea' },
  { key: 'restDays', label: 'Días de reposo', type: 'integer' },
]);

const consent = definition('general.consents', 'Consentimiento informado', [
  { key: 'title', label: 'Título', type: 'text' },
  { key: 'body', label: 'Texto del consentimiento', type: 'textarea' },
  { key: 'signerName', label: 'Nombre de quien firma', type: 'text' },
  { key: 'acceptedBy', label: 'Quién lo acepta', type: 'select', options: [] },
]);

const record = (overrides: Partial<SpecialtyRecord>): SpecialtyRecord => ({
  id: 'record-1',
  patientId: 'patient-1',
  specialtyId: 'dentistry',
  moduleKey: 'general.prescriptions',
  schemaVersion: 1,
  version: 1,
  recordDate: '2026-10-03T15:00:00.000Z',
  data: {},
  professional: {
    id: 'pro-1',
    firstName: 'Carlos',
    lastName: 'Vera',
    professionalProfile: { professionalTitle: 'Odontólogo', licenseNumber: 'MSP-1234' },
  },
  specialty: { code: 'DENTISTRY', name: 'Odontología' },
  ...overrides,
});

const props = (overrides: Partial<RecordDocumentProps>): RecordDocumentProps => ({
  clinic: { name: 'Centro Integral', address: 'Av. Amazonas 100', phone: '+593 2 123 4567' },
  patient: {
    firstName: 'Lucía',
    lastName: 'Torres',
    dateOfBirth: '1990-02-14T00:00:00.000Z',
    identificationType: 'CEDULA',
    identificationNumber: '1712345678',
  },
  record: record({}),
  definition: prescription,
  printedAt: new Date(2026, 9, 3, 16, 30),
  ...overrides,
});

describe('RecordDocument', () => {
  it('lays a prescription out with letterhead, patient, content and the professional’s signature', () => {
    render(
      <RecordDocument
        {...props({
          record: record({
            data: { items: [{ medication: 'Ibuprofeno 400 mg', dose: '1 tableta' }], generalInstructions: 'Tomar con comida' },
            notes: 'Control en 3 días',
          }),
        })}
      />,
    );

    expect(screen.getByText('Centro Integral')).toBeInTheDocument();
    expect(screen.getByText('Av. Amazonas 100 · +593 2 123 4567')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Receta' })).toBeInTheDocument();
    expect(screen.getByText('Lucía Torres')).toBeInTheDocument();
    expect(screen.getByText('Cédula 1712345678')).toBeInTheDocument();
    expect(screen.getByText('36 años')).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Medicamentos' });
    expect(within(table).getByRole('cell', { name: 'Ibuprofeno 400 mg' })).toBeInTheDocument();
    expect(screen.getByText('Tomar con comida')).toBeInTheDocument();
    expect(screen.getByText('Control en 3 días')).toBeInTheDocument();

    expect(screen.getByText('Carlos Vera')).toBeInTheDocument();
    expect(screen.getByText('Odontólogo · Registro MSP-1234')).toBeInTheDocument();
    expect(screen.getByText(/Documento generado el 03\/10\/2026 16:30 · Registro record-1$/)).toBeInTheDocument();
  });

  it('titles a certificate by what it certifies and keeps the type out of the body', () => {
    render(
      <RecordDocument
        {...props({
          definition: certificate,
          record: record({
            moduleKey: 'general.certificates',
            version: 2,
            data: { certificateType: 'REPOSO', body: 'Requiere reposo por lumbalgia.', restDays: 3 },
          }),
        })}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Certificado de reposo' })).toBeInTheDocument();
    expect(screen.queryByText('Tipo de certificado')).not.toBeInTheDocument();
    expect(screen.getByText('Requiere reposo por lumbalgia.')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/versión 2/)).toBeInTheDocument();
  });

  it('adds the signature of whoever accepts a consent', () => {
    render(
      <RecordDocument
        {...props({
          definition: consent,
          record: record({
            moduleKey: 'general.consents',
            data: {
              title: 'Consentimiento para extracción',
              body: 'Autorizo el procedimiento.',
              signerName: 'María Torres',
              signerIdentification: '1709876543',
              acceptedBy: 'REPRESENTANTE',
              accepted: true,
            },
          }),
        })}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Consentimiento para extracción' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Autorizo el procedimiento.')).toBeInTheDocument();
    expect(screen.getByText('María Torres')).toBeInTheDocument();
    expect(screen.getByText('Representante legal · 1709876543')).toBeInTheDocument();
    // The signer appears once, in the signature block.
    expect(screen.queryByText('Nombre de quien firma')).not.toBeInTheDocument();
  });

  it('places the signature drawn on screen on the line of whoever accepts, not in the body', () => {
    const signature = 'data:image/png;base64,iVBORw0KGgo=';
    render(
      <RecordDocument
        {...props({
          definition: {
            ...consent,
            schema: {
              sections: [
                {
                  ...consent.schema.sections[0],
                  fields: [
                    ...consent.schema.sections[0].fields,
                    { key: 'signerSignature', label: 'Firma de quien acepta', type: 'signature' },
                  ],
                },
              ],
            },
          },
          record: record({
            moduleKey: 'general.consents',
            data: {
              title: 'Consentimiento para extracción',
              body: 'Autorizo el procedimiento.',
              signerName: 'María Torres',
              acceptedBy: 'PACIENTE',
              signerSignature: signature,
            },
          }),
        })}
      />,
    );

    expect(screen.getByRole('img', { name: 'Firma de María Torres' })).toHaveAttribute('src', signature);
    expect(screen.queryByText('Firma de quien acepta')).not.toBeInTheDocument();
  });

  it('carries the verification code and its address when the record has one', async () => {
    render(
      <RecordDocument {...props({ record: record({ verificationCode: 'ABCDEFGHJKMNPQRS' }) })} />,
    );

    expect(screen.getByText('Código: ABCD-EFGH-JKMN-PQRS')).toBeInTheDocument();
    expect(
      await screen.findByText(`${window.location.origin}/verify/ABCD-EFGH-JKMN-PQRS`),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: 'Código QR de verificación del documento' }),
    ).toHaveAttribute('src', expect.stringMatching(/^data:image\/svg\+xml/));
  });

  it('prints no verification block for a record without a code', () => {
    render(<RecordDocument {...props({})} />);

    expect(screen.queryByText('Verificación del documento')).not.toBeInTheDocument();
  });

  it('prints a record without patient document, birth date or known definition', () => {
    render(
      <RecordDocument
        {...props({
          definition: undefined,
          patient: { firstName: 'Ana', lastName: 'Paz', dateOfBirth: null },
          record: record({ data: { custom: 'valor' }, professional: undefined }),
        })}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Registro clínico' })).toBeInTheDocument();
    expect(screen.queryByText(/Identificación:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Edad:/)).not.toBeInTheDocument();
    expect(screen.getByText('valor')).toBeInTheDocument();
    expect(screen.getByText('Profesional tratante')).toBeInTheDocument();
  });
});
