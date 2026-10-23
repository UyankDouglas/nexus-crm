import type { PageMeta } from '@nexus/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataPaginationProps {
  meta: PageMeta;
  pageSizes: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemLabel?: { singular: string; plural: string };
}

export function DataPagination({
  meta,
  pageSizes,
  onPageChange,
  onPageSizeChange,
  itemLabel = { singular: 'registro', plural: 'registros' },
}: DataPaginationProps) {
  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const last = Math.min(meta.page * meta.pageSize, meta.total);
  const totalPages = Math.max(meta.totalPages, 1);

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <p aria-live="polite">
        {meta.total === 0
          ? `Nenhum ${itemLabel.singular}`
          : `Mostrando ${first}–${last} de ${meta.total} ${meta.total === 1 ? itemLabel.singular : itemLabel.plural}`}
      </p>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="hidden sm:inline">Por página</span>
          <Select
            value={String(meta.pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size="sm" className="w-18" aria-label="Itens por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <span className="tabular-nums">
          Página {Math.min(meta.page, totalPages)} de {totalPages}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(meta.page - 1)}
            disabled={meta.page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(meta.page + 1)}
            disabled={meta.page >= totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </nav>
  );
}
