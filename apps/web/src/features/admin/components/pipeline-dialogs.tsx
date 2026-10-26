import { zodResolver } from '@hookform/resolvers/zod';
import {
  PIPELINE_LIMITS,
  type PipelineInput,
  type PipelineItem,
  pipelineSchema,
  type PipelineStageItem,
  type StageInput,
  stageSchema,
} from '@nexus/shared';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { applyApiErrors } from '@/lib/form-errors';

/** Diálogo de nome do funil (criação e renomeação). */
export function PipelineNameDialog({
  open,
  title,
  initialName = '',
  submitLabel,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  initialName?: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<unknown>;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Novos funis começam com as etapas padrão, que você pode ajustar depois.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PipelineNameForm
            initialName={initialName}
            submitLabel={submitLabel}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PipelineNameForm({
  initialName,
  submitLabel,
  onSubmit,
  onClose,
}: {
  initialName: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<PipelineInput>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: { name: initialName },
  });
  const submit = form.handleSubmit(async ({ name }) => {
    setFormError(null);
    try {
      await onSubmit(name);
      onClose();
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, ['name']));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FieldGroup>
        <FormErrorAlert message={formError} />
        <FormTextField
          control={form.control}
          name="name"
          label="Nome do funil"
          placeholder="Ex.: Renovações"
          maxLength={PIPELINE_LIMITS.name}
          autoFocus
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface StageFields {
  name: string;
  probability: string;
}

/** Diálogo de etapa (criação e edição). Etapas de ganho e perda têm probabilidade fixa. */
export function StageDialog({
  stage,
  open,
  onSubmit,
  onClose,
}: {
  /** `null`: nova etapa em andamento. */
  stage: PipelineStageItem | null;
  open: boolean;
  onSubmit: (input: StageInput) => Promise<unknown>;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{stage ? 'Editar etapa' : 'Nova etapa'}</DialogTitle>
          <DialogDescription>
            A probabilidade indica a chance de fechamento e pondera o valor do pipeline nos
            relatórios.
          </DialogDescription>
        </DialogHeader>
        {open && <StageForm stage={stage} onSubmit={onSubmit} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function StageForm({
  stage,
  onSubmit,
  onClose,
}: {
  stage: PipelineStageItem | null;
  onSubmit: (input: StageInput) => Promise<unknown>;
  onClose: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const closing = stage !== null && stage.kind !== 'OPEN';
  const form = useForm<StageFields, unknown, StageInput>({
    resolver: zodResolver(stageSchema) as unknown as Resolver<StageFields, unknown, StageInput>,
    defaultValues: {
      name: stage?.name ?? '',
      probability: String(stage?.probability ?? 50),
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, ['name', 'probability']));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FieldGroup>
        <FormErrorAlert message={formError} />
        <FormTextField
          control={form.control}
          name="name"
          label="Nome da etapa"
          placeholder="Ex.: Demonstração"
          maxLength={PIPELINE_LIMITS.stageName}
          autoFocus
        />
        <FormTextField
          control={form.control}
          name="probability"
          label="Probabilidade de fechamento (%)"
          type="number"
          min={0}
          max={100}
          step={1}
          disabled={closing}
          description={
            closing ? 'Etapas de ganho e perda têm probabilidade fixa (100% e 0%).' : undefined
          }
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          {stage ? 'Salvar etapa' : 'Adicionar etapa'}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Confirmação de exclusão de etapa: os negócios da etapa (se houver) vão para a etapa
 * escolhida, com registro no histórico de cada um.
 */
export function DeleteStageDialog({
  stage,
  targets,
  pending,
  onConfirm,
  onClose,
}: {
  stage: PipelineStageItem | null;
  targets: PipelineStageItem[];
  pending: boolean;
  onConfirm: (moveTo: string) => void;
  onClose: () => void;
}) {
  const [moveTo, setMoveTo] = useState<string>('');
  const shown = useRetainedValue(stage);
  const target = moveTo || targets[0]?.id || '';

  return (
    <AlertDialog
      open={stage !== null}
      onOpenChange={(open) => {
        if (!open) {
          setMoveTo('');
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Excluir a etapa {shown?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Negócios desta etapa serão movidos para a etapa escolhida abaixo, com registro no
            histórico. O histórico já registrado continua com o nome antigo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="move-to">Mover negócios para</FieldLabel>
          <Select value={target} onValueChange={setMoveTo}>
            <SelectTrigger id="move-to" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targets.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Somente etapas em andamento do mesmo funil.</FieldDescription>
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || !target}
            onClick={(event) => {
              event.preventDefault();
              onConfirm(target);
            }}
          >
            {pending && <Spinner />}
            Excluir etapa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Confirmação de exclusão de funil: a API só aceita funis sem negócios e que não são o padrão. */
export function DeletePipelineDialog({
  pipeline,
  pending,
  onConfirm,
  onClose,
}: {
  pipeline: PipelineItem | null;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const shown = useRetainedValue(pipeline);
  return (
    <AlertDialog open={pipeline !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Excluir o funil {shown?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            O funil e as {shown?.stages.length} etapas serão removidos. Só é possível excluir um
            funil sem negócios: mova ou exclua os negócios dele antes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending && <Spinner />}
            Excluir funil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
