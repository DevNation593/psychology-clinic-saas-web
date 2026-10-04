'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FormValues, TableRow } from './form-values';

export type Dentition = 'PERMANENT' | 'TEMPORARY' | 'MIXED';

export const TOOTH_STATES: Record<string, { label: string; color: string; wholeTooth: boolean }> = {
  CARIES: { label: 'Caries', color: '#dc2626', wholeTooth: false },
  RESTORATION: { label: 'Restauración', color: '#2563eb', wholeTooth: false },
  MISSING: { label: 'Ausente', color: '#6b7280', wholeTooth: true },
  CROWN: { label: 'Corona', color: '#d97706', wholeTooth: true },
  ENDODONTICS_INDICATED: { label: 'Endodoncia indicada', color: '#7c3aed', wholeTooth: true },
  EXTRACTION_INDICATED: { label: 'Extracción indicada', color: '#9f1239', wholeTooth: true },
  IMPLANT: { label: 'Implante', color: '#0f766e', wholeTooth: true },
};

export const SURFACE_LABELS: Record<string, string> = {
  O: 'Oclusal / incisal',
  M: 'Mesial',
  D: 'Distal',
  V: 'Vestibular',
  L: 'Lingual / palatina',
  W: 'Pieza completa',
};

const DENTITION_LABELS: Record<Dentition, string> = {
  PERMANENT: 'Permanente',
  TEMPORARY: 'Temporal',
  MIXED: 'Mixta',
};

const range = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, index) =>
    String(from < to ? from + index : from - index),
  );

// Each arch as the dentist sees it: the patient's right side on the left of the screen (FDI).
const ARCHES: Record<'permanent' | 'temporary', { upper: string[]; lower: string[] }> = {
  permanent: {
    upper: [...range(18, 11), ...range(21, 28)],
    lower: [...range(48, 41), ...range(31, 38)],
  },
  temporary: {
    upper: [...range(55, 51), ...range(61, 65)],
    lower: [...range(85, 81), ...range(71, 75)],
  },
};

type Zone = 'top' | 'bottom' | 'left' | 'right' | 'center';

const ZONE_PATHS: Record<Zone, string> = {
  top: 'M2 2 L38 2 L27 13 L13 13 Z',
  bottom: 'M2 38 L38 38 L27 27 L13 27 Z',
  left: 'M2 2 L13 13 L13 27 L2 38 Z',
  right: 'M38 2 L27 13 L27 27 L38 38 Z',
  center: 'M13 13 L27 13 L27 27 L13 27 Z',
};

/** Which surface each zone of the drawing is, given where the tooth sits in the mouth. */
function zoneSurface(tooth: string, zone: Zone): string {
  const quadrant = Number(tooth[0]);
  const upper = [1, 2, 5, 6].includes(quadrant);
  const patientRight = [1, 4, 5, 8].includes(quadrant);
  switch (zone) {
    case 'center':
      return 'O';
    case 'top':
      return upper ? 'V' : 'L';
    case 'bottom':
      return upper ? 'L' : 'V';
    case 'left':
      // Mesial always faces the midline, which is to the right of the patient's right side.
      return patientRight ? 'D' : 'M';
    case 'right':
      return patientRight ? 'M' : 'D';
  }
}

interface Finding {
  tooth: string;
  surface: string;
  state: string;
}

const toFindings = (value: unknown): Finding[] =>
  Array.isArray(value)
    ? (value as TableRow[]).filter(
        (row): row is TableRow & Finding =>
          typeof row?.tooth === 'string' &&
          typeof row?.surface === 'string' &&
          typeof row?.state === 'string' &&
          row.state in TOOTH_STATES,
      )
    : [];

export interface OdontogramProps {
  /** Reads and writes `dentition` and `findings` of the odontogram module. */
  values: FormValues;
  onChange?: (values: FormValues) => void;
  readOnly?: boolean;
  disabled?: boolean;
}

function Tooth({
  tooth,
  findings,
  onZone,
  interactive,
}: {
  tooth: string;
  findings: Finding[];
  onZone: (surface: string) => void;
  interactive: boolean;
}) {
  const own = findings.filter((finding) => finding.tooth === tooth);
  const whole = own.find((finding) => finding.surface === 'W');
  const stateOf = (surface: string) => own.find((finding) => finding.surface === surface)?.state;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{tooth}</span>
      <svg viewBox="0 0 40 40" className="h-9 w-9 sm:h-10 sm:w-10" role="group" aria-label={`Pieza ${tooth}`}>
        {(Object.keys(ZONE_PATHS) as Zone[]).map((zone) => {
          const surface = zoneSurface(tooth, zone);
          const state = stateOf(surface);
          const label = `Pieza ${tooth}, ${SURFACE_LABELS[surface].toLowerCase()}${
            state ? `: ${TOOTH_STATES[state].label}` : ''
          }`;
          return (
            <path
              key={zone}
              d={ZONE_PATHS[zone]}
              fill={state ? TOOTH_STATES[state].color : 'hsl(var(--background))'}
              fillOpacity={whole ? 0.25 : 1}
              stroke="hsl(var(--foreground))"
              strokeWidth={1}
              className={cn(interactive && 'cursor-pointer hover:opacity-70 focus:outline-none focus-visible:stroke-[3]')}
              {...(interactive
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': label,
                    onClick: () => onZone(surface),
                    onKeyDown: (event: React.KeyboardEvent) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onZone(surface);
                      }
                    },
                  }
                : { 'aria-label': label })}
            />
          );
        })}
        {whole && (
          <g pointerEvents="none" aria-hidden="true">
            <rect x={2} y={2} width={36} height={36} fill={TOOTH_STATES[whole.state].color} fillOpacity={0.35} />
            <path
              d="M6 6 L34 34 M34 6 L6 34"
              stroke={TOOTH_STATES[whole.state].color}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * The odontogram: choose a state, then click a surface to mark it. States that affect the whole
 * tooth are stored under surface W. Every finding is also listed as text below the drawing.
 */
export function Odontogram({ values, onChange, readOnly = false, disabled }: OdontogramProps) {
  const [tool, setTool] = useState<string>('CARIES');
  const dentition = (values.dentition as Dentition) || 'PERMANENT';
  const findings = toFindings(values.findings);
  const interactive = !readOnly && !disabled;

  const setFindings = (next: Finding[]) => onChange?.({ ...values, findings: next });

  const applyTool = (tooth: string, surface: string) => {
    if (tool === 'ERASE') {
      const hasSurface = findings.some((f) => f.tooth === tooth && f.surface === surface);
      // With nothing on that surface, erasing removes the whole-tooth state instead.
      setFindings(
        findings.filter(
          (f) => !(f.tooth === tooth && f.surface === (hasSurface ? surface : 'W')),
        ),
      );
      return;
    }
    const target = TOOTH_STATES[tool].wholeTooth ? 'W' : surface;
    const existing = findings.find((f) => f.tooth === tooth && f.surface === target);
    const others = findings.filter((f) => !(f.tooth === tooth && f.surface === target));
    // Marking the same state again clears it.
    setFindings(existing?.state === tool ? others : [...others, { tooth, surface: target, state: tool }]);
  };

  const arches = [
    ...(dentition !== 'TEMPORARY' ? [ARCHES.permanent] : []),
    ...(dentition !== 'PERMANENT' ? [ARCHES.temporary] : []),
  ];

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="odontogram-dentition">
              Dentición<span className="text-destructive"> *</span>
            </Label>
            <select
              id="odontogram-dentition"
              value={dentition}
              disabled={disabled}
              onChange={(event) => onChange?.({ ...values, dentition: event.target.value })}
              className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(DENTITION_LABELS) as Dentition[]).map((option) => (
                <option key={option} value={option}>
                  {DENTITION_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <div role="radiogroup" aria-label="Estado a marcar" className="flex flex-wrap gap-2">
            {[...Object.entries(TOOTH_STATES), ['ERASE', { label: 'Borrar', color: 'transparent' }] as const].map(
              ([key, state]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={tool === key}
                  disabled={disabled}
                  onClick={() => setTool(key)}
                  className={cn(
                    'flex min-h-[36px] items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    tool === key ? 'border-primary bg-primary/10' : 'border-input hover:bg-accent',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 rounded-sm border border-foreground/40"
                    style={{ backgroundColor: state.color }}
                  />
                  {state.label}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-input p-3">
        <div className="mx-auto w-max space-y-4">
          {arches.map((arch, index) => (
            <div key={index} className="space-y-2">
              {[arch.upper, arch.lower].map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1">
                  {row.map((tooth, toothIndex) => (
                    <div
                      key={tooth}
                      className={cn(toothIndex === row.length / 2 && 'ml-2 border-l border-input pl-2')}
                    >
                      <Tooth
                        tooth={tooth}
                        findings={findings}
                        interactive={interactive}
                        onZone={(surface) => applyTool(tooth, surface)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Hallazgos</p>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin hallazgos: todas las piezas se registran sanas.</p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-2">
            {findings.map((finding) => (
              <li
                key={`${finding.tooth}-${finding.surface}`}
                className="flex items-center gap-1.5 rounded-full border border-input px-2.5 py-1 text-xs"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: TOOTH_STATES[finding.state].color }}
                />
                Pieza {finding.tooth} · {SURFACE_LABELS[finding.surface] ?? finding.surface} ·{' '}
                {TOOTH_STATES[finding.state].label}
                {interactive && (
                  <button
                    type="button"
                    onClick={() => setFindings(findings.filter((f) => f !== finding))}
                    aria-label={`Quitar hallazgo de la pieza ${finding.tooth}, ${(
                      SURFACE_LABELS[finding.surface] ?? finding.surface
                    ).toLowerCase()}`}
                    className="rounded-full p-0.5 hover:bg-accent"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
