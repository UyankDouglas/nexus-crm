import type { TaskStats } from '@nexus/shared';
import { AlarmClock, CalendarCheck, CircleCheck, ListTodo } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TaskListParams } from '@/services/tasks.service';

interface StatCard {
  label: string;
  value: number;
  hint: string;
  icon: ReactNode;
  tone: string;
  active: boolean;
  onClick: () => void;
}

interface TaskStatsCardsProps {
  stats: TaskStats | undefined;
  filters: TaskListParams;
  onFilter: (change: Pick<TaskListParams, 'status' | 'due'>) => void;
}

/** Totais reais de tarefas; cada card aplica o filtro correspondente. */
export function TaskStatsCards({ stats, filters, onFilter }: TaskStatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[74px] rounded-xl" />
        ))}
      </div>
    );
  }

  const isOpenView = (filters.status ?? 'open') === 'open';
  const cards: StatCard[] = [
    {
      label: 'Pendentes',
      value: stats.open,
      hint: 'A fazer e em andamento',
      icon: <ListTodo />,
      tone: 'bg-primary/10 text-primary',
      active: isOpenView && !filters.due,
      onClick: () => onFilter({ status: 'open', due: undefined }),
    },
    {
      label: 'Atrasadas',
      value: stats.overdue,
      hint: 'Prazo vencido',
      icon: <AlarmClock />,
      tone: 'bg-destructive/10 text-destructive',
      active: filters.due === 'overdue',
      onClick: () => onFilter({ status: 'open', due: 'overdue' }),
    },
    {
      label: 'Vencem hoje',
      value: stats.dueToday,
      hint: 'Para resolver ainda hoje',
      icon: <CalendarCheck />,
      tone: 'bg-warning/15 text-warning',
      active: filters.due === 'today',
      onClick: () => onFilter({ status: 'open', due: 'today' }),
    },
    {
      label: 'Concluídas',
      value: stats.completedLast7Days,
      hint: 'Nos últimos 7 dias',
      icon: <CircleCheck />,
      tone: 'bg-success/15 text-success',
      active: filters.status === 'DONE' && !filters.due,
      onClick: () => onFilter({ status: 'DONE', due: undefined }),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          onClick={card.onClick}
          aria-pressed={card.active}
          className={cn(
            'flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            card.active && 'border-primary/60 ring-1 ring-primary/30',
          )}
        >
          <span
            className={cn(
              'hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex [&_svg]:size-4',
              card.tone,
            )}
            aria-hidden="true"
          >
            {card.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{card.label}</span>
            <span className="block text-lg leading-tight font-semibold tabular-nums">
              {card.value}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{card.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
