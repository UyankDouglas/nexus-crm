import type { DateRange } from '@nexus/shared';
import type { ActivityListParams } from '@/services/activities.service';
import type { AuditListParams } from '@/services/admin.service';
import type { CustomerListParams } from '@/services/customers.service';
import type { BoardParams, DealListParams } from '@/services/deals.service';
import type { ClosedDealsParams } from '@/services/reports.service';
import type { TaskListParams } from '@/services/tasks.service';

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
  tasks: {
    all: ['tasks'] as const,
    list: (params: TaskListParams) => ['tasks', 'list', params] as const,
    stats: ['tasks', 'stats'] as const,
  },
  activities: {
    all: ['activities'] as const,
    list: (params: ActivityListParams) => ['activities', 'list', params] as const,
    feed: (params: Omit<ActivityListParams, 'page'>) => ['activities', 'feed', params] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: (range: DateRange) => ['dashboard', range] as const,
  },
  invitations: ['organization', 'current', 'invitations'] as const,
  audit: {
    all: ['audit'] as const,
    list: (params: AuditListParams) => ['audit', params] as const,
  },
  reports: {
    all: ['reports'] as const,
    overview: (range: DateRange) => ['reports', 'overview', range] as const,
    closedDeals: (params: ClosedDealsParams) => ['reports', 'closed-deals', params] as const,
  },
};
