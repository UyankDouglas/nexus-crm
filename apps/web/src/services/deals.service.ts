import type {
  DealBoard,
  DealDetail,
  DealInput,
  DealListItem,
  DealMoveInput,
  DealSort,
  DealStats,
  DealStatus,
  DealUpdateInput,
  Paginated,
  PipelineItem,
} from '@nexus/shared';
import { apiClient } from './api-client';
import { toQueryString } from './query-string';

export interface BoardParams {
  search?: string;
  /** `me`, `none` ou o ID de um usuário. */
  owner?: string;
}

export interface DealListParams extends BoardParams {
  status?: DealStatus;
  customerId?: string;
  page: number;
  pageSize: number;
  sort: DealSort;
}

export const dealService = {
  pipelines: (signal?: AbortSignal) => apiClient.get<PipelineItem[]>('/pipelines', { signal }),
  board: (pipelineId: string, params: BoardParams, signal?: AbortSignal) =>
    apiClient.get<DealBoard>(`/pipelines/${pipelineId}/board${toQueryString(params)}`, { signal }),
  list: (params: DealListParams, signal?: AbortSignal) =>
    apiClient.get<Paginated<DealListItem>>(`/deals${toQueryString(params)}`, { signal }),
  get: (id: string, signal?: AbortSignal) => apiClient.get<DealDetail>(`/deals/${id}`, { signal }),
  stats: (signal?: AbortSignal) => apiClient.get<DealStats>('/deals/stats', { signal }),
  create: (input: DealInput) => apiClient.post<DealDetail>('/deals', input),
  update: (id: string, input: DealUpdateInput) =>
    apiClient.patch<DealDetail>(`/deals/${id}`, input),
  move: (id: string, input: DealMoveInput) =>
    apiClient.post<DealDetail>(`/deals/${id}/move`, input),
  remove: (id: string) => apiClient.delete<void>(`/deals/${id}`),
};
