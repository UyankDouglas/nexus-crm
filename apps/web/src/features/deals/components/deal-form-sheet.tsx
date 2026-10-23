import type { CustomerSummary, DealDetail, DealInput } from '@nexus/shared';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateDeal, useDeal, usePipelines, useUpdateDeal } from '../hooks';
import { DealForm } from './deal-form';

export type DealFormMode =
  | { kind: 'create'; customer?: CustomerSummary | null; stageId?: string }
  | { kind: 'edit'; dealId: string }
  | null;

interface DealFormSheetProps {
  mode: DealFormMode;
  onClose: () => void;
  onCreated?: (deal: DealDetail) => void;
}

export function DealFormSheet({ mode, onClose, onCreated }: DealFormSheetProps) {
  return (
    <Sheet open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{mode?.kind === 'edit' ? 'Editar negócio' : 'Novo negócio'}</SheetTitle>
          <SheetDescription>
            {mode?.kind === 'edit'
              ? 'Atualize os dados da oportunidade. A etapa muda pelo quadro.'
              : 'Registre uma oportunidade de venda para um cliente da sua carteira.'}
          </SheetDescription>
        </SheetHeader>
        {mode?.kind === 'create' && (
          <CreateDeal
            customer={mode.customer ?? null}
            stageId={mode.stageId}
            onClose={onClose}
            onCreated={onCreated}
          />
        )}
        {mode?.kind === 'edit' && <EditDeal dealId={mode.dealId} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4 p-6" role="status" aria-label="Carregando formulário">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}

function useOpenStages() {
  const pipelines = usePipelines();
  const pipeline = pipelines.data?.find((item) => item.isDefault) ?? pipelines.data?.[0];
  return {
    isLoading: pipelines.isPending,
    stages: pipeline?.stages.filter((stage) => stage.kind === 'OPEN') ?? [],
  };
}

function CreateDeal({
  customer,
  stageId,
  onClose,
  onCreated,
}: {
  customer: CustomerSummary | null;
  stageId?: string;
  onClose: () => void;
  onCreated?: (deal: DealDetail) => void;
}) {
  const create = useCreateDeal();
  const { stages, isLoading } = useOpenStages();

  const submit = async (values: DealInput) => {
    const deal = await create.mutateAsync(values);
    toast.success(`Negócio ${deal.title} cadastrado em ${deal.stageName}.`);
    onClose();
    onCreated?.(deal);
  };

  if (isLoading) return <FormSkeleton />;
  return (
    <DealForm
      deal={null}
      openStages={stages}
      initialCustomer={customer}
      initialStageId={stageId}
      onSubmit={submit}
      onCancel={onClose}
      submitLabel="Cadastrar"
    />
  );
}

function EditDeal({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const deal = useDeal(dealId);
  const update = useUpdateDeal(dealId);
  const { stages } = useOpenStages();

  const submit = async ({ stageId: _stageId, ...values }: DealInput) => {
    const updated = await update.mutateAsync(values);
    toast.success(`${updated.title} atualizado.`);
    onClose();
  };

  if (deal.isError) {
    return <p className="p-6 text-sm text-destructive">{deal.error.message}</p>;
  }
  if (!deal.data) return <FormSkeleton />;
  return (
    <DealForm
      key={deal.data.id}
      deal={deal.data}
      openStages={stages}
      onSubmit={submit}
      onCancel={onClose}
      submitLabel="Salvar alterações"
    />
  );
}
