import type {
  ClosedDealFilter,
  ClosedDealItem,
  DateRange,
  ExportFormat,
  Paginated,
  ReportsOverview,
  ReportType,
} from '@nexus/shared';
import { apiClient } from './api-client';
import { toQueryString } from './query-string';

export interface ClosedDealsParams extends DateRange {
  status: ClosedDealFilter;
  page: number;
  pageSize: number;
}

export interface ExportParams extends DateRange {
  type: ReportType;
  format: ExportFormat;
  status?: ClosedDealFilter;
}

export const reportService = {
  overview: (range: DateRange, signal?: AbortSignal) =>
    apiClient.get<ReportsOverview>(`/reports/overview${toQueryString(range)}`, { signal }),
  closedDeals: (params: ClosedDealsParams, signal?: AbortSignal) =>
    apiClient.get<Paginated<ClosedDealItem>>(`/reports/closed-deals${toQueryString(params)}`, {
      signal,
    }),
  export: (params: ExportParams) => apiClient.download(`/reports/export${toQueryString(params)}`),
};
