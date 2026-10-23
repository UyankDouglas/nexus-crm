import type { CustomerListParams } from '@/services/customers.service';
import type { BoardParams, DealListParams } from '@/services/deals.service';

/** Chaves centralizadas do TanStack Query. */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  organization: ['organization', 'current'] as const,
  organizationMembers: ['organization', 'current', 'members'] as const,
  customers: {
    all: ['customers'] as const,
    list: (params: CustomerListParams) => ['customers', 'list', params] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
    tags: ['customers', 'tags'] as const,
    stats: ['customers', 'stats'] as const,
  },
  deals: {
    all: ['deals'] as const,
    pipelines: ['deals', 'pipelines'] as const,
    boards: ['deals', 'board'] as const,
    board: (pipelineId: string, params: BoardParams) =>
      ['deals', 'board', pipelineId, params] as const,
    list: (params: DealListParams) => ['deals', 'list', params] as const,
    detail: (id: string) => ['deals', 'detail', id] as const,
    stats: ['deals', 'stats'] as const,
  },
};
