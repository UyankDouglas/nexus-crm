import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { useDeleteTask } from '../hooks';

interface DeleteTaskDialogProps {
  task: { id: string; title: string } | null;
  onClose: () => void;
}

export function DeleteTaskDialog({ task, onClose }: DeleteTaskDialogProps) {
  const remove = useDeleteTask(() => {
    toast.success(`Tarefa "${task?.title ?? ''}" excluída.`);
    onClose();
  });

  return (
    <AlertDialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Excluir a tarefa?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground">{task?.title}</strong> será removida
            permanentemente. Para registrar que ela não será feita, prefira cancelá-la.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              // Mantém o diálogo aberto até a API confirmar a exclusão.
              event.preventDefault();
              if (task) remove.mutate(task.id, { onError: (error) => toast.error(error.message) });
            }}
          >
            {remove.isPending && <Spinner />}
            Excluir tarefa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
