import type { DealBoard, DealCard, PipelineStageItem } from '@nexus/shared';
import {
  type Announcements,
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { usePermission } from '@/features/auth/hooks';
import {
  afterIdOf,
  applyColumnsToBoard,
  type BoardColumns,
  columnsFromBoard,
  findColumnOf,
  indexOf,
  moveCard,
} from '../board-utils';
import { useMoveDeal } from '../hooks';
import { BoardColumnView } from './board-column';
import { LostDealDialog, WonDealDialog } from './close-deal-dialogs';
import { DealCardView } from './deal-card';

interface PendingMove {
  deal: DealCard;
  stage: PipelineStageItem;
  columns: BoardColumns;
}

interface DealBoardViewProps {
  board: DealBoard;
  /** Chave do quadro no cache, para a atualização otimista. */
  queryKey: readonly unknown[];
  onOpenDeal: (dealId: string) => void;
}

export function DealBoardView({ board, queryKey, onOpenDeal }: DealBoardViewProps) {
  const queryClient = useQueryClient();
  const move = useMoveDeal();
  const canReopen = usePermission('deals:reopen');
  const baseColumns = useMemo(() => columnsFromBoard(board), [board]);
  // Durante o arraste, o quadro exibe um estado local; ao soltar, o cache é atualizado.
  const [dragColumns, setDragColumns] = useState<BoardColumns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const columns = dragColumns ?? baseColumns;

  const stages = board.pipeline.stages;
  const stageById = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);
  const dealById = useMemo(
    () => new Map(board.columns.flatMap((column) => column.deals).map((deal) => [deal.id, deal])),
    [board],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columnOf = (id: string, current: BoardColumns) =>
    stageById.has(id) ? id : findColumnOf(current, id);

  const commit = (
    deal: DealCard,
    stage: PipelineStageItem,
    next: BoardColumns,
    lostReason?: string,
  ) => {
    const previous = queryClient.getQueryData<DealBoard>(queryKey);
    queryClient.setQueryData<DealBoard>(queryKey, (current) =>
      current ? applyColumnsToBoard(current, next, deal.id, stage) : current,
    );
    setDragColumns(null);
    setPending(null);

    move.mutate(
      {
        id: deal.id,
        input: { stageId: stage.id, afterDealId: afterIdOf(next, stage.id, deal.id), lostReason },
      },
      {
        onSuccess: () => {
          if (stage.id === deal.stageId) return;
          if (stage.kind === 'WON') toast.success(`${deal.title} foi ganho!`);
          else if (stage.kind === 'LOST') toast.info(`${deal.title} foi marcado como perdido.`);
          else toast.success(`${deal.title} movido para ${stage.name}.`);
        },
        onError: (error) => {
          queryClient.setQueryData(queryKey, previous);
          toast.error(error.message);
        },
      },
    );
  };

  /** Encerramentos pedem confirmação (ganho) ou motivo (perda) antes de gravar. */
  const finish = (deal: DealCard, stage: PipelineStageItem, next: BoardColumns) => {
    if (stage.id !== deal.stageId && stage.kind !== 'OPEN') {
      setPending({ deal, stage, columns: next });
      return;
    }
    commit(deal, stage, next);
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDragColumns(baseColumns);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !dragColumns) return;
    const from = findColumnOf(dragColumns, String(active.id));
    const to = columnOf(String(over.id), dragColumns);
    if (!from || !to || from === to) return;

    const overIndex = stageById.has(String(over.id))
      ? dragColumns[to]!.length
      : indexOf(dragColumns, to, String(over.id));
    setDragColumns(moveCard(dragColumns, String(active.id), to, overIndex));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const dealId = String(active.id);
    const deal = dealById.get(dealId);
    if (!over || !dragColumns || !deal) {
      setDragColumns(null);
      return;
    }

    const to = columnOf(String(over.id), dragColumns) ?? deal.stageId;
    let next = dragColumns;
    if (!stageById.has(String(over.id)) && String(over.id) !== dealId) {
      next = moveCard(dragColumns, dealId, to, indexOf(dragColumns, to, String(over.id)));
    }

    const unchanged =
      to === deal.stageId &&
      indexOf(next, to, dealId) === indexOf(baseColumns, deal.stageId, dealId);
    if (unchanged) {
      setDragColumns(null);
      return;
    }
    finish(deal, stageById.get(to)!, next);
  };

  /** Alternativa ao arraste (menu do card): envia para o topo da etapa escolhida. */
  const moveTo = (deal: DealCard, stage: PipelineStageItem) => {
    finish(deal, stage, moveCard(baseColumns, deal.id, stage.id, 0));
  };

  const cancelPending = () => {
    setPending(null);
    setDragColumns(null);
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Negócio ${dealById.get(String(active.id))?.title ?? ''} selecionado.`,
    onDragOver: ({ active, over }) => {
      if (!over) return `${dealById.get(String(active.id))?.title ?? 'Negócio'} fora de uma etapa.`;
      const stage = stageById.get(columnOf(String(over.id), columns) ?? '');
      return stage ? `Sobre a etapa ${stage.name}.` : undefined;
    },
    onDragEnd: ({ over }) => {
      const stage = over ? stageById.get(columnOf(String(over.id), columns) ?? '') : undefined;
      return stage ? `Negócio solto na etapa ${stage.name}.` : 'Movimentação cancelada.';
    },
    onDragCancel: () => 'Movimentação cancelada. O negócio voltou à posição original.',
  };

  const activeDeal = activeId ? dealById.get(activeId) : undefined;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setDragColumns(null);
        }}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'Para mover o negócio, pressione Espaço ou Enter. Use as setas para escolher a posição e a etapa, Espaço ou Enter para soltar e Esc para cancelar.',
          },
        }}
      >
        <div
          className="flex h-full gap-3 overflow-x-auto pb-3"
          aria-label="Quadro do funil de vendas"
        >
          {board.columns.map((column) => (
            <BoardColumnView
              key={column.stage.id}
              stage={column.stage}
              deals={columns[column.stage.id] ?? []}
              summary={dragColumns ? summarize(columns[column.stage.id] ?? []) : column}
              stages={stages}
              canMoveClosed={canReopen}
              onOpen={onOpenDeal}
              onMoveTo={moveTo}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal ? <DealCardView deal={activeDeal} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <WonDealDialog
        deal={pending?.stage.kind === 'WON' ? pending.deal : null}
        onCancel={cancelPending}
        onConfirm={() => pending && commit(pending.deal, pending.stage, pending.columns)}
      />
      <LostDealDialog
        deal={pending?.stage.kind === 'LOST' ? pending.deal : null}
        onCancel={cancelPending}
        onConfirm={(reason) =>
          pending && commit(pending.deal, pending.stage, pending.columns, reason)
        }
      />
    </>
  );
}

function summarize(deals: DealCard[]) {
  return {
    count: deals.length,
    totalValue: Math.round(deals.reduce((sum, deal) => sum + deal.value, 0) * 100) / 100,
  };
}
