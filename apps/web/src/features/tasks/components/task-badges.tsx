import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@nexus/shared';
import { CalendarClock, CircleCheck, CircleDashed, CircleSlash, Flag, Loader } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { todayIsoDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type DueTone, describeDue } from '../task-utils';

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  HIGH: 'border-destructive/30 bg-destructive/10 text-destructive',
  MEDIUM: 'border-warning/30 bg-warning/10 text-warning',
  LOW: 'border-border bg-muted text-muted-foreground',
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={cn('gap-1', PRIORITY_STYLES[priority])}>
      <Flag className="size-3" aria-hidden="true" />
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  );
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: 'border-border text-muted-foreground',
  IN_PROGRESS: 'border-primary/25 bg-primary/10 text-primary',
  DONE: 'border-success/30 bg-success/10 text-success',
  CANCELED: 'border-border bg-muted text-muted-foreground line-through',
};

const STATUS_ICONS = {
  TODO: CircleDashed,
  IN_PROGRESS: Loader,
  DONE: CircleCheck,
  CANCELED: CircleSlash,
} as const;

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const Icon = STATUS_ICONS[status];
  return (
    <Badge variant="outline" className={cn('gap-1', STATUS_STYLES[status])}>
      <Icon className="size-3" aria-hidden="true" />
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

const DUE_STYLES: Record<DueTone, string> = {
  overdue: 'font-medium text-destructive',
  today: 'font-medium text-warning',
  soon: 'text-foreground',
  normal: 'text-muted-foreground',
  closed: 'text-muted-foreground',
};

/** Prazo com destaque para atrasos e tarefas do dia. */
export function TaskDueLabel({ dueDate, status }: { dueDate: string; status: TaskStatus }) {
  const due = describeDue(dueDate, status, todayIsoDate());
  return (
    <span className={cn('inline-flex items-center gap-1', DUE_STYLES[due.tone])}>
      <CalendarClock className="size-3.5" aria-hidden="true" />
      {due.label}
    </span>
  );
}
