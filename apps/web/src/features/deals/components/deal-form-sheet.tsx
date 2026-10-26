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
import { useRetainedValue } from '@/hooks/use-retained-value';
import { useCreateDeal, useDeal, usePipelines, useUpdateDeal } from '../hooks';
import { DealForm, type StageGroup } from './deal-form';

export type DealFormMode =
  | {
      kind: 'create';
      customer?: CustomerSummary | null;
      stageId?: string;
      /** Funil sugerido (o aberto no quadro); sem ele, o funil padrão. */
      pipelineId?: string;
    }
  | { kind: 'edit'; dealId: string }
  | null;

interface DealFormSheetProps {
  mode: DealFormMode;
  onClose: () => void;
  onCreated?: (deal: DealDetail) => void;
}

export function DealFormSheet({ mode: currentMode, onClose, onCreated }: DealFormSheetProps) {
  // Durante a animação de fechamento, o formulário anterior continua visível.
  const mode = useRetainedValue(currentMode);
  return (
    <Sheet open={currentMode !== null} onOpenChange={(open) => !open && onClose()}>
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
            pipelineId={mode.pipelineId}
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

/** Etapas em andamento de cada funil, com o funil sugerido (ou o padrão) em primeiro lugar. */
function useStageGroups(preferredPipelineId?: string): {
  isLoading: boolean;
  groups: StageGroup[];
} {
  const pipelines = usePipelines();
  const list = pipelines.data ?? [];
  const preferred =
    list.find((item) => item.id === preferredPipelineId) ??
    list.find((item) => item.isDefault) ??
    list[0];
  const ordered = preferred ? [preferred, ...list.filter((item) => item !== preferred)] : list;
  return {
    isLoading: pipelines.isPending,
    groups: ordered.map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      stages: pipeline.stages.filter((stage) => stage.kind === 'OPEN'),
    })),
  };
}

function CreateDeal({
  customer,
  stageId,
  pipelineId,
  onClose,
  onCreated,
}: {
  customer: CustomerSummary | null;
  stageId?: string;
  pipelineId?: string;
  onClose: () => void;
  onCreated?: (deal: DealDetail) => void;
}) {
  const create = useCreateDeal();
  const { groups, isLoading } = useStageGroups(pipelineId);

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
      stageGroups={groups}
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
  const { groups } = useStageGroups();

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
      stageGroups={groups}
      onSubmit={submit}
      onCancel={onClose}
      submitLabel="Salvar alterações"
    />
  );
}
