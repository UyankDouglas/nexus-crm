import type { CustomerDetail, CustomerInput } from '@nexus/shared';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { useCreateCustomer, useCustomer, useUpdateCustomer } from '../hooks';
import { CustomerForm } from './customer-form';

export type CustomerFormMode = { kind: 'create' } | { kind: 'edit'; customerId: string } | null;

interface CustomerFormSheetProps {
  mode: CustomerFormMode;
  onClose: () => void;
  onCreated?: (customer: CustomerDetail) => void;
}

/** Drawer de cadastro e edição de clientes. */
export function CustomerFormSheet({
  mode: currentMode,
  onClose,
  onCreated,
}: CustomerFormSheetProps) {
  // Durante a animação de fechamento, o formulário anterior continua visível.
  const mode = useRetainedValue(currentMode);
  return (
    <Sheet open={currentMode !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{mode?.kind === 'edit' ? 'Editar cliente' : 'Novo cliente'}</SheetTitle>
          <SheetDescription>
            {mode?.kind === 'edit'
              ? 'Atualize os dados do cliente. Campos vazios são removidos.'
              : 'Cadastre uma empresa ou pessoa física. Somente o nome é obrigatório.'}
          </SheetDescription>
        </SheetHeader>
        {mode?.kind === 'create' && <CreateCustomer onClose={onClose} onCreated={onCreated} />}
        {mode?.kind === 'edit' && <EditCustomer customerId={mode.customerId} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function CreateCustomer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (customer: CustomerDetail) => void;
}) {
  const create = useCreateCustomer();

  const submit = async (values: CustomerInput) => {
    const customer = await create.mutateAsync(values);
    toast.success(`${customer.name} cadastrado com sucesso.`);
    onClose();
    onCreated?.(customer);
  };

  return (
    <CustomerForm customer={null} onSubmit={submit} onCancel={onClose} submitLabel="Cadastrar" />
  );
}

/** Edita a partir do detalhe completo — a linha da listagem não traz todos os campos. */
function EditCustomer({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const customer = useCustomer(customerId);
  const update = useUpdateCustomer(customerId);

  const submit = async ({ type: _type, ...values }: CustomerInput) => {
    const updated = await update.mutateAsync(values);
    toast.success(`${updated.name} atualizado.`);
    onClose();
  };

  if (customer.isError) {
    return <p className="p-6 text-sm text-destructive">{customer.error.message}</p>;
  }
  if (!customer.data) {
    return (
      <div className="space-y-4 p-6" role="status" aria-label="Carregando cliente">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <CustomerForm
      key={customer.data.id}
      customer={customer.data}
      onSubmit={submit}
      onCancel={onClose}
      submitLabel="Salvar alterações"
    />
  );
}
