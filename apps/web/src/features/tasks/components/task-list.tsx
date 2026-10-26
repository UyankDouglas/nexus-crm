import { isOpenTaskStatus, type TaskItem, type TaskStatus } from '@nexus/shared';
import {
  CircleCheck,
  CircleSlash,
  MoreHorizontal,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/features/auth/hooks';
import { customerPath, dealPath } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useUpdateTask } from '../hooks';
import { TaskDueLabel, TaskPriorityBadge, TaskStatusBadge } from './task-badges';

interface TaskListProps {
  tasks: TaskItem[];
  onEdit: (task: TaskItem) => void;
  onDelete?: (task: TaskItem) => void;
  /** Oculta o cliente e o negócio (ex.: lista dentro do próprio cliente). */
  hideLinks?: boolean;
  /** Mostra o responsável (útil para gestores, que veem tarefas de toda a equipe). */
  showAssignee?: boolean;
  isFetching?: boolean;
}

const STATUS_MESSAGES: Record<TaskStatus, string> = {
  TODO: 'reaberta',
  IN_PROGRESS: 'iniciada',
  DONE: 'concluída',
  CANCELED: 'cancelada',
};

export function TaskList({
  tasks,
  onEdit,
  onDelete,
  hideLinks = false,
  showAssignee = false,
  isFetching = false,
}: TaskListProps) {
  const update = useUpdateTask();
  const canDelete = usePermission('tasks:delete');

  const changeStatus = (task: TaskItem, status: TaskStatus) => {
    update.mutate(
      { id: task.id, input: { status } },
      {
        onSuccess: () => toast.success(`Tarefa "${task.title}" ${STATUS_MESSAGES[status]}.`),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <ul className={cn('divide-y transition-opacity', isFetching && 'opacity-60')}>
      {tasks.map((task) => {
        const open = isOpenTaskStatus(task.status);
        const done = task.status === 'DONE';
        const pending = update.isPending && update.variables?.id === task.id;
        return (
          <li key={task.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <Checkbox
              className="mt-0.5"
              checked={done}
              disabled={pending || task.status === 'CANCELED'}
              onCheckedChange={(checked) => changeStatus(task, checked ? 'DONE' : 'TODO')}
              aria-label={done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className={cn(
                    'text-left text-sm font-medium hover:text-primary hover:underline focus-visible:underline focus-visible:outline-none',
                    !open && 'text-muted-foreground line-through',
                  )}
                >
                  {task.title}
                </button>
                {open && task.priority === 'HIGH' && <TaskPriorityBadge priority="HIGH" />}
                {task.status !== 'TODO' && <TaskStatusBadge status={task.status} />}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <TaskDueLabel dueDate={task.dueDate} status={task.status} />
                {showAssignee && (
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="size-3.5" aria-hidden="true" />
                    {task.assignee.name}
                  </span>
                )}
                {!hideLinks && task.customer && (
                  <Link
                    to={customerPath(task.customer.id)}
                    className="hover:text-primary hover:underline"
                  >
                    {task.customer.name}
                  </Link>
                )}
                {!hideLinks && task.deal && (
                  <Link to={dealPath(task.deal.id)} className="hover:text-primary hover:underline">
                    {task.deal.title}
                  </Link>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${task.title}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => onEdit(task)}>
                  <Pencil />
                  Editar
                </DropdownMenuItem>
                {task.status === 'TODO' && (
                  <DropdownMenuItem onSelect={() => changeStatus(task, 'IN_PROGRESS')}>
                    <Play />
                    Iniciar
                  </DropdownMenuItem>
                )}
                {open && (
                  <DropdownMenuItem onSelect={() => changeStatus(task, 'DONE')}>
                    <CircleCheck />
                    Concluir
                  </DropdownMenuItem>
                )}
                {!open && (
                  <DropdownMenuItem onSelect={() => changeStatus(task, 'TODO')}>
                    <RotateCcw />
                    Reabrir
                  </DropdownMenuItem>
                )}
                {open && (
                  <DropdownMenuItem onSelect={() => changeStatus(task, 'CANCELED')}>
                    <CircleSlash />
                    Cancelar tarefa
                  </DropdownMenuItem>
                )}
                {canDelete && onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => onDelete(task)}>
                      <Trash2 />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        );
      })}
    </ul>
  );
}

export function TaskListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Carregando tarefas">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-start gap-3">
          <Skeleton className="size-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
