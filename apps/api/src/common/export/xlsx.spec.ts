import { crc32, inflateRawSync } from 'node:zlib';
import type { ExportColumn } from './columns';
import { columnName, excelSerial, toXlsx } from './xlsx';

/** Lê as entradas de um ZIP pelo diretório central, conferindo o CRC de cada uma. */
function unzip(buffer: Buffer): Map<string, string> {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buffer.readUInt16LE(end + 10);
  let pointer = buffer.readUInt32LE(end + 16);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    const crc = buffer.readUInt32LE(pointer + 16);
    const size = buffer.readUInt32LE(pointer + 20);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString('utf8', pointer + 46, pointer + 46 + nameLength);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const start = localOffset + 30 + localNameLength;
    const data = inflateRawSync(buffer.subarray(start, start + size));
    expect(crc32(data)).toBe(crc);
    files.set(name, data.toString('utf8'));
    pointer += 46 + nameLength;
  }
  return files;
}

interface Row {
  seller: string;
  won: number;
  revenue: number;
  closed: string | null;
}

const columns: ExportColumn<Row>[] = [
  { header: 'Vendedor', type: 'text', width: 24, value: (row) => row.seller },
  { header: 'Ganhos', type: 'integer', value: (row) => row.won },
  { header: 'Receita', type: 'currency', value: (row) => row.revenue },
  { header: 'Fechamento', type: 'date', value: (row) => row.closed },
];

describe('toXlsx', () => {
  it('gera um pacote .xlsx válido com cabeçalho, números e datas', () => {
    const file = toXlsx('Desempenho: equipe', columns, [
      { seller: 'Juliana <Costa> & cia', won: 4, revenue: 118300.5, closed: '2026-10-26' },
      { seller: ' Rafael ', won: 0, revenue: 0, closed: null },
    ]);
    expect(file.subarray(0, 2).toString()).toBe('PK');

    const files = unzip(file);
    expect([...files.keys()]).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]);
    // Nome da aba sem caracteres proibidos pelo Excel.
    expect(files.get('xl/workbook.xml')).toContain('name="Desempenho  equipe"');

    const sheet = files.get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1"><is><t>Vendedor</t></is></c>');
    expect(sheet).toContain('<t>Juliana &lt;Costa&gt; &amp; cia</t>');
    expect(sheet).toContain('<c r="C2" s="3"><v>118300.5</v></c>');
    expect(sheet).toContain(`<c r="D2" s="5"><v>${excelSerial('2026-10-26')}</v></c>`);
    expect(sheet).toContain('<t xml:space="preserve"> Rafael </t>');
    expect(sheet).not.toContain('r="D3"');
  });

  it('remove caracteres de controle proibidos em XML, preservando quebras de linha e acentos', () => {
    const file = toXlsx('Notas', columns, [
      { seller: 'Ana\u0000\u0007 Ribeiro\nGestão\t😀', won: 1, revenue: 1, closed: null },
    ]);

    const sheet = unzip(file).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain('<t>Ana Ribeiro\nGestão\t😀</t>');
  });

  it('converte índices de coluna e datas para o formato do Excel', () => {
    expect([0, 25, 26, 51, 52].map(columnName)).toEqual(['A', 'Z', 'AA', 'AZ', 'BA']);
    expect(excelSerial('1900-03-01')).toBe(61);
    expect(excelSerial('2026-10-26')).toBe(46321);
  });
});
