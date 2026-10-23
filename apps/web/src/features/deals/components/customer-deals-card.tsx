import type { CustomerSummary } from '@nexus/shared';
import { Handshake, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact, formatIsoDate } from '@/lib/format';
import { paths } from '@/lib/navigation';
import { useDeals } from '../hooks';
import { DealStatusBadge } from './deal-badges';
import { DealDetailSheet } from './deal-detail-sheet';
import { type DealFormMode, DealFormSheet } from './deal-form-sheet';

const PREVIEW_LIMIT = 8;

/** Negócios do cliente visíveis ao usuário (a API aplica o escopo da carteira). */
export function CustomerDealsCard({ customer }: { customer: CustomerSummary }) {
  const deals = useDeals({
    customerId: customer.id,
    page: 1,
    pageSize: PREVIEW_LIMIT,
    sort: 'recent',
  });
  const [formMode, setFormMode] = useState<DealFormMode>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const openCreate = () => setFormMode({ kind: 'create', customer });

  const rows = deals.data?.data ?? [];
  const total = deals.data?.meta.total ?? 0;
  const openValue = rows
    .filter((deal) => deal.status === 'OPEN')
    .reduce((sum, deal) => sum + deal.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Negócios</CardTitle>
        <CardDescription>
          {total === 0
            ? 'Oportunidades de venda deste cliente'
            : `${total} ${total === 1 ? 'negócio' : 'negócios'}${openValue > 0 && total <= PREVIEW_LIMIT ? ` · ${formatCurrencyCompact(openValue)} em andamento` : ''}`}
        </CardDescription>
        {total > 0 && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus />
              Novo negócio
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {deals.isError ? (
          <p className="text-sm text-destructive">{deals.error.message}</p>
        ) : !deals.data ? (
          <div className="space-y-2" role="status" aria-label="Carregando negócios">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <Empty className="border border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Handshake />
              </EmptyMedia>
              <EmptyTitle>Nenhum negócio registrado</EmptyTitle>
              <EmptyDescription>
                Registre uma oportunidade para acompanhá-la no funil de vendas.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={openCreate}>
                <Plus />
                Novo negócio
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <ul className="divide-y">
              {rows.map((deal) => (
                <li
                  key={deal.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => setOpenDealId(deal.id)}
                      className="block max-w-full truncate text-left text-sm font-medium hover:text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      {deal.title}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {deal.stageName}
                      {deal.owner && ` · ${deal.owner.name}`}
                      {deal.status === 'OPEN' &&
                        deal.expectedCloseDate &&
                        ` · previsão ${formatIsoDate(deal.expectedCloseDate)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(deal.value)}
                    </span>
                    <DealStatusBadge status={deal.status} />
                  </div>
                </li>
              ))}
            </ul>
            {total > rows.length && (
              <Button asChild variant="link" size="sm" className="mt-2 px-0">
                <Link to={`${paths.pipeline}?search=${encodeURIComponent(customer.name)}`}>
                  Ver todos os {total} negócios no funil
                </Link>
              </Button>
            )}
          </>
        )}
      </CardContent>

      <DealDetailSheet
        dealId={openDealId}
        onClose={() => setOpenDealId(null)}
        onEdit={(dealId) => setFormMode({ kind: 'edit', dealId })}
      />
      <DealFormSheet mode={formMode} onClose={() => setFormMode(null)} />
    </Card>
  );
}
