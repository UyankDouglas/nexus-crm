import { addDays, type DateRange } from '@nexus/shared';

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function wallClock(instant: Date, timeZone: string) {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Diferença (ms) entre o horário local do fuso e o UTC no instante informado. */
function offsetMs(instant: Date, timeZone: string): number {
  const local = wallClock(instant, timeZone);
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );
  return asUtc - (instant.getTime() - instant.getUTCMilliseconds());
}

/** Data de calendário (AAAA-MM-DD) do instante no fuso informado. */
export function zonedIsoDate(instant: Date, timeZone: string): string {
  const { year, month, day } = wallClock(instant, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Instante (UTC) em que começa o dia AAAA-MM-DD no fuso informado. */
export function zonedStartOfDay(isoDate: string, timeZone: string): Date {
  const guess = new Date(`${isoDate}T00:00:00.000Z`);
  const first = new Date(guess.getTime() - offsetMs(guess, timeZone));
  // Segunda passada corrige dias com mudança de horário de verão.
  return new Date(guess.getTime() - offsetMs(first, timeZone));
}

/** Instantes [início, fim) que cobrem o intervalo de datas inteiro no fuso informado. */
export function zonedRangeBounds(range: DateRange, timeZone: string): { gte: Date; lt: Date } {
  return {
    gte: zonedStartOfDay(range.from, timeZone),
    lt: zonedStartOfDay(addDays(range.to, 1), timeZone),
  };
}
