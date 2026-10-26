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
import { useDeleteActivity } from '../hooks';

interface DeleteActivityDialogProps {
  activity: { id: string; subject: string } | null;
  onClose: () => void;
}

export function DeleteActivityDialog({ activity, onClose }: DeleteActivityDialogProps) {
  const remove = useDeleteActivity(() => {
    toast.success('Atividade excluída do histórico.');
    onClose();
  });

  return (
    <AlertDialog open={activity !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Excluir a atividade?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground">{activity?.subject}</strong> sairá do histórico de
            interações. Esta ação não pode ser desfeita.
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
              if (activity) {
                remove.mutate(activity.id, { onError: (error) => toast.error(error.message) });
              }
            }}
          >
            {remove.isPending && <Spinner />}
            Excluir atividade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
