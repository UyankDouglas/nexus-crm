import type { BoardParams } from '@/services/deals.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BoardFilters extends BoardParams {
  /** Funil exibido; sem valor, usa o funil padrão da organização. */
  pipelineId?: string;
}

/** Filtros do quadro guardados na URL. Valores inválidos são descartados. */
export function parseBoardFilters(search: URLSearchParams): BoardFilters {
  const owner = search.get('owner');
  const pipelineId = search.get('pipeline');
  return {
    search: search.get('search')?.trim().slice(0, 100) || undefined,
    owner: owner === 'me' || owner === 'none' || (owner && UUID.test(owner)) ? owner : undefined,
    pipelineId: pipelineId && UUID.test(pipelineId) ? pipelineId : undefined,
  };
}

export function serializeBoardFilters(filters: BoardFilters): URLSearchParams {
  const search = new URLSearchParams();
  if (filters.search) search.set('search', filters.search);
  if (filters.owner) search.set('owner', filters.owner);
  if (filters.pipelineId) search.set('pipeline', filters.pipelineId);
  return search;
}

export function hasBoardFilters(filters: BoardFilters): boolean {
  return Boolean(filters.search || filters.owner);
}
