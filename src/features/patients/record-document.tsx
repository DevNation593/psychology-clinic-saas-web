'use client';

import { RecordDataView } from '@/features/clinical-forms/clinical-module-form';
import { formatFieldValue, listFields } from '@/features/clinical-forms/form-values';
import { formatDate } from '@/lib/utils';
import type { Patient, SpecialtyRecord } from '@/types';
import type { ClinicalModuleDefinition } from '@/types/clinical';
import { isSignatureImage } from '@/features/clinical-forms/signature-pad';
import { VerificationBlock } from './document-verification';
import { describeIdentification } from './patient-identity';

export interface RecordDocumentProps {
  clinic: { name: string; address?: string | null; phone?: string | null; logoUrl?: string | null };
  patient: Pick<
    Patient,
    'firstName' | 'lastName' | 'dateOfBirth' | 'identificationType' | 'identificationNumber'
  >;
  record: SpecialtyRecord;
  /** The version the record was written under. */
  definition?: ClinicalModuleDefinition;
  /** When the document is printed; fixed by the caller so the render is repeatable. */
  printedAt: Date;
}

function ageOn(dateOfBirth: string | null | undefined, on: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth ?? '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const hadBirthday = on.getMonth() + 1 > month || (on.getMonth() + 1 === month && on.getDate() >= day);
  return on.getFullYear() - year - (hadBirthday ? 0 : 1);
}

/** Certificates and consents are titled by what they certify; everything else by its module. */
function documentTitle(record: SpecialtyRecord, definition?: ClinicalModuleDefinition): string {
  if (record.moduleKey === 'general.consents' && typeof record.data.title === 'string') {
    return record.data.title;
  }
  if (record.moduleKey === 'general.certificates' && definition) {
    const type = listFields(definition.schema).find((field) => field.key === 'certificateType');
    if (type && record.data.certificateType) {
      return formatFieldValue(type, record.data.certificateType);
    }
  }
  return definition?.name ?? 'Registro clínico';
}

// Shown in the title or the signature block instead of the body.
const HIDDEN_FIELDS: Record<string, string[]> = {
  'general.certificates': ['certificateType'],
  'general.consents': [
    'title',
    'signerName',
    'signerIdentification',
    'accepted',
    'acceptedBy',
    'signerSignature',
  ],
};

function SignatureLine({
  name,
  detail,
  image,
}: {
  name: string;
  detail?: string;
  /** A signature drawn on screen; without it the line is left to sign on paper. */
  image?: string;
}) {
  return (
    <div className="w-64 text-center text-sm">
      <div className="mb-1 flex h-16 items-end justify-center border-b border-foreground">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- a data URL kept in the record
          <img src={image} alt={`Firma de ${name}`} className="max-h-16 max-w-full object-contain" />
        )}
      </div>
      <p className="font-medium">{name}</p>
      {detail && <p className="text-muted-foreground">{detail}</p>}
    </div>
  );
}

/** A clinical record laid out as a document: letterhead, patient, content and signatures. */
export function RecordDocument({ clinic, patient, record, definition, printedAt }: RecordDocumentProps) {
  const hidden = HIDDEN_FIELDS[record.moduleKey] ?? [];
  const data = Object.fromEntries(Object.entries(record.data).filter(([key]) => !hidden.includes(key)));
  const visibleDefinition = definition && {
    ...definition,
    schema: {
      ...definition.schema,
      sections: definition.schema.sections.map((section) => ({
        ...section,
        fields: section.fields.filter((field) => !hidden.includes(field.key)),
      })),
    },
  };

  const age = ageOn(patient.dateOfBirth, new Date(record.recordDate));
  const identification = describeIdentification(patient.identificationType, patient.identificationNumber);
  const profile = record.professional?.professionalProfile;
  const professionalName = record.professional
    ? `${record.professional.firstName} ${record.professional.lastName}`
    : 'Profesional tratante';
  const isConsent = record.moduleKey === 'general.consents';

  return (
    <article className="mx-auto max-w-3xl space-y-6 bg-background p-6 text-foreground print:max-w-none print:p-0">
      <header className="flex items-start justify-between gap-6 border-b pb-4">
        <div className="flex items-center gap-4">
          {clinic.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- the logo is a clinic-provided URL
            <img src={clinic.logoUrl} alt="" className="h-14 w-14 object-contain" />
          )}
          <div>
            <p className="text-lg font-semibold">{clinic.name}</p>
            <p className="text-sm text-muted-foreground">
              {[clinic.address, clinic.phone].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <p className="whitespace-nowrap text-sm">{formatDate(record.recordDate, 'PPP')}</p>
      </header>

      <h1 className="text-center text-xl font-bold uppercase tracking-wide">
        {documentTitle(record, definition)}
      </h1>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 rounded-md border p-3 text-sm sm:grid-cols-3 print:grid-cols-3">
        <div className="sm:col-span-3 print:col-span-3">
          <dt className="inline text-muted-foreground">Paciente: </dt>
          <dd className="inline font-medium">
            {patient.firstName} {patient.lastName}
          </dd>
        </div>
        {identification && (
          <div>
            <dt className="inline text-muted-foreground">Identificación: </dt>
            <dd className="inline">{identification}</dd>
          </div>
        )}
        {age !== null && (
          <div>
            <dt className="inline text-muted-foreground">Edad: </dt>
            <dd className="inline">{age} {age === 1 ? 'año' : 'años'}</dd>
          </div>
        )}
        {record.specialty && (
          <div>
            <dt className="inline text-muted-foreground">Especialidad: </dt>
            <dd className="inline">{record.specialty.name}</dd>
          </div>
        )}
      </dl>

      <section>
        <RecordDataView definition={visibleDefinition} data={data} />
        {record.notes && <p className="mt-4 whitespace-pre-wrap text-sm">{record.notes}</p>}
      </section>

      <footer className="space-y-6 pt-10">
        <div className="flex flex-wrap justify-around gap-8">
          <SignatureLine
            name={professionalName}
            detail={[profile?.professionalTitle, profile?.licenseNumber && `Registro ${profile.licenseNumber}`]
              .filter(Boolean)
              .join(' · ')}
          />
          {isConsent && (
            <SignatureLine
              name={typeof record.data.signerName === 'string' ? record.data.signerName : 'Paciente'}
              image={
                isSignatureImage(record.data.signerSignature)
                  ? record.data.signerSignature
                  : undefined
              }
              detail={[
                record.data.acceptedBy === 'REPRESENTANTE' ? 'Representante legal' : 'Paciente',
                typeof record.data.signerIdentification === 'string' && record.data.signerIdentification,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          )}
        </div>
        {record.verificationCode && (
          <div className="border-t pt-3">
            <VerificationBlock code={record.verificationCode} />
          </div>
        )}
        <p className="border-t pt-2 text-center text-xs text-muted-foreground">
          Documento generado el {formatDate(printedAt, 'dd/MM/yyyy HH:mm')} · Registro {record.id}
          {(record.version ?? 1) > 1 ? ` · versión ${record.version}` : ''}
        </p>
      </footer>
    </article>
  );
}
