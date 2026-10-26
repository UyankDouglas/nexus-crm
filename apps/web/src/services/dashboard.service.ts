import type { DashboardSummary, DateRange } from '@nexus/shared';
import { apiClient } from './api-client';
import { toQueryString } from './query-string';

export const dashboardService = {
  summary: (range: DateRange, signal?: AbortSignal) =>
    apiClient.get<DashboardSummary>(`/dashboard${toQueryString(range)}`, { signal }),
};
