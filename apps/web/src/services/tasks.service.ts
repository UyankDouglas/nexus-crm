import type {
  Paginated,
  TaskDueFilter,
  TaskInput,
  TaskItem,
  TaskPriority,
  TaskSort,
  TaskStats,
  TaskStatusFilter,
  TaskUpdateInput,
} from '@nexus/shared';
import { apiClient } from './api-client';
import { toQueryString } from './query-string';

export interface TaskListParams {
  search?: string;
  status?: TaskStatusFilter;
  due?: TaskDueFilter;
  priority?: TaskPriority;
  /** `me` ou o ID de um membro. */
  assignee?: string;
  customerId?: string;
  dealId?: string;
  page: number;
  pageSize: number;
  sort: TaskSort;
}

/** No cadastro, o responsável é opcional: a API usa o próprio usuário. */
export type TaskCreateInput = Omit<TaskInput, 'assigneeId'> & { assigneeId?: string };

export const taskService = {
  list: (params: TaskListParams, signal?: AbortSignal) =>
    apiClient.get<Paginated<TaskItem>>(`/tasks${toQueryString(params)}`, { signal }),
  stats: (signal?: AbortSignal) => apiClient.get<TaskStats>('/tasks/stats', { signal }),
  get: (id: string, signal?: AbortSignal) => apiClient.get<TaskItem>(`/tasks/${id}`, { signal }),
  create: (input: TaskCreateInput) => apiClient.post<TaskItem>('/tasks', input),
  update: (id: string, input: TaskUpdateInput) => apiClient.patch<TaskItem>(`/tasks/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/tasks/${id}`),
};
