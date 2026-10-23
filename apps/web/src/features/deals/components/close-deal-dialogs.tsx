import { LOST_REASON_SUGGESTIONS, lostReasonSchema } from '@nexus/shared';
import { PartyPopper, ThumbsDown } from 'lucide-react';
import { useId, useState } from 'react';
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DealSummary {
  title: string;
  value: number;
}

export function WonDealDialog({
  deal,
  onConfirm,
  onCancel,
}: {
  deal: DealSummary | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={deal !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-success/10 text-success">
            <PartyPopper />
          </AlertDialogMedia>
          <AlertDialogTitle>Marcar como ganho?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground">{deal?.title}</strong> será encerrado como ganho,
            somando {deal ? formatCurrency(deal.value) : ''} à receita. Somente gestores podem
            reabrir negócios encerrados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-success text-white hover:bg-success/90"
          >
            Confirmar ganho
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function LostDealDialog({
  deal,
  onConfirm,
  onCancel,
}: {
  deal: DealSummary | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={deal !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        {deal && <LostReasonForm deal={deal} onConfirm={onConfirm} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Conteúdo separado: o estado do motivo reinicia a cada abertura do diálogo. */
function LostReasonForm({
  deal,
  onConfirm,
}: {
  deal: DealSummary;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();

  const confirm = () => {
    const result = lostReasonSchema.safeParse(reason);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Motivo inválido.');
      return;
    }
    onConfirm(result.data);
  };

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogMedia className="bg-destructive/10 text-destructive">
          <ThumbsDown />
        </AlertDialogMedia>
        <AlertDialogTitle>Por que o negócio foi perdido?</AlertDialogTitle>
        <AlertDialogDescription>
          Registrar o motivo de <strong className="text-foreground">{deal.title}</strong> ajuda a
          entender as perdas nos relatórios.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5" aria-label="Motivos frequentes">
          {LOST_REASON_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setReason(suggestion);
                setError(null);
              }}
              aria-pressed={reason === suggestion}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-destructive/50',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                reason === suggestion && 'border-destructive/60 bg-destructive/10 text-destructive',
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={fieldId}>Motivo</FieldLabel>
          <Textarea
            id={fieldId}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError(null);
            }}
            rows={3}
            maxLength={500}
            aria-invalid={Boolean(error)}
            placeholder="Descreva o motivo da perda"
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={(event) => {
            // Só fecha quando o motivo for válido.
            event.preventDefault();
            confirm();
          }}
        >
          Marcar como perdido
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
