import { describe, expect, it } from 'vitest';
import {
  addDays,
  bucketStart,
  bucketStarts,
  granularityFor,
  periodRange,
  rangeLength,
  validateRange,
} from './dashboard.js';

describe('períodos do dashboard', () => {
  it('calcula os intervalos pré-definidos a partir de hoje', () => {
    expect(periodRange('7d', '2026-10-26')).toEqual({ from: '2026-10-20', to: '2026-10-26' });
    expect(periodRange('30d', '2026-03-01')).toEqual({ from: '2026-01-31', to: '2026-03-01' });
    expect(periodRange('12m', '2026-10-26')).toEqual({ from: '2025-11-01', to: '2026-10-26' });
    expect(periodRange('ytd', '2026-10-26')).toEqual({ from: '2026-01-01', to: '2026-10-26' });
  });

  it('conta os dias do intervalo incluindo as duas pontas e atravessa anos bissextos', () => {
    expect(rangeLength({ from: '2026-10-20', to: '2026-10-26' })).toBe(7);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('escolhe o agrupamento pelo tamanho do intervalo', () => {
    expect(granularityFor(periodRange('30d', '2026-10-26'))).toBe('day');
    expect(granularityFor(periodRange('90d', '2026-10-26'))).toBe('week');
    expect(granularityFor(periodRange('12m', '2026-10-26'))).toBe('month');
  });

  it('agrupa semanas a partir da segunda-feira e meses a partir do dia 1º', () => {
    expect(bucketStart('2026-10-25', 'week')).toBe('2026-10-19'); // domingo
    expect(bucketStart('2026-10-26', 'week')).toBe('2026-10-26'); // segunda
    expect(bucketStart('2026-10-26', 'month')).toBe('2026-10-01');
  });

  it('lista todos os grupos do intervalo, inclusive os vazios', () => {
    expect(bucketStarts({ from: '2026-08-15', to: '2026-10-26' }, 'month')).toEqual([
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
    ]);
    expect(bucketStarts({ from: '2026-10-24', to: '2026-10-26' }, 'day')).toHaveLength(3);
    expect(bucketStarts({ from: '2026-10-21', to: '2026-11-03' }, 'week')).toEqual([
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ]);
  });

  it('recusa intervalos inválidos, invertidos ou longos demais', () => {
    expect(validateRange({ from: '2026-10-01', to: '2026-10-26' })).toBeNull();
    expect(validateRange({ from: '2026-02-30', to: '2026-10-26' })).toMatch(/datas válidas/);
    expect(validateRange({ from: '2026-10-27', to: '2026-10-26' })).toMatch(/anterior/);
    expect(validateRange({ from: '2020-01-01', to: '2026-10-26' })).toMatch(/no máximo/);
  });
});
