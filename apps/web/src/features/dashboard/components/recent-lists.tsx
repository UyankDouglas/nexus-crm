import type { ActivityItem, TaskItem } from '@nexus/shared';
import { ArrowRight, Handshake, ListChecks, MessagesSquare } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type ActivityFormMode,
  ActivityFormDialog,
} from '@/features/activities/components/activity-form-dialog';
import { ActivityTimeline } from '@/features/activities/components/activity-timeline';
import { DeleteActivityDialog } from '@/features/activities/components/delete-activity-dialog';
import { useActivities } from '@/features/activities/hooks';
import { DealStatusBadge } from '@/features/deals/components/deal-badges';
import { useDeals } from '@/features/deals/hooks';
import { DeleteTaskDialog } from '@/features/tasks/components/delete-task-dialog';
import { type TaskFormMode, TaskFormSheet } from '@/features/tasks/components/task-form-sheet';
import { TaskList } from '@/features/tasks/components/task-list';
import { useTasks } from '@/features/tasks/hooks';
import { formatCurrency, formatRelative } from '@/lib/format';
import { ACTIVITIES_TAB, dealPath, paths, TAB_PARAM } from '@/lib/navigation';

const LIMIT = 5;

function ListCard({
  title,
  description,
  to,
  children,
}: {
  title: string;
  description: string;
  to: string;
  children: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to={to}>
              Ver todas
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyList({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Empty className="border border-dashed py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Últimas negociações movimentadas (qualquer status), dentro da carteira do usuário. */
export function RecentDealsCard() {
  const deals = useDeals({ page: 1, pageSize: LIMIT, sort: 'updated' });

  return (
    <ListCard
      title="Últimas negociações"
      description="Atualizadas mais recentemente"
      to={paths.pipeline}
    >
      {deals.isError ? (
        <p className="text-sm text-destructive">{deals.error.message}</p>
      ) : !deals.data ? (
        <ListSkeleton />
      ) : deals.data.data.length === 0 ? (
        <EmptyList
          icon={<Handshake />}
          title="Nenhum negócio ainda"
          description="Os negócios cadastrados no funil aparecem aqui."
        />
      ) : (
        <ul className="divide-y">
          {deals.data.data.map((deal) => (
            <li
              key={deal.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Link
                  to={dealPath(deal.id)}
                  className="block truncate text-sm font-medium hover:text-primary hover:underline"
                >
                  {deal.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {deal.customer.name} · {deal.stageName} · {formatRelative(deal.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(deal.value)}
                </span>
                {deal.status !== 'OPEN' && <DealStatusBadge status={deal.status} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  );
}

/** Próximas tarefas do próprio usuário, pelo prazo. */
export function UpcomingTasksCard() {
  const tasks = useTasks({ assignee: 'me', status: 'open', page: 1, pageSize: LIMIT, sort: 'due' });
  const [formMode, setFormMode] = useState<TaskFormMode>(null);
  const [deleting, setDeleting] = useState<TaskItem | null>(null);

  return (
    <ListCard title="Próximas tarefas" description="Suas pendências pelo prazo" to={paths.tasks}>
      {tasks.isError ? (
        <p className="text-sm text-destructive">{tasks.error.message}</p>
      ) : !tasks.data ? (
        <ListSkeleton />
      ) : tasks.data.data.length === 0 ? (
        <EmptyList
          icon={<ListChecks />}
          title="Tudo em dia"
          description="Você não tem tarefas pendentes."
        />
      ) : (
        <TaskList
          tasks={tasks.data.data}
          onEdit={(task) => setFormMode({ kind: 'edit', task })}
          onDelete={setDeleting}
        />
      )}
      <TaskFormSheet mode={formMode} onClose={() => setFormMode(null)} />
      <DeleteTaskDialog task={deleting} onClose={() => setDeleting(null)} />
    </ListCard>
  );
}

/** Interações registradas mais recentemente na carteira visível ao usuário. */
export function RecentActivitiesCard() {
  const activities = useActivities({ page: 1, pageSize: LIMIT });
  const [formMode, setFormMode] = useState<ActivityFormMode>(null);
  const [deleting, setDeleting] = useState<ActivityItem | null>(null);

  return (
    <ListCard
      title="Atividades recentes"
      description="Ligações, reuniões, e-mails e observações"
      to={`${paths.tasks}?${TAB_PARAM}=${ACTIVITIES_TAB}`}
    >
      {activities.isError ? (
        <p className="text-sm text-destructive">{activities.error.message}</p>
      ) : !activities.data ? (
        <ListSkeleton />
      ) : activities.data.data.length === 0 ? (
        <EmptyList
          icon={<MessagesSquare />}
          title="Nenhuma interação"
          description="Registre ligações e reuniões nos clientes e negócios."
        />
      ) : (
        <ActivityTimeline
          activities={activities.data.data}
          onEdit={(activity) => setFormMode({ kind: 'edit', activity })}
          onDelete={setDeleting}
        />
      )}
      <ActivityFormDialog mode={formMode} onClose={() => setFormMode(null)} />
      <DeleteActivityDialog activity={deleting} onClose={() => setDeleting(null)} />
    </ListCard>
  );
}
