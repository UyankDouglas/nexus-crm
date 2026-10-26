import { ACTIVITY_TYPES, DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@nexus/shared';
import type { ActivityListParams } from '@/services/activities.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Filtros do histórico de atividades na URL. Valores inválidos são descartados. */
export function parseActivityFilters(search: URLSearchParams): ActivityListParams {
  const type = search.get('type');
  const author = search.get('author');
  const pageSize = positiveInt(search.get('pageSize'), DEFAULT_PAGE_SIZE);
  return {
    search: search.get('search')?.trim().slice(0, 100) || undefined,
    type: (ACTIVITY_TYPES as readonly string[]).includes(type ?? '')
      ? (type as ActivityListParams['type'])
      : undefined,
    author: author === 'me' || (author && UUID.test(author)) ? author : undefined,
    page: positiveInt(search.get('page'), 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

export function serializeActivityFilters(filters: ActivityListParams): URLSearchParams {
  const search = new URLSearchParams();
  if (filters.search) search.set('search', filters.search);
  if (filters.type) search.set('type', filters.type);
  if (filters.author) search.set('author', filters.author);
  if (filters.page > 1) search.set('page', String(filters.page));
  if (filters.pageSize !== DEFAULT_PAGE_SIZE) search.set('pageSize', String(filters.pageSize));
  return search;
}

export function hasActivityFilters(filters: ActivityListParams): boolean {
  return Boolean(filters.search || filters.type || filters.author);
}
