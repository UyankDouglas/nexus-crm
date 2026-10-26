import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  TASK_DUE_FILTERS,
  TASK_PRIORITIES,
  TASK_SORTS,
  TASK_STATUS_FILTERS,
  type TaskSort,
  type TaskStatusFilter,
} from '@nexus/shared';
import type { TaskListParams } from '@/services/tasks.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return value !== null && (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Filtros da lista de tarefas na URL. Valores inválidos são descartados. */
export function parseTaskFilters(search: URLSearchParams): TaskListParams {
  const assignee = search.get('assignee');
  const pageSize = positiveInt(search.get('pageSize'), DEFAULT_PAGE_SIZE);
  return {
    search: search.get('search')?.trim().slice(0, 100) || undefined,
    status: oneOf<TaskStatusFilter>(TASK_STATUS_FILTERS, search.get('status')) ?? 'open',
    due: oneOf(TASK_DUE_FILTERS, search.get('due')),
    priority: oneOf(TASK_PRIORITIES, search.get('priority')),
    assignee: assignee === 'me' || (assignee && UUID.test(assignee)) ? assignee : undefined,
    page: positiveInt(search.get('page'), 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
    sort: oneOf<TaskSort>(TASK_SORTS, search.get('sort')) ?? 'due',
  };
}

export function serializeTaskFilters(filters: TaskListParams): URLSearchParams {
  const search = new URLSearchParams();
  if (filters.search) search.set('search', filters.search);
  if (filters.status && filters.status !== 'open') search.set('status', filters.status);
  if (filters.due) search.set('due', filters.due);
  if (filters.priority) search.set('priority', filters.priority);
  if (filters.assignee) search.set('assignee', filters.assignee);
  if (filters.page > 1) search.set('page', String(filters.page));
  if (filters.pageSize !== DEFAULT_PAGE_SIZE) search.set('pageSize', String(filters.pageSize));
  if (filters.sort !== 'due') search.set('sort', filters.sort);
  return search;
}

export function hasTaskFilters(filters: TaskListParams): boolean {
  return Boolean(
    filters.search ||
    (filters.status && filters.status !== 'open') ||
    filters.due ||
    filters.priority ||
    filters.assignee,
  );
}
