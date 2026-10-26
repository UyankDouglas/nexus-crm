import { describe, expect, it } from 'vitest';
import { bucketLabel, parsePeriod, rangeFor } from './period';

describe('período do dashboard', () => {
  it('usa 90 dias como padrão para valores ausentes ou inválidos', () => {
    expect(parsePeriod(null)).toBe('90d');
    expect(parsePeriod('5anos')).toBe('90d');
    expect(parsePeriod('12m')).toBe('12m');
  });

  it('calcula o intervalo a partir de hoje', () => {
    expect(rangeFor('7d', '2026-10-26')).toEqual({ from: '2026-10-20', to: '2026-10-26' });
  });

  it('formata rótulos de dia, semana e mês sem deslocar o fuso', () => {
    expect(bucketLabel('2026-10-01', 'day')).toBe('01/10');
    expect(bucketLabel('2026-10-01', 'day', true)).toBe('1 de outubro');
    expect(bucketLabel('2026-10-19', 'week', true)).toBe('Semana de 19/10');
    expect(bucketLabel('2026-10-01', 'month', true)).toBe('outubro de 2026');
  });
});
