import { HttpStatus } from '@nestjs/common';
import { API_ERROR_CODES, type DealStatus, type StageKind } from '@nexus/shared';
import { AppException } from '../../common/errors/app.exception';

export interface TransitionInput {
  current: {
    stageId: string;
    status: DealStatus;
    closedAt: Date | null;
    lostReason: string | null;
  };
  target: { id: string; kind: StageKind };
  /** Permissão `deals:reopen` (gestores e administradores). */
  canReopen: boolean;
  lostReason?: string | null;
  now?: Date;
}

export interface TransitionResult {
  stageChanged: boolean;
  status: DealStatus;
  closedAt: Date | null;
  lostReason: string | null;
}

/**
 * Regras de movimentação no funil:
 * - a etapa de destino define o status (OPEN, WON ou LOST);
 * - perder exige motivo;
 * - negócios encerrados só mudam de etapa (inclusive reabrir) com `deals:reopen`;
 * - reordenar dentro da mesma etapa nunca altera status.
 */
export function resolveTransition(input: TransitionInput): TransitionResult {
  const { current, target, canReopen } = input;
  const now = input.now ?? new Date();

  if (current.stageId === target.id) {
    return {
      stageChanged: false,
      status: current.status,
      closedAt: current.closedAt,
      lostReason: current.lostReason,
    };
  }

  if (current.status !== 'OPEN' && !canReopen) {
    throw new AppException(
      HttpStatus.FORBIDDEN,
      API_ERROR_CODES.FORBIDDEN,
      'Somente gestores e administradores podem reabrir ou mover negócios encerrados.',
    );
  }

  const lostReason = input.lostReason?.trim() || null;
  if (target.kind === 'LOST' && !lostReason) {
    throw AppException.validation({ lostReason: ['Informe o motivo da perda.'] });
  }

  const status: DealStatus = target.kind;
  const keepsClosedAt = status !== 'OPEN' && current.status === status;

  return {
    stageChanged: true,
    status,
    closedAt: status === 'OPEN' ? null : keepsClosedAt ? current.closedAt : now,
    lostReason: status === 'LOST' ? lostReason : null,
  };
}

/** Diferença mínima entre posições antes de renumerar a coluna (precisão de ponto flutuante). */
export const MIN_POSITION_GAP = 1e-6;

/**
 * Índice fracionário: calcula a posição de um card sem renumerar a coluna.
 * - `after` nulo: topo da coluna (antes de `first`);
 * - com `after` e `next`: ponto médio;
 * - com `after` e sem `next`: fim da coluna.
 * Retorna `null` quando o espaço entre vizinhos se esgotou (a coluna precisa ser renumerada).
 */
export function positionBetween(
  after: number | null,
  next: number | null,
  first: number | null,
): number | null {
  if (after === null) return first === null ? 0 : first - 1;
  if (next === null) return after + 1;
  if (next - after < MIN_POSITION_GAP) return null;
  return (after + next) / 2;
}

export function assertDealIsOpen(status: DealStatus): void {
  if (status !== 'OPEN') {
    throw new AppException(
      HttpStatus.CONFLICT,
      API_ERROR_CODES.CONFLICT,
      'Negócio encerrado. Reabra o negócio para editá-lo.',
    );
  }
}
