import type { BoardColumn, DealCard, PipelineStageItem } from '@nexus/shared';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CircleCheck, CircleX, Inbox } from 'lucide-react';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SortableDealCard } from './deal-card';

interface BoardColumnViewProps {
  stage: PipelineStageItem;
  deals: DealCard[];
  summary: Pick<BoardColumn, 'count' | 'totalValue'>;
  stages: PipelineStageItem[];
  canMoveClosed: boolean;
  onOpen: (dealId: string) => void;
  onMoveTo: (deal: DealCard, stage: PipelineStageItem) => void;
}

export function BoardColumnView({
  stage,
  deals,
  summary,
  stages,
  canMoveClosed,
  onOpen,
  onMoveTo,
}: BoardColumnViewProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: 'column' } });
  const headingId = `coluna-${stage.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex max-h-full w-72 shrink-0 flex-col rounded-xl border bg-muted/40',
        stage.kind === 'WON' && 'border-t-4 border-t-success',
        stage.kind === 'LOST' && 'border-t-4 border-t-destructive',
        stage.kind === 'OPEN' && 'border-t-4 border-t-primary/60',
      )}
    >
      <header className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-1.5 truncate text-sm font-semibold">
            {stage.kind === 'WON' && <CircleCheck className="size-4 text-success" />}
            {stage.kind === 'LOST' && <CircleX className="size-4 text-destructive" />}
            {stage.name}
          </h2>
          <p className="text-xs text-muted-foreground" title={formatCurrency(summary.totalValue)}>
            {formatCurrencyCompact(summary.totalValue)}
            {stage.kind === 'OPEN' && ` · ${stage.probability}% de chance`}
          </p>
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums">
          {summary.count}
        </span>
      </header>

      <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3 transition-colors',
            isOver && 'rounded-b-xl bg-primary/5',
          )}
        >
          {deals.map((deal) => (
            <SortableDealCard
              key={deal.id}
              deal={deal}
              stages={stages}
              disabled={deal.status !== 'OPEN' && !canMoveClosed}
              onOpen={onOpen}
              onMoveTo={onMoveTo}
            />
          ))}
          {deals.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-6 text-xs text-muted-foreground">
              <Inbox className="size-4" />
              Arraste negócios para cá
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
