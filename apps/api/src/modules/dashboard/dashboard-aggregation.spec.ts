import { buildSalesSeries, buildSellerRows } from './dashboard-aggregation';

describe('agregações do dashboard', () => {
  const tz = 'America/Sao_Paulo';

  describe('buildSalesSeries', () => {
    it('agrupa as vendas pela data local e preenche grupos vazios com zero', () => {
      const series = buildSalesSeries(
        [
          { closedAt: new Date('2026-10-02T15:00:00Z'), value: 1000.1 },
          { closedAt: new Date('2026-10-02T20:00:00Z'), value: 500.2 },
          // 01:00 UTC de 04/10 ainda é 03/10 em São Paulo.
          { closedAt: new Date('2026-10-04T01:00:00Z'), value: 300 },
        ],
        { from: '2026-10-01', to: '2026-10-04' },
        'day',
        tz,
      );
      expect(series).toEqual([
        { start: '2026-10-01', wonCount: 0, wonValue: 0 },
        { start: '2026-10-02', wonCount: 2, wonValue: 1500.3 },
        { start: '2026-10-03', wonCount: 1, wonValue: 300 },
        { start: '2026-10-04', wonCount: 0, wonValue: 0 },
      ]);
    });

    it('soma por mês quando o período é longo', () => {
      const series = buildSalesSeries(
        [
          { closedAt: new Date('2026-08-10T12:00:00Z'), value: 10 },
          { closedAt: new Date('2026-08-31T12:00:00Z'), value: 5 },
        ],
        { from: '2026-08-01', to: '2026-10-26' },
        'month',
        tz,
      );
      expect(series.map((bucket) => [bucket.start, bucket.wonValue])).toEqual([
        ['2026-08-01', 15],
        ['2026-09-01', 0],
        ['2026-10-01', 0],
      ]);
    });
  });

  describe('buildSellerRows', () => {
    const ana = { id: 'u-ana', name: 'Ana' };
    const bia = { id: 'u-bia', name: 'Bia' };

    it('soma as parciais por responsável, calcula a conversão e ordena pela receita', () => {
      const rows = buildSellerRows(
        [
          { ownerId: 'u-ana', wonCount: 1, wonValue: 100 },
          { ownerId: 'u-ana', lostCount: 1 },
          { ownerId: 'u-bia', wonCount: 2, wonValue: 500 },
          { ownerId: null, openCount: 3, openValue: 90 },
        ],
        [ana, bia],
        [],
      );
      expect(rows.map((row) => row.user?.name ?? 'sem responsável')).toEqual([
        'Bia',
        'Ana',
        'sem responsável',
      ]);
      expect(rows[1]).toMatchObject({ wonCount: 1, lostCount: 1, conversionRate: 0.5 });
      expect(rows[2]).toMatchObject({ openCount: 3, conversionRate: null });
    });

    it('inclui membros sem movimento quando solicitado', () => {
      const rows = buildSellerRows([], [ana], ['u-ana']);
      expect(rows).toEqual([
        {
          user: ana,
          wonCount: 0,
          wonValue: 0,
          lostCount: 0,
          openCount: 0,
          openValue: 0,
          conversionRate: null,
        },
      ]);
    });
  });
});
