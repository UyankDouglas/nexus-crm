import {
  bucketStart,
  bucketStarts,
  type DateRange,
  type Granularity,
  type SalesBucket,
  type SellerPerformance,
  type UserSummary,
} from '@nexus/shared';
import { zonedIsoDate } from '../../common/time/zoned-date';

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export interface WonDeal {
  closedAt: Date;
  value: number;
}

/**
 * Vendas ganhas por grupo (dia, semana ou mês) no fuso de negócio. Grupos sem vendas aparecem
 * com zero, para o gráfico mostrar o período inteiro.
 */
export function buildSalesSeries(
  won: WonDeal[],
  range: DateRange,
  granularity: Granularity,
  timeZone: string,
): SalesBucket[] {
  const buckets = new Map(
    bucketStarts(range, granularity).map((start) => [start, { start, wonCount: 0, wonValue: 0 }]),
  );
  for (const deal of won) {
    const start = bucketStart(zonedIsoDate(deal.closedAt, timeZone), granularity);
    const bucket = buckets.get(start);
    if (!bucket) continue;
    bucket.wonCount += 1;
    bucket.wonValue += deal.value;
  }
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    wonValue: roundMoney(bucket.wonValue),
  }));
}

export interface OwnerTotals {
  ownerId: string | null;
  wonCount?: number;
  wonValue?: number;
  lostCount?: number;
  openCount?: number;
  openValue?: number;
}

/**
 * Desempenho por responsável: soma as parciais de cada consulta e completa com os membros que
 * devem aparecer mesmo sem movimento. Ordena pela receita ganha; "sem responsável" fica por último.
 */
export function buildSellerRows(
  partials: OwnerTotals[],
  users: UserSummary[],
  alwaysInclude: string[],
): SellerPerformance[] {
  const rows = new Map<string | null, SellerPerformance>();
  const names = new Map(users.map((user) => [user.id, user]));
  const rowFor = (ownerId: string | null) => {
    let row = rows.get(ownerId);
    if (!row) {
      row = {
        user: ownerId ? (names.get(ownerId) ?? { id: ownerId, name: 'Membro removido' }) : null,
        wonCount: 0,
        wonValue: 0,
        lostCount: 0,
        openCount: 0,
        openValue: 0,
        conversionRate: null,
      };
      rows.set(ownerId, row);
    }
    return row;
  };

  for (const id of alwaysInclude) rowFor(id);
  for (const partial of partials) {
    const row = rowFor(partial.ownerId);
    row.wonCount += partial.wonCount ?? 0;
    row.wonValue += partial.wonValue ?? 0;
    row.lostCount += partial.lostCount ?? 0;
    row.openCount += partial.openCount ?? 0;
    row.openValue += partial.openValue ?? 0;
  }

  return [...rows.values()]
    .map((row) => {
      const closed = row.wonCount + row.lostCount;
      return {
        ...row,
        wonValue: roundMoney(row.wonValue),
        openValue: roundMoney(row.openValue),
        conversionRate: closed > 0 ? row.wonCount / closed : null,
      };
    })
    .sort((a, b) => {
      if (!a.user || !b.user) return a.user ? -1 : b.user ? 1 : 0;
      return (
        b.wonValue - a.wonValue ||
        b.openValue - a.openValue ||
        a.user.name.localeCompare(b.user.name, 'pt-BR')
      );
    });
}
