import type { TaskItem } from '@nexus/shared';
import { AlarmClock, Bell, BellOff, CalendarCheck } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskDueLabel } from '@/features/tasks/components/task-badges';
import { useTasks } from '@/features/tasks/hooks';
import { paths } from '@/lib/navigation';

const LIMIT = 5;

/**
 * Central de notificações: lembra o usuário das próprias tarefas atrasadas e das que vencem hoje
 * (dados reais da API). Notificações em tempo real ficam para uma fase futura.
 */
export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const base = { assignee: 'me', status: 'open', page: 1, pageSize: LIMIT, sort: 'due' } as const;
  const overdue = useTasks({ ...base, due: 'overdue' });
  const today = useTasks({ ...base, due: 'today' });
  const overdueTotal = overdue.data?.meta.total ?? 0;
  const todayTotal = today.data?.meta.total ?? 0;
  const total = overdueTotal + todayTotal;
  const loading = !overdue.data || !today.data;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            total > 0
              ? `Notificações: ${total} ${total === 1 ? 'tarefa precisa' : 'tarefas precisam'} de atenção`
              : 'Notificações'
          }
        >
          <Bell />
          {total > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white">
              {total > 9 ? '9+' : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Notificações</p>
          <p className="text-xs text-muted-foreground">Suas tarefas que precisam de atenção</p>
        </div>
        {loading ? (
          <div className="space-y-2 p-4" role="status" aria-label="Carregando notificações">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : total === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellOff />
              </EmptyMedia>
              <EmptyTitle>Tudo em dia</EmptyTitle>
              <EmptyDescription>Nenhuma tarefa atrasada ou para hoje.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="max-h-96 overflow-y-auto py-2">
            <TaskGroup
              icon={<AlarmClock className="size-3.5 text-destructive" />}
              title="Atrasadas"
              total={overdueTotal}
              tasks={overdue.data?.data ?? []}
              href={`${paths.tasks}?due=overdue`}
              onNavigate={() => setOpen(false)}
            />
            <TaskGroup
              icon={<CalendarCheck className="size-3.5 text-warning" />}
              title="Vencem hoje"
              total={todayTotal}
              tasks={today.data?.data ?? []}
              href={`${paths.tasks}?due=today`}
              onNavigate={() => setOpen(false)}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TaskGroup({
  icon,
  title,
  total,
  tasks,
  href,
  onNavigate,
}: {
  icon: ReactNode;
  title: string;
  total: number;
  tasks: TaskItem[];
  href: string;
  onNavigate: () => void;
}) {
  if (total === 0) return null;
  return (
    <section className="px-2 py-1">
      <div className="flex items-center justify-between px-2 py-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
          {icon}
          {title} ({total})
        </p>
        <Link to={href} onClick={onNavigate} className="text-xs text-primary hover:underline">
          Ver todas
        </Link>
      </div>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              to={href}
              onClick={onNavigate}
              className="block rounded-md px-2 py-1.5 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <span className="block truncate text-sm">{task.title}</span>
              <span className="text-xs">
                <TaskDueLabel dueDate={task.dueDate} status={task.status} />
                {task.customer && (
                  <span className="text-muted-foreground"> · {task.customer.name}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
