import type { DateRange, SellerReportRow } from '@nexus/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartCard } from '@/features/dashboard/components/charts/chart-card';
import { formatCurrency, formatPercent } from '@/lib/format';
import { ExportMenu } from './export-menu';

const numeric = 'text-right tabular-nums';

/** Desempenho por vendedor: resultados do período, carteira em andamento e produtividade. */
export function SellersReport({
  sellers,
  range,
}: {
  sellers: SellerReportRow[] | undefined;
  range: DateRange;
}) {
  return (
    <ChartCard
      title="Desempenho por vendedor"
      description="Resultados no período, carteira em andamento e produtividade"
      action={<ExportMenu type="sellers" range={range} />}
      loading={!sellers}
      empty={sellers?.length === 0}
      emptyMessage="Nenhum vendedor ou gestor ativo na organização."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendedor</TableHead>
            <TableHead className={numeric}>Ganhos</TableHead>
            <TableHead className={numeric}>Receita</TableHead>
            <TableHead className={numeric}>Perdidos</TableHead>
            <TableHead className={numeric}>Conversão</TableHead>
            <TableHead className={numeric}>Ticket médio</TableHead>
            <TableHead className={numeric}>Em andamento</TableHead>
            <TableHead className={numeric}>Atividades</TableHead>
            <TableHead className={numeric}>Tarefas concluídas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sellers?.map((row) => (
            <TableRow key={row.user?.id ?? 'unassigned'}>
              <TableCell className="font-medium">
                {row.user?.name ?? <span className="text-muted-foreground">Sem responsável</span>}
              </TableCell>
              <TableCell className={numeric}>{row.wonCount}</TableCell>
              <TableCell className={numeric}>{formatCurrency(row.wonValue)}</TableCell>
              <TableCell className={numeric}>{row.lostCount}</TableCell>
              <TableCell className={numeric}>
                {row.conversionRate === null ? '—' : formatPercent(row.conversionRate)}
              </TableCell>
              <TableCell className={numeric}>
                {row.averageTicket === null ? '—' : formatCurrency(row.averageTicket)}
              </TableCell>
              <TableCell className={numeric}>
                {formatCurrency(row.openValue)}
                <span className="block text-xs text-muted-foreground">
                  {row.openCount} {row.openCount === 1 ? 'negócio' : 'negócios'}
                </span>
              </TableCell>
              <TableCell className={numeric}>{row.activities}</TableCell>
              <TableCell className={numeric}>{row.tasksCompleted}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ChartCard>
  );
}
