/** Relatórios exportáveis (CSV e Excel). */
export const REPORT_TYPES = ['sellers', 'revenue', 'pipeline', 'closed-deals'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  sellers: 'Desempenho por vendedor',
  revenue: 'Receita por período',
  pipeline: 'Valor do pipeline',
  'closed-deals': 'Negócios ganhos e perdidos',
};

export const EXPORT_FORMATS = ['csv', 'xlsx'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'CSV',
  xlsx: 'Excel (.xlsx)',
};

/** Filtro de status da listagem de negócios encerrados. */
export const CLOSED_DEAL_FILTERS = ['all', 'WON', 'LOST'] as const;
export type ClosedDealFilter = (typeof CLOSED_DEAL_FILTERS)[number];

/** Limite de linhas por exportação, para proteger a API de arquivos gigantes. */
export const MAX_EXPORT_ROWS = 10_000;
