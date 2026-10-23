import type { CustomerListParams } from '@/services/customers.service';

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
};
