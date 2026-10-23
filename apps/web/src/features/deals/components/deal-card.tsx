import type { DealCard, PipelineStageItem } from '@nexus/shared';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarClock, GripVertical, MoreHorizontal, MoveRight } from 'lucide-react';
import type { CSSProperties, HTMLAttributes, KeyboardEventHandler, Ref } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { daysSince, formatCurrency, formatIsoDate, getInitials, todayIsoDate } from '@/lib/format';
import { cn } from '@/lib/utils';

function timeInStage(since: string): string {
  const days = daysSince(since);
  if (days === 0) return 'Entrou na etapa hoje';
  return `${days} ${days === 1 ? 'dia' : 'dias'} nesta etapa`;
}

interface DealCardViewProps {
  deal: DealCard;
  /** Etapas para o menu "Mover para…" (alternativa ao arrastar). */
  stages?: PipelineStageItem[];
  draggable?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  onOpen?: (dealId: string) => void;
  onMoveTo?: (deal: DealCard, stage: PipelineStageItem) => void;
  handleRef?: Ref<HTMLButtonElement>;
  handleProps?: HTMLAttributes<HTMLButtonElement>;
  cardRef?: Ref<HTMLDivElement>;
  cardProps?: HTMLAttributes<HTMLDivElement>;
  style?: CSSProperties;
}

/** Apresentação do card (também usada na sobreposição durante o arraste). */
export function DealCardView({
  deal,
  stages = [],
  draggable = true,
  isDragging,
  isOverlay,
  onOpen,
  onMoveTo,
  handleRef,
  handleProps,
  cardRef,
  cardProps,
  style,
}: DealCardViewProps) {
  const overdue =
    deal.status === 'OPEN' &&
    deal.expectedCloseDate !== null &&
    deal.expectedCloseDate < todayIsoDate();
  const otherStages = stages.filter((stage) => stage.id !== deal.stageId);

  return (
    <div
      ref={cardRef}
      style={style}
      {...cardProps}
      className={cn(
        'group/card relative rounded-lg border bg-card p-3 text-sm shadow-xs transition-shadow',
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        isOverlay && 'rotate-1 shadow-lg ring-2 ring-primary/40',
        deal.status === 'WON' && 'border-l-4 border-l-success',
        deal.status === 'LOST' && 'border-l-4 border-l-destructive opacity-80',
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => onOpen?.(deal.id)}
          className="min-w-0 flex-1 text-left leading-snug font-medium text-foreground hover:text-primary focus-visible:underline focus-visible:outline-none"
        >
          {deal.title}
        </button>
        {draggable && (
          <button
            ref={handleRef}
            type="button"
            {...handleProps}
            className="-mt-0.5 -mr-1 rounded p-0.5 text-muted-foreground opacity-60 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`Mover ${deal.title}`}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        {onMoveTo && otherStages.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="-mt-0.5 opacity-60 group-hover/card:opacity-100 focus-visible:opacity-100"
                aria-label={`Ações para ${deal.title}`}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => onOpen?.(deal.id)}>Ver detalhes</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Mover para
              </DropdownMenuLabel>
              {otherStages.map((stage) => (
                <DropdownMenuItem key={stage.id} onSelect={() => onMoveTo(deal, stage)}>
                  <MoveRight />
                  {stage.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <p className="mt-0.5 truncate text-xs text-muted-foreground">{deal.customer.name}</p>
      <p className="mt-2 font-semibold tabular-nums">{formatCurrency(deal.value)}</p>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <Avatar className="size-5">
            <AvatarFallback className="bg-primary/10 text-[9px] font-semibold text-primary">
              {deal.owner ? getInitials(deal.owner.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{deal.owner?.name ?? 'Sem responsável'}</span>
        </span>
        {deal.expectedCloseDate && deal.status === 'OPEN' && (
          <span
            className={cn(
              'flex shrink-0 items-center gap-1',
              overdue && 'font-medium text-destructive',
            )}
            title={overdue ? 'Previsão de fechamento vencida' : 'Previsão de fechamento'}
          >
            <CalendarClock className="size-3.5" />
            {formatIsoDate(deal.expectedCloseDate)}
          </span>
        )}
      </div>
      {deal.status === 'OPEN' && (
        <p className="mt-1.5 text-[11px] text-muted-foreground/80">
          {timeInStage(deal.stageChangedAt)}
        </p>
      )}
    </div>
  );
}

interface SortableDealCardProps {
  deal: DealCard;
  stages: PipelineStageItem[];
  disabled?: boolean;
  onOpen: (dealId: string) => void;
  onMoveTo: (deal: DealCard, stage: PipelineStageItem) => void;
}

/**
 * Card arrastável. O ponteiro arrasta o card inteiro; pelo teclado, a alça (Espaço/Enter)
 * inicia o arraste, e as setas movem entre posições e etapas.
 */
export function SortableDealCard({
  deal,
  stages,
  disabled,
  onOpen,
  onMoveTo,
}: SortableDealCardProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id, data: { type: 'card', stageId: deal.stageId }, disabled });

  // O teclado usa só a alça (focável); o ponteiro arrasta o card inteiro.
  const { onKeyDown, ...pointerListeners } = listeners ?? {};
  const handleKeyDown = onKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined;

  return (
    <DealCardView
      deal={deal}
      stages={disabled ? [] : stages}
      draggable={!disabled}
      isDragging={isDragging}
      onOpen={onOpen}
      onMoveTo={disabled ? undefined : onMoveTo}
      cardRef={setNodeRef}
      cardProps={pointerListeners}
      handleRef={setActivatorNodeRef}
      handleProps={{ ...attributes, onKeyDown: handleKeyDown }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    />
  );
}
