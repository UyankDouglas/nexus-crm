import type { DealBoard, DealCard, PipelineStageItem } from '@nexus/shared';

/** Cards por etapa (stageId → cards na ordem exibida). */
export type BoardColumns = Record<string, DealCard[]>;

export function columnsFromBoard(board: DealBoard): BoardColumns {
  return Object.fromEntries(board.columns.map((column) => [column.stage.id, column.deals]));
}

export function findColumnOf(columns: BoardColumns, dealId: string): string | undefined {
  return Object.keys(columns).find((stageId) =>
    columns[stageId]!.some((deal) => deal.id === dealId),
  );
}

/** Move um card para a etapa e o índice indicados, sem alterar o objeto original. */
export function moveCard(
  columns: BoardColumns,
  dealId: string,
  toStageId: string,
  toIndex: number,
): BoardColumns {
  const fromStageId = findColumnOf(columns, dealId);
  if (!fromStageId || !(toStageId in columns)) return columns;

  const card = columns[fromStageId]!.find((deal) => deal.id === dealId)!;
  const next: BoardColumns = { ...columns };
  next[fromStageId] = columns[fromStageId]!.filter((deal) => deal.id !== dealId);

  const target = [...next[toStageId]!];
  const index = Math.max(0, Math.min(toIndex, target.length));
  target.splice(index, 0, { ...card, stageId: toStageId });
  next[toStageId] = target;
  return next;
}

/** ID do card logo acima na coluna — a âncora `afterDealId` da API (`null` = topo). */
export function afterIdOf(columns: BoardColumns, stageId: string, dealId: string): string | null {
  const column = columns[stageId] ?? [];
  const index = column.findIndex((deal) => deal.id === dealId);
  return index > 0 ? column[index - 1]!.id : null;
}

export function indexOf(columns: BoardColumns, stageId: string, dealId: string): number {
  return (columns[stageId] ?? []).findIndex((deal) => deal.id === dealId);
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/**
 * Reflete a movimentação no quadro em cache (atualização otimista): ordem dos cards, etapa e
 * status do card movido e os totais de cada coluna.
 */
export function applyColumnsToBoard(
  board: DealBoard,
  columns: BoardColumns,
  movedDealId: string,
  targetStage: PipelineStageItem,
): DealBoard {
  return {
    ...board,
    columns: board.columns.map((column) => {
      const deals = (columns[column.stage.id] ?? column.deals).map((deal) =>
        deal.id === movedDealId
          ? { ...deal, stageId: targetStage.id, status: targetStage.kind }
          : deal,
      );
      return {
        ...column,
        deals,
        count: deals.length,
        totalValue: roundMoney(deals.reduce((sum, deal) => sum + deal.value, 0)),
      };
    }),
  };
}
