import { type ClosedDealFilter, type DateRange, PAGE_SIZES } from '@nexus/shared';
import { Handshake } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { DataPagination } from '@/components/data-pagination';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DealStatusBadge } from '@/features/deals/components/deal-badges';
import { formatCurrency, formatDate } from '@/lib/format';
import { dealPath } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useClosedDeals } from '../hooks';
import { ExportMenu } from './export-menu';

const FILTER_LABELS: Record<ClosedDealFilter, string> = {
  all: 'Ganhos e perdidos',
  WON: 'Somente ganhos',
  LOST: 'Somente perdidos',
};

/**
 * Negócios encerrados no período, do mais recente para o mais antigo. O componente é
 * recriado (via `key`) quando o período muda, voltando à primeira página.
 */
export function ClosedDealsReport({ range }: { range: DateRange }) {
  const [status, setStatus] = useState<ClosedDealFilter>('all');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const deals = useClosedDeals({ ...range, status, ...pagination });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Negócios ganhos e perdidos</CardTitle>
        <CardDescription>Encerrados no período, com o motivo de cada perda</CardDescription>
        <CardAction className="flex gap-2">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ClosedDealFilter);
              setPagination((current) => ({ ...current, page: 1 }));
            }}
          >
            <SelectTrigger size="sm" className="w-40" aria-label="Filtrar por resultado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {(Object.keys(FILTER_LABELS) as ClosedDealFilter[]).map((filter) => (
                <SelectItem key={filter} value={filter}>
                  {FILTER_LABELS[filter]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportMenu type="closed-deals" range={range} status={status} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {deals.isError ? (
          <p className="text-sm text-destructive">{deals.error.message}</p>
        ) : !deals.data ? (
          <div className="space-y-2" role="status" aria-label="Carregando negócios encerrados">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : deals.data.data.length === 0 ? (
          <Empty className="border border-dashed py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Handshake />
              </EmptyMedia>
              <EmptyTitle>Nenhum negócio encerrado</EmptyTitle>
              <EmptyDescription>
                Negócios marcados como ganhos ou perdidos no período aparecem aqui.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table className={cn(deals.isPlaceholderData && 'opacity-60')}>
            <TableHeader>
              <TableRow>
                <TableHead>Negócio</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Encerrado em</TableHead>
                <TableHead>Motivo da perda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.data.data.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell>
                    <Link to={dealPath(deal.id)} className="font-medium hover:underline">
                      {deal.title}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {deal.customer.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {deal.owner?.name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <DealStatusBadge status={deal.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(deal.value)}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDate(deal.closedAt)}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
                    {deal.lostReason ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {deals.data && deals.data.meta.total > 0 && (
          <DataPagination
            meta={deals.data.meta}
            pageSizes={PAGE_SIZES}
            itemLabel={{ singular: 'negócio', plural: 'negócios' }}
            onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
            onPageSizeChange={(pageSize) => setPagination({ page: 1, pageSize })}
          />
        )}
      </CardContent>
    </Card>
  );
}
