import type { DealDetail, PipelineStageItem } from '@nexus/shared';
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  CircleX,
  Pencil,
  PlusCircle,
  RotateCcw,
  ThumbsDown,
  Trash2,
  Trophy,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityFeed } from '@/features/activities/components/activity-feed';
import { usePermission } from '@/features/auth/hooks';
import { TaskPanel } from '@/features/tasks/components/task-panel';
import { useRetainedValue } from '@/hooks/use-retained-value';
import {
  daysSince,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatIsoDate,
  formatRelative,
  todayIsoDate,
} from '@/lib/format';
import { customerPath } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { describeHistory, type HistoryKind } from '../deal-history';
import { useDeal, useMoveDeal, usePipelines } from '../hooks';
import { LostDealDialog, WonDealDialog } from './close-deal-dialogs';
import { DealStatusBadge } from './deal-badges';
import { DeleteDealDialog } from './delete-deal-dialog';

interface DealDetailSheetProps {
  dealId: string | null;
  onClose: () => void;
  onEdit: (dealId: string) => void;
}

export function DealDetailSheet({ dealId, onClose, onEdit }: DealDetailSheetProps) {
  // Durante a animação de fechamento, o negócio anterior continua visível.
  const shownId = useRetainedValue(dealId);
  return (
    <Sheet open={dealId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {shownId && <DealDetailContent dealId={shownId} onClose={onClose} onEdit={onEdit} />}
      </SheetContent>
    </Sheet>
  );
}

function DealDetailContent({
  dealId,
  onClose,
  onEdit,
}: Required<DealDetailSheetProps> & {
  dealId: string;
}) {
  const deal = useDeal(dealId);

  if (deal.isError) {
    return (
      <>
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Negócio</SheetTitle>
          <SheetDescription>Não foi possível abrir este negócio.</SheetDescription>
        </SheetHeader>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTitle>Negócio indisponível</AlertTitle>
            <AlertDescription>{deal.error.message}</AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  if (!deal.data) {
    return (
      <>
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Carregando negócio…</SheetTitle>
          <SheetDescription className="sr-only">Buscando os dados do negócio.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-6" role="status" aria-label="Carregando negócio">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </>
    );
  }

  return <DealDetailView deal={deal.data} onClose={onClose} onEdit={onEdit} />;
}

function DealDetailView({
  deal,
  onClose,
  onEdit,
}: {
  deal: DealDetail;
  onClose: () => void;
  onEdit: (dealId: string) => void;
}) {
  const canUpdate = usePermission('deals:update');
  const canReopen = usePermission('deals:reopen');
  const canDelete = usePermission('deals:delete');
  const pipelines = usePipelines();
  const move = useMoveDeal();
  const [closing, setClosing] = useState<'WON' | 'LOST' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const stages = pipelines.data?.find((pipeline) => pipeline.id === deal.pipelineId)?.stages ?? [];
  const wonStage = stages.find((stage) => stage.kind === 'WON');
  const lostStage = stages.find((stage) => stage.kind === 'LOST');
  const openStages = stages.filter((stage) => stage.kind === 'OPEN');
  const isOpen = deal.status === 'OPEN';
  const dealSummary = { id: deal.id, title: deal.title };
  const overdue =
    isOpen && deal.expectedCloseDate !== null && deal.expectedCloseDate < todayIsoDate();

  const moveTo = (stage: PipelineStageItem, lostReason?: string) => {
    setClosing(null);
    move.mutate(
      { id: deal.id, input: { stageId: stage.id, lostReason } },
      {
        onSuccess: () => {
          if (stage.kind === 'WON') toast.success(`${deal.title} foi ganho!`);
          else if (stage.kind === 'LOST') toast.info(`${deal.title} foi marcado como perdido.`);
          else toast.success(`${deal.title} foi reaberto em ${stage.name}.`);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <>
      <SheetHeader className="border-b px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <DealStatusBadge status={deal.status} />
          <span className="text-xs text-muted-foreground">{deal.stageName}</span>
        </div>
        <SheetTitle className="text-lg">{deal.title}</SheetTitle>
        <SheetDescription>
          {deal.customer.name} · {formatCurrency(deal.value)}
        </SheetDescription>
      </SheetHeader>

      <Tabs defaultValue="resumo" className="min-h-0 flex-1 gap-0">
        <TabsList variant="line" className="w-full justify-start rounded-none border-b px-4">
          <TabsTrigger value="resumo" className="flex-none">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="atividades" className="flex-none">
            Atividades
          </TabsTrigger>
          <TabsTrigger value="tarefas" className="flex-none">
            Tarefas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-6 overflow-y-auto px-6 py-5">
          {deal.status === 'LOST' && deal.lostReason && (
            <Alert variant="destructive">
              <ThumbsDown />
              <AlertTitle>Motivo da perda</AlertTitle>
              <AlertDescription>{deal.lostReason}</AlertDescription>
            </Alert>
          )}
          {deal.status === 'WON' && deal.closedAt && (
            <Alert className="border-success/30 text-success">
              <Trophy />
              <AlertTitle>Negócio ganho</AlertTitle>
              <AlertDescription>Encerrado em {formatDate(deal.closedAt)}.</AlertDescription>
            </Alert>
          )}

          <dl className="grid gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
            <DetailItem label="Valor potencial">
              <span className="text-base font-semibold tabular-nums">
                {formatCurrency(deal.value)}
              </span>
            </DetailItem>
            <DetailItem label="Cliente">
              <Link
                to={customerPath(deal.customer.id)}
                onClick={onClose}
                className="text-primary hover:underline"
              >
                {deal.customer.name}
              </Link>
            </DetailItem>
            <DetailItem label="Responsável">
              {deal.owner?.name ?? (
                <span className="text-muted-foreground italic">Sem responsável</span>
              )}
            </DetailItem>
            <DetailItem label="Previsão de fechamento">
              {deal.expectedCloseDate && (
                <span className={cn(overdue && 'text-destructive')}>
                  {formatIsoDate(deal.expectedCloseDate)}
                  {overdue && ' · atrasado'}
                </span>
              )}
            </DetailItem>
            <DetailItem label={isOpen ? 'Na etapa atual' : 'Encerrado em'}>
              {isOpen ? (
                <span title={formatDateTime(deal.stageChangedAt)}>
                  {daysSince(deal.stageChangedAt) === 0
                    ? 'Desde hoje'
                    : `Há ${daysSince(deal.stageChangedAt)} ${daysSince(deal.stageChangedAt) === 1 ? 'dia' : 'dias'}`}
                </span>
              ) : (
                deal.closedAt && formatDate(deal.closedAt)
              )}
            </DetailItem>
            <DetailItem label="Cadastrado">
              <span title={formatDateTime(deal.createdAt)}>
                {formatDate(deal.createdAt)}
                {deal.createdBy && ` por ${deal.createdBy.name}`}
              </span>
            </DetailItem>
          </dl>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Observações</h3>
            {deal.notes ? (
              <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma observação registrada.</p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Histórico de movimentações</h3>
            {deal.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
            ) : (
              <ol className="relative space-y-4 border-l pl-5">
                {deal.history.map((entry) => {
                  const description = describeHistory(entry);
                  return (
                    <li key={entry.id}>
                      <HistoryIcon kind={description.kind} />
                      <p className="text-sm font-medium">{description.title}</p>
                      {description.detail && (
                        <p className="text-xs break-words text-muted-foreground">
                          {description.detail}
                        </p>
                      )}
                      <p
                        className="text-xs text-muted-foreground"
                        title={formatDateTime(entry.createdAt)}
                      >
                        {formatRelative(entry.createdAt)}
                        {entry.changedBy && ` · ${entry.changedBy.name}`}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </TabsContent>

        <TabsContent value="atividades" className="overflow-y-auto px-6 py-5">
          <ActivityFeed customer={deal.customer} deal={dealSummary} pageSize={6} />
        </TabsContent>

        <TabsContent value="tarefas" className="overflow-y-auto px-6 py-5">
          <TaskPanel customer={deal.customer} deal={dealSummary} />
        </TabsContent>
      </Tabs>

      <SheetFooter className="flex-row flex-wrap justify-between gap-2 border-t px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {isOpen && canUpdate && (
            <>
              <Button variant="outline" onClick={() => onEdit(deal.id)}>
                <Pencil />
                Editar
              </Button>
              {wonStage && (
                <Button
                  className="bg-success text-white hover:bg-success/90"
                  disabled={move.isPending}
                  onClick={() => setClosing('WON')}
                >
                  {move.isPending ? <Spinner /> : <CircleCheck />}
                  Ganho
                </Button>
              )}
              {lostStage && (
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={move.isPending}
                  onClick={() => setClosing('LOST')}
                >
                  <CircleX />
                  Perdido
                </Button>
              )}
            </>
          )}
          {!isOpen &&
            (canReopen ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={move.isPending || openStages.length === 0}>
                    {move.isPending ? <Spinner /> : <RotateCcw />}
                    Reabrir
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Reabrir na etapa</DropdownMenuLabel>
                  {openStages.map((stage) => (
                    <DropdownMenuItem key={stage.id} onSelect={() => moveTo(stage)}>
                      {stage.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <p className="self-center text-xs text-muted-foreground">
                Negócio encerrado. Somente gestores podem reabri-lo.
              </p>
            ))}
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2 />
            Excluir
          </Button>
        )}
      </SheetFooter>

      <WonDealDialog
        deal={closing === 'WON' ? deal : null}
        onCancel={() => setClosing(null)}
        onConfirm={() => wonStage && moveTo(wonStage)}
      />
      <LostDealDialog
        deal={closing === 'LOST' ? deal : null}
        onCancel={() => setClosing(null)}
        onConfirm={(reason) => lostStage && moveTo(lostStage, reason)}
      />
      <DeleteDealDialog
        deal={deleting ? deal : null}
        onClose={() => setDeleting(false)}
        onDeleted={onClose}
      />
    </>
  );
}

const HISTORY_ICONS: Record<HistoryKind, { icon: typeof ArrowRight; className: string }> = {
  created: { icon: PlusCircle, className: 'bg-primary/10 text-primary' },
  moved: { icon: ArrowRight, className: 'bg-primary/10 text-primary' },
  won: { icon: CircleCheck, className: 'bg-success/15 text-success' },
  lost: { icon: CircleX, className: 'bg-destructive/10 text-destructive' },
  reopened: { icon: RotateCcw, className: 'bg-warning/15 text-warning' },
};

function HistoryIcon({ kind }: { kind: HistoryKind }) {
  const { icon: Icon, className } = HISTORY_ICONS[kind];
  return (
    <span
      className={cn(
        'absolute -left-2.5 flex size-5 items-center justify-center rounded-full ring-4 ring-background',
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
    </span>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">
        {children || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
