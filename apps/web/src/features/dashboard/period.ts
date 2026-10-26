import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
  type DateRange,
  DEFAULT_DASHBOARD_PERIOD,
  type Granularity,
  periodRange,
} from '@nexus/shared';
import { todayIsoDate } from '@/lib/format';

export const PERIOD_PARAM = 'periodo';

export function parsePeriod(value: string | null): DashboardPeriod {
  return (DASHBOARD_PERIODS as readonly string[]).includes(value ?? '')
    ? (value as DashboardPeriod)
    : DEFAULT_DASHBOARD_PERIOD;
}

/** Intervalo do período terminando hoje, no calendário do navegador. */
export function rangeFor(period: DashboardPeriod, today = todayIsoDate()): DateRange {
  return periodRange(period, today);
}

const UTC_NOON = (isoDate: string) => new Date(`${isoDate}T12:00:00.000Z`);
const dayMonth = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});
const shortMonth = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});
const longMonth = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const longDay = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** Rótulo do grupo no eixo do gráfico ("26/10", "out. de 26") e na dica ("Semana de 19/10"). */
export function bucketLabel(start: string, granularity: Granularity, long = false): string {
  const date = UTC_NOON(start);
  if (granularity === 'month') return (long ? longMonth : shortMonth).format(date);
  if (granularity === 'week')
    return long ? `Semana de ${dayMonth.format(date)}` : dayMonth.format(date);
  return long ? longDay.format(date) : dayMonth.format(date);
}
