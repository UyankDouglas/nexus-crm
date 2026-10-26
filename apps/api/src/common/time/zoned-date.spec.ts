import { zonedIsoDate, zonedRangeBounds, zonedStartOfDay } from './zoned-date';

describe('datas no fuso de negócio', () => {
  const tz = 'America/Sao_Paulo';

  it('converte instantes UTC para a data local', () => {
    // 01:30 UTC ainda é o dia anterior em São Paulo (UTC−3).
    expect(zonedIsoDate(new Date('2026-11-01T01:30:00Z'), tz)).toBe('2026-10-31');
    expect(zonedIsoDate(new Date('2026-11-01T03:00:00Z'), tz)).toBe('2026-11-01');
  });

  it('calcula a meia-noite local em UTC', () => {
    expect(zonedStartOfDay('2026-10-26', tz).toISOString()).toBe('2026-10-26T03:00:00.000Z');
    expect(zonedStartOfDay('2026-10-26', 'UTC').toISOString()).toBe('2026-10-26T00:00:00.000Z');
  });

  it('respeita fusos com horário de verão', () => {
    // Nova York: UTC−4 em julho, UTC−5 em dezembro.
    expect(zonedStartOfDay('2026-07-01', 'America/New_York').toISOString()).toBe(
      '2026-07-01T04:00:00.000Z',
    );
    expect(zonedStartOfDay('2026-12-01', 'America/New_York').toISOString()).toBe(
      '2026-12-01T05:00:00.000Z',
    );
  });

  it('cobre o intervalo inteiro, do início do primeiro dia ao fim do último', () => {
    const bounds = zonedRangeBounds({ from: '2026-10-01', to: '2026-10-31' }, tz);
    expect(bounds.gte.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(bounds.lt.toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });
});
