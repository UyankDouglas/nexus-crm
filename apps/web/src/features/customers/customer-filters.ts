import {
  CUSTOMER_SORTS,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  type CustomerSort,
} from '@nexus/shared';
import type { CustomerListParams } from '@/services/customers.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return value !== null && (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Filtros da listagem guardados na URL (links compartilháveis e botão "voltar" funcionando).
 * Valores inválidos são descartados, nunca repassados à API.
 */
export function parseCustomerFilters(search: URLSearchParams): CustomerListParams {
  const owner = search.get('owner');
  const pageSize = positiveInt(search.get('pageSize'), DEFAULT_PAGE_SIZE);

  return {
    search: search.get('search')?.trim().slice(0, 100) || undefined,
    status: oneOf(CUSTOMER_STATUSES, search.get('status')),
    type: oneOf(CUSTOMER_TYPES, search.get('type')),
    owner: owner === 'me' || owner === 'none' || (owner && UUID.test(owner)) ? owner : undefined,
    tag: search.get('tag')?.slice(0, 30) || undefined,
    page: positiveInt(search.get('page'), 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
    sort: oneOf<CustomerSort>(CUSTOMER_SORTS, search.get('sort')) ?? 'name',
  };
}

/** Grava apenas valores diferentes do padrão, mantendo a URL curta. */
export function serializeCustomerFilters(filters: CustomerListParams): URLSearchParams {
  const search = new URLSearchParams();
  if (filters.search) search.set('search', filters.search);
  if (filters.status) search.set('status', filters.status);
  if (filters.type) search.set('type', filters.type);
  if (filters.owner) search.set('owner', filters.owner);
  if (filters.tag) search.set('tag', filters.tag);
  if (filters.page > 1) search.set('page', String(filters.page));
  if (filters.pageSize !== DEFAULT_PAGE_SIZE) search.set('pageSize', String(filters.pageSize));
  if (filters.sort !== 'name') search.set('sort', filters.sort);
  return search;
}

export function hasActiveFilters(filters: CustomerListParams): boolean {
  return Boolean(filters.search || filters.status || filters.type || filters.owner || filters.tag);
}
