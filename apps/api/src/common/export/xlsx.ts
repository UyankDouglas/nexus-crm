import type { CellType, ExportColumn } from './columns';
import { createZip } from './zip';

const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** Índices de `cellXfs` em styles.xml. */
const STYLE: Record<CellType | 'header', number> = {
  text: 0,
  header: 1,
  integer: 2,
  currency: 3,
  percent: 4,
  date: 5,
};

const STYLES_XML = `${XML_HEADER}
<styleSheet xmlns="${MAIN_NS}">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Remove caracteres proibidos em XML 1.0 e escapa os reservados. */
function escapeXml(value: string): string {
  return value
    .replace(/[^\t\n\r\x20-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Referência de coluna no estilo A, B, …, Z, AA. */
export function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

/** Número de série de data do Excel (dias desde 30/12/1899) para AAAA-MM-DD. */
export function excelSerial(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00.000Z`) / 86_400_000 + 25_569;
}

function cell(ref: string, type: CellType, value: string | number | null): string {
  if (value === null || value === '') return '';
  if (type === 'date' && typeof value === 'string') {
    return `<c r="${ref}" s="${STYLE.date}"><v>${excelSerial(value)}</v></c>`;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `<c r="${ref}" s="${STYLE[type]}"><v>${value}</v></c>` : '';
  }
  const text = escapeXml(value);
  const space = text.trim() !== text ? ' xml:space="preserve"' : '';
  return `<c r="${ref}" t="inlineStr"><is><t${space}>${text}</t></is></c>`;
}

function sheetXml<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const header = columns
    .map(
      (column, index) =>
        `<c r="${columnName(index)}1" t="inlineStr" s="${STYLE.header}"><is><t>${escapeXml(column.header)}</t></is></c>`,
    )
    .join('');
  const body = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 2;
      const cells = columns
        .map((column, index) => cell(`${columnName(index)}${r}`, column.type, column.value(row)))
        .join('');
      return `<row r="${r}">${cells}</row>`;
    })
    .join('');
  const cols = columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${column.width ?? 16}" customWidth="1"/>`,
    )
    .join('');

  return `${XML_HEADER}
<worksheet xmlns="${MAIN_NS}" xmlns:r="${REL_NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData><row r="1">${header}</row>${body}</sheetData></worksheet>`;
}

/** Nome de aba válido no Excel: até 31 caracteres, sem `[]:*?/\`. */
function sheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Relatório';
}

/**
 * Planilha .xlsx (Office Open XML) com uma aba: cabeçalho em negrito e congelado, números como
 * números (moeda, percentual, datas), sem dependências externas.
 */
export function toXlsx<T>(title: string, columns: ExportColumn<T>[], rows: T[]): Buffer {
  const files = {
    '[Content_Types].xml': `${XML_HEADER}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `${XML_HEADER}
<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${XML_HEADER}
<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}"><sheets><sheet name="${escapeXml(sheetName(title))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML_HEADER}
<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': STYLES_XML,
    'xl/worksheets/sheet1.xml': sheetXml(columns, rows),
  };

  return createZip(
    Object.entries(files).map(([name, content]) => ({ name, data: Buffer.from(content, 'utf8') })),
  );
}
