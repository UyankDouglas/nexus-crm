import type { DealHistoryItem } from '@nexus/shared';

export type HistoryKind = 'created' | 'moved' | 'won' | 'lost' | 'reopened';

export interface HistoryDescription {
  kind: HistoryKind;
  title: string;
  detail: string | null;
}

/** Texto de cada movimentação do histórico, a partir dos nomes de etapa gravados no momento. */
export function describeHistory(entry: DealHistoryItem): HistoryDescription {
  if (entry.fromStageName === null) {
    return { kind: 'created', title: `Negócio criado em ${entry.toStageName}`, detail: null };
  }
  const path = `${entry.fromStageName} → ${entry.toStageName}`;
  if (entry.toStatus === 'WON') {
    return { kind: 'won', title: 'Marcado como ganho', detail: path };
  }
  if (entry.toStatus === 'LOST') {
    return {
      kind: 'lost',
      title: 'Marcado como perdido',
      detail: entry.lostReason ? `${path} · ${entry.lostReason}` : path,
    };
  }
  if (entry.fromStatus !== null && entry.fromStatus !== 'OPEN') {
    return { kind: 'reopened', title: `Reaberto em ${entry.toStageName}`, detail: path };
  }
  return {
    kind: 'moved',
    title: `Movido para ${entry.toStageName}`,
    detail: `de ${entry.fromStageName}`,
  };
}
