import type { DealHistoryItem } from '@nexus/shared';
import { describe, expect, it } from 'vitest';
import { describeHistory } from './deal-history';

const entry = (overrides: Partial<DealHistoryItem>): DealHistoryItem => ({
  id: 'h1',
  fromStageName: 'Qualificação',
  toStageName: 'Proposta enviada',
  fromStatus: 'OPEN',
  toStatus: 'OPEN',
  lostReason: null,
  changedBy: null,
  createdAt: '2026-10-20T12:00:00.000Z',
  ...overrides,
});

describe('describeHistory', () => {
  it('descreve a criação do negócio', () => {
    expect(describeHistory(entry({ fromStageName: null, fromStatus: null }))).toEqual({
      kind: 'created',
      title: 'Negócio criado em Proposta enviada',
      detail: null,
    });
  });

  it('descreve a movimentação entre etapas em andamento', () => {
    expect(describeHistory(entry({}))).toEqual({
      kind: 'moved',
      title: 'Movido para Proposta enviada',
      detail: 'de Qualificação',
    });
  });

  it('descreve ganhos e perdas com o motivo informado', () => {
    expect(describeHistory(entry({ toStageName: 'Ganho', toStatus: 'WON' }))).toMatchObject({
      kind: 'won',
      detail: 'Qualificação → Ganho',
    });
    expect(
      describeHistory(
        entry({ toStageName: 'Perdido', toStatus: 'LOST', lostReason: 'Escolheu um concorrente' }),
      ),
    ).toEqual({
      kind: 'lost',
      title: 'Marcado como perdido',
      detail: 'Qualificação → Perdido · Escolheu um concorrente',
    });
  });

  it('descreve a reabertura de negócios encerrados', () => {
    expect(
      describeHistory(
        entry({ fromStageName: 'Perdido', fromStatus: 'LOST', toStageName: 'Negociação' }),
      ),
    ).toMatchObject({ kind: 'reopened', title: 'Reaberto em Negociação' });
  });
});
