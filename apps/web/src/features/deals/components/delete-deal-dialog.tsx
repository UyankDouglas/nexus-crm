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
import { useDeleteDeal } from '../hooks';

interface DeleteDealDialogProps {
  deal: { id: string; title: string } | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteDealDialog({ deal, onClose, onDeleted }: DeleteDealDialogProps) {
  const remove = useDeleteDeal(() => {
    toast.success(`${deal?.title ?? 'Negócio'} foi excluído.`);
    onClose();
    onDeleted?.();
  });

  const confirm = () => {
    if (!deal) return;
    remove.mutate(deal.id, { onError: (error) => toast.error(error.message) });
  };

  return (
    <AlertDialog open={deal !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Excluir {deal?.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            O negócio e o histórico de movimentações serão removidos permanentemente e deixarão de
            contar nos indicadores. Para registrar uma oportunidade que não avançou, prefira
            marcá-la como perdida.
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
              confirm();
            }}
          >
            {remove.isPending && <Spinner />}
            Excluir negócio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
