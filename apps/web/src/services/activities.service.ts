import type {
  ActivityInput,
  ActivityItem,
  ActivityType,
  ActivityUpdateInput,
  Paginated,
} from '@nexus/shared';
import { apiClient } from './api-client';
import { toQueryString } from './query-string';

export interface ActivityListParams {
  search?: string;
  type?: ActivityType;
  customerId?: string;
  dealId?: string;
  /** `me` ou o ID de um membro. */
  author?: string;
  page: number;
  pageSize: number;
}

export const activityService = {
  list: (params: ActivityListParams, signal?: AbortSignal) =>
    apiClient.get<Paginated<ActivityItem>>(`/activities${toQueryString(params)}`, { signal }),
  create: (input: ActivityInput) => apiClient.post<ActivityItem>('/activities', input),
  update: (id: string, input: ActivityUpdateInput) =>
    apiClient.patch<ActivityItem>(`/activities/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/activities/${id}`),
};
