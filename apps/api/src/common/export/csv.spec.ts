import type { ExportColumn } from './columns';
import { toCsv } from './csv';

interface Row {
  name: string;
  value: number;
  rate: number | null;
  date: string;
}

const columns: ExportColumn<Row>[] = [
  { header: 'Nome', type: 'text', value: (row) => row.name },
  { header: 'Valor', type: 'currency', value: (row) => row.value },
  { header: 'Conversão', type: 'percent', value: (row) => row.rate },
  { header: 'Data', type: 'date', value: (row) => row.date },
];

describe('toCsv', () => {
  it('gera CSV no padrão do Excel em português, com BOM UTF-8', () => {
    const csv = toCsv(columns, [
      { name: 'Aurora; Ltda', value: 1234.5, rate: 0.625, date: '2026-10-26' },
      { name: 'Sem conversão', value: 0, rate: null, date: '2026-01-02' },
    ]);
    expect([...csv.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(csv.subarray(3).toString('utf8')).toBe(
      'Nome;Valor;Conversão;Data\r\n' +
        '"Aurora; Ltda";1234,50;62,5%;26/10/2026\r\n' +
        'Sem conversão;0,00;;02/01/2026\r\n',
    );
  });

  it('neutraliza textos que planilhas executariam como fórmula', () => {
    const csv = toCsv(columns.slice(0, 1), [
      { name: '=HYPERLINK("http://x")', value: 0, rate: null, date: '' },
      { name: '-2+3', value: 0, rate: null, date: '' },
      { name: '@SUM(A1)', value: 0, rate: null, date: '' },
    ]);
    expect(csv.subarray(3).toString('utf8').split('\r\n').slice(1, 4)).toEqual([
      '"\'=HYPERLINK(""http://x"")"',
      "'-2+3",
      "'@SUM(A1)",
    ]);
  });
});
