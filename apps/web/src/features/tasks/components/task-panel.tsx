import type { CustomerSummary, DealSummary, TaskItem } from '@nexus/shared';
import { ListChecks, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useTasks } from '../hooks';
import { DeleteTaskDialog } from './delete-task-dialog';
import { type TaskFormMode, TaskFormSheet } from './task-form-sheet';
import { TaskList, TaskListSkeleton } from './task-list';

const LIMIT = 10;

interface TaskPanelProps {
  customer: CustomerSummary;
  /** Com negócio, lista e cria tarefas do negócio; sem ele, as do cliente. */
  deal?: DealSummary;
}

/** Tarefas pendentes de um cliente ou negócio, com criação já vinculada. */
export function TaskPanel({ customer, deal }: TaskPanelProps) {
  const tasks = useTasks({
    ...(deal ? { dealId: deal.id } : { customerId: customer.id }),
    status: 'open',
    page: 1,
    pageSize: LIMIT,
    sort: 'due',
  });
  const [formMode, setFormMode] = useState<TaskFormMode>(null);
  const [deleting, setDeleting] = useState<TaskItem | null>(null);
  const total = tasks.data?.meta.total ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? 'Nenhuma tarefa pendente'
            : `${total} ${total === 1 ? 'tarefa pendente' : 'tarefas pendentes'}`}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFormMode({ kind: 'create', customer, deal: deal ?? null })}
        >
          <Plus />
          Nova tarefa
        </Button>
      </div>

      {tasks.isError ? (
        <p className="text-sm text-destructive">{tasks.error.message}</p>
      ) : !tasks.data ? (
        <TaskListSkeleton rows={2} />
      ) : tasks.data.data.length === 0 ? (
        <Empty className="border border-dashed py-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks />
            </EmptyMedia>
            <EmptyTitle>Tudo em dia</EmptyTitle>
            <EmptyDescription>
              Crie tarefas para combinar próximos passos, retornos e prazos.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <TaskList
            tasks={tasks.data.data}
            onEdit={(task) => setFormMode({ kind: 'edit', task })}
            onDelete={setDeleting}
            hideLinks
            showAssignee
          />
          {total > LIMIT && (
            <p className="text-xs text-muted-foreground">
              Mostrando as {LIMIT} com prazo mais próximo de {total} tarefas pendentes.
            </p>
          )}
        </>
      )}

      <TaskFormSheet mode={formMode} onClose={() => setFormMode(null)} />
      <DeleteTaskDialog task={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
