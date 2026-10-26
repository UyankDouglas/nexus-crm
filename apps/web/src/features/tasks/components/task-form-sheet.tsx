import type { CustomerSummary, DealSummary, TaskItem } from '@nexus/shared';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { useCreateTask, useUpdateTask } from '../hooks';
import { TaskForm, type TaskFormValues } from './task-form';

export type TaskFormMode =
  | { kind: 'create'; customer?: CustomerSummary | null; deal?: DealSummary | null }
  | { kind: 'edit'; task: TaskItem }
  | null;

interface TaskFormSheetProps {
  mode: TaskFormMode;
  onClose: () => void;
}

export function TaskFormSheet({ mode: currentMode, onClose }: TaskFormSheetProps) {
  // Durante a animação de fechamento, o formulário anterior continua visível.
  const mode = useRetainedValue(currentMode);
  const create = useCreateTask();
  const update = useUpdateTask();

  const submitCreate = async ({ status: _status, ...values }: TaskFormValues) => {
    const task = await create.mutateAsync(values);
    toast.success(`Tarefa "${task.title}" criada para ${task.assignee.name}.`);
    onClose();
  };

  const submitEdit = (task: TaskItem) => async (values: TaskFormValues) => {
    const updated = await update.mutateAsync({ id: task.id, input: values });
    toast.success(`Tarefa "${updated.title}" atualizada.`);
    onClose();
  };

  return (
    <Sheet open={currentMode !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{mode?.kind === 'edit' ? 'Editar tarefa' : 'Nova tarefa'}</SheetTitle>
          <SheetDescription>
            {mode?.kind === 'edit'
              ? 'Atualize os dados, o prazo ou o status da tarefa.'
              : 'Defina o que precisa ser feito, o prazo e quem é o responsável.'}
          </SheetDescription>
        </SheetHeader>
        {mode?.kind === 'create' && (
          <TaskForm
            task={null}
            initialCustomer={mode.customer ?? null}
            initialDeal={mode.deal ?? null}
            onSubmit={submitCreate}
            onCancel={onClose}
            submitLabel="Criar tarefa"
          />
        )}
        {mode?.kind === 'edit' && (
          <TaskForm
            key={mode.task.id}
            task={mode.task}
            onSubmit={submitEdit(mode.task)}
            onCancel={onClose}
            submitLabel="Salvar alterações"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
