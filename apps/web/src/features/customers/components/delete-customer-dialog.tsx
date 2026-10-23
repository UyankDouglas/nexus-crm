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
import { useDeleteCustomer } from '../hooks';

interface DeleteCustomerDialogProps {
  customer: { id: string; name: string } | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteCustomerDialog({ customer, onClose, onDeleted }: DeleteCustomerDialogProps) {
  const remove = useDeleteCustomer();

  const confirm = () => {
    if (!customer) return;
    remove.mutate(customer.id, {
      onSuccess: () => {
        toast.success(`${customer.name} foi excluído.`);
        onClose();
        onDeleted?.();
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <AlertDialog open={customer !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Excluir {customer?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            O cliente e todos os seus contatos serão removidos permanentemente. Pessoas vinculadas a
            esta empresa serão mantidas, sem vínculo. Esta ação não pode ser desfeita.
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
            Excluir cliente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
