import type { DealBoard, DealCard, PipelineStageItem } from '@nexus/shared';
import { describe, expect, it } from 'vitest';
import {
  adjacentStage,
  afterIdOf,
  applyColumnsToBoard,
  columnsFromBoard,
  findColumnOf,
  moveCard,
} from './board-utils';

const stage = (id: string, kind: PipelineStageItem['kind'] = 'OPEN', position = 0) => ({
  id,
  name: id,
  kind,
  probability: 0,
  position,
});

const card = (id: string, stageId: string, value = 100): DealCard => ({
  id,
  title: id,
  value,
  status: 'OPEN',
  expectedCloseDate: null,
  stageId,
  pipelineId: 'p1',
  customer: { id: 'c1', name: 'Cliente' },
  owner: null,
  stageChangedAt: '2026-10-01T00:00:00.000Z',
  closedAt: null,
  updatedAt: '2026-10-01T00:00:00.000Z',
});

const board: DealBoard = {
  pipeline: {
    id: 'p1',
    name: 'Funil',
    isDefault: true,
    stages: [stage('lead'), stage('proposta', 'OPEN', 1), stage('ganho', 'WON', 2)],
  },
  closedWindowDays: 30,
  columns: [
    {
      stage: stage('lead'),
      deals: [card('a', 'lead'), card('b', 'lead', 250)],
      count: 2,
      totalValue: 350,
    },
    {
      stage: stage('proposta', 'OPEN', 1),
      deals: [card('c', 'proposta')],
      count: 1,
      totalValue: 100,
    },
    { stage: stage('ganho', 'WON', 2), deals: [], count: 0, totalValue: 0 },
  ],
};

describe('utilitários do quadro', () => {
  const columns = columnsFromBoard(board);

  it('localiza a coluna de um card', () => {
    expect(findColumnOf(columns, 'c')).toBe('proposta');
    expect(findColumnOf(columns, 'x')).toBeUndefined();
  });

  it('move entre colunas sem mutar o original', () => {
    const moved = moveCard(columns, 'a', 'proposta', 1);
    expect(moved.lead!.map((deal) => deal.id)).toEqual(['b']);
    expect(moved.proposta!.map((deal) => deal.id)).toEqual(['c', 'a']);
    expect(moved.proposta![1]!.stageId).toBe('proposta');
    expect(columns.lead!.map((deal) => deal.id)).toEqual(['a', 'b']);
  });

  it('limita o índice ao tamanho da coluna', () => {
    expect(moveCard(columns, 'a', 'ganho', 99).ganho!.map((deal) => deal.id)).toEqual(['a']);
  });

  it('calcula a âncora para a API', () => {
    const moved = moveCard(columns, 'c', 'lead', 1);
    expect(afterIdOf(moved, 'lead', 'c')).toBe('a');
    expect(afterIdOf(moved, 'lead', 'a')).toBeNull();
  });

  it('aplica a movimentação no quadro com status e totais atualizados', () => {
    const moved = moveCard(columns, 'b', 'ganho', 0);
    const next = applyColumnsToBoard(board, moved, 'b', stage('ganho', 'WON', 2));

    expect(next.columns[0]).toMatchObject({ count: 1, totalValue: 100 });
    expect(next.columns[2]).toMatchObject({ count: 1, totalValue: 250 });
    expect(next.columns[2]!.deals[0]).toMatchObject({ id: 'b', status: 'WON', stageId: 'ganho' });
  });

  it('encontra a etapa vizinha para mover pelo teclado, sem passar das pontas', () => {
    const order = ['lead', 'contato', 'proposta', 'ganho'];
    expect(adjacentStage(order, 'contato', 1)).toBe('proposta');
    expect(adjacentStage(order, 'contato', -1)).toBe('lead');
    expect(adjacentStage(order, 'lead', -1)).toBeUndefined();
    expect(adjacentStage(order, 'ganho', 1)).toBeUndefined();
    expect(adjacentStage(order, 'inexistente', 1)).toBeUndefined();
  });
});
