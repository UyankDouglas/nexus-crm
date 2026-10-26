/** Tipo de dado da coluna: define a formatação no CSV e o formato numérico no Excel. */
export type CellType = 'text' | 'integer' | 'currency' | 'percent' | 'date';

export type CellValue = string | number | null;

export interface ExportColumn<T> {
  header: string;
  type: CellType;
  /** Largura aproximada no Excel, em caracteres. */
  width?: number;
  /** `date` recebe AAAA-MM-DD; `percent`, uma fração (0,625 = 62,5%). */
  value: (row: T) => CellValue;
}
