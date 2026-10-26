import type { ActivityItem, CustomerSummary, DealSummary } from '@nexus/shared';
import { MessagesSquare, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { useActivityFeed } from '../hooks';
import { type ActivityFormMode, ActivityFormDialog } from './activity-form-dialog';
import { ActivityTimeline, ActivityTimelineSkeleton } from './activity-timeline';
import { DeleteActivityDialog } from './delete-activity-dialog';

interface ActivityFeedProps {
  customer: CustomerSummary;
  /** Com negócio, mostra e registra apenas as interações daquele negócio. */
  deal?: DealSummary;
  pageSize?: number;
}

/** Histórico de interações de um cliente ou negócio, com registro já vinculado. */
export function ActivityFeed({ customer, deal, pageSize = 8 }: ActivityFeedProps) {
  const feed = useActivityFeed({
    ...(deal ? { dealId: deal.id } : { customerId: customer.id }),
    pageSize,
  });
  const [formMode, setFormMode] = useState<ActivityFormMode>(null);
  const [deleting, setDeleting] = useState<ActivityItem | null>(null);
  const activities = feed.data?.pages.flatMap((page) => page.data) ?? [];
  const total = feed.data?.pages[0]?.meta.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? 'Nenhuma interação registrada'
            : `${total} ${total === 1 ? 'interação registrada' : 'interações registradas'}`}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFormMode({ kind: 'create', customer, deal: deal ?? null })}
        >
          <Plus />
          Registrar
        </Button>
      </div>

      {feed.isError ? (
        <p className="text-sm text-destructive">{feed.error.message}</p>
      ) : !feed.data ? (
        <ActivityTimelineSkeleton />
      ) : activities.length === 0 ? (
        <Empty className="border border-dashed py-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessagesSquare />
            </EmptyMedia>
            <EmptyTitle>Sem interações ainda</EmptyTitle>
            <EmptyDescription>
              Registre ligações, reuniões e e-mails para a equipe acompanhar o relacionamento.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ActivityTimeline
            activities={activities}
            onEdit={(activity) => setFormMode({ kind: 'edit', activity })}
            onDelete={setDeleting}
            hideLinks
          />
          {feed.hasNextPage && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={feed.isFetchingNextPage}
              onClick={() => void feed.fetchNextPage()}
            >
              {feed.isFetchingNextPage && <Spinner />}
              Carregar interações anteriores
            </Button>
          )}
        </>
      )}

      <ActivityFormDialog mode={formMode} onClose={() => setFormMode(null)} />
      <DeleteActivityDialog activity={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
