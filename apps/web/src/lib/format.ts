const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

/** R$ 12.345,67 */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** R$ 1,2 mi — para totais em espaços pequenos. */
export function formatCurrencyCompact(value: number): string {
  return compactCurrencyFormatter.format(value);
}

/** 0,625 → "62,5%" */
export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio);
}

/** Data sem horário (AAAA-MM-DD) exibida sem conversão de fuso: "15 de dez. de 2026". */
export function formatIsoDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return dateFormatter.format(new Date(year, month - 1, day));
}

/** Dias inteiros desde a data informada (0 = hoje). */
export function daysSince(value: string | Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000));
}

/** Data de hoje no formato AAAA-MM-DD, no fuso do navegador. */
export function todayIsoDate(now = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const relativeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** "há 3 dias", "ontem", "agora" — para datas recentes em listas. */
export function formatRelative(value: string | Date, now = new Date()): string {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relativeFormatter.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return 'agora';
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(new Date(value));
}

/** "quinta-feira, 23 de outubro" com a primeira letra maiúscula. */
export function formatLongDate(value: string | Date): string {
  const text = longDateFormatter.format(new Date(value));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Ana Ribeiro" → "AR"; ignora trechos entre parênteses e símbolos: "Horizonte Tecnologia (Demo)" → "HT". */
export function getInitials(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
