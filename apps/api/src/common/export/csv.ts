import type { CellValue, ExportColumn } from './columns';

const SEPARATOR = ';';
/** Prefixos que planilhas interpretam como fórmula (CSV injection). */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function formatNumber(value: number, decimals: number): string {
  return value.toFixed(decimals).replace('.', ',');
}

function formatCell(type: ExportColumn<unknown>['type'], value: CellValue): string {
  if (value === null || value === '') return '';
  if (typeof value === 'number') {
    if (type === 'currency') return formatNumber(value, 2);
    if (type === 'percent') return `${formatNumber(value * 100, 1)}%`;
    return String(value);
  }
  if (type === 'date') {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

function quote(field: string): string {
  return /[;"\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

/**
 * CSV no padrão do Excel em português: separador `;`, vírgula decimal, datas dd/mm/aaaa, BOM
 * UTF-8 (acentos corretos) e textos iniciados por `=`, `+`, `-` ou `@` neutralizados com `'`.
 */
export function toCsv<T>(columns: ExportColumn<T>[], rows: T[]): Buffer {
  const lines = [
    columns.map((column) => quote(column.header)).join(SEPARATOR),
    ...rows.map((row) =>
      columns.map((column) => quote(formatCell(column.type, column.value(row)))).join(SEPARATOR),
    ),
  ];
  return Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from(`${lines.join('\r\n')}\r\n`, 'utf8'),
  ]);
}
