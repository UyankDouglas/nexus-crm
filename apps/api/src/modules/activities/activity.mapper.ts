import type { ActivityItem } from '@nexus/shared';
import type { Prisma } from '../../generated/prisma/client';

export const activityInclude = {
  customer: { select: { id: true, name: true } },
  deal: { select: { id: true, title: true } },
  authorMembership: { select: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.ActivityInclude;

type ActivityWithRelations = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>;

export function toActivityItem(activity: ActivityWithRelations): ActivityItem {
  return {
    id: activity.id,
    type: activity.type,
    subject: activity.subject,
    description: activity.description,
    occurredAt: activity.occurredAt.toISOString(),
    customer: activity.customer,
    deal: activity.deal,
    author: activity.authorMembership.user,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}
