import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** With `pageSize`, also shows which rows of the total are on screen. */
  total?: number;
  pageSize?: number;
  className?: string;
}

/** Previous/next controls for a list; renders nothing while everything fits on one page. */
export function Pagination({ page, totalPages, onPageChange, total, pageSize, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const range =
    total !== undefined && pageSize !== undefined
      ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`
      : null;

  return (
    <nav aria-label="Paginación" className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
        <p>
          Página {page} de {totalPages}
        </p>
        {range && <p>{range}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
