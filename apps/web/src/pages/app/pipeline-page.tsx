import { KanbanSquare, Plus, RefreshCw, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/features/auth/hooks';
import {
  type BoardFilters,
  hasBoardFilters,
  parseBoardFilters,
  serializeBoardFilters,
} from '@/features/deals/board-filters';
import { BoardToolbar } from '@/features/deals/components/board-toolbar';
import { DealBoardView } from '@/features/deals/components/deal-board';
import { DealDetailSheet } from '@/features/deals/components/deal-detail-sheet';
import { type DealFormMode, DealFormSheet } from '@/features/deals/components/deal-form-sheet';
import { DealStatsCards } from '@/features/deals/components/deal-stats-cards';
import { useBoard, useDealStats, usePipelines } from '@/features/deals/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { DEAL_PARAM, NEW_DEAL_PARAM } from '@/lib/navigation';
import { queryKeys } from '@/lib/query-keys';
import type { BoardParams } from '@/services/deals.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function PipelinePage() {
  useDocumentTitle('Funil de vendas');
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const filters = useMemo(() => parseBoardFilters(new URLSearchParams(queryString)), [queryString]);
  const canViewAll = usePermission('deals:read-all');
  const pipelines = usePipelines();
  const stats = useDealStats();

  const pipeline =
    pipelines.data?.find((item) => item.id === filters.pipelineId) ??
    pipelines.data?.find((item) => item.isDefault) ??
    pipelines.data?.[0];
  const boardParams = useMemo<BoardParams>(
    () => ({ search: filters.search, owner: filters.owner }),
    [filters.search, filters.owner],
  );
  const board = useBoard(pipeline?.id, boardParams);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [toolbarKey, setToolbarKey] = useState(0);
  const creating = searchParams.get(NEW_DEAL_PARAM) === '1';
  const openDealParam = searchParams.get(DEAL_PARAM);
  const openDealId = openDealParam && UUID.test(openDealParam) ? openDealParam : null;
  const formMode: DealFormMode = creating
    ? { kind: 'create', pipelineId: pipeline?.id }
    : editingId
      ? { kind: 'edit', dealId: editingId }
      : null;

  const applyFilters = (next: BoardFilters) =>
    setSearchParams(serializeBoardFilters(next), { replace: true });
  const changeFilters = (change: Partial<BoardFilters>) => applyFilters({ ...filters, ...change });
  const resetFilters = () => {
    applyFilters({ pipelineId: filters.pipelineId });
    setToolbarKey((key) => key + 1);
  };

  /** Detalhes e cadastro ficam na URL: o "voltar" do navegador fecha a gaveta. */
  const withParam = (name: string, value: string) => {
    const next = serializeBoardFilters(filters);
    next.set(name, value);
    setSearchParams(next);
  };
  const clearParams = () => setSearchParams(serializeBoardFilters(filters), { replace: true });

  const filtered = hasBoardFilters(filters);
  const totalDeals = board.data?.columns.reduce((sum, column) => sum + column.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funil de vendas"
        description={
          canViewAll
            ? 'Oportunidades de toda a equipe, da prospecção ao fechamento.'
            : 'As oportunidades pelas quais você é responsável.'
        }
        actions={
          <Button onClick={() => withParam(NEW_DEAL_PARAM, '1')}>
            <Plus />
            Novo negócio
          </Button>
        }
      />

      <DealStatsCards stats={stats.data} />

      {pipelines.isError ? (
        <LoadError message={pipelines.error.message} onRetry={() => void pipelines.refetch()} />
      ) : pipelines.data && !pipeline ? (
        <Alert variant="destructive">
          <AlertTitle>Nenhum funil configurado</AlertTitle>
          <AlertDescription>
            Esta organização ainda não tem um funil de vendas. Fale com um administrador.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <BoardToolbar
            key={toolbarKey}
            filters={filters}
            pipelines={pipelines.data ?? []}
            pipelineId={pipeline?.id ?? ''}
            onChange={changeFilters}
            onReset={resetFilters}
          />

          {board.isError ? (
            <LoadError message={board.error.message} onRetry={() => void board.refetch()} />
          ) : !board.data || !pipeline ? (
            <BoardSkeleton />
          ) : totalDeals === 0 && !filtered ? (
            <Empty className="border border-dashed py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <KanbanSquare />
                </EmptyMedia>
                <EmptyTitle>Nenhum negócio no funil ainda</EmptyTitle>
                <EmptyDescription>
                  Cadastre uma oportunidade para um cliente e acompanhe cada etapa até o fechamento.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => withParam(NEW_DEAL_PARAM, '1')}>
                  <Plus />
                  Cadastrar primeiro negócio
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              {totalDeals === 0 && (
                <Alert>
                  <SearchX />
                  <AlertTitle>Nenhum negócio encontrado</AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center gap-3">
                    Ajuste a busca ou o filtro de responsável.
                    <Button size="sm" variant="outline" onClick={resetFilters}>
                      Limpar filtros
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              <div
                className="h-[calc(100dvh-19rem)] min-h-[26rem]"
                aria-busy={board.isPlaceholderData}
              >
                <DealBoardView
                  board={board.data}
                  queryKey={queryKeys.deals.board(pipeline.id, boardParams)}
                  onOpenDeal={(dealId) => withParam(DEAL_PARAM, dealId)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Negócios ganhos e perdidos ficam no quadro por {board.data.closedWindowDays} dias
                após o encerramento. Arraste os cards ou use o menu de cada card para mudar a etapa.
              </p>
            </>
          )}
        </div>
      )}

      <DealDetailSheet dealId={openDealId} onClose={clearParams} onEdit={setEditingId} />
      <DealFormSheet
        mode={formMode}
        onClose={() => {
          setEditingId(null);
          if (creating) clearParams();
        }}
      />
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Não foi possível carregar o funil</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        {message}
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw />
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" role="status" aria-label="Carregando quadro">
      {Array.from({ length: 5 }, (_, column) => (
        <div key={column} className="w-72 shrink-0 space-y-2 rounded-xl border bg-muted/40 p-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: 3 - (column % 2) }, (_, card) => (
            <Skeleton key={card} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
