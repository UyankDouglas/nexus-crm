import {
  type ClosedDealFilter,
  type DateRange,
  EXPORT_FORMAT_LABELS,
  EXPORT_FORMATS,
  type ExportFormat,
  REPORT_TYPE_LABELS,
  type ReportType,
} from '@nexus/shared';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { usePermission } from '@/features/auth/hooks';
import { useExportReport } from '../hooks';

const FORMAT_ICONS = { csv: FileText, xlsx: FileSpreadsheet } as const;

interface ExportMenuProps {
  type: ReportType;
  range: DateRange;
  /** Filtro de status (apenas para negócios encerrados). */
  status?: ClosedDealFilter;
}

/** Exporta o relatório do período em CSV ou Excel; some para quem não pode exportar. */
export function ExportMenu({ type, range, status }: ExportMenuProps) {
  const canExport = usePermission('reports:export');
  const exportReport = useExportReport();
  if (!canExport) return null;

  const run = (format: ExportFormat) =>
    exportReport.mutate(
      { ...range, type, format, status },
      {
        onSuccess: (file) => toast.success(`Arquivo ${file.filename} gerado.`),
        onError: (error) => toast.error(error.message),
      },
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={exportReport.isPending}
          aria-label={`Exportar ${REPORT_TYPE_LABELS[type]}`}
        >
          {exportReport.isPending ? <Spinner /> : <Download />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{REPORT_TYPE_LABELS[type]}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {EXPORT_FORMATS.map((format) => {
          const Icon = FORMAT_ICONS[format];
          return (
            <DropdownMenuItem key={format} onSelect={() => run(format)}>
              <Icon />
              {EXPORT_FORMAT_LABELS[format]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
