import { PIPELINE_LIMITS, type PipelineItem, type PipelineStageItem } from '@nexus/shared';
import { ArrowDown, ArrowUp, CircleCheck, CircleX, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelines } from '@/features/deals/hooks';
import { cn } from '@/lib/utils';
import { usePipelineSettings } from '../hooks';
import {
  DeletePipelineDialog,
  DeleteStageDialog,
  PipelineNameDialog,
  StageDialog,
} from './pipeline-dialogs';

type NameDialog = { kind: 'create' } | { kind: 'rename'; pipeline: PipelineItem } | null;
type StageEditor = { stage: PipelineStageItem | null } | null;

/**
 * Configuração dos funis (somente administradores): etapas em andamento podem ser criadas,
 * renomeadas, reordenadas e excluídas; ganho e perda ficam sempre ao final.
 */
export function PipelinesPanel() {
  const pipelines = usePipelines();
  const settings = usePipelineSettings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nameDialog, setNameDialog] = useState<NameDialog>(null);
  const [stageEditor, setStageEditor] = useState<StageEditor>(null);
  const [deleting, setDeleting] = useState<PipelineStageItem | null>(null);
  const [deletingPipeline, setDeletingPipeline] = useState<PipelineItem | null>(null);

  if (pipelines.isError)
    return <p className="text-sm text-destructive">{pipelines.error.message}</p>;
  if (!pipelines.data) {
    return (
      <div className="space-y-2" role="status" aria-label="Carregando funis">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const pipeline =
    pipelines.data.find((item) => item.id === selectedId) ??
    pipelines.data.find((item) => item.isDefault) ??
    pipelines.data[0]!;
  const open = pipeline.stages.filter((stage) => stage.kind === 'OPEN');
  const notify = (promise: Promise<unknown>, success: string) =>
    promise.then(
      () => toast.success(success),
      (error: Error) => toast.error(error.message),
    );

  const move = (stage: PipelineStageItem, offset: -1 | 1) => {
    const ids = open.map((item) => item.id);
    const index = ids.indexOf(stage.id);
    [ids[index], ids[index + offset]] = [ids[index + offset]!, ids[index]!];
    void notify(
      settings.reorderStages.mutateAsync({ pipelineId: pipeline.id, stageIds: ids }),
      `Etapa ${stage.name} movida.`,
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {pipelines.data.length > 1 ? (
            <Select value={pipeline.id} onValueChange={setSelectedId}>
              <SelectTrigger className="w-56" aria-label="Funil">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines.data.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                    {item.isDefault && ' (padrão)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <h3 className="text-base font-semibold">{pipeline.name}</h3>
          )}
          {pipeline.isDefault && (
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Star className="size-3" aria-hidden="true" />
              Padrão
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNameDialog({ kind: 'rename', pipeline })}
          >
            <Pencil />
            Renomear
          </Button>
          {!pipeline.isDefault && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void notify(
                    settings.updatePipeline.mutateAsync({ id: pipeline.id, isDefault: true }),
                    `${pipeline.name} agora é o funil padrão.`,
                  )
                }
              >
                <Star />
                Tornar padrão
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeletingPipeline(pipeline)}
              >
                <Trash2 />
                Excluir funil
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setNameDialog({ kind: 'create' })}>
            <Plus />
            Novo funil
          </Button>
        </div>
      </div>

      <ol className="divide-y rounded-lg border" aria-label={`Etapas do funil ${pipeline.name}`}>
        {pipeline.stages.map((stage) => {
          const index = open.findIndex((item) => item.id === stage.id);
          const isOpen = stage.kind === 'OPEN';
          return (
            <li key={stage.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex w-14 shrink-0 gap-0.5">
                {isOpen && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === 0 || settings.reorderStages.isPending}
                      onClick={() => move(stage, -1)}
                      aria-label={`Subir ${stage.name}`}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === open.length - 1 || settings.reorderStages.isPending}
                      onClick={() => move(stage, 1)}
                      aria-label={`Descer ${stage.name}`}
                    >
                      <ArrowDown />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {stage.kind === 'WON' && <CircleCheck className="size-4 text-success" />}
                {stage.kind === 'LOST' && <CircleX className="size-4 text-destructive" />}
                <span className="truncate text-sm font-medium">{stage.name}</span>
                {!isOpen && (
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {stage.kind === 'WON' ? 'Encerra como ganho' : 'Encerra como perdido'}
                  </Badge>
                )}
              </div>
              <span
                className={cn(
                  'w-14 shrink-0 text-right text-sm tabular-nums',
                  isOpen ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {stage.probability}%
              </span>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setStageEditor({ stage })}
                  aria-label={`Editar ${stage.name}`}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  disabled={!isOpen || open.length <= 1}
                  onClick={() => setDeleting(stage)}
                  aria-label={`Excluir ${stage.name}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {open.length} de {PIPELINE_LIMITS.maxOpenStages} etapas em andamento. Renomear ou excluir
          etapas não altera o histórico já registrado nos negócios.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={open.length >= PIPELINE_LIMITS.maxOpenStages}
          onClick={() => setStageEditor({ stage: null })}
        >
          <Plus />
          Adicionar etapa
        </Button>
      </div>

      <PipelineNameDialog
        open={nameDialog !== null}
        title={nameDialog?.kind === 'rename' ? 'Renomear funil' : 'Novo funil'}
        initialName={nameDialog?.kind === 'rename' ? nameDialog.pipeline.name : ''}
        submitLabel={nameDialog?.kind === 'rename' ? 'Salvar' : 'Criar funil'}
        onClose={() => setNameDialog(null)}
        onSubmit={async (name) => {
          if (nameDialog?.kind === 'rename') {
            await settings.updatePipeline.mutateAsync({ id: nameDialog.pipeline.id, name });
            toast.success('Funil renomeado.');
          } else {
            const created = await settings.createPipeline.mutateAsync(name);
            setSelectedId(created.id);
            toast.success(`Funil ${created.name} criado com as etapas padrão.`);
          }
        }}
      />
      <StageDialog
        open={stageEditor !== null}
        stage={stageEditor?.stage ?? null}
        onClose={() => setStageEditor(null)}
        onSubmit={async (input) => {
          const stage = stageEditor?.stage;
          if (stage) {
            await settings.updateStage.mutateAsync({
              pipelineId: pipeline.id,
              stageId: stage.id,
              input: stage.kind === 'OPEN' ? input : { name: input.name },
            });
            toast.success('Etapa atualizada.');
          } else {
            await settings.addStage.mutateAsync({ pipelineId: pipeline.id, input });
            toast.success(`Etapa ${input.name} adicionada.`);
          }
        }}
      />
      <DeletePipelineDialog
        pipeline={deletingPipeline}
        pending={settings.deletePipeline.isPending}
        onClose={() => setDeletingPipeline(null)}
        onConfirm={() =>
          void notify(
            settings.deletePipeline.mutateAsync(deletingPipeline!.id).then(() => {
              setDeletingPipeline(null);
              setSelectedId(null);
            }),
            `Funil ${deletingPipeline!.name} excluído.`,
          )
        }
      />
      <DeleteStageDialog
        stage={deleting}
        targets={open.filter((stage) => stage.id !== deleting?.id)}
        pending={settings.deleteStage.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={(moveTo) =>
          void notify(
            settings.deleteStage
              .mutateAsync({ pipelineId: pipeline.id, stageId: deleting!.id, moveTo })
              .then(() => setDeleting(null)),
            `Etapa ${deleting!.name} excluída.`,
          )
        }
      />
    </div>
  );
}
