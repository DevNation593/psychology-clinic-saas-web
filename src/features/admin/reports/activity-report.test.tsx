import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityReport as Report } from '@/lib/api/reports-api';
import { ActivityReport, currentMonth, reportPeriod } from './activity-report';

const hooks = vi.hoisted(() => ({
  params: [] as unknown[],
  report: { data: undefined as unknown, isError: false, isPending: false, refetch: vi.fn() },
  branches: [] as unknown[],
}));

vi.mock('@/hooks/useReports', () => ({
  useActivityReport: (params: unknown) => {
    hooks.params.push(params);
    return hooks.report;
  },
}));
vi.mock('@/hooks/useBranches', () => ({ useBranches: () => ({ data: hooks.branches }) }));

const counts = (appointments: number, encounters: number) => ({
  appointments,
  completed: appointments,
  cancelled: 0,
  noShow: 0,
  encounters,
});
const report: Report = {
  from: '2026-10-01T05:00:00.000Z',
  to: '2026-11-01T05:00:00.000Z',
  branchId: null,
  totals: { appointments: 12, completed: 9, cancelled: 2, noShow: 1, encounters: 8 },
  appointmentsByStatus: { COMPLETED: 9, CANCELLED: 2, NO_SHOW: 1 },
  encountersByType: { FIRST_VISIT: 5, CONTROL: 3 },
  branches: [
    { branchId: 'main', name: 'Sede principal', isActive: true, ...counts(7, 6) },
    { branchId: 'north', name: 'Sede Norte', isActive: false, ...counts(4, 2) },
    { branchId: null, name: 'Sin sede', isActive: true, ...counts(1, 0) },
  ],
  professionals: [{ professionalId: 'ana', name: 'Ana Ruiz', ...counts(12, 8) }],
};

beforeEach(() => {
  vi.clearAllMocks();
  hooks.params = [];
  hooks.report = { data: report, isError: false, isPending: false, refetch: vi.fn() };
  hooks.branches = [
    { id: 'main', name: 'Sede principal', isMain: true, isActive: true },
    { id: 'north', name: 'Sede Norte', isMain: false, isActive: false },
  ];
});

describe('reportPeriod', () => {
  it('covers from the start of the first day to the end of the last one', () => {
    const period = reportPeriod('2026-10-01', '2026-10-31');

    expect(period).toEqual({
      from: new Date(2026, 9, 1).toISOString(),
      to: new Date(2026, 10, 1).toISOString(),
    });
  });

  it('explains dates that do not make a period', () => {
    expect(reportPeriod('', '2026-10-31')).toBe('Elige la fecha inicial y la final.');
    expect(reportPeriod('2026-10-31', '2026-10-01')).toBe(
      'La fecha final no puede ser anterior a la inicial.',
    );
    expect(reportPeriod('2025-01-01', '2026-06-01')).toBe('El reporte cubre como máximo un año.');
    // A single day is a valid period.
    expect(reportPeriod('2026-10-03', '2026-10-03')).toEqual(expect.objectContaining({ from: expect.any(String) }));
  });

  it('starts on the current month', () => {
    expect(currentMonth(new Date(2026, 1, 14))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});

describe('ActivityReport', () => {
  it('shows the totals and the counts by branch and by professional', () => {
    render(<ActivityReport />);

    const byBranch = screen.getByRole('table', { name: 'Citas y atenciones por sede' });
    const rows = within(byBranch).getAllByRole('row');
    expect(within(byBranch).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
      'Sede principal',
      'Sede Norte (inactiva)',
      'Sin sede',
    ]);
    expect(within(rows[1]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '7',
      '7',
      '0',
      '0',
      '6',
    ]);
    expect(
      within(screen.getByRole('table', { name: 'Citas y atenciones por profesional' })).getByRole(
        'rowheader',
        { name: 'Ana Ruiz' },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Primera consulta')).toBeInTheDocument();
    expect(screen.getByText('No asistió', { selector: 'dt' })).toBeInTheDocument();
  });

  it('asks again for the chosen branch and period', () => {
    render(<ActivityReport />);

    fireEvent.change(screen.getByLabelText('Sede'), { target: { value: 'north' } });
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-09-30' } });

    expect(hooks.params.at(-1)).toEqual({
      from: new Date(2026, 8, 1).toISOString(),
      to: new Date(2026, 9, 1).toISOString(),
      branchId: 'north',
    });
  });

  it('explains an invalid period instead of asking the API', () => {
    render(<ActivityReport />);

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2020-01-01' } });

    expect(screen.getByText('La fecha final no puede ser anterior a la inicial.')).toBeInTheDocument();
    expect(hooks.params.at(-1)).toBeNull();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toHaveAttribute('aria-invalid', 'true');
  });

  it('hides the branch filter in a clinic with a single branch and offers to retry on error', () => {
    hooks.branches = [{ id: 'main', name: 'Sede principal', isMain: true, isActive: true }];
    hooks.report = { data: undefined, isError: true, isPending: false, refetch: vi.fn() };
    render(<ActivityReport />);

    expect(screen.queryByLabelText('Sede')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(hooks.report.refetch).toHaveBeenCalled();
  });
});
