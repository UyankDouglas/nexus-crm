import {
  BUSINESS_TIME_ZONE,
  DEAL_STATUS_LABELS,
  type ClosedDealItem,
  type Granularity,
  type PipelineStageReport,
  type SalesBucket,
  type SellerReportRow,
} from '@nexus/shared';
import type { ExportColumn } from '../../common/export/columns';
import { zonedIsoDate } from '../../common/time/zoned-date';

export interface RevenueRow extends SalesBucket {
  granularity: Granularity;
  cumulative: number;
}

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: 'Dia',
  week: 'Semana iniciada em',
  month: 'Mês',
};

/** Colunas de cada relatório exportável (CSV e Excel usam as mesmas definições). */
export const REPORT_COLUMNS = {
  sellers: [
    {
      header: 'Responsável',
      type: 'text',
      width: 28,
      value: (row) => row.user?.name ?? 'Sem responsável',
    },
    { header: 'Negócios ganhos', type: 'integer', value: (row) => row.wonCount },
    { header: 'Receita (R$)', type: 'currency', width: 18, value: (row) => row.wonValue },
    { header: 'Ticket médio (R$)', type: 'currency', width: 18, value: (row) => row.averageTicket },
    { header: 'Negócios perdidos', type: 'integer', value: (row) => row.lostCount },
    { header: 'Taxa de conversão', type: 'percent', value: (row) => row.conversionRate },
    { header: 'Em andamento', type: 'integer', value: (row) => row.openCount },
    {
      header: 'Valor em andamento (R$)',
      type: 'currency',
      width: 22,
      value: (row) => row.openValue,
    },
    {
      header: 'Atividades registradas',
      type: 'integer',
      width: 20,
      value: (row) => row.activities,
    },
    {
      header: 'Tarefas concluídas',
      type: 'integer',
      width: 18,
      value: (row) => row.tasksCompleted,
    },
  ] satisfies ExportColumn<SellerReportRow>[],

  revenue: [
    { header: 'Período', type: 'date', width: 14, value: (row) => row.start },
    {
      header: 'Agrupamento',
      type: 'text',
      width: 20,
      value: (row) => GRANULARITY_LABELS[row.granularity],
    },
    { header: 'Negócios ganhos', type: 'integer', value: (row) => row.wonCount },
    { header: 'Receita (R$)', type: 'currency', width: 18, value: (row) => row.wonValue },
    {
      header: 'Receita acumulada (R$)',
      type: 'currency',
      width: 22,
      value: (row) => row.cumulative,
    },
  ] satisfies ExportColumn<RevenueRow>[],

  pipeline: [
    { header: 'Funil', type: 'text', width: 24, value: (row) => row.pipelineName },
    { header: 'Etapa', type: 'text', width: 22, value: (row) => row.name },
    { header: 'Probabilidade', type: 'percent', value: (row) => row.probability / 100 },
    { header: 'Negócios', type: 'integer', value: (row) => row.count },
    { header: 'Valor (R$)', type: 'currency', width: 18, value: (row) => row.value },
    {
      header: 'Valor ponderado (R$)',
      type: 'currency',
      width: 20,
      value: (row) => row.weightedValue,
    },
  ] satisfies ExportColumn<PipelineStageReport>[],

  'closed-deals': [
    {
      header: 'Fechamento',
      type: 'date',
      width: 14,
      value: (row) => zonedIsoDate(new Date(row.closedAt), BUSINESS_TIME_ZONE),
    },
    { header: 'Negócio', type: 'text', width: 34, value: (row) => row.title },
    { header: 'Cliente', type: 'text', width: 30, value: (row) => row.customer.name },
    {
      header: 'Responsável',
      type: 'text',
      width: 22,
      value: (row) => row.owner?.name ?? 'Sem responsável',
    },
    {
      header: 'Resultado',
      type: 'text',
      width: 12,
      value: (row) => DEAL_STATUS_LABELS[row.status],
    },
    { header: 'Valor (R$)', type: 'currency', width: 18, value: (row) => row.value },
    { header: 'Motivo da perda', type: 'text', width: 34, value: (row) => row.lostReason },
  ] satisfies ExportColumn<ClosedDealItem>[],
};
