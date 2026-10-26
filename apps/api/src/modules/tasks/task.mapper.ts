import type { TaskItem } from '@nexus/shared';
import type { Prisma } from '../../generated/prisma/client';
import { toIsoDate } from '../deals/deal.mapper';

const userSummary = { select: { id: true, name: true } } as const;

export const taskInclude = {
  assigneeMembership: { select: { user: userSummary } },
  customer: { select: { id: true, name: true } },
  deal: { select: { id: true, title: true } },
  createdBy: userSummary,
} satisfies Prisma.TaskInclude;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export function toTaskItem(task: TaskWithRelations): TaskItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: toIsoDate(task.dueDate)!,
    completedAt: task.completedAt?.toISOString() ?? null,
    assignee: task.assigneeMembership.user,
    customer: task.customer,
    deal: task.deal,
    createdBy: task.createdBy,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
