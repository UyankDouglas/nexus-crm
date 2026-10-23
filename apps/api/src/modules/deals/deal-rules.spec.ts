import { AppException } from '../../common/errors/app.exception';
import { assertDealIsOpen, positionBetween, resolveTransition } from './deal-rules';

const now = new Date('2026-10-23T12:00:00Z');
const openDeal = {
  stageId: 'qualificacao',
  status: 'OPEN' as const,
  closedAt: null,
  lostReason: null,
};

describe('resolveTransition', () => {
  it('avança entre etapas abertas sem encerrar', () => {
    expect(
      resolveTransition({
        current: openDeal,
        target: { id: 'proposta', kind: 'OPEN' },
        canReopen: false,
        now,
      }),
    ).toEqual({ stageChanged: true, status: 'OPEN', closedAt: null, lostReason: null });
  });

  it('marca como ganho com data de fechamento', () => {
    expect(
      resolveTransition({
        current: openDeal,
        target: { id: 'ganho', kind: 'WON' },
        canReopen: false,
        now,
      }),
    ).toEqual({ stageChanged: true, status: 'WON', closedAt: now, lostReason: null });
  });

  it('exige motivo para marcar como perdido', () => {
    expect(() =>
      resolveTransition({
        current: openDeal,
        target: { id: 'perdido', kind: 'LOST' },
        canReopen: false,
        lostReason: '   ',
      }),
    ).toThrow(AppException);

    expect(
      resolveTransition({
        current: openDeal,
        target: { id: 'perdido', kind: 'LOST' },
        canReopen: false,
        lostReason: ' Escolheu um concorrente ',
        now,
      }),
    ).toMatchObject({ status: 'LOST', closedAt: now, lostReason: 'Escolheu um concorrente' });
  });

  it('impede vendedor de reabrir negócio encerrado', () => {
    const won = { stageId: 'ganho', status: 'WON' as const, closedAt: now, lostReason: null };
    expect(() =>
      resolveTransition({
        current: won,
        target: { id: 'negociacao', kind: 'OPEN' },
        canReopen: false,
      }),
    ).toThrow('Somente gestores e administradores podem reabrir ou mover negócios encerrados.');
  });

  it('gestão reabre negócio perdido, limpando fechamento e motivo', () => {
    const lost = {
      stageId: 'perdido',
      status: 'LOST' as const,
      closedAt: now,
      lostReason: 'Sem orçamento',
    };
    expect(
      resolveTransition({
        current: lost,
        target: { id: 'negociacao', kind: 'OPEN' },
        canReopen: true,
      }),
    ).toEqual({ stageChanged: true, status: 'OPEN', closedAt: null, lostReason: null });
  });

  it('reordenar na mesma etapa preserva status, fechamento e motivo', () => {
    const lost = {
      stageId: 'perdido',
      status: 'LOST' as const,
      closedAt: now,
      lostReason: 'Sem orçamento',
    };
    expect(
      resolveTransition({
        current: lost,
        target: { id: 'perdido', kind: 'LOST' },
        canReopen: false,
      }),
    ).toEqual({ stageChanged: false, status: 'LOST', closedAt: now, lostReason: 'Sem orçamento' });
  });
});

describe('positionBetween', () => {
  it('coloca no topo, no meio e no fim da coluna', () => {
    expect(positionBetween(null, null, null)).toBe(0);
    expect(positionBetween(null, null, 5)).toBe(4);
    expect(positionBetween(1, 2, null)).toBe(1.5);
    expect(positionBetween(7, null, null)).toBe(8);
  });

  it('sinaliza quando a coluna precisa ser renumerada', () => {
    expect(positionBetween(1, 1 + 1e-9, null)).toBeNull();
  });
});

describe('assertDealIsOpen', () => {
  it('bloqueia edição de negócio encerrado', () => {
    expect(() => assertDealIsOpen('OPEN')).not.toThrow();
    expect(() => assertDealIsOpen('WON')).toThrow('Reabra o negócio para editá-lo.');
  });
});
