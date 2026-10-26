import { isValidIsoDate } from './deals.js';

/**
 * Fuso usado para agrupar resultados por dia, semana e mês. Uma configuração por organização
 * pode substituí-lo no futuro; por ora o produto atende empresas brasileiras.
 */
export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

export const DASHBOARD_PERIODS = ['7d', '30d', '90d', '12m', 'ytd'] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const DASHBOARD_PERIOD_LABELS: Record<DashboardPeriod, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '12m': 'Últimos 12 meses',
  ytd: 'Este ano',
};

export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = '90d';

/** Maior intervalo aceito pela API (em dias, inclusive). */
export const MAX_PERIOD_DAYS = 731;

export type Granularity = 'day' | 'week' | 'month';

export interface DateRange {
  /** AAAA-MM-DD (inclusive) */
  from: string;
  /** AAAA-MM-DD (inclusive) */
  to: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Soma dias a uma data AAAA-MM-DD (sem fuso). */
export function addDays(isoDate: string, days: number): string {
  return toIsoDate(new Date(toUtcDate(isoDate).getTime() + days * DAY_MS));
}

/** Quantidade de dias do intervalo, contando as duas pontas. */
export function rangeLength({ from, to }: DateRange): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / DAY_MS) + 1;
}

/** Intervalo de datas de um período pré-definido, terminando em `today` (AAAA-MM-DD). */
export function periodRange(period: DashboardPeriod, today: string): DateRange {
  switch (period) {
    case '7d':
      return { from: addDays(today, -6), to: today };
    case '30d':
      return { from: addDays(today, -29), to: today };
    case '90d':
      return { from: addDays(today, -89), to: today };
    case '12m': {
      // Começa no primeiro dia do mês, 11 meses atrás: 12 barras mensais completas.
      const date = toUtcDate(today);
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 11, 1));
      return { from: toIsoDate(start), to: today };
    }
    case 'ytd':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }
}

/** Agrupamento dos gráficos: diário até um mês, semanal até um trimestre, mensal acima disso. */
export function granularityFor(range: DateRange): Granularity {
  const days = rangeLength(range);
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

/** Início do grupo que contém a data: o próprio dia, a segunda-feira da semana ou o dia 1º. */
export function bucketStart(isoDate: string, granularity: Granularity): string {
  if (granularity === 'day') return isoDate;
  if (granularity === 'month') return `${isoDate.slice(0, 7)}-01`;
  const weekday = toUtcDate(isoDate).getUTCDay(); // 0 = domingo
  return addDays(isoDate, -((weekday + 6) % 7));
}

/** Inícios de todos os grupos do intervalo, em ordem — inclusive os sem movimento. */
export function bucketStarts(range: DateRange, granularity: Granularity): string[] {
  const starts: string[] = [];
  let current = bucketStart(range.from, granularity);
  while (current <= range.to) {
    starts.push(current);
    if (granularity === 'day') current = addDays(current, 1);
    else if (granularity === 'week') current = addDays(current, 7);
    else {
      const date = toUtcDate(current);
      current = toIsoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)));
    }
  }
  return starts;
}

/** Valida um intervalo vindo de fora (URL ou API). Retorna a mensagem de erro, se houver. */
export function validateRange(range: Partial<DateRange>): string | null {
  if (!range.from || !range.to || !isValidIsoDate(range.from) || !isValidIsoDate(range.to)) {
    return 'Informe datas válidas no formato AAAA-MM-DD.';
  }
  if (range.from > range.to) return 'A data inicial deve ser anterior à final.';
  if (rangeLength(range as DateRange) > MAX_PERIOD_DAYS) {
    return `O período deve ter no máximo ${MAX_PERIOD_DAYS} dias.`;
  }
  return null;
}
